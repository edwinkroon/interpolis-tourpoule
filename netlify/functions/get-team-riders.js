const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get user_id from query string
  const userId = event.queryStringParameters?.userId;
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'userId parameter is required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Get team riders for the participant
    // Show ALL riders (including inactive main riders who are DNS/DNF)
    // Determine DNS/DNF status by checking latest stage results
    const query = `
      SELECT 
        r.id,
        r.first_name,
        r.last_name,
        r.photo_url,
        tp.name as team_name,
        ftr.slot_type,
        ftr.slot_number,
        ftr.active,
        ftr.out_of_race,
        -- Check if rider is DNS/DNF in latest stage with results
        -- DNF: has result with time_seconds IS NULL
        -- DNS: no result in latest stage with results (but other riders have results)
        CASE 
          WHEN EXISTS (
            -- Check if rider has DNF result (time_seconds IS NULL) in latest stage where they have a result
            SELECT 1 
            FROM stage_results sr
            INNER JOIN stages s ON sr.stage_id = s.id
            WHERE sr.rider_id = r.id 
              AND sr.time_seconds IS NULL
              AND s.id = (
                SELECT MAX(s2.id) 
                FROM stages s2 
                INNER JOIN stage_results sr2 ON s2.id = sr2.stage_id 
                WHERE sr2.rider_id = r.id
              )
          ) THEN true
          WHEN EXISTS (
            -- Check if there's a latest stage with results, but this rider has no result (DNS)
            SELECT 1
            FROM stages s
            WHERE EXISTS (
              SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
            )
            AND s.id = (
              SELECT MAX(s2.id)
              FROM stages s2
              WHERE EXISTS (SELECT 1 FROM stage_results sr2 WHERE sr2.stage_id = s2.id)
            )
            AND NOT EXISTS (
              SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id AND sr.rider_id = r.id
            )
          ) THEN true
          ELSE false
        END as is_dnf
      FROM fantasy_team_riders ftr
      INNER JOIN fantasy_teams ft ON ftr.fantasy_team_id = ft.id
      INNER JOIN participants p ON ft.participant_id = p.id
      INNER JOIN riders r ON ftr.rider_id = r.id
      LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
      WHERE p.user_id = $1
      ORDER BY ftr.slot_type ASC, ftr.slot_number ASC
    `;
    
    const { rows } = await client.query(query, [userId]);

    const riders = rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      photo_url: row.photo_url,
      team_name: row.team_name,
      slot_type: row.slot_type,
      slot_number: row.slot_number,
      active: row.active,
      out_of_race: row.out_of_race || false,
      is_dnf: row.is_dnf || false
    }));

    // Get total rider count and check if all slots are filled (15 total: 10 main + 5 reserve)
    const totalRiders = riders.length;
    const maxRiders = 15;
    const allRidersSelected = totalRiders >= maxRiders;

    // Check jersey assignments (assuming jerseys need to be assigned to team riders)
    // For now, we'll check if there are any jersey assignments needed
    // This might need to be extended based on actual jersey assignment logic
    // For now, we assume jerseys are complete if we have all riders
    // This can be extended to actually check jersey assignments if that feature exists
    const allJerseysAssigned = allRidersSelected; // Simplified for now
    
    await client.end();

    // Determine team status
    // Status 1: No riders (0 riders)
    // Status 2: Has riders but incomplete (1-14 riders or jerseys not assigned)
    // Status 3: Complete (15 riders and all jerseys assigned)
    let teamStatus = 1; // Default to status 1
    if (totalRiders === 0) {
      teamStatus = 1;
    } else if (totalRiders > 0 && (totalRiders < maxRiders || !allJerseysAssigned)) {
      teamStatus = 2;
    } else if (totalRiders >= maxRiders && allJerseysAssigned) {
      teamStatus = 3;
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        riders: riders,
        status: {
          teamStatus: teamStatus,
          totalRiders: totalRiders,
          maxRiders: maxRiders,
          allRidersSelected: allRidersSelected,
          allJerseysAssigned: allJerseysAssigned
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};


