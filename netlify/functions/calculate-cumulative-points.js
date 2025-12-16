const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

/**
 * Calculates cumulative points and rankings for all participants after a specific stage
 * @param {Client} client - Database client
 * @param {number} stageId - The stage ID to calculate cumulative points for
 * @returns {Promise<Object>} Result with participants calculated
 */
async function calculateCumulativePoints(client, stageId) {
  // Get stage number
  const stageQuery = await client.query('SELECT stage_number FROM stages WHERE id = $1', [stageId]);
  if (stageQuery.rows.length === 0) {
    throw new Error(`Stage with id ${stageId} not found`);
  }
  const stageNumber = stageQuery.rows[0].stage_number;

  // Calculate cumulative points for each participant up to this stage
  // Include all participants, even if they don't have entries for all stages
  // Calculate total_points directly from components to avoid issues with dbgenerated column
  // Use a subquery to ensure we always get a value, even if there are no matches
  const cumulativeQuery = `
    SELECT 
      p.id as participant_id,
      COALESCE(
        (
          SELECT SUM(
            COALESCE(fsp2.points_stage, 0) + 
            COALESCE(fsp2.points_jerseys, 0) + 
            COALESCE(fsp2.points_bonus, 0)
          )
          FROM fantasy_stage_points fsp2
          WHERE fsp2.participant_id = p.id
            AND fsp2.stage_id IN (
              SELECT id FROM stages WHERE stage_number <= $1
            )
        ),
        0
      ) as total_points
    FROM participants p
    ORDER BY 
      COALESCE(
        (
          SELECT SUM(
            COALESCE(fsp2.points_stage, 0) + 
            COALESCE(fsp2.points_jerseys, 0) + 
            COALESCE(fsp2.points_bonus, 0)
          )
          FROM fantasy_stage_points fsp2
          WHERE fsp2.participant_id = p.id
            AND fsp2.stage_id IN (
              SELECT id FROM stages WHERE stage_number <= $1
            )
        ),
        0
      ) DESC, 
      p.team_name ASC
  `;

  const cumulativeResult = await client.query(cumulativeQuery, [stageNumber]);

  // Debug: Log the results to see what we're getting
  console.log(`Calculating cumulative points for stage ${stageNumber} (stageId: ${stageId})`);
  console.log(`Found ${cumulativeResult.rows.length} participants`);
  if (cumulativeResult.rows.length > 0) {
    console.log(`Sample participant: participant_id=${cumulativeResult.rows[0].participant_id}, total_points=${cumulativeResult.rows[0].total_points} (type: ${typeof cumulativeResult.rows[0].total_points})`);
  }

  // Assign ranks (handle ties - same points = same rank)
  let currentRank = 1;
  let previousPoints = null;
  const rankedParticipants = [];

  cumulativeResult.rows.forEach((row, index) => {
    // Ensure total_points is a number
    const totalPoints = parseInt(row.total_points, 10) || 0;
    
    if (previousPoints !== null && totalPoints < previousPoints) {
      // Points decreased, increment rank
      currentRank = index + 1;
    } else if (previousPoints !== null && totalPoints === previousPoints) {
      // Same points, keep same rank
      // currentRank stays the same
    } else {
      // First entry or points increased
      currentRank = index + 1;
    }

    rankedParticipants.push({
      participant_id: row.participant_id,
      total_points: totalPoints,
      rank: currentRank
    });

    previousPoints = totalPoints;
  });

  // Insert or update cumulative points
  for (const participant of rankedParticipants) {
    await client.query(
      `INSERT INTO fantasy_cumulative_points 
       (participant_id, after_stage_id, total_points, rank)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (participant_id, after_stage_id)
       DO UPDATE SET
         total_points = EXCLUDED.total_points,
         rank = EXCLUDED.rank`,
      [participant.participant_id, stageId, participant.total_points, participant.rank]
    );
  }

  return { participantsCalculated: rankedParticipants.length };
}

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
    const { stageId } = body;

    if (!stageId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'stageId is required' })
      };
    }

    client = await getDbClient();

    const result = await calculateCumulativePoints(client, stageId);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        ...result
      })
    };
  } catch (err) {
    return await handleDbError(err, 'calculate-cumulative-points', client);
  }
};

module.exports = { calculateCumulativePoints };

