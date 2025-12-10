const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const fs = require('fs');
const path = require('path');

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
    // Check if database URL is set
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    // Read CSV file
    const csvPath = path.join(__dirname, '../../imports/riders.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find column indices
    const firstNameIndex = headers.indexOf('first_name');
    const lastNameIndex = headers.indexOf('last_name');
    const teamNameIndex = headers.indexOf('team_name');
    const nationalityIndex = headers.indexOf('nationality');
    
    if (firstNameIndex === -1 || lastNameIndex === -1 || teamNameIndex === -1 || nationalityIndex === -1) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'CSV file missing required columns' 
        })
      };
    }
    
    // Parse riders data
    const riders = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 4) {
        riders.push({
          first_name: values[firstNameIndex],
          last_name: values[lastNameIndex],
          team_name: values[teamNameIndex],
          nationality: values[nationalityIndex]
        });
      }
    }
    
    if (riders.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'No riders found in CSV file' 
        })
      };
    }

    // Connect to database
    client = await getDbClient();

    // Check if riders table exists, if not create it
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS riders (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        team_name VARCHAR(100),
        nationality VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `;
    await client.query(createTableQuery);

    // Import riders using bulk insert with ON CONFLICT
    // Using first_name + last_name as unique identifier
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const rider of riders) {
      try {
        const query = `
          INSERT INTO riders (first_name, last_name, team_name, nationality)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        
        // For now, we'll insert all (no unique constraint on name combination)
        // If you want to prevent duplicates, add a unique constraint
        const result = await client.query(query, [
          rider.first_name,
          rider.last_name,
          rider.team_name,
          rider.nationality
        ]);
        
        if (result.rows.length > 0) {
          imported++;
        }
      } catch (err) {
        console.error(`Error importing rider ${rider.first_name} ${rider.last_name}:`, err);
        errors++;
      }
    }

    await client.end();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ok: true,
        imported,
        updated,
        errors,
        total: riders.length
      })
    };
  } catch (err) {
    return await handleDbError(err, client);
  }
};

