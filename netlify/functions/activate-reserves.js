const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');
const {
  getAvailableMainSlots,
  activateReservesForTeam
} = require('./import-stage-results');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    const body = JSON.parse(event.body || '{}');
    const { participantId, activateAll = false } = body;

    if (!activateAll && !participantId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'participantId is required (or set activateAll to true)' 
        })
      };
    }

    client = await getDbClient();

    if (activateAll) {
      // Activate reserves for all teams that need it
      const allTeamsQuery = await client.query(
        `SELECT ft.id as fantasy_team_id, ft.participant_id
         FROM fantasy_teams ft`
      );

      const results = [];
      let totalActivated = 0;

      await client.query('BEGIN');

      try {
        for (const team of allTeamsQuery.rows) {
          const activeMainCountQuery = await client.query(
            `SELECT COUNT(*) as count
             FROM fantasy_team_riders
             WHERE fantasy_team_id = $1 AND slot_type = 'main' AND active = true`,
            [team.fantasy_team_id]
          );

          const activeMainCount = parseInt(activeMainCountQuery.rows[0].count, 10);
          const targetMainCount = 10;
          const neededReserves = Math.max(0, targetMainCount - activeMainCount);

          if (neededReserves > 0) {
            const activated = await activateReservesForTeam(
              client,
              team.fantasy_team_id,
              neededReserves,
              activeMainCount
            );
            
            if (activated > 0) {
              results.push({
                participantId: team.participant_id,
                activeMainCount: activeMainCount,
                reservesActivated: activated,
                newActiveMainCount: activeMainCount + activated
              });
              totalActivated += activated;
            }
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
            message: `Activated reserves for ${results.length} team(s)`,
            totalReservesActivated: totalActivated,
            teams: results
          })
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } else {
      // Activate reserves for a specific participant
      const teamQuery = await client.query(
        'SELECT id FROM fantasy_teams WHERE participant_id = $1',
        [participantId]
      );

      if (teamQuery.rows.length === 0) {
        await client.end();
        return {
          statusCode: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            ok: false, 
            error: 'Fantasy team not found for this participant' 
          })
        };
      }

      const fantasyTeamId = teamQuery.rows[0].id;

      // Count active main riders
      const activeMainCountQuery = await client.query(
        `SELECT COUNT(*) as count
         FROM fantasy_team_riders
         WHERE fantasy_team_id = $1 AND slot_type = 'main' AND active = true`,
        [fantasyTeamId]
      );

      const activeMainCount = parseInt(activeMainCountQuery.rows[0].count, 10);
      const targetMainCount = 10;
      const neededReserves = Math.max(0, targetMainCount - activeMainCount);

      if (neededReserves === 0) {
        await client.end();
        return {
          statusCode: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            ok: true, 
            message: 'Team already has 10 active main riders',
            activeMainCount: activeMainCount,
            reservesActivated: 0
          })
        };
      }

      // Activate reserves
      await client.query('BEGIN');
      
      try {
        const activated = await activateReservesForTeam(client, fantasyTeamId, neededReserves, activeMainCount);
        
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
            message: `Activated ${activated} reserve(s)`,
            activeMainCount: activeMainCount,
            reservesActivated: activated,
            newActiveMainCount: activeMainCount + activated
          })
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    return handleDbError(error, client);
  }
};


