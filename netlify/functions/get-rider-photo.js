/**
 * Netlify function to get rider photo from ProCyclingStats or alternative source
 * 
 * Note: ProCyclingStats doesn't have an open API, so this function would need to:
 * 1. Scrape ProCyclingStats (check their terms of service first)
 * 2. Use an alternative API/service
 * 3. Or use a cached database of rider photos
 * 
 * For now, this is a placeholder that returns a structure ready for implementation
 */

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Get rider name from query string
  const riderName = event.queryStringParameters?.riderName;
  
  if (!riderName) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'riderName parameter is required' })
    };
  }

  try {
    // Try to fetch photo from Wikipedia API (free and open)
    const photoUrl = await fetchRiderPhoto(riderName);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ok: true,
        riderName: riderName,
        photoUrl: photoUrl
      })
    };
  } catch (err) {
    console.error('Error fetching rider photo:', err);
    return {
      statusCode: 200, // Return 200 even on error, with null photoUrl
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ok: true,
        riderName: riderName,
        photoUrl: null
      })
    };
  }
};

/**
 * Fetch rider photo from Wikipedia API
 * Falls back to null if not found (will use colored avatar)
 */
async function fetchRiderPhoto(riderName) {
  try {
    // Try Wikipedia API - it's free and open
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(riderName)}`;
    const response = await fetch(wikiUrl);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Wikipedia returns thumbnail URLs, we can request a larger size
    if (data.thumbnail && data.thumbnail.source) {
      // Convert thumbnail URL to larger size (Wikipedia thumbnails are small by default)
      // Replace /thumb/ with / and remove the size suffix to get original
      let photoUrl = data.thumbnail.source;
      // Wikipedia thumbnails format: /thumb/path/to/image/220px-Filename.jpg
      // We want a larger size, so replace 220px with 300px or get original
      photoUrl = photoUrl.replace(/\/\d+px-/, '/300px-');
      return photoUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    return null;
  }
}

