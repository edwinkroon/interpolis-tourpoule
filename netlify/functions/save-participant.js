import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon gebruikt SSL
});

let connected = false;
async function ensureConnected() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
}

export async function handler(event) {
  console.log('save-participant CALLED, method =', event.httpMethod);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { teamName, email, avatarUrl, newsletter } = JSON.parse(event.body || '{}');

  if (!teamName || !email) {
    return { statusCode: 400, body: 'teamName en email zijn verplicht' };
  }

  try {
    await ensureConnected();

    const query = `
      INSERT INTO participants (team_name, email, avatar_url, newsletter)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const values = [teamName, email, avatarUrl || null, !!newsletter];

    const { rows } = await client.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: rows[0].id })
    };
  } catch (err) {
    console.error('Neon insert error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'DB error' })
    };
  }
}
