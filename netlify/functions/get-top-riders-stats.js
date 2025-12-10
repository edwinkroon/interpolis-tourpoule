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

    client = await getDbClient();

    // Get all stages with results
    const stagesQuery = await client.query(`
      SELECT DISTINCT s.id, s.stage_number
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
          riders: []
        })
      };
    }

    const stageIds = stagesQuery.rows.map(row => row.id);

    // Get scoring rules
    const scoringRulesQuery = await client.query(`
      SELECT rule_type, condition_json, points 
      FROM scoring_rules 
      WHERE rule_type IN ('stage_position', 'jersey')
    `);
    
    const positionPointsMap = new Map();
    const jerseyPointsMap = new Map();
    scoringRulesQuery.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (rule.rule_type === 'stage_position' && condition && condition.position) {
        positionPointsMap.set(condition.position, rule.points);
      } else if (rule.rule_type === 'jersey' && condition && condition.jersey_type) {
        jerseyPointsMap.set(condition.jersey_type, rule.points);
      }
    });

    // Calculate total points per rider across all stages
    const riderPointsMap = new Map();

    for (const stage of stagesQuery.rows) {
      // Get stage results
      const stageResultsQuery = await client.query(`
        SELECT rider_id, position
        FROM stage_results
        WHERE stage_id = $1
      `, [stage.id]);
      
      // Get jersey wearers
      const jerseyWearersQuery = await client.query(`
        SELECT 
          sjw.rider_id,
          j.type as jersey_type
        FROM stage_jersey_wearers sjw
        JOIN jerseys j ON sjw.jersey_id = j.id
        WHERE sjw.stage_id = $1
      `, [stage.id]);
      
      // Add position points
      stageResultsQuery.rows.forEach(result => {
        const currentPoints = riderPointsMap.get(result.rider_id) || 0;
        const positionPoints = positionPointsMap.get(result.position) || 0;
        riderPointsMap.set(result.rider_id, currentPoints + positionPoints);
      });
      
      // Add jersey points
      jerseyWearersQuery.rows.forEach(wearer => {
        const currentPoints = riderPointsMap.get(wearer.rider_id) || 0;
        const jerseyPoints = jerseyPointsMap.get(wearer.jersey_type) || 0;
        riderPointsMap.set(wearer.rider_id, currentPoints + jerseyPoints);
      });
    }

    // Get rider details and sort by points
    const riderIds = Array.from(riderPointsMap.keys());
    
    if (riderIds.length === 0) {
      await client.end();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          riders: []
        })
      };
    }

    const ridersQuery = await client.query(`
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        tp.name as team_name
      FROM riders r
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE r.id = ANY($1::int[])
    `, [riderIds]);

    const riders = ridersQuery.rows.map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      team: row.team_name || 'Onbekend team',
      points: riderPointsMap.get(row.id) || 0
    }));

    // Sort by points descending and take top 10
    riders.sort((a, b) => b.points - a.points);
    const topRiders = riders.slice(0, 10);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        riders: topRiders
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

