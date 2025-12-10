const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get participant_id from query string (optional - if not provided, returns all teams)
  const participantId = event.queryStringParameters?.participantId 
    ? parseInt(event.queryStringParameters.participantId) 
    : null;

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Get all stages with results, ordered by stage number
    const stagesQuery = await client.query(`
      SELECT DISTINCT s.id, s.stage_number, s.name
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number ASC
    `);

    if (stagesQuery.rows.length === 0) {
      await client.end();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          stages: [],
          teams: []
        })
      };
    }

    const stages = stagesQuery.rows;
    const stageLabels = stages.map(s => `Etappe ${s.stage_number}`);

    // Get all participants with fantasy teams
    const participantsQuery = await client.query(`
      SELECT DISTINCT p.id, p.team_name
      FROM participants p
      INNER JOIN fantasy_teams ft ON ft.participant_id = p.id
      ${participantId ? 'WHERE p.id = $1' : ''}
    `, participantId ? [participantId] : []);

    const teams = [];

    for (const participant of participantsQuery.rows) {
      const teamData = {
        participantId: participant.id,
        teamName: participant.team_name,
        points: []
      };

      // Get cumulative points for each stage
      for (const stage of stages) {
        // Try to get from cumulative points first
        const cumulativeQuery = await client.query(`
          SELECT total_points
          FROM fantasy_cumulative_points
          WHERE participant_id = $1 AND after_stage_id = $2
          LIMIT 1
        `, [participant.id, stage.id]);

        if (cumulativeQuery.rows.length > 0) {
          teamData.points.push(cumulativeQuery.rows[0].total_points || 0);
        } else {
          // Fallback: sum of stage points up to this stage
          const stagePointsQuery = await client.query(`
            SELECT COALESCE(SUM(total_points), 0) as total_points
            FROM fantasy_stage_points
            WHERE participant_id = $1
              AND stage_id IN (
                SELECT id FROM stages WHERE stage_number <= $2
              )
          `, [participant.id, stage.stage_number]);
          
          teamData.points.push(parseFloat(stagePointsQuery.rows[0].total_points) || 0);
        }
      }

      teams.push(teamData);
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        stages: stageLabels,
        teams: teams
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

