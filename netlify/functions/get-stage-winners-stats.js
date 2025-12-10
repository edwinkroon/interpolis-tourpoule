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

    // Get stage winners (riders who finished first in each stage)
    const winnersQuery = await client.query(`
      SELECT 
        sr.stage_id,
        sr.rider_id,
        s.stage_number,
        s.name as stage_name,
        r.first_name,
        r.last_name,
        tp.name as team_name
      FROM stage_results sr
      INNER JOIN stages s ON sr.stage_id = s.id
      INNER JOIN riders r ON sr.rider_id = r.id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE sr.position = 1
      ORDER BY s.stage_number ASC
    `);

    // Group by team and count wins
    const teamWinsMap = new Map();
    
    winnersQuery.rows.forEach(winner => {
      const teamName = winner.team_name || 'Onbekend team';
      const currentWins = teamWinsMap.get(teamName) || 0;
      teamWinsMap.set(teamName, currentWins + 1);
    });

    // Convert to array and sort by wins
    const teamWins = Array.from(teamWinsMap.entries())
      .map(([team, wins]) => ({ team, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10); // Top 10 teams

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        teamWins: teamWins
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

