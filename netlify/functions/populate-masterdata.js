const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const fs = require('fs');
const path = require('path');

// Helper: read CSV from stamtabellen/<name>.csv, database_csv/<name>.csv or imports/<name>.csv
function readCsvFile(fileName) {
  const stamtabellenPath = path.join(__dirname, '../../stamtabellen', fileName);
  const databaseCsvPath = path.join(__dirname, '../../database_csv', fileName);
  const importsPath = path.join(__dirname, '../../imports', fileName);
  
  let filePath = null;
  if (fs.existsSync(stamtabellenPath)) {
    filePath = stamtabellenPath;
  } else if (fs.existsSync(databaseCsvPath)) {
    filePath = databaseCsvPath;
  } else if (fs.existsSync(importsPath)) {
    filePath = importsPath;
  }
  
  if (!filePath) {
    throw new Error(`${fileName} not found in stamtabellen, database_csv or imports`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error(`${fileName} has no data rows`);
  }
  
  // Parse CSV with proper handling of quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote (double quote)
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // Add last field
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      let value = values[idx] || '';
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
        // Unescape double quotes
        value = value.replace(/""/g, '"');
      }
      obj[h] = value === '' ? null : value;
    });
    return obj;
  });
  return rows;
}

// Helper: check if CSV file exists in stamtabellen folder
function csvExistsInStamtabellen(fileName) {
  const stamtabellenPath = path.join(__dirname, '../../stamtabellen', fileName);
  return fs.existsSync(stamtabellenPath);
}

