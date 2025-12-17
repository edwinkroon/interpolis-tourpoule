/**
 * Proxy function to fetch rider images from ProCyclingStats
 * This bypasses CORS restrictions by fetching the image server-side
 */

exports.handler = async function(event) {
  console.log('Proxy function called:', event.path, event.queryStringParameters);
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const imageUrl = event.queryStringParameters?.url;
  
  if (!imageUrl) {
    console.error('No url parameter provided');
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'url parameter is required' })
    };
  }

  console.log('Fetching image from:', imageUrl);

  try {
    // Fetch the image from ProCyclingStats
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.procyclingstats.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    console.log('Fetch response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: false, error: `Failed to fetch image: ${response.status} ${response.statusText}` })
      };
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log('Image fetched successfully, size:', imageBuffer.byteLength, 'bytes, type:', contentType);

    // Convert to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Return the image with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: base64Image,
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error proxying image:', error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: false, error: error.message, stack: error.stack })
    };
  }
};

