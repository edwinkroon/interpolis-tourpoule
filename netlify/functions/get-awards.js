const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    client = await getDbClient();

    const { limit, participant_id, stage_number } = event.queryStringParameters || {};

    let query = `
      SELECT 
        app.id,
        app.participant_id,
        app.stage_id,
        a.id as award_id,
        a.code,
        a.title,
        a.description,
        a.icon,
        s.stage_number,
        s.name as stage_name,
        s.start_location,
        s.end_location,
        s.date as stage_date
      FROM awards_per_participant app
      INNER JOIN awards a ON app.award_id = a.id
      LEFT JOIN stages s ON app.stage_id = s.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by participant_id if provided
    if (participant_id) {
      query += ` AND app.participant_id = $${paramIndex}`;
      params.push(parseInt(participant_id));
      paramIndex++;
    }

    // Filter by stage_number if provided
    if (stage_number !== undefined && stage_number !== null && stage_number !== '') {
      query += ` AND s.stage_number = $${paramIndex}`;
      params.push(parseInt(stage_number));
      paramIndex++;
    }

    // Order by stage date (newest first), then by award code
    query += ` ORDER BY s.date DESC NULLS LAST, app.id DESC`;

    // Apply limit if provided
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await client.query(query, params);

    const awards = result.rows.map((row) => ({
      id: row.id,
      participantId: row.participant_id,
      stageId: row.stage_id,
      award: {
        id: row.award_id,
        code: row.code,
        title: row.title,
        description: row.description,
        icon: row.icon,
      },
      stage: row.stage_id
        ? {
            id: row.stage_id,
            stageNumber: row.stage_number,
            name: row.stage_name,
            startLocation: row.start_location,
            endLocation: row.end_location,
            date: row.stage_date,
          }
        : null,
    }));

    await client.end();

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        awards,
      }),
    };
  } catch (error) {
    return await handleDbError(error, client);
  }
};
