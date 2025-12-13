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
    // Add "Begin" label at the start, then all stages
    const stageLabels = ['Begin', ...stages.map(s => `Etappe ${s.stage_number}`)];

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

      // Start with 0 points (begin tour)
      let previousPoints = 0;
      teamData.points.push(0);

      // Get cumulative points for each stage
      for (const stage of stages) {
        // Always calculate cumulative points directly from fantasy_stage_points
        // This ensures consistency and that points always increase or stay the same
        const stagePointsQuery = await client.query(`
          SELECT 
            COALESCE(
              SUM(COALESCE(total_points, points_stage + points_jerseys + COALESCE(points_bonus, 0))),
              0
            ) as total_points
          FROM fantasy_stage_points
          WHERE participant_id = $1
            AND stage_id IN (
              SELECT id FROM stages 
              WHERE stage_number <= $2
                AND EXISTS (SELECT 1 FROM stage_results sr WHERE sr.stage_id = stages.id)
            )
        `, [participant.id, stage.stage_number]);
        
        let totalPoints = stagePointsQuery.rows[0]?.total_points;
        totalPoints = totalPoints ? parseInt(totalPoints) : 0;
        
        // Ensure points never decrease (cumulative should always increase or stay same)
        // Use the maximum of calculated points and previous points
        totalPoints = Math.max(totalPoints, previousPoints);
        
        teamData.points.push(totalPoints);
        previousPoints = totalPoints;
      }

      teams.push(teamData);
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
