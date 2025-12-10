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

    // Helper function to normalize names (remove diacritics)
    // Similar to Python's normalize_name function
    function normalizeName(name) {
      if (!name) return '';
      // Normalize to NFD (decomposed form) and remove combining marks
      return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
        .toLowerCase()
        .trim();
    }

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
      if (!timeStr || typeof timeStr !== 'string') {
        return null;
      }
      
      // Clean the time string: remove commas, trim whitespace
      const cleaned = timeStr.replace(/,/g, '').trim();
      
      // Check for empty, DNF, DNS, or just commas
      if (cleaned === '' || cleaned.toLowerCase() === 'dnf' || cleaned.toLowerCase() === 'dns' || cleaned === ',') {
        return null;
      }
      
      // Parse time format (HH:MM:SS or MM:SS)
      const parts = cleaned.split(':').map(p => {
        const parsed = parseInt(p, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
      
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
      
      // Split by tab (ProCyclingStats format) - tabs are the primary separator
      // Only use commas if there are no tabs at all
      let parts;
      if (line.includes('\t')) {
        // Use tabs as separator (ProCyclingStats format)
        parts = line.split('\t').map(part => part.trim());
      } else {
        // Fallback to commas only if no tabs are present
        parts = line.split(',').map(part => part.trim());
      }
      
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
      // In the text file, the format is usually: last name first, then first name
      // For compound last names (like "van der Poel"), we need to try different splits
      const nameParts = riderName.trim().split(/\s+/);
      let firstName, lastName;
      
      if (nameParts.length === 1) {
        // Only one word, assume it's the last name
        firstName = null;
        lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        // Two words: first word is last name, second word is first name
        lastName = nameParts[0];
        firstName = nameParts[1];
      } else {
        // More than two words: try different splits
        // Common pattern: compound last name (e.g., "van der Poel") + first name (e.g., "Mathieu")
        // Try: last word = first name, rest = last name
        // This handles cases like "van der Poel Mathieu" -> lastName="van der Poel", firstName="Mathieu"
        lastName = nameParts.slice(0, -1).join(' ');
        firstName = nameParts[nameParts.length - 1];
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
    let lastValidTimeSeconds = null; // Track last valid time to propagate to null times
    
    for (const result of parsedResults) {
      let riderId = null;
      let matchedRider = null;
      
      // If time is null, use the time from the previous rider (same time group)
      let timeSeconds = result.timeSeconds;
      if (timeSeconds === null && lastValidTimeSeconds !== null) {
        timeSeconds = lastValidTimeSeconds;
      }
      
      // Update lastValidTimeSeconds if we have a valid time
      if (timeSeconds !== null) {
        lastValidTimeSeconds = timeSeconds;
      }
      
      // Normalize input names FIRST - this is the key improvement
      // We'll use normalized names as primary matching strategy
      const normalizedRiderName = normalizeName(result.riderName);
      const normalizedFirstName = result.firstName ? normalizeName(result.firstName) : null;
      const normalizedLastName = result.lastName ? normalizeName(result.lastName) : null;
      
      // Try multiple matching strategies - prioritize normalized matching
      // Strategy 1: Match on full name (CONCAT first_name + last_name) - normalized first
      let fullNameMatch;
      try {
        // Try normalized fields first (most reliable for diacritics)
        const fullNameQuery = `
          SELECT id, first_name, last_name 
          FROM riders 
          WHERE (first_name_normalized IS NOT NULL AND last_name_normalized IS NOT NULL
                 AND CONCAT(first_name_normalized, ' ', last_name_normalized) = $1)
             OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM($2))
          LIMIT 1
        `;
        fullNameMatch = await client.query(fullNameQuery, [normalizedRiderName, result.riderName]);
      } catch (queryErr) {
        // If normalized columns don't exist, try without them
        const fullNameQuery = `
          SELECT id, first_name, last_name 
          FROM riders 
          WHERE LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(TRIM($1))
          LIMIT 1
        `;
        fullNameMatch = await client.query(fullNameQuery, [result.riderName]);
      }
      
      if (fullNameMatch.rows.length > 0) {
        riderId = fullNameMatch.rows[0].id;
        matchedRider = fullNameMatch.rows[0];
      } else if (result.firstName && result.lastName) {
        // Strategy 2: Match on first and last name separately - normalized first
        let nameMatch;
        try {
          // Prioritize normalized matching (handles diacritics better)
          const nameQuery = `
            SELECT id, first_name, last_name 
            FROM riders 
            WHERE (first_name_normalized IS NOT NULL AND last_name_normalized IS NOT NULL
                   AND first_name_normalized = $1
                   AND last_name_normalized = $2)
               OR (LOWER(TRIM(first_name)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(last_name)) = LOWER(TRIM($4)))
          LIMIT 1
          `;
          nameMatch = await client.query(nameQuery, [
            normalizedFirstName,
            normalizedLastName,
            result.firstName, 
            result.lastName
          ]);
        } catch (queryErr) {
          // If normalized columns don't exist, try without them
          const nameQuery = `
            SELECT id, first_name, last_name 
            FROM riders 
            WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
              AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
          LIMIT 1
          `;
          nameMatch = await client.query(nameQuery, [result.firstName, result.lastName]);
        }
        
        // If still no match and we have normalized names, try matching with normalized names on original fields
        if (nameMatch.rows.length === 0 && normalizedFirstName && normalizedLastName) {
          try {
            // Get candidates by matching first few characters, then match by normalized names in JavaScript
            const firstChar = normalizedLastName.substring(0, 4);
            const candidatesQuery = `
              SELECT id, first_name, last_name 
              FROM riders 
              WHERE LOWER(SUBSTRING(TRIM(last_name), 1, 4)) = $1
                 OR LOWER(SUBSTRING(TRIM(first_name), 1, 4)) = $2
              LIMIT 30
            `;
            const candidates = await client.query(candidatesQuery, [
              firstChar,
              normalizedFirstName.substring(0, 4)
            ]);
            
            // Match by normalized names in JavaScript
            for (const candidate of candidates.rows) {
              const candidateFirstNorm = normalizeName(candidate.first_name || '');
              const candidateLastNorm = normalizeName(candidate.last_name || '');
              
              // Try both orders: normal and reversed (for cases like "Wærenskjold Søren" vs "Soren Waerenskjold")
              if ((candidateFirstNorm === normalizedFirstName && candidateLastNorm === normalizedLastName) ||
                  (candidateFirstNorm === normalizedLastName && candidateLastNorm === normalizedFirstName)) {
                nameMatch = { rows: [candidate] };
                break;
              }
            }
          } catch (queryErr) {
            // Ignore - this is a fallback strategy
          }
        }
        
        if (nameMatch.rows.length > 0) {
          riderId = nameMatch.rows[0].id;
          matchedRider = nameMatch.rows[0];
        } else {
          // Strategy 3: Try matching with reversed order (in case parsing was wrong)
          // This is critical for "Wærenskjold Søren" -> "Soren Waerenskjold"
          // Try: parsed firstName as last_name, parsed lastName as first_name - normalized first
          let reversedMatch;
          if (normalizedFirstName && normalizedLastName) {
            // First try with normalized names (most reliable for diacritics)
            try {
              const normalizedReversedQuery = `
                SELECT id, first_name, last_name 
                FROM riders 
                WHERE (first_name_normalized IS NOT NULL AND last_name_normalized IS NOT NULL
                  AND first_name_normalized = $1
                  AND last_name_normalized = $2)
                LIMIT 1
              `;
              // Reversed: input firstName should match db first_name, input lastName should match db last_name
              // For "Wærenskjold Søren": normalizedFirstName="soren", normalizedLastName="waerenskjold"
              // Should match: db first_name_normalized="soren", db last_name_normalized="waerenskjold"
              const normalizedReversedResult = await client.query(normalizedReversedQuery, [
                normalizedFirstName,  // Input firstName -> db first_name
                normalizedLastName   // Input lastName -> db last_name
              ]);
              if (normalizedReversedResult.rows.length > 0) {
                reversedMatch = normalizedReversedResult;
              }
            } catch (queryErr) {
              // Normalized columns don't exist, will try fallback below
            }
            
            // If normalized query didn't work, try JavaScript-based normalized matching
            if (!reversedMatch || reversedMatch.rows.length === 0) {
              try {
                // Get candidates by matching first few characters
                const candidatesQuery = `
                  SELECT id, first_name, last_name 
                  FROM riders 
                  WHERE LOWER(SUBSTRING(TRIM(last_name), 1, 4)) = $1
                     OR LOWER(SUBSTRING(TRIM(first_name), 1, 4)) = $2
                  LIMIT 50
                `;
                const candidates = await client.query(candidatesQuery, [
                  normalizedLastName.substring(0, 4),
                  normalizedFirstName.substring(0, 4)
                ]);
                
                // Match by normalized names in JavaScript (reversed: input firstName -> db first_name, input lastName -> db last_name)
                for (const candidate of candidates.rows) {
                  const candidateFirstNorm = normalizeName(candidate.first_name || '');
                  const candidateLastNorm = normalizeName(candidate.last_name || '');
                  
                  // Reversed match: input firstName should match db first_name, input lastName should match db last_name
                  if (candidateFirstNorm === normalizedFirstName && candidateLastNorm === normalizedLastName) {
                    reversedMatch = { rows: [candidate] };
                    break;
                  }
                }
              } catch (fallbackErr) {
                // Ignore - this is a fallback strategy
              }
            }
          }
          
          // Fallback to original names if normalized matching didn't work
          if (!reversedMatch || reversedMatch.rows.length === 0) {
            try {
              const reversedNameQuery = `
                SELECT id, first_name, last_name 
                FROM riders 
                WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
                  AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
                LIMIT 1
              `;
              reversedMatch = await client.query(reversedNameQuery, [result.lastName, result.firstName]);
            } catch (queryErr) {
              // Ignore
            }
          }
          
          if (reversedMatch.rows.length > 0) {
            riderId = reversedMatch.rows[0].id;
            matchedRider = reversedMatch.rows[0];
          } else {
            // Strategy 4: Try matching just last name (fuzzy match) - normalized first
            // This helps with compound last names like "van der Poel"
            let lastNameMatch;
            try {
              // Prioritize normalized matching
              const lastNameQuery = `
                SELECT id, first_name, last_name 
                FROM riders 
                WHERE (last_name_normalized IS NOT NULL AND last_name_normalized = $1)
                   OR LOWER(TRIM(last_name)) = LOWER(TRIM($2))
                LIMIT 1
              `;
              lastNameMatch = await client.query(lastNameQuery, [normalizedLastName, result.lastName]);
            } catch (queryErr) {
              // If normalized columns don't exist, try without them
              const lastNameQuery = `
                SELECT id, first_name, last_name 
                FROM riders 
                WHERE LOWER(TRIM(last_name)) = LOWER(TRIM($1))
                LIMIT 1
              `;
              lastNameMatch = await client.query(lastNameQuery, [result.lastName]);
            }
            
            if (lastNameMatch.rows.length === 1) {
              // Only match if there's exactly one rider with this last name
              riderId = lastNameMatch.rows[0].id;
              matchedRider = lastNameMatch.rows[0];
            } else {
              // Strategy 5: Try fuzzy matching for spelling variations - normalized first
              // This helps with cases like "Mathieu" vs "Matthieu"
              // Match if first 4+ characters match and last name matches exactly
              if (normalizedFirstName && normalizedFirstName.length >= 4 && normalizedLastName) {
                const normalizedFirstNamePrefix = normalizedFirstName.substring(0, 4);
                let fuzzyMatch;
                try {
                  // Prioritize normalized matching
                  const fuzzyNameQuery = `
                    SELECT id, first_name, last_name 
                    FROM riders 
                    WHERE (first_name_normalized IS NOT NULL AND last_name_normalized IS NOT NULL
                           AND SUBSTRING(first_name_normalized, 1, 4) = $1
                           AND last_name_normalized = $2)
                       OR (LOWER(SUBSTRING(TRIM(first_name), 1, 4)) = $3
                           AND LOWER(TRIM(last_name)) = LOWER(TRIM($4)))
                    LIMIT 1
                  `;
                  fuzzyMatch = await client.query(fuzzyNameQuery, [
                    normalizedFirstNamePrefix,
                    normalizedLastName,
                    result.firstName.substring(0, 4).toLowerCase(), 
                    result.lastName
                  ]);
                } catch (queryErr) {
                  // If normalized columns don't exist, try without them
                  if (result.firstName && result.firstName.length >= 4) {
                    const firstNamePrefix = result.firstName.substring(0, 4).toLowerCase();
                    const fuzzyNameQuery = `
                      SELECT id, first_name, last_name 
                      FROM riders 
                      WHERE LOWER(SUBSTRING(TRIM(first_name), 1, 4)) = $1
                        AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
                      LIMIT 1
                    `;
                    fuzzyMatch = await client.query(fuzzyNameQuery, [firstNamePrefix, result.lastName]);
                  }
                }
                
                if (fuzzyMatch.rows.length > 0) {
                  riderId = fuzzyMatch.rows[0].id;
                  matchedRider = fuzzyMatch.rows[0];
                } else {
                  // Strategy 6: Try matching with all possible combinations of the name parts
                  // This helps with cases like "Johannessen Tobias Halland" where parsing might need adjustment
                  if (result.riderName && result.riderName.split(/\s+/).length >= 3) {
                    const allNameParts = result.riderName.trim().split(/\s+/);
                    
                    // Try different splits: for 3+ words, try last 2 words as first name
                    if (allNameParts.length >= 3) {
                      // Try: first word = last name, rest = first name (alternative parsing)
                      const altLastName = allNameParts[0];
                      const altFirstName = allNameParts.slice(1).join(' ');
                      const altNormalizedFirstName = normalizeName(altFirstName);
                      const altNormalizedLastName = normalizeName(altLastName);
                      
                      let altMatch;
                      try {
                        // Prioritize normalized matching
                        const altQuery = `
                          SELECT id, first_name, last_name 
                          FROM riders 
                          WHERE (first_name_normalized IS NOT NULL AND last_name_normalized IS NOT NULL
                                 AND first_name_normalized = $1
                                 AND last_name_normalized = $2)
                             OR (LOWER(TRIM(first_name)) = LOWER(TRIM($3))
                                 AND LOWER(TRIM(last_name)) = LOWER(TRIM($4)))
                          LIMIT 1
                        `;
                        altMatch = await client.query(altQuery, [
                          altNormalizedFirstName,
                          altNormalizedLastName,
                          altFirstName,
                          altLastName
                        ]);
                      } catch (queryErr) {
                        const altQuery = `
                          SELECT id, first_name, last_name 
                          FROM riders 
                          WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1))
                            AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))
                          LIMIT 1
                        `;
                        altMatch = await client.query(altQuery, [altFirstName, altLastName]);
                      }
                      
                      if (altMatch.rows.length > 0) {
                        riderId = altMatch.rows[0].id;
                        matchedRider = altMatch.rows[0];
                      } else if (normalizedFirstName && normalizedLastName) {
                        // Strategy 6b: Try matching with normalized names on original fields (for diacritics)
                        // This helps with cases like "Wærenskjold Søren" vs "Soren Waerenskjold"
                        // Use LIKE to get candidates that might match after normalization
                        try {
                          // Get candidates by matching first few characters (more efficient than all riders)
                          const firstChar = normalizedLastName.substring(0, 3);
                          const candidatesQuery = `
                            SELECT id, first_name, last_name 
                            FROM riders 
                            WHERE LOWER(SUBSTRING(TRIM(last_name), 1, 3)) = $1
                               OR LOWER(SUBSTRING(TRIM(first_name), 1, 3)) = $2
                            LIMIT 50
                          `;
                          const candidates = await client.query(candidatesQuery, [
                            firstChar,
                            normalizedFirstName.substring(0, 3)
                          ]);
                          
                          // Match by normalized names in JavaScript
                          for (const candidate of candidates.rows) {
                            const candidateFirstNorm = normalizeName(candidate.first_name || '');
                            const candidateLastNorm = normalizeName(candidate.last_name || '');
                            
                            // Try both orders: normal and reversed
                            if ((candidateFirstNorm === normalizedFirstName && candidateLastNorm === normalizedLastName) ||
                                (candidateFirstNorm === normalizedLastName && candidateLastNorm === normalizedFirstName)) {
                              riderId = candidate.id;
                              matchedRider = candidate;
                              break;
                            }
                          }
                        } catch (queryErr) {
                          // Ignore - this is a fallback strategy
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      if (riderId) {
        validatedResults.push({
          position: result.position,
          riderId,
          timeSeconds: timeSeconds, // Use the potentially propagated time
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
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: err.message || 'Database error',
        errorCode: err.code,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        hint: err.hint || err.detail
      })
    };
  }
};

