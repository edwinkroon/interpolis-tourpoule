const { Client } = require('pg');

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
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Database configuration missing'
        })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'Invalid JSON in request body'
        })
      };
    }

    const stageId = body.stageId;
    const resultsText = body.resultsText;

    if (!stageId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'stageId is required'
        })
      };
    }

    if (!resultsText || typeof resultsText !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: 'resultsText is required and must be a string'
        })
      };
    }

    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Verify stage exists
    const stageCheck = await client.query('SELECT id, stage_number, name FROM stages WHERE id = $1', [stageId]);
    if (stageCheck.rows.length === 0) {
      await client.end();
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: `Stage with id ${stageId} does not exist`
        })
      };
    }

    // Parse the results text
    const lines = resultsText.trim().split('\n').filter(line => line.trim().length > 0);
    const parsedResults = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Skip empty lines
      if (!line) continue;

      // Parse CSV-like format: position, first_name, last_name, [rider_id], time_seconds
      const parts = line.split(',').map(part => part.trim());
      
      if (parts.length < 3) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Onvoldoende kolommen (minimaal positie, voornaam, achternaam vereist)'
        });
        continue;
      }

      const position = parseInt(parts[0], 10);
      const firstName = parts[1];
      const lastName = parts[2];
      const riderIdProvided = parts.length >= 4 && parts[3] !== '' ? parseInt(parts[3], 10) : null;
      const timeSeconds = parts.length >= 5 && parts[4] !== '' ? parseInt(parts[4], 10) : null;

      if (isNaN(position) || position < 1) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Ongeldige positie (moet een positief getal zijn)'
        });
        continue;
      }

      if (!firstName || !lastName) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Voornaam en achternaam zijn verplicht'
        });
        continue;
      }

      if (riderIdProvided !== null && isNaN(riderIdProvided)) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Ongeldig rider_id formaat'
        });
        continue;
      }

      if (timeSeconds !== null && isNaN(timeSeconds)) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Ongeldig tijd formaat (moet seconden zijn)'
        });
        continue;
      }

      parsedResults.push({
        position,
        firstName,
        lastName,
        riderIdProvided,
        timeSeconds
      });
    }

    // Check for duplicate positions
    const positions = parsedResults.map(r => r.position);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    if (duplicatePositions.length > 0) {
      const uniqueDuplicates = [...new Set(duplicatePositions)];
      uniqueDuplicates.forEach(pos => {
        const linesWithPos = parsedResults
          .map((r, idx) => ({ ...r, lineNumber: idx + 1 }))
          .filter(r => r.position === pos);
        errors.push({
          line: linesWithPos.map(r => r.lineNumber).join(', '),
          content: `Positie ${pos}`,
          error: `Positie ${pos} komt meerdere keren voor`
        });
      });
    }

    // Try to match riders with database
    const validatedResults = [];
    for (const result of parsedResults) {
      let riderId = null;
      
      // First try rider_id if provided
      if (result.riderIdProvided !== null) {
        const riderCheck = await client.query('SELECT id, first_name, last_name FROM riders WHERE id = $1', [result.riderIdProvided]);
        if (riderCheck.rows.length > 0) {
          riderId = result.riderIdProvided;
        } else {
          errors.push({
            line: parsedResults.indexOf(result) + 1,
            content: `${result.position}, ${result.firstName}, ${result.lastName}`,
            error: `Rider met id ${result.riderIdProvided} niet gevonden in database`
          });
          continue;
        }
      } else {
        // Try to match by name
        const nameQuery = `
          SELECT id, first_name, last_name 
          FROM riders 
          WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
            AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
          LIMIT 1
        `;
        const nameMatch = await client.query(nameQuery, [result.firstName, result.lastName]);
        
        if (nameMatch.rows.length === 0) {
          errors.push({
            line: parsedResults.indexOf(result) + 1,
            content: `${result.position}, ${result.firstName}, ${result.lastName}`,
            error: `Renner "${result.firstName} ${result.lastName}" niet gevonden in database`
          });
          continue;
        }
        
        riderId = nameMatch.rows[0].id;
      }

      validatedResults.push({
        ...result,
        riderId
      });
    }

    await client.end();

    // Return validation result
    if (errors.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: false,
          valid: false,
          errors: errors,
          validatedCount: validatedResults.length,
          totalCount: parsedResults.length
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        valid: true,
        results: validatedResults,
        count: validatedResults.length
      })
    };
  } catch (err) {
    if (client) {
      try {
        await client.end();
      } catch (closeErr) {
        // Silent fail on connection close error
      }
    }

    console.error('Error in validate-stage-results function:', err);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};

