const { getDbClient, handleDbError, missingDbConfigResponse } = require('./_shared/db');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let client;
  try {
    if (!process.env.NEON_DATABASE_URL) {
      return missingDbConfigResponse();
    }

    // Get user_id from query string
    const userId = event.queryStringParameters?.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'userId parameter is required' 
        })
      };
    }

    client = await getDbClient();

    // Get participant ID from user_id
    const participantQuery = await client.query(
      `SELECT id FROM participants WHERE user_id = $1`,
      [userId]
    );

    if (participantQuery.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Participant not found' 
        })
      };
    }

    const participantId = participantQuery.rows[0].id;

    // Get latest stage with results
    const latestStageQuery = await client.query(
      `SELECT s.id, s.stage_number, s.name, s.start_location, s.end_location, s.distance_km
       FROM stages s
       WHERE EXISTS (
         SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
       )
       ORDER BY s.stage_number DESC
       LIMIT 1`
    );

    if (latestStageQuery.rows.length === 0) {
      await client.end();
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          ok: true, 
          riders: [],
          totalPoints: 0
        })
      };
    }

    const latestStage = latestStageQuery.rows[0];
    const latestStageId = latestStage.id;

    // Get scoring rules
    const scoringRules = await client.query(
      `SELECT rule_type, condition_json, points 
       FROM scoring_rules 
       WHERE rule_type = 'stage_position'`
    );

    const positionPointsMap = new Map();
    scoringRules.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (condition && condition.position) {
        positionPointsMap.set(condition.position, rule.points);
      }
    });

    // Get jersey rules
    const jerseyRules = await client.query(
      `SELECT rule_type, condition_json, points 
       FROM scoring_rules 
       WHERE rule_type = 'jersey'`
    );

    const jerseyPointsMap = new Map();
    jerseyRules.rows.forEach(rule => {
      const condition = rule.condition_json;
      if (condition && condition.jersey_type) {
        jerseyPointsMap.set(condition.jersey_type, rule.points);
      }
    });

    // Get jersey wearers for latest stage
    const jerseyWearers = await client.query(
      `SELECT 
         sjw.rider_id,
         j.type as jersey_type
       FROM stage_jersey_wearers sjw
       JOIN jerseys j ON sjw.jersey_id = j.id
       WHERE sjw.stage_id = $1`,
      [latestStageId]
    );

    const riderJerseyPointsMap = new Map();
    jerseyWearers.rows.forEach(jersey => {
      const points = jerseyPointsMap.get(jersey.jersey_type) || 0;
      riderJerseyPointsMap.set(jersey.rider_id, points);
    });

    // Get user's fantasy team riders for latest stage
    const teamRidersQuery = await client.query(
      `SELECT 
         r.id as rider_id,
         r.first_name,
         r.last_name,
         r.photo_url,
         tp.name as team_name,
         sr.position,
         sr.time_seconds
       FROM fantasy_teams ft
       JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
       JOIN riders r ON ftr.rider_id = r.id
       LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
       LEFT JOIN stage_results sr ON sr.rider_id = r.id AND sr.stage_id = $1
       WHERE ft.participant_id = $2
         AND ftr.active = true
       ORDER BY sr.position NULLS LAST, r.last_name, r.first_name`,
      [latestStageId, participantId]
    );

    // Calculate points for each rider in latest stage
    const ridersWithPoints = teamRidersQuery.rows
      .map(rider => {
        let points = 0;

        // Points from position
        if (rider.position) {
          points += positionPointsMap.get(rider.position) || 0;
        }

        // Points from jersey
        points += riderJerseyPointsMap.get(rider.rider_id) || 0;

        return {
          rider_id: rider.rider_id,
          first_name: rider.first_name,
          last_name: rider.last_name,
          photo_url: rider.photo_url,
          team_name: rider.team_name,
          points: points,
          stage_id: latestStageId,
          stage_number: latestStage.stage_number,
          stage_name: latestStage.name,
          start_location: latestStage.start_location,
          end_location: latestStage.end_location,
          distance_km: latestStage.distance_km
        };
      })
      .filter(rider => rider.points > 0);

    let resultRiders = [];
    let routeText = '';
    let totalPoints = 0;

    if (ridersWithPoints.length > 0) {
      // Show all riders from latest stage (if they all have points from same day)
      resultRiders = ridersWithPoints;
      totalPoints = ridersWithPoints.reduce((sum, rider) => sum + rider.points, 0);
      if (latestStage.start_location && latestStage.end_location) {
        routeText = `${latestStage.start_location} - ${latestStage.end_location}`;
        if (latestStage.distance_km) {
          routeText += ` (${parseFloat(latestStage.distance_km).toFixed(0)}km)`;
        }
      } else if (latestStage.name) {
        routeText = latestStage.name;
        if (latestStage.distance_km) {
          routeText += ` (${parseFloat(latestStage.distance_km).toFixed(0)}km)`;
        }
      }
    } else {
      // Get last 3 riders with points from any stage
      const allStagesQuery = await client.query(
        `SELECT s.id, s.stage_number, s.name, s.start_location, s.end_location, s.distance_km
         FROM stages s
         WHERE EXISTS (
           SELECT 1 FROM stage_results sr WHERE sr.stage_id = s.id
         )
         ORDER BY s.stage_number DESC`
      );

      const allRidersWithPoints = [];

      for (const stage of allStagesQuery.rows) {
        // Get jersey wearers for this stage
        const stageJerseyWearers = await client.query(
          `SELECT 
             sjw.rider_id,
             j.type as jersey_type
           FROM stage_jersey_wearers sjw
           JOIN jerseys j ON sjw.jersey_id = j.id
           WHERE sjw.stage_id = $1`,
          [stage.id]
        );

        const stageRiderJerseyPointsMap = new Map();
        stageJerseyWearers.rows.forEach(jersey => {
          const points = jerseyPointsMap.get(jersey.jersey_type) || 0;
          stageRiderJerseyPointsMap.set(jersey.rider_id, points);
        });

        // Get stage results for this stage
        const stageResults = await client.query(
          `SELECT rider_id, position 
           FROM stage_results 
           WHERE stage_id = $1 
           ORDER BY position`,
          [stage.id]
        );

        // Get user's team riders for this stage
        const stageTeamRiders = await client.query(
          `SELECT 
             r.id as rider_id,
             r.first_name,
             r.last_name,
             r.photo_url,
             tp.name as team_name
           FROM fantasy_teams ft
           JOIN fantasy_team_riders ftr ON ft.id = ftr.fantasy_team_id
           JOIN riders r ON ftr.rider_id = r.id
           LEFT JOIN teams_pro tp ON r.team_pro_id = tp.id
           WHERE ft.participant_id = $1
             AND ftr.active = true
             AND EXISTS (
               SELECT 1 FROM stage_results sr 
               WHERE sr.rider_id = r.id AND sr.stage_id = $2
             )`,
          [participantId, stage.id]
        );

        stageTeamRiders.rows.forEach(rider => {
          let points = 0;

          // Points from position
          const stageResult = stageResults.rows.find(sr => sr.rider_id === rider.rider_id);
          if (stageResult) {
            points += positionPointsMap.get(stageResult.position) || 0;
          }

          // Points from jersey
          points += stageRiderJerseyPointsMap.get(rider.rider_id) || 0;

          if (points > 0) {
            allRidersWithPoints.push({
              rider_id: rider.rider_id,
              first_name: rider.first_name,
              last_name: rider.last_name,
              photo_url: rider.photo_url,
              team_name: rider.team_name,
              points: points,
              stage_id: stage.id,
              stage_number: stage.stage_number,
              stage_name: stage.name,
              start_location: stage.start_location,
              end_location: stage.end_location,
              distance_km: stage.distance_km
            });
          }
        });
      }

      // Sort by stage_number DESC, then by points DESC
      allRidersWithPoints.sort((a, b) => {
        if (b.stage_number !== a.stage_number) {
          return b.stage_number - a.stage_number;
        }
        return b.points - a.points;
      });

      // Always show at least 3 riders, but show more if they're all from the same stage
      if (allRidersWithPoints.length > 0) {
        const latestStageNumber = allRidersWithPoints[0].stage_number;
        // Find all riders from the latest stage
        const ridersFromLatestStage = allRidersWithPoints.filter(r => r.stage_number === latestStageNumber);
        
        // If there are riders from the latest stage, show all of them (even if more than 3)
        // Otherwise, show the last 3 riders (which may include riders from different stages)
        if (ridersFromLatestStage.length > 0) {
          resultRiders = ridersFromLatestStage;
        } else {
          resultRiders = allRidersWithPoints.slice(0, 3);
        }
        
        totalPoints = resultRiders.reduce((sum, rider) => sum + rider.points, 0);

        // Use route from first rider (most recent)
        const firstRider = resultRiders[0];
        if (firstRider.start_location && firstRider.end_location) {
          routeText = `${firstRider.start_location} - ${firstRider.end_location}`;
          if (firstRider.distance_km) {
            routeText += ` (${parseFloat(firstRider.distance_km).toFixed(0)}km)`;
          }
        } else if (firstRider.stage_name) {
          routeText = firstRider.stage_name;
          if (firstRider.distance_km) {
            routeText += ` (${parseFloat(firstRider.distance_km).toFixed(0)}km)`;
          }
        }
      }
    }

    // Format riders for response
    const formattedRiders = resultRiders.map(rider => ({
      id: rider.rider_id,
      name: `${rider.first_name || ''} ${rider.last_name || ''}`.trim(),
      photoUrl: rider.photo_url,
      team: rider.team_name || '',
      points: rider.points,
      route: routeText
    }));

    await client.end();

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        ok: true, 
        riders: formattedRiders,
        totalPoints: totalPoints,
        route: routeText
      })
    };
  } catch (err) {
    return await handleDbError(err, 'get-my-points-riders', client);
  }
};

