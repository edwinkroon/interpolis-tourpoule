const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'User ID required' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Check if user is admin
    const adminCheck = await client.query(
      'SELECT is_admin FROM participants WHERE user_id = $1',
      [userId]
    );

    if (!adminCheck.rows.length || !adminCheck.rows[0].is_admin) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Admin access required' })
      };
    }

    // Check if first stage has results
    const firstStageCheck = await client.query(
      `SELECT COUNT(*) as count
       FROM stage_results sr
       JOIN stages s ON sr.stage_id = s.id
       WHERE s.stage_number = 1`
    );
    
    const hasFirstStageResults = parseInt(firstStageCheck.rows[0]?.count || 0, 10) > 0;
    
    if (hasFirstStageResults) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'De eerste etappe heeft al resultaten. Dummy teams kunnen niet meer worden aangemaakt.' 
        })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { teamCount } = body;

    if (!teamCount || teamCount < 1 || teamCount > 50) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'teamCount must be between 1 and 50' 
        })
      };
    }

    await client.query('BEGIN');

    try {
      // Get all available riders
      const ridersResult = await client.query(`
        SELECT r.id, r.team_pro_id, r.nationality
        FROM riders r
        WHERE r.id IS NOT NULL
        ORDER BY RANDOM()
      `);

      if (ridersResult.rows.length < 15 * teamCount) {
        await client.query('ROLLBACK');
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ok: false, 
            error: `Niet genoeg renners beschikbaar. Minimaal ${15 * teamCount} renners nodig, maar er zijn er maar ${ridersResult.rows.length}.` 
          })
        };
      }

      // Get all jerseys
      const jerseysResult = await client.query('SELECT id, type FROM jerseys ORDER BY id');
      const jerseys = jerseysResult.rows;

      // Group riders by team_pro_id for more realistic distribution
      const ridersByTeam = new Map();
      ridersResult.rows.forEach(rider => {
        const teamId = rider.team_pro_id || 'no_team';
        if (!ridersByTeam.has(teamId)) {
          ridersByTeam.set(teamId, []);
        }
        ridersByTeam.get(teamId).push(rider);
      });

      const createdTeams = [];
      let riderIndex = 0;

      for (let i = 1; i <= teamCount; i++) {
        // Create participant
        const participantResult = await client.query(
          `INSERT INTO participants (user_id, team_name, email, newsletter, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id) DO UPDATE SET team_name = EXCLUDED.team_name
           RETURNING id`,
          [
            `dummy-user-${i}`,
            `Dummy Team ${i}`,
            `dummy${i}@example.com`,
            false
          ]
        );

        const participantId = participantResult.rows[0].id;

        // Create fantasy team
        const fantasyTeamResult = await client.query(
          `INSERT INTO fantasy_teams (participant_id, created_at)
           VALUES ($1, NOW())
           ON CONFLICT (participant_id) DO UPDATE SET participant_id = EXCLUDED.participant_id
           RETURNING id`,
          [participantId]
        );

        const fantasyTeamId = fantasyTeamResult.rows[0].id;

        // Select 15 riders for this team with some logic
        // Strategy: Mix riders from different teams_pro, avoid too many duplicates
        const selectedRiders = [];
        const usedRiderIds = new Set();
        const teamDistribution = new Map(); // Track how many riders per team_pro

        // First, try to get a diverse set of riders
        const teamKeys = Array.from(ridersByTeam.keys());
        let attempts = 0;
        const maxAttempts = ridersResult.rows.length * 2;

        while (selectedRiders.length < 15 && attempts < maxAttempts) {
          // Alternate between different strategies
          let rider;
          
          if (selectedRiders.length < 10) {
            // For main riders: prefer diversity
            const strategy = selectedRiders.length % 3;
            if (strategy === 0 && teamKeys.length > 0) {
              // Pick from a different team_pro
              const teamKey = teamKeys[selectedRiders.length % teamKeys.length];
              const teamRiders = ridersByTeam.get(teamKey);
              if (teamRiders && teamRiders.length > 0) {
                const teamRiderIndex = Math.floor(selectedRiders.length / teamKeys.length) % teamRiders.length;
                rider = teamRiders[teamRiderIndex];
              }
            }
            
            if (!rider) {
              // Fallback: pick from all riders
              rider = ridersResult.rows[riderIndex % ridersResult.rows.length];
            }
          } else {
            // For reserves: more random but still avoid duplicates
            rider = ridersResult.rows[(riderIndex + selectedRiders.length * 7) % ridersResult.rows.length];
          }

          if (rider && !usedRiderIds.has(rider.id)) {
            selectedRiders.push(rider);
            usedRiderIds.add(rider.id);
            
            const teamId = rider.team_pro_id || 'no_team';
            teamDistribution.set(teamId, (teamDistribution.get(teamId) || 0) + 1);
          }

          riderIndex++;
          attempts++;
        }

        // Ensure we have exactly 15 riders
        if (selectedRiders.length < 15) {
          // Fill remaining slots with any available riders
          for (const rider of ridersResult.rows) {
            if (selectedRiders.length >= 15) break;
            if (!usedRiderIds.has(rider.id)) {
              selectedRiders.push(rider);
              usedRiderIds.add(rider.id);
            }
          }
        }

        // If we still don't have 15 riders, throw an error
        if (selectedRiders.length < 15) {
          throw new Error(`Niet genoeg unieke renners beschikbaar voor team ${i}. Vereist: 15, beschikbaar: ${selectedRiders.length}`);
        }

        // Ensure we have exactly 15 riders (trim if needed, though this shouldn't happen)
        const finalRiders = selectedRiders.slice(0, 15);

        // Add exactly 10 main riders
        for (let slotNum = 1; slotNum <= 10; slotNum++) {
          const rider = finalRiders[slotNum - 1];
          await client.query(
            `INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
             VALUES ($1, $2, 'main', $3, true)
             ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
               slot_type = EXCLUDED.slot_type,
               slot_number = EXCLUDED.slot_number,
               active = true`,
            [fantasyTeamId, rider.id, slotNum]
          );
        }

        // Add exactly 5 reserve riders
        for (let slotNum = 1; slotNum <= 5; slotNum++) {
          const rider = finalRiders[10 + slotNum - 1];
          await client.query(
            `INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
             VALUES ($1, $2, 'reserve', $3, true)
             ON CONFLICT (fantasy_team_id, rider_id) DO UPDATE SET
               slot_type = EXCLUDED.slot_type,
               slot_number = EXCLUDED.slot_number,
               active = true`,
            [fantasyTeamId, rider.id, slotNum]
          );
        }

        // Assign jerseys to some riders (2-4 jerseys per team, assigned to main riders)
        // Ensure fantasy_team_jerseys table exists
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS fantasy_team_jerseys (
              id SERIAL PRIMARY KEY,
              fantasy_team_id INTEGER NOT NULL,
              jersey_id INTEGER NOT NULL,
              rider_id INTEGER,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
              FOREIGN KEY (jersey_id) REFERENCES jerseys(id) ON DELETE CASCADE,
              FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE SET NULL,
              UNIQUE(fantasy_team_id, jersey_id)
            )
          `);
        } catch (err) {
          // Table might already exist, that's ok
          if (err.code !== '42P07') throw err;
        }

        // Assign all 4 jerseys to riders (can be main or reserve)
        // Shuffle the jerseys and assign them to different riders from the 15 selected
        const shuffledJerseys = [...jerseys].sort(() => Math.random() - 0.5);
        
        // Ensure we assign all jerseys to different riders
        const usedRiderIndicesForJerseys = new Set();
        
        for (let j = 0; j < jerseys.length; j++) {
          const jersey = shuffledJerseys[j];
          
          // Find a rider index that hasn't been used for jerseys yet
          let riderIndex;
          let attempts = 0;
          do {
            riderIndex = (i * 4 + j * 3 + attempts) % finalRiders.length;
            attempts++;
          } while (usedRiderIndicesForJerseys.has(riderIndex) && attempts < 15);
          
          // If all riders are used, just use the calculated index
          const assignedRider = finalRiders[riderIndex];
          usedRiderIndicesForJerseys.add(riderIndex);
          
          await client.query(
            `INSERT INTO fantasy_team_jerseys (fantasy_team_id, jersey_id, rider_id, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (fantasy_team_id, jersey_id) 
             DO UPDATE SET rider_id = EXCLUDED.rider_id, updated_at = NOW()`,
            [fantasyTeamId, jersey.id, assignedRider.id]
          );
        }

        createdTeams.push({
          participantId,
          fantasyTeamId,
          teamName: `Dummy Team ${i}`,
          mainRidersCount: 10,
          reserveRidersCount: 5,
          jerseysCount: jerseys.length
        });
      }

      await client.query('COMMIT');
      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          message: `${teamCount} dummy team(s) succesvol aangemaakt`,
          teams: createdTeams
        })
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    return handleDbError(error, client);
  }
};
