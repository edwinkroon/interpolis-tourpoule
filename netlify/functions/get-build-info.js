exports.handler = async function(event) {
  // Get build info from Netlify environment variables
  const buildInfo = {
    deployId: process.env.DEPLOY_ID || 'local',
    commitRef: process.env.COMMIT_REF || 'unknown',
    deployTime: process.env.DEPLOY_TIME || new Date().toISOString(),
    context: process.env.CONTEXT || 'local'
  };

  // Create a short identifier (first 7 chars of commit hash or deploy ID)
  const shortId = buildInfo.commitRef !== 'unknown' 
    ? buildInfo.commitRef.substring(0, 7)
    : buildInfo.deployId.substring(0, 7);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({
      shortId: shortId,
      deployId: buildInfo.deployId,
      commitRef: buildInfo.commitRef,
      deployTime: buildInfo.deployTime,
      context: buildInfo.context
    })
  };
};

