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

    async function buildStandingsUpToStageNumber(stageNumber) {
      // Only include stages that actually have results
      const stagesRes = await client.query(
        `
          SELECT s.id
          FROM stages s
          WHERE s.stage_number <= $1
            AND EXISTS (SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id)
        `,
        [stageNumber]
      );

      const stageIds = stagesRes.rows.map((r) => r.id);
      if (stageIds.length === 0) return [];

      // Scoring rules (same logic as get-my-points-riders)
      const scoringRules = await client.query(
        `SELECT rule_type, condition_json, points
         FROM scoring_rules
         WHERE rule_type IN ('stage_position', 'jersey')`
      );

      const positionPointsMap = new Map();
      const jerseyPointsMap = new Map();

      scoringRules.rows.forEach((rule) => {
        const condition = rule.condition_json;
        if (rule.rule_type === 'stage_position' && condition && condition.position) {
          positionPointsMap.set(condition.position, rule.points);
        }
        if (rule.rule_type === 'jersey' && condition && condition.jersey_type) {
          jerseyPointsMap.set(condition.jersey_type, rule.points);
        }
      });

      // Aggregate rider points across all included stages
      const riderPointsAgg = new Map(); // rider_id -> points

      const stageResultsRes = await client.query(
        `SELECT rider_id, position
         FROM stage_results
         WHERE stage_id = ANY($1::int[])`,
        [stageIds]
      );
      stageResultsRes.rows.forEach((row) => {
        const points = positionPointsMap.get(row.position) || 0;
        if (!points) return;
        riderPointsAgg.set(row.rider_id, (riderPointsAgg.get(row.rider_id) || 0) + points);
      });

      const jerseyWearersRes = await client.query(
        `SELECT sjw.rider_id, j.type as jersey_type
         FROM stage_jersey_wearers sjw
         JOIN jerseys j ON sjw.jersey_id = j.id
         WHERE sjw.stage_id = ANY($1::int[])`,
        [stageIds]
      );
      jerseyWearersRes.rows.forEach((row) => {
        const points = jerseyPointsMap.get(row.jersey_type) || 0;
        if (!points) return;
        riderPointsAgg.set(row.rider_id, (riderPointsAgg.get(row.rider_id) || 0) + points);
      });

      // Get all participants + their active team riders
      const teamRidersRes = await client.query(
        `
          SELECT
            p.id as participant_id,
            p.team_name,
            p.avatar_url,
            ftr.rider_id
          FROM participants p
          LEFT JOIN fantasy_teams ft ON ft.participant_id = p.id
          LEFT JOIN fantasy_team_riders ftr ON ftr.fantasy_team_id = ft.id AND ftr.active = true
        `
      );

      const participantMap = new Map(); // participant_id -> { teamName, avatarUrl, riderIds: [] }
      teamRidersRes.rows.forEach((row) => {
        if (!participantMap.has(row.participant_id)) {
          participantMap.set(row.participant_id, { teamName: row.team_name, avatarUrl: row.avatar_url || null, riderIds: [] });
        }
        if (row.rider_id) participantMap.get(row.participant_id).riderIds.push(row.rider_id);
      });

      const standings = Array.from(participantMap.entries()).map(([participantId, data]) => {
        const totalPoints = (data.riderIds || []).reduce((sum, riderId) => sum + (riderPointsAgg.get(riderId) || 0), 0);
        return {
          participantId,
          teamName: data.teamName,
          avatarUrl: data.avatarUrl,
          totalPoints,
        };
      });

      // Rank: points DESC, then team name ASC
      standings.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return String(a.teamName || '').localeCompare(String(b.teamName || ''), 'nl-NL');
      });

      // Assign rank (ties share rank)
      let rank = 1;
      let prevPoints = null;
      return standings.map((row, index) => {
        if (prevPoints !== null && row.totalPoints < prevPoints) rank = index + 1;
        prevPoints = row.totalPoints;
        return { ...row, rank };
      });
    }

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

    // Build standings from the same sources as "Mijn punten"
    const currentStandings = await buildStandingsUpToStageNumber(latestStageNumber);

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
      const previousStageNumber = previousStageResult.rows[0].stage_number;
      const previousStandings = await buildStandingsUpToStageNumber(previousStageNumber);
      previousStandings.forEach((row) => {
        previousRankMap.set(row.participantId, row.rank);
      });
    }

    // Build standings with position change
    const standings = currentStandings.map((row) => {
      const points = row.totalPoints || 0;
      const finalRank = row.rank;
      const previousRank = previousRankMap.get(row.participantId);
      
      let positionChange = null;
      if (previousRank !== undefined && previousRank !== null) {
        positionChange = previousRank - finalRank; // Positive = moved up, negative = moved down
      }

      return {
        participantId: row.participantId,
        id: row.participantId, // Also include as 'id' for compatibility
        teamName: row.teamName,
        avatar_url: row.avatarUrl || null,
        avatarUrl: row.avatarUrl || null, // Also include as 'avatarUrl' for compatibility
        totalPoints: points,
        rank: finalRank,
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

