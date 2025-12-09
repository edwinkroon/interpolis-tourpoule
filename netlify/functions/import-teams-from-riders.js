const { Client } = require('pg');
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
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Database configuration missing' 
        })
      };
    }

    // Read CSV file
    const csvPath = path.join(__dirname, '../../imports/riders.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find column indices
    const teamNameIndex = headers.indexOf('team_name');
    const nationalityIndex = headers.indexOf('nationality');
    
    if (teamNameIndex === -1) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'CSV file missing team_name column' 
        })
      };
    }
    
    // Extract unique teams
    const teamsMap = new Map();
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length > teamNameIndex && values[teamNameIndex]) {
        const teamName = values[teamNameIndex];
        const nationality = nationalityIndex !== -1 ? values[nationalityIndex] : null;
        
        if (!teamsMap.has(teamName)) {
          // Generate team code from team name (first 3 letters, uppercase)
          const code = teamName
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 3)
            .toUpperCase();
          
          // Get country code from nationality (first 3 letters, uppercase)
          let country = 'UNK';
          if (nationality) {
            country = nationality
              .replace(/[^a-zA-Z0-9]/g, '')
              .substring(0, 3)
              .toUpperCase();
          }
          
          teamsMap.set(teamName, {
            name: teamName,
            code: code,
            country: country
          });
        }
      }
    }
    
    const teams = Array.from(teamsMap.values());
    
    if (teams.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'No teams found in CSV file' 
        })
      };
    }

    // Connect to database
    client = new Client({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Check if teams_pro table exists, if not create it
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS teams_pro (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(10) NOT NULL,
        country VARCHAR(10) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `;
    await client.query(createTableQuery);

    // Import teams using bulk insert with ON CONFLICT
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const team of teams) {
      try {
        const query = `
          INSERT INTO teams_pro (name, code, country)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) 
          DO UPDATE SET 
            code = EXCLUDED.code,
            country = EXCLUDED.country
          RETURNING id
        `;
        
        const result = await client.query(query, [
          team.name,
          team.code,
          team.country
        ]);
        
        if (result.rows.length > 0) {
          imported++;
        }
      } catch (err) {
        console.error(`Error importing team ${team.name}:`, err);
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
        total: teams.length,
        teams: teams
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

    console.error('Import error:', err);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message || 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};

