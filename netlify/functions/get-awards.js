const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  const limitParam = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit, 10)
    : null;
  const stageNumberParam = event.queryStringParameters?.stage_number
    ? parseInt(event.queryStringParameters.stage_number, 10)
    : null;
  const participantIdParam = event.queryStringParameters?.participant_id
    ? parseInt(event.queryStringParameters.participant_id, 10)
    : null;

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    // Resolve stage_id when stage_number is provided
    let stageFilter = null;
    if (stageNumberParam && !Number.isNaN(stageNumberParam)) {
      const stageRes = await client.query(
        'SELECT id, stage_number, name FROM stages WHERE stage_number = $1 LIMIT 1',
        [stageNumberParam]
      );
      stageFilter = stageRes.rows[0] || null;
    }

    const params = [];
    const whereConditions = [];
    
    if (stageFilter?.id) {
      whereConditions.push(`a.stage_id = $${params.length + 1}`);
      params.push(stageFilter.id);
    }
    
    if (participantIdParam && !Number.isNaN(participantIdParam)) {
      whereConditions.push(`ap.participant_id = $${params.length + 1}`);
      params.push(participantIdParam);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Default: latest 3 awards across all stages
    const applyLimit = !stageFilter && limitParam && !Number.isNaN(limitParam);
    let limitClause = applyLimit ? `LIMIT $${params.length + 1}` : '';
    if (applyLimit) {
      params.push(Math.max(1, limitParam));
    } else if (!stageFilter) {
      // hard default to 3 when no stage filter and no explicit limit
      params.push(3);
      whereClause = whereClause || '';
      // use positional index for limit
      const positional = params.length;
      whereClause = whereClause; // no-op, clarity
      limitClause = `LIMIT $${positional}`;
    }

    const query = `
      SELECT
        ap.id AS award_assignment_id,
        a.id AS award_id,
        a.code,
        a.title,
        a.description,
        a.icon,
        a.stage_id,
        s.stage_number,
        s.name AS stage_name,
        p.id AS participant_id,
        p.team_name,
        p.avatar_url
      FROM awards_per_participant ap
      INNER JOIN awards a ON a.id = ap.award_id
      LEFT JOIN stages s ON s.id = a.stage_id
      INNER JOIN participants p ON p.id = ap.participant_id
      ${whereClause}
      ORDER BY ap.id DESC
      ${limitClause}
    `;

    const result = await client.query(query, params);

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        awards: result.rows.map((row) => ({
          awardAssignmentId: row.award_assignment_id,
          awardId: row.award_id,
          awardCode: row.code,
          awardTitle: row.title,
          awardDescription: row.description,
          icon: row.icon,
          stageId: row.stage_id,
          stageNumber: row.stage_number,
          stageName: row.stage_name,
          participantId: row.participant_id,
          teamName: row.team_name,
          avatarUrl: row.avatar_url
        }))
      })
    };
  } catch (error) {
    return handleDbError(error, client);
  }
};
