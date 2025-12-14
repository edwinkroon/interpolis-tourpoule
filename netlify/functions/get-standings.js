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

    // Get the latest stage with results
    const latestStageQuery = `
      SELECT s.id, s.stage_number
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      ORDER BY s.stage_number DESC
      LIMIT 1
    `;
    
    const latestStageResult = await client.query(latestStageQuery);
    
    if (latestStageResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          standings: [],
          message: 'No stages with results yet'
        })
      };
    }

    const latestStageId = latestStageResult.rows[0].id;
    const latestStageNumber = latestStageResult.rows[0].stage_number;

    // Check if cumulative points exist, otherwise calculate from stage points
    const cumulativePointsCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM fantasy_cumulative_points
      WHERE after_stage_id = $1
    `, [latestStageId]);

    let currentStandings;
    
    if (cumulativePointsCheck.rows[0].count > 0) {
      // Use cumulative points if available
      const currentStandingsQuery = `
        SELECT 
          p.id as participant_id,
          p.team_name,
          fcp.total_points,
          fcp.rank,
          fcp.after_stage_id
        FROM fantasy_cumulative_points fcp
        JOIN participants p ON p.id = fcp.participant_id
        WHERE fcp.after_stage_id = $1
        ORDER BY fcp.rank ASC NULLS LAST, fcp.total_points DESC, p.team_name ASC
      `;
      currentStandings = await client.query(currentStandingsQuery, [latestStageId]);
    } else {
      // Calculate from stage points if cumulative points don't exist
      const stagePointsQuery = `
        SELECT 
          p.id as participant_id,
          p.team_name,
          COALESCE(SUM(fsp.total_points), 0) as total_points
        FROM participants p
        LEFT JOIN fantasy_stage_points fsp ON fsp.participant_id = p.id
        WHERE fsp.stage_id IN (
          SELECT id FROM stages WHERE stage_number <= $1
        )
        GROUP BY p.id, p.team_name
        ORDER BY total_points DESC, p.team_name ASC
      `;
      const stagePointsResult = await client.query(stagePointsQuery, [latestStageNumber]);
      
      // Add rank to results
      currentStandings = {
        rows: stagePointsResult.rows.map((row, index) => ({
          ...row,
          rank: index + 1,
          after_stage_id: latestStageId
        }))
      };
    }

    // Get previous standings (second-to-last stage with results)
    const previousStageQuery = `
      SELECT s.id, s.stage_number
      FROM stages s
      WHERE EXISTS (
        SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
      )
      AND s.stage_number < $1
      ORDER BY s.stage_number DESC
      LIMIT 1
    `;

    const previousStageResult = await client.query(previousStageQuery, [latestStageNumber]);
    
    let previousRankMap = new Map();
    
    if (previousStageResult.rows.length > 0) {
      const previousStageId = previousStageResult.rows[0].id;
      const previousStageNumber = previousStageResult.rows[0].stage_number;
      
      // Check if cumulative points exist for previous stage
      const previousCumulativeCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM fantasy_cumulative_points
        WHERE after_stage_id = $1
      `, [previousStageId]);
      
      if (previousCumulativeCheck.rows[0].count > 0) {
        // Use cumulative points if available
        const previousStandingsQuery = `
          SELECT 
            participant_id,
            rank
          FROM fantasy_cumulative_points
          WHERE after_stage_id = $1
        `;
        
        const previousStandings = await client.query(previousStandingsQuery, [previousStageId]);
        
        previousStandings.rows.forEach(row => {
          previousRankMap.set(row.participant_id, row.rank);
        });
      } else {
        // Calculate previous rankings from stage points if cumulative doesn't exist
        const previousStagePointsQuery = `
          SELECT 
            p.id as participant_id,
            COALESCE(SUM(fsp.total_points), 0) as total_points
          FROM participants p
          LEFT JOIN fantasy_stage_points fsp ON fsp.participant_id = p.id
          WHERE fsp.stage_id IN (
            SELECT id FROM stages WHERE stage_number <= $1
          )
          GROUP BY p.id
          ORDER BY total_points DESC, p.team_name ASC
        `;
        
        const previousStagePointsResult = await client.query(previousStagePointsQuery, [previousStageNumber]);
        
        // Assign ranks (handle ties)
        let previousRank = 1;
        let previousPoints = null;
        previousStagePointsResult.rows.forEach((row, index) => {
          if (previousPoints !== null && row.total_points < previousPoints) {
            previousRank = index + 1;
          } else if (previousPoints === null || row.total_points > previousPoints) {
            previousRank = index + 1;
          }
          previousRankMap.set(row.participant_id, previousRank);
          previousPoints = row.total_points;
        });
      }
    }

    // Build standings with position change
    const standings = currentStandings.rows.map((row, index) => {
      const currentRank = row.rank || (index + 1);
      const previousRank = previousRankMap.get(row.participant_id);
      
      let positionChange = null;
      if (previousRank !== undefined && previousRank !== null) {
        positionChange = previousRank - currentRank; // Positive = moved up, negative = moved down
      }

      return {
        participantId: row.participant_id,
        teamName: row.team_name,
        totalPoints: row.total_points || 0,
        rank: currentRank,
        positionChange: positionChange
      };
    });

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        standings: standings,
        latestStageNumber: latestStageNumber
      })
    };
  } catch (err) {
    return await handleDbError(err, 'get-standings', client);
  }
};

