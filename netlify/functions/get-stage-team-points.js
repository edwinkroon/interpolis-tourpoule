const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    // Get stage_number from query parameters
    const stageNumber = event.queryStringParameters?.stage_number 
      ? parseInt(event.queryStringParameters.stage_number) 
      : null;

    if (!stageNumber) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'stage_number parameter is required' 
        })
      };
    }

    client = await getDbClient();

    // Get stage ID from stage number
    const stageQuery = await client.query(
      `SELECT id FROM stages WHERE stage_number = $1`,
      [stageNumber]
    );

    if (stageQuery.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Stage not found' 
        })
      };
    }

    const stageId = stageQuery.rows[0].id;

    // Get team points for this stage, ordered by total_points descending
    // Only include participants that have a fantasy team
    const query = `
      SELECT 
        p.id as participant_id,
        p.team_name,
        COALESCE(fsp.total_points, 0) as points
      FROM participants p
      INNER JOIN fantasy_teams ft ON ft.participant_id = p.id
      LEFT JOIN fantasy_stage_points fsp ON fsp.participant_id = p.id AND fsp.stage_id = $1
      ORDER BY COALESCE(fsp.total_points, 0) DESC, p.team_name ASC
    `;
    
    const { rows } = await client.query(query, [stageId]);
    
    await client.end();

    // Format results with rank, team name, and points
    // Handle ties: teams with same points get same rank
    let currentRank = 1;
    let previousPoints = null;
    const teams = rows.map((row, index) => {
      const points = row.points || 0;
      
      // If points are different from previous, update rank
      if (previousPoints !== null && points < previousPoints) {
        currentRank = index + 1;
      } else if (previousPoints === null || points > previousPoints) {
        currentRank = index + 1;
      }
      // If points are same as previous, keep same rank
      
      previousPoints = points;
      
      return {
        rank: currentRank,
        teamName: row.team_name,
        points: points,
        participantId: row.participant_id
      };
    });

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        teams: teams,
        stageNumber: stageNumber
      })
    };
  } catch (err) {
    return await handleDbError(err, 'get-stage-team-points', client);
  }
};

