const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

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

    // Get participant and fantasy team
    const participantQuery = `
      SELECT p.id as participant_id, ft.id as fantasy_team_id
      FROM participants p
      LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
      WHERE p.user_id = $1
    `;
    const participantResult = await client.query(participantQuery, [userId]);
    
    if (participantResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Participant not found' 
        })
      };
    }

    const participantId = participantResult.rows[0].participant_id;
    const fantasyTeamId = participantResult.rows[0].fantasy_team_id;

    // Check if first stage exists and has results
    const firstStageQuery = `
      SELECT s.id, s.stage_number, s.name, s.date,
             (SELECT COUNT(*) FROM stage_results sr WHERE sr.stage_id = s.id) as result_count
      FROM stages s
      WHERE s.stage_number = 1
      ORDER BY s.id
      LIMIT 1
    `;
    const firstStageResult = await client.query(firstStageQuery);
    const firstStage = firstStageResult.rows[0] || null;
    const firstStageExists = firstStage !== null;
    const firstStageHasResults = firstStage && parseInt(firstStage.result_count, 10) > 0;
    const firstStageDate = firstStage ? firstStage.date : null;

    // Get rider counts
    let mainRidersCount = 0;
    let reserveRidersCount = 0;
    let totalRidersCount = 0;

    if (fantasyTeamId) {
      const ridersQuery = `
        SELECT slot_type, COUNT(*) as count
        FROM fantasy_team_riders
        WHERE fantasy_team_id = $1 
          AND (active = true OR slot_type = 'reserve')
        GROUP BY slot_type
      `;
      const ridersResult = await client.query(ridersQuery, [fantasyTeamId]);
      
      ridersResult.rows.forEach(row => {
        const count = parseInt(row.count, 10);
        if (row.slot_type === 'main') {
          mainRidersCount = count;
        } else if (row.slot_type === 'reserve') {
          reserveRidersCount = count;
        }
      });
      totalRidersCount = mainRidersCount + reserveRidersCount;
    }

    // Get jersey count
    let jerseysAssignedCount = 0;
    if (fantasyTeamId) {
      // Check if fantasy_team_jerseys table exists and get count
      try {
        const jerseysQuery = `
          SELECT COUNT(*) as count
          FROM fantasy_team_jerseys
          WHERE fantasy_team_id = $1 AND rider_id IS NOT NULL
        `;
        const jerseysResult = await client.query(jerseysQuery, [fantasyTeamId]);
        jerseysAssignedCount = parseInt(jerseysResult.rows[0]?.count || 0, 10);
      } catch (err) {
        // Table might not exist, that's okay
        jerseysAssignedCount = 0;
      }
    }

    // Determine if team is complete
    const requiredMainRiders = 10;
    const requiredReserveRiders = 5;
    const requiredJerseys = 4;
    
    const hasAllMainRiders = mainRidersCount >= requiredMainRiders;
    const hasAllReserveRiders = reserveRidersCount >= requiredReserveRiders;
    const hasAllJerseys = jerseysAssignedCount >= requiredJerseys;
    
    const isComplete = hasAllMainRiders && hasAllReserveRiders && hasAllJerseys;

    // Get registration deadline if set
    const deadlineQuery = `SELECT value FROM settings WHERE key = 'registration_deadline'`;
    const deadlineResult = await client.query(deadlineQuery);
    const registrationDeadline = deadlineResult.rows[0]?.value || null;

    await client.end();

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true,
        firstStageExists,
        firstStageHasResults,
        firstStageDate,
        registrationDeadline,
        teamStatus: {
          isComplete,
          mainRidersCount,
          reserveRidersCount,
          totalRidersCount,
          jerseysAssignedCount,
          requiredMainRiders,
          requiredReserveRiders,
          requiredJerseys,
          hasAllMainRiders,
          hasAllReserveRiders,
          hasAllJerseys
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};
