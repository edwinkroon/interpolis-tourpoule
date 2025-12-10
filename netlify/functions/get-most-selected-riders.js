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

    // Get most selected riders (riders that appear in most fantasy teams)
    const query = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        tp.name as team_name,
        COUNT(DISTINCT ftr.fantasy_team_id) as selection_count,
        COUNT(DISTINCT CASE WHEN ftr.slot_type = 'main' THEN ftr.fantasy_team_id END) as main_selections,
        COUNT(DISTINCT CASE WHEN ftr.slot_type = 'reserve' THEN ftr.fantasy_team_id END) as reserve_selections
      FROM riders r
      INNER JOIN fantasy_team_riders ftr ON r.id = ftr.rider_id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE ftr.active = true
      GROUP BY r.id, r.first_name, r.last_name, tp.name
      ORDER BY selection_count DESC, main_selections DESC
      LIMIT 10
    `;
    
    const { rows } = await client.query(query);
    
    const riders = rows.map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      team: row.team_name || 'Onbekend team',
      selectionCount: parseInt(row.selection_count) || 0,
      mainSelections: parseInt(row.main_selections) || 0,
      reserveSelections: parseInt(row.reserve_selections) || 0
    }));

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        riders: riders
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

