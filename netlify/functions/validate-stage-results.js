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

    // Helper function to parse time string (HH:MM:SS or MM:SS) to seconds
    function parseTimeToSeconds(timeStr) {
      if (!timeStr || timeStr.trim() === '' || timeStr.toLowerCase() === 'dnf' || timeStr.toLowerCase() === 'dns') {
        return null;
      }
      
      const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) {
        // MM:SS format
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return null;
    }

    // Helper function to merge lines that are split across multiple lines
    function mergeMultiLineEntries(lines) {
      const mergedLines = [];
      let currentLine = null;
      let currentLineIndex = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) {
          continue;
        }

        // Skip header lines
        if (line.toLowerCase().includes('rnk') && line.toLowerCase().includes('rider')) {
          continue;
        }

        // Check if line starts with a number (position) - indicates start of new entry
        const startsWithNumber = /^\d+/.test(line);
        const tabCount = (line.match(/\t/g) || []).length;
        const commaCount = (line.match(/,/g) || []).length;
        
        // Determine if using tabs or commas
        const useTabs = tabCount >= commaCount;
        const separator = useTabs ? '\t' : ',';
        const expectedColumns = useTabs ? 6 : 5; // Rnk, Rider, Team, UCI, Pnt, Time (tabs) or similar (commas)
        const actualColumnCount = useTabs ? tabCount + 1 : commaCount + 1;

        if (startsWithNumber) {
          // If we have a pending line, save it
          if (currentLine !== null) {
            mergedLines.push({
              line: currentLine,
              originalLineNumbers: currentLineIndex
            });
          }
          
          // Start new entry
          currentLine = line;
          currentLineIndex = [i + 1];
          
          // Check if line is complete (has enough columns)
          if (actualColumnCount >= 4) {
            // Line appears complete, add it
            mergedLines.push({
              line: currentLine,
              originalLineNumbers: currentLineIndex
            });
            currentLine = null;
            currentLineIndex = null;
          }
        } else {
          // This line doesn't start with a number - it's a continuation of the previous line
          if (currentLine !== null) {
            // Append to current line (with tab or space separator)
            currentLine += (useTabs ? '\t' : ' ') + line;
            currentLineIndex.push(i + 1);
            
            // Check if the merged line now has enough columns
            const mergedTabCount = (currentLine.match(/\t/g) || []).length;
            const mergedCommaCount = (currentLine.match(/,/g) || []).length;
            const mergedUseTabs = mergedTabCount >= mergedCommaCount;
            const mergedColumnCount = mergedUseTabs ? mergedTabCount + 1 : mergedCommaCount + 1;
            
            if (mergedColumnCount >= 4) {
              // Line appears complete now
              mergedLines.push({
                line: currentLine,
                originalLineNumbers: currentLineIndex
              });
              currentLine = null;
              currentLineIndex = null;
            }
          } else {
            // No current line, but this line doesn't start with a number
            // This might be a continuation of the last merged line
            if (mergedLines.length > 0) {
              const lastEntry = mergedLines[mergedLines.length - 1];
              lastEntry.line += (useTabs ? '\t' : ' ') + line;
              lastEntry.originalLineNumbers.push(i + 1);
            } else {
              // Orphan line - treat as new entry anyway
              mergedLines.push({
                line: line,
                originalLineNumbers: [i + 1]
              });
            }
          }
        }
      }

      // Don't forget the last pending line
      if (currentLine !== null) {
        mergedLines.push({
          line: currentLine,
          originalLineNumbers: currentLineIndex
        });
      }

      return mergedLines;
    }

    // Parse the results text (ProCyclingStats format: Rnk, Rider, Team, UCI, Pnt, , Time)
    const rawLines = resultsText.trim().split('\n').filter(line => line.trim().length > 0);
    
    // First, merge lines that are split across multiple lines
    const mergedEntries = mergeMultiLineEntries(rawLines);
    
    const parsedResults = [];
    const errors = [];

    for (let i = 0; i < mergedEntries.length; i++) {
      const entry = mergedEntries[i];
      const line = entry.line.trim();
      const originalLineNumbers = entry.originalLineNumbers;
      const lineNumber = originalLineNumbers.join('-'); // Show range if multiple lines
      
      // Split by tab (ProCyclingStats format) or comma (fallback)
      const parts = line.includes('\t') 
        ? line.split('\t').map(part => part.trim())
        : line.split(',').map(part => part.trim());
      
      if (parts.length < 3) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Onvoldoende kolommen (verwacht: Rnk, Rider, Team, UCI, Pnt, Time)'
        });
        continue;
      }

      const position = parseInt(parts[0], 10);
      const riderName = parts[1] || ''; // Combined first and last name
      const team = parts[2] || '';
      const uci = parts[3] || '';
      const pnt = parts[4] || '';
      const timeStr = parts[6] || parts[5] || ''; // Time can be at position 5 or 6 (after empty column)

      if (isNaN(position) || position < 1) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Ongeldige positie (moet een positief getal zijn)'
        });
        continue;
      }

      if (!riderName) {
        errors.push({
          line: lineNumber,
          content: line,
          error: 'Rider naam is verplicht'
        });
        continue;
      }

      // Parse time to seconds
      const timeSeconds = parseTimeToSeconds(timeStr);

      // Try to split rider name into first and last name
      // Usually the last word is the last name, everything before is first name
      const nameParts = riderName.trim().split(/\s+/);
      let firstName, lastName;
      
      if (nameParts.length === 1) {
        // Only one word, assume it's the last name
        firstName = null;
        lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        // Two words: first and last name
        firstName = nameParts[0];
        lastName = nameParts[1];
      } else {
        // More than two words: last word is last name, rest is first name
        lastName = nameParts[nameParts.length - 1];
        firstName = nameParts.slice(0, -1).join(' ');
      }

      parsedResults.push({
        position,
        riderName, // Keep original combined name
        firstName,
        lastName,
        team,
        uci,
        pnt,
        timeStr,
        timeSeconds,
        originalLine: line,
        originalLineNumbers: originalLineNumbers
      });
    }

    // Check for duplicate positions
    const positions = parsedResults.map(r => r.position);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    if (duplicatePositions.length > 0) {
      const uniqueDuplicates = [...new Set(duplicatePositions)];
      uniqueDuplicates.forEach(pos => {
        const linesWithPos = parsedResults.filter(r => r.position === pos);
        errors.push({
          line: linesWithPos.map(r => r.originalLineNumbers ? r.originalLineNumbers.join('-') : '?').join(', '),
          content: `Positie ${pos}`,
          error: `Positie ${pos} komt meerdere keren voor`
        });
      });
    }

    // Try to match riders with database
    const validatedResults = [];
    const unmatchedResults = [];
    
    for (const result of parsedResults) {
      let riderId = null;
      let matchedRider = null;
      
      // Try multiple matching strategies
      // Strategy 1: Match on full name (CONCAT first_name + last_name)
      const fullNameQuery = `
        SELECT id, first_name, last_name 
        FROM riders 
        WHERE LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM($1))
        LIMIT 1
      `;
      const fullNameMatch = await client.query(fullNameQuery, [result.riderName]);
      
      if (fullNameMatch.rows.length > 0) {
        riderId = fullNameMatch.rows[0].id;
        matchedRider = fullNameMatch.rows[0];
      } else if (result.firstName && result.lastName) {
        // Strategy 2: Match on first and last name separately
        const nameQuery = `
          SELECT id, first_name, last_name 
          FROM riders 
          WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
            AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
          LIMIT 1
        `;
        const nameMatch = await client.query(nameQuery, [result.firstName, result.lastName]);
        
        if (nameMatch.rows.length > 0) {
          riderId = nameMatch.rows[0].id;
          matchedRider = nameMatch.rows[0];
        } else {
          // Strategy 3: Try matching just last name (fuzzy match)
          const lastNameQuery = `
            SELECT id, first_name, last_name 
            FROM riders 
            WHERE LOWER(TRIM(last_name)) = LOWER(TRIM($1))
            LIMIT 1
          `;
          const lastNameMatch = await client.query(lastNameQuery, [result.lastName]);
          
          if (lastNameMatch.rows.length === 1) {
            // Only match if there's exactly one rider with this last name
            riderId = lastNameMatch.rows[0].id;
            matchedRider = lastNameMatch.rows[0];
          }
        }
      }
      
      if (riderId) {
        validatedResults.push({
          position: result.position,
          riderId,
          timeSeconds: result.timeSeconds,
          firstName: matchedRider.first_name,
          lastName: matchedRider.last_name,
          matchedName: `${matchedRider.first_name} ${matchedRider.last_name}`
        });
      } else {
        unmatchedResults.push(result);
        errors.push({
          line: result.originalLineNumbers ? result.originalLineNumbers.join('-') : (parsedResults.indexOf(result) + 1),
          content: result.originalLine || `${result.position}\t${result.riderName}`,
          error: `Renner "${result.riderName}" niet gevonden in database`
        });
      }
    }

    await client.end();

    // Return validation result
    if (errors.length > 0) {
      // Return unmatched results as editable text
      const unmatchedText = unmatchedResults.map(r => r.originalLine || `${r.position}\t${r.riderName}\t${r.team || ''}\t${r.uci || ''}\t${r.pnt || ''}\t\t${r.timeStr || ''}`).join('\n');
      
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
          totalCount: parsedResults.length,
          unmatchedText: unmatchedText,
          unmatchedResults: unmatchedResults
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

