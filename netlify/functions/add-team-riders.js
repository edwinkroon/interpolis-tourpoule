const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

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
      return missingDbConfigResponse();
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
    const slotType = body.slotType; // Optional: 'main' or 'reserve'

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

    client = await getDbClient();

    // Check if deadline has passed or first stage has results
    const deadlineCheck = await client.query(
      `SELECT value FROM settings WHERE key = 'registration_deadline'`
    );
    
    const firstStageCheck = await client.query(
      `SELECT COUNT(*) as count
       FROM stage_results sr
       JOIN stages s ON sr.stage_id = s.id
       WHERE s.stage_number = 1`
    );
    
    const hasFirstStageResults = parseInt(firstStageCheck.rows[0]?.count || 0, 10) > 0;
    
    // Check deadline if set
    if (deadlineCheck.rows.length > 0 && deadlineCheck.rows[0].value) {
      const deadline = new Date(deadlineCheck.rows[0].value);
      const now = new Date();
      
      if (now > deadline) {
        await client.end();
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ok: false, 
            error: 'De aanmeldingsdeadline is verstreken. Je team kan niet meer worden gewijzigd.' 
          })
        };
      }
    }
    
    // Check if first stage has results
    if (hasFirstStageResults) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'De eerste etappe heeft al resultaten. Je team kan niet meer worden gewijzigd.' 
        })
      };
    }

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
        await client.end();
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ok: false, 
            error: 'Participant not found',
            userId: userId
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

      // Add riders to available slots
      let addedCount = 0;
      let slotIndex = 0;

      // If slotType is specified, use only that type
      const targetSlotType = slotType || null;
      const useReserveSlots = targetSlotType === 'reserve';
      const useMainSlots = targetSlotType === 'main' || !targetSlotType;

      for (const riderId of newRiderIds) {
        let finalSlotType, slotNumber;
        let active = true;

        if (useReserveSlots) {
          // Adding as reserve: use reserve slots and set active = false
          if (slotIndex < availableReserveSlots.length) {
            finalSlotType = 'reserve';
            slotNumber = availableReserveSlots[slotIndex];
            active = false; // Reserves are inactive by default
          } else {
            // No more reserve slots available
            break;
          }
        } else if (useMainSlots) {
          // Adding as main: prefer main slots, then reserves if main is full
          if (slotIndex < availableMainSlots.length) {
            finalSlotType = 'main';
            slotNumber = availableMainSlots[slotIndex];
          } else if (slotIndex - availableMainSlots.length < availableReserveSlots.length) {
            finalSlotType = 'reserve';
            slotNumber = availableReserveSlots[slotIndex - availableMainSlots.length];
            active = false; // Reserves are inactive by default
          } else {
            // No more slots available
            break;
          }
        } else {
          // No more slots available
          break;
        }

        // Insert rider
        const insertQuery = `
          INSERT INTO fantasy_team_riders (fantasy_team_id, rider_id, slot_type, slot_number, active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (fantasy_team_id, rider_id) DO NOTHING
          RETURNING id
        `;
        
        const insertResult = await client.query(insertQuery, [fantasyTeamId, riderId, finalSlotType, slotNumber, active]);
        
        if (insertResult.rows.length > 0) {
          addedCount++;
        }
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

    return await handleDbError(err, client);
  }
};