exports.handler = async function(event) {
  // Check admin access for POST requests
  if (event.httpMethod === 'POST') {
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'User ID required' })
      };
    }

    let client;
    try {
      if (!process.env.NEON_DATABASE_URL) {
        return missingDbConfigResponse();
      }

      client = await getDbClient();

      // Check if user is admin
      const adminCheck = await client.query(
        'SELECT is_admin FROM participants WHERE user_id = $1',
        [userId]
      );

      if (!adminCheck.rows.length || !adminCheck.rows[0].is_admin) {
        await client.end();
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'Admin access required' })
        };
      }

      // Parse request body
      const body = JSON.parse(event.body || '{}');
      const { tables } = body;

      if (!tables || typeof tables !== 'object') {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'Tables object required' })
        };
      }

      const results = {};
      const missingCsvFiles = [];
      
      // Check for CSV files in stamtabellen folder for all selected tables
      if (tables.awards && !csvExistsInStamtabellen('awards.csv')) {
        missingCsvFiles.push('awards.csv');
      }
      if (tables.jerseys && !csvExistsInStamtabellen('jerseys.csv')) {
        missingCsvFiles.push('jerseys.csv');
      }
      if (tables.scoring_rules && !csvExistsInStamtabellen('scoring_rules.csv')) {
        missingCsvFiles.push('scoring_rules.csv');
      }
      if (tables.stages && !csvExistsInStamtabellen('stages.csv')) {
        missingCsvFiles.push('stages.csv');
      }
      if (tables.teams_pro && !csvExistsInStamtabellen('teams_pro.csv')) {
        missingCsvFiles.push('teams_pro.csv');
      }
      
      if (missingCsvFiles.length > 0) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ok: false,
            error: `De volgende CSV bestanden ontbreken in de stamtabellen map: ${missingCsvFiles.join(', ')}`
          })
        };
      }

      await client.query('BEGIN');

      try {
        // Populate awards
        if (tables.awards) {
          try {
            // Always use CSV from stamtabellen folder
            const sourceRows = readCsvFile('awards.csv');

            if (!sourceRows.length) {
              throw new Error('awards.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE awards RESTART IDENTITY CASCADE');
            for (const row of sourceRows) {
              // Insert award (no ON CONFLICT needed since we TRUNCATE first)
              await client.query(
                `INSERT INTO awards (stage_id, code, title, description, icon)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  row.stage_id ? Number(row.stage_id) : null,
                  row.code,
                  row.title,
                  row.description,
                  row.icon || null
                ]
              );
            }
            const count = await client.query('SELECT COUNT(*) as count FROM awards');
            results.awards = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.awards = {
              success: false,
              error: err.message
            };
          }
        }

        // Populate jerseys
        if (tables.jerseys) {
          try {
            // Always use CSV from stamtabellen folder
            const sourceRows = readCsvFile('jerseys.csv');
            
            if (!sourceRows.length) {
              throw new Error('jerseys.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE jerseys RESTART IDENTITY CASCADE');
            for (const row of sourceRows) {
              await client.query(
                `INSERT INTO jerseys (type, name, icon)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (type) DO UPDATE SET
                   name = EXCLUDED.name,
                   icon = EXCLUDED.icon`,
                [row.type, row.name, row.icon || null]
              );
            }
            const count = await client.query('SELECT COUNT(*) as count FROM jerseys');
            results.jerseys = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.jerseys = {
              success: false,
              error: err.message
            };
          }
        }

        // Populate scoring_rules
        if (tables.scoring_rules) {
          try {
            // Always use CSV from stamtabellen folder
            let sourceRows = readCsvFile('scoring_rules.csv');
            // parse condition_json if CSV string
            sourceRows = sourceRows.map((r) => {
              let conditionJson = null;
              if (r.condition_json) {
                try {
                  // The CSV parser should have already handled quotes, so parse directly
                  conditionJson = JSON.parse(r.condition_json);
                } catch (parseErr) {
                  throw new Error(`Invalid JSON in condition_json: ${r.condition_json} - ${parseErr.message}`);
                }
              }
              return {
                rule_type: r.rule_type,
                condition_json: conditionJson,
                points: r.points ? Number(r.points) : 0
              };
            });

            if (!sourceRows.length) {
              throw new Error('scoring_rules.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE scoring_rules RESTART IDENTITY CASCADE');
            for (const row of sourceRows) {
              await client.query(
                `INSERT INTO scoring_rules (rule_type, condition_json, points)
                 VALUES ($1, $2, $3)`,
                [row.rule_type, row.condition_json, row.points]
              );
            }
            const count = await client.query('SELECT COUNT(*) as count FROM scoring_rules');
            results.scoring_rules = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.scoring_rules = {
              success: false,
              error: err.message
            };
          }
        }

        // Populate stages
        if (tables.stages) {
          try {
            await client.query(`ALTER TABLE stages ADD COLUMN IF NOT EXISTS type VARCHAR(20)`);

            // Always use CSV from stamtabellen folder
            let sourceRows = readCsvFile('stages.csv');
            sourceRows = sourceRows.map((r) => {
              // Ensure date is not empty - it's a required field
              // Handle both empty string and null/undefined
              let dateValue = r.date;
              if (dateValue) {
                dateValue = dateValue.trim();
              }
              if (!dateValue || dateValue === '') {
                throw new Error(`Stage ${r.stage_number || 'unknown'} (${r.name || 'unknown'}) heeft geen datum. Gelezen waarde: "${r.date}"`);
              }
              
              return {
                stage_number: Number(r.stage_number),
                name: r.name || '',
                start_location: (r.start_location && r.start_location.trim()) ? r.start_location.trim() : null,
                end_location: (r.end_location && r.end_location.trim()) ? r.end_location.trim() : null,
                distance_km: (r.distance_km && r.distance_km.trim()) ? Number(r.distance_km) : null,
                date: dateValue,
                type: (r.type && r.type.trim()) ? r.type.trim() : null,
                is_neutralized: r.is_neutralized ? (r.is_neutralized === 'true' || r.is_neutralized === '1') : false,
                is_cancelled: r.is_cancelled ? (r.is_cancelled === 'true' || r.is_cancelled === '1') : false
              };
            });

            if (!sourceRows.length) {
              throw new Error('stages.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE stages RESTART IDENTITY CASCADE');
            for (const row of sourceRows) {
              await client.query(
                `INSERT INTO stages (stage_number, name, start_location, end_location, distance_km, date, type, is_neutralized, is_cancelled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (stage_number) DO UPDATE SET
                   name = EXCLUDED.name,
                   start_location = EXCLUDED.start_location,
                   end_location = EXCLUDED.end_location,
                   distance_km = EXCLUDED.distance_km,
                   date = EXCLUDED.date,
                   type = EXCLUDED.type,
                   is_neutralized = EXCLUDED.is_neutralized,
                   is_cancelled = EXCLUDED.is_cancelled`,
                [
                  row.stage_number,
                  row.name,
                  row.start_location,
                  row.end_location,
                  row.distance_km,
                  row.date,
                  row.type,
                  row.is_neutralized || false,
                  row.is_cancelled || false
                ]
              );
            }
            const count = await client.query('SELECT COUNT(*) as count FROM stages');
            results.stages = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.stages = {
              success: false,
              error: err.message
            };
          }
        }

        // Populate teams_pro
        if (tables.teams_pro) {
          try {
            // Always use CSV from stamtabellen folder
            const csvRows = readCsvFile('teams_pro.csv');
            const teams = csvRows.map((r) => ({
              name: r.name,
              code: r.code || null,
              country: r.country || null
            }));

            if (!teams.length) {
              throw new Error('teams_pro.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE teams_pro RESTART IDENTITY CASCADE');
            for (const team of teams) {
              await client.query(
                `INSERT INTO teams_pro (name, code, country)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (name) 
                 DO UPDATE SET 
                   code = EXCLUDED.code,
                   country = EXCLUDED.country`,
                [team.name, team.code, team.country]
              );
            }

            const count = await client.query('SELECT COUNT(*) as count FROM teams_pro');
            results.teams_pro = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.teams_pro = {
              success: false,
              error: err.message
            };
          }
        }

        // Populate riders
        if (tables.riders) {
          try {
            // Always use CSV from stamtabellen folder
            const csvRows = readCsvFile('riders.csv');
            const sourceRows = csvRows.map((r) => ({
              first_name: r.first_name || null,
              last_name: r.last_name || null,
              nationality: r.nationality || null,
              team_pro_id: r.team_pro_id ? Number(r.team_pro_id) : null,
              date_of_birth: r.date_of_birth && r.date_of_birth.trim() ? r.date_of_birth.trim() : null,
              weight_kg: r.weight_kg && r.weight_kg.trim() ? Number(r.weight_kg) : null,
              height_m: r.height_m && r.height_m.trim() ? Number(r.height_m) : null,
              photo_url: r.photo_url || null
            }));

            if (!sourceRows.length) {
              throw new Error('riders.csv heeft geen data');
            }

            await client.query('TRUNCATE TABLE riders RESTART IDENTITY CASCADE');

            for (const rider of sourceRows) {
              await client.query(
                `INSERT INTO riders (
                  first_name, 
                  last_name, 
                  nationality,
                  team_pro_id,
                  date_of_birth,
                  weight_kg,
                  height_m,
                  photo_url
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  rider.first_name,
                  rider.last_name,
                  rider.nationality,
                  rider.team_pro_id,
                  rider.date_of_birth,
                  rider.weight_kg,
                  rider.height_m,
                  rider.photo_url
                ]
              );
            }

            const count = await client.query('SELECT COUNT(*) as count FROM riders');
            results.riders = {
              success: true,
              count: parseInt(count.rows[0].count, 10)
            };
          } catch (err) {
            results.riders = {
              success: false,
              error: err.message
            };
          }
        }

        await client.query('COMMIT');
        await client.end();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            ok: true,
            results
          })
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } catch (error) {
      return handleDbError(error, client);
    }
  }

  // GET request: return current data from masterdata tables
  if (event.httpMethod === 'GET') {
    let client;
    try {
      if (!process.env.NEON_DATABASE_URL) {
        return missingDbConfigResponse();
      }

      client = await getDbClient();

      const masterdata = {};

      // Get current awards
      const awardsResult = await client.query('SELECT * FROM awards ORDER BY code');
      masterdata.awards = awardsResult.rows;

      // Get current jerseys
      const jerseysResult = await client.query('SELECT * FROM jerseys ORDER BY type');
      masterdata.jerseys = jerseysResult.rows;

      // Get current scoring_rules
      const scoringRulesResult = await client.query('SELECT * FROM scoring_rules ORDER BY rule_type, points DESC');
      masterdata.scoring_rules = scoringRulesResult.rows;

      // Get current stages
      const stagesResult = await client.query('SELECT * FROM stages ORDER BY stage_number');
      masterdata.stages = stagesResult.rows;

      // Get current teams_pro
      const teamsProResult = await client.query('SELECT * FROM teams_pro ORDER BY name');
      masterdata.teams_pro = teamsProResult.rows;

      // Get current riders
      const ridersResult = await client.query('SELECT * FROM riders ORDER BY last_name, first_name');
      masterdata.riders = ridersResult.rows;

      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          ok: true,
          masterdata
        })
      };
    } catch (error) {
      return handleDbError(error, client);
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
  };
};
