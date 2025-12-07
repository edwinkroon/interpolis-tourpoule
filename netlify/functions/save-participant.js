export async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    const { teamName, email, avatarUrl, newsletter } = JSON.parse(event.body || '{}');
  
    // TODO: hier straks echt opslaan in Netlify DB of Fauna
    console.log('New participant:', { teamName, email, avatarUrl, newsletter });
  
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  }
  