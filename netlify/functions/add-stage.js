const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const { calculateCumulativePoints } = require('./calculate-cumulative-points');

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

    const body = JSON.parse(event.body || '{}');
    const { userId, stageNumber, name, startLocation, endLocation, distanceKm, date, type } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId is required' 
        })
      };
    }

    // Check if user is admin
    client = await getDbClient();
    const adminCheck = await client.query(
      'SELECT is_admin FROM participants WHERE user_id = $1',
      [userId]
    );

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      await client.end();
      return {
        statusCode: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Admin access required' 
        })
      };
    }

    // Validate required fields
    if (!stageNumber || !name || !date) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'stageNumber, name, and date are required' 
        })
      };
    }

    // Check if stage_number already exists
    const existingStage = await client.query(
      'SELECT id FROM stages WHERE stage_number = $1',
      [stageNumber]
    );

    if (existingStage.rows.length > 0) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: `Etappe ${stageNumber} bestaat al` 
        })
      };
    }

    // Insert new stage
    const insertQuery = `
      INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, stage_number, name, start_location, end_location, distance_km, date, type, is_neutralized, is_cancelled
    `;

    const distanceValue = distanceKm && distanceKm.trim() !== '' ? parseFloat(distanceKm) : null;
    const typeValue = type && type.trim() !== '' ? type.trim() : null;
    
    const result = await client.query(insertQuery, [
      parseInt(stageNumber),
      name.trim(),
      startLocation && startLocation.trim() !== '' ? startLocation.trim() : null,
      endLocation && endLocation.trim() !== '' ? endLocation.trim() : null,
      distanceValue,
      date.trim(),
      typeValue
    ]);

    const newStage = result.rows[0];
    const stageId = newStage.id;

    // Create initial fantasy_stage_points entries with 0 points for all participants
    // This ensures that all participants have an entry even before results are imported
    const allParticipants = await client.query('SELECT id FROM participants');
    for (const participant of allParticipants.rows) {
      await client.query(
        `INSERT INTO fantasy_stage_points 
         (stage_id, participant_id, points_stage, points_jerseys, points_bonus)
         VALUES ($1, $2, 0, 0, 0)
         ON CONFLICT (stage_id, participant_id) DO NOTHING`,
        [stageId, participant.id]
      );
    }

    // Calculate cumulative points for all participants after this stage
    // This ensures the cumulative points table is up to date
    try {
      await calculateCumulativePoints(client, stageId);
    } catch (cumulativeErr) {
      console.error('Error calculating cumulative points:', cumulativeErr);
      // Don't fail the stage creation if cumulative points calculation fails
      // The stage and stage points are already created successfully
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
        stage: {
          id: newStage.id,
          stage_number: newStage.stage_number,
          name: newStage.name,
          start_location: newStage.start_location,
          end_location: newStage.end_location,
          distance_km: newStage.distance_km ? parseFloat(newStage.distance_km) : null,
          date: newStage.date,
          type: newStage.type || null,
          is_neutralized: newStage.is_neutralized || false,
          is_cancelled: newStage.is_cancelled || false
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, 'add-stage', client);
  }
};


