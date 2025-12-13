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

    // Get total riders count
    const totalRidersQuery = await client.query('SELECT COUNT(*) as count FROM riders');
    const totalRiders = parseInt(totalRidersQuery.rows[0].count) || 0;

    // Get active riders (riders that have results in any stage)
    const activeRidersQuery = await client.query(`
      SELECT COUNT(DISTINCT rider_id) as count
      FROM stage_results
    `);
    const activeRiders = parseInt(activeRidersQuery.rows[0].count) || 0;

    // Get total stages count
    const totalStagesQuery = await client.query('SELECT COUNT(*) as count FROM stages');
    const totalStages = parseInt(totalStagesQuery.rows[0].count) || 0;

    // Get stages with results count
    const stagesWithResultsQuery = await client.query(`
      SELECT COUNT(DISTINCT stage_id) as count
      FROM stage_results
    `);
    const stagesWithResults = parseInt(stagesWithResultsQuery.rows[0].count) || 0;

    // Get teams count (participants with fantasy teams)
    const teamsQuery = await client.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM participants p
      INNER JOIN fantasy_teams ft ON ft.participant_id = p.id
    `);
    const teamsCount = parseInt(teamsQuery.rows[0].count) || 0;

    // Get average points per team
    // First try to get from cumulative points (most accurate)
    const latestStageQuery = await client.query(`
      SELECT s.id, s.stage_number
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number DESC
      LIMIT 1
    `);

    let averagePoints = 0;
    if (latestStageQuery.rows.length > 0) {
      const latestStageId = latestStageQuery.rows[0].id;
      
      // Try to get from cumulative points first
      const cumulativeQuery = await client.query(`
        SELECT AVG(total_points) as avg_points
        FROM fantasy_cumulative_points
        WHERE after_stage_id = $1
      `, [latestStageId]);
      
      if (cumulativeQuery.rows.length > 0 && cumulativeQuery.rows[0].avg_points !== null) {
        averagePoints = parseFloat(cumulativeQuery.rows[0].avg_points) || 0;
      } else {
        // Fallback: calculate sum of all stage points per participant
        // Use COALESCE to handle NULL total_points and calculate from components if needed
        const stagePointsQuery = await client.query(`
          SELECT AVG(team_total) as avg_points
          FROM (
            SELECT 
              participant_id, 
              COALESCE(
                SUM(COALESCE(total_points, points_stage + points_jerseys + COALESCE(points_bonus, 0))),
                0
              ) as team_total
            FROM fantasy_stage_points
            GROUP BY participant_id
          ) as team_points
          WHERE team_total > 0
        `);
        
        if (stagePointsQuery.rows.length > 0 && stagePointsQuery.rows[0].avg_points !== null) {
          averagePoints = parseFloat(stagePointsQuery.rows[0].avg_points) || 0;
        }
      }
    } else {
      // No stages with results yet, but try to get points anyway
      const stagePointsQuery = await client.query(`
        SELECT AVG(team_total) as avg_points
        FROM (
          SELECT 
            participant_id, 
            COALESCE(
              SUM(COALESCE(total_points, points_stage + points_jerseys + COALESCE(points_bonus, 0))),
              0
            ) as team_total
          FROM fantasy_stage_points
          GROUP BY participant_id
        ) as team_points
        WHERE team_total > 0
      `);
      
      if (stagePointsQuery.rows.length > 0 && stagePointsQuery.rows[0].avg_points !== null) {
        averagePoints = parseFloat(stagePointsQuery.rows[0].avg_points) || 0;
      }
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ok: true,
        statistics: {
          totalRiders: totalRiders,
          activeRiders: activeRiders,
          totalStages: totalStages,
          stagesWithResults: stagesWithResults,
          teamsCount: teamsCount,
          averagePoints: Math.round(averagePoints * 100) / 100 // Round to 2 decimals
        }
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

