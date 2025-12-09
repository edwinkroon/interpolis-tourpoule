const { Client } = require('pg');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Database configuration missing' 
        })
      };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Invalid JSON in request body' 
        })
      };
    }

    const userId = body.userId;
    const riderIds = body.riderIds; // Array of rider IDs

    if (!userId || !Array.isArray(riderIds) || riderIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId and riderIds (non-empty array) are required' 
        })
      };
    }

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Start transaction
    await client.query('BEGIN');

    try {
      // Get participant and fantasy team
      const participantQuery = `
        SELECT p.id as participant_id, ft.id as fantasy_team_id
        FROM participants p
        LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
        WHERE p.user_id = $1
      `;
      
      const participantResult = await client.query(participantQuery, [userId]);
      
      if (participantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ok: false, 
            error: 'Participant not found' 
          })
        };
      }

      const participantId = participantResult.rows[0].participant_id;
      let fantasyTeamId = participantResult.rows[0].fantasy_team_id;

      // Create fantasy team if it doesn't exist
      if (!fantasyTeamId) {
        const createTeamQuery = `
          INSERT INTO fantasy_teams (participant_id, created_at)
          VALUES ($1, NOW())
          RETURNING id
        `;
        const createResult = await client.query(createTeamQuery, [participantId]);
        fantasyTeamId = createResult.rows[0].id;
      }

      // Get existing riders in team to avoid duplicates
      const existingRidersQuery = `
        SELECT rider_id
        FROM fantasy_team_riders
        WHERE fantasy_team_id = $1
      `;
      const existingRidersResult = await client.query(existingRidersQuery, [fantasyTeamId]);
      const existingRiderIds = new Set(existingRidersResult.rows.map(row => row.rider_id));

      // Filter out riders that are already in the team
      const newRiderIds = riderIds.filter(id => !existingRiderIds.has(id));

      if (newRiderIds.length === 0) {
        await client.query('ROLLBACK');
        return {
          statusCode: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            ok: true, 
            message: 'All riders are already in the team',
            added: 0,
            skipped: riderIds.length
          })
        };
      }

      // Get current slots to find available positions
      const slotsQuery = `
        SELECT slot_type, slot_number
        FROM fantasy_team_riders
        WHERE fantasy_team_id = $1
        ORDER BY slot_type, slot_number
      `;
      const slotsResult = await client.query(slotsQuery, [fantasyTeamId]);

      // Build sets of used slots
      const usedMainSlots = new Set();
      const usedReserveSlots = new Set();
      
      slotsResult.rows.forEach(row => {
        if (row.slot_type === 'main') {
          usedMainSlots.add(row.slot_number);
        } else if (row.slot_type === 'reserve') {
          usedReserveSlots.add(row.slot_number);
        }
      });

      // Find available slots (main slots 1-10, reserve slots 1-5)
      const availableMainSlots = [];
      const availableReserveSlots = [];
      
      for (let i = 1; i <= 10; i++) {
        if (!usedMainSlots.has(i)) {
          availableMainSlots.push(i);
        }
      }
      
      for (let i = 1; i <= 5; i++) {
        if (!usedReserveSlots.has(i)) {
          availableReserveSlots.push(i);
        }
      }

      // Add riders to available slots (prefer main slots, then reserves)
      let addedCount = 0;
      let slotIndex = 0;

      for (const riderId of newRiderIds) {
        let slotType, slotNumber;

        if (slotIndex < availableMainSlots.length) {
          slotType = 'main';
          slotNumber = availableMainSlots[slotIndex];
        } else if (slotIndex - availableMainSlots.length < availableReserveSlots.length) {
          slotType = 'reserve';
          slotNumber = availableReserveSlots[slotIndex - availableMainSlots.length];
        } else {
          // No more slots available
          break;
        }

        // Insert rider
        const insertQuery = `
          INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (fantasy_team_id, rider_id) DO NOTHING
        `;
        
        await client.query(insertQuery, [fantasyTeamId, riderId, slotType, slotNumber]);
        addedCount++;
        slotIndex++;
      }

      // Commit transaction
      await client.query('COMMIT');
      
      // Close client connection
      await client.end();

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: true, 
          added: addedCount,
          skipped: riderIds.length - newRiderIds.length,
          total: riderIds.length
        })
      };
    } catch (err) {
      // Rollback transaction on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      throw err;
    }
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    console.error('Error in add-team-riders function:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code
      })
    };
  }
};

