async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'Content-Type': options?.headers?.['Content-Type'] || 'application/json',
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  async getStatisticsOverview() {
    return await fetchJson('/.netlify/functions/get-statistics-overview');
  },

  async getTopRidersStats() {
    return await fetchJson('/.netlify/functions/get-top-riders-stats');
  },

  async getMostSelectedRiders() {
    return await fetchJson('/.netlify/functions/get-most-selected-riders');
  },

  async getStageWinnersStats() {
    return await fetchJson('/.netlify/functions/get-stage-winners-stats');
  },

  async getTeamPerformanceStats(participantId) {
    const url = participantId 
      ? `/.netlify/functions/get-team-performance-stats?participantId=${encodeURIComponent(participantId)}`
      : `/.netlify/functions/get-team-performance-stats`;
    return await fetchJson(url);
  },

  async getStagesWithResults() {
    return await fetchJson('/.netlify/functions/get-stages-with-results');
  },

  async getStagesWithoutResults() {
    return await fetchJson('/.netlify/functions/get-stages-without-results');
  },

  async getStageResults(stageNumber) {
    return await fetchJson(`/.netlify/functions/get-stage-results?stage_number=${encodeURIComponent(stageNumber)}`);
  },

  async getMyStageRiders({ userId, stageNumber }) {
    return await fetchJson(
      `/.netlify/functions/get-my-stage-riders?userId=${encodeURIComponent(userId)}&stage_number=${encodeURIComponent(stageNumber)}`
    );
  },

  async getStageJerseyWearers(stageNumber) {
    return await fetchJson(`/.netlify/functions/get-stage-jersey-wearers?stage_number=${encodeURIComponent(stageNumber)}`);
  },

  async getStageTeamPoints(stageNumber) {
    return await fetchJson(`/.netlify/functions/get-stage-team-points?stage_number=${encodeURIComponent(stageNumber)}`);
  },

  async validateStageResults({ stageId, resultsText }) {
    return await fetchJson('/.netlify/functions/validate-stage-results', {
      method: 'POST',
      body: JSON.stringify({ stageId, resultsText }),
    });
  },

  async getStageJerseys(stageNumber) {
    return await fetchJson(`/.netlify/functions/get-stage-jerseys?stage_number=${encodeURIComponent(stageNumber)}`);
  },

  async importStageResults({ stageId, results, jerseys }) {
    return await fetchJson('/.netlify/functions/import-stage-results', {
      method: 'POST',
      body: JSON.stringify({ stageId, results, jerseys }),
    });
  },

  async checkAdmin(userId) {
    return await fetchJson(`/.netlify/functions/check-admin?userId=${encodeURIComponent(userId)}`);
  },

  async getSettings() {
    return await fetchJson('/.netlify/functions/get-settings');
  },

  async saveSettings({ userId, settings }) {
    return await fetchJson(`/.netlify/functions/save-settings?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  },

  async getStages() {
    return await fetchJson('/.netlify/functions/get-stages');
  },

  async updateStageStatus({ userId, stageId, isNeutralized, isCancelled }) {
    return await fetchJson(`/.netlify/functions/update-stage-status?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: JSON.stringify({ stageId, isNeutralized, isCancelled }),
    });
  },

  async addStage({ userId, stageNumber, name, startLocation, endLocation, distanceKm, date }) {
    return await fetchJson(`/.netlify/functions/add-stage?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: JSON.stringify({ userId, stageNumber, name, startLocation, endLocation, distanceKm, date }),
    });
  },

  async getTeamComparison(participantId) {
    return await fetchJson(`/.netlify/functions/get-team-comparison?participantId=${encodeURIComponent(participantId)}`);
  },

  async getUser(userId) {
    return await fetchJson(`/.netlify/functions/get-user?userId=${encodeURIComponent(userId)}`);
  },

  async getStandings() {
    return await fetchJson('/.netlify/functions/get-standings');
  },

  async getMyPointsRiders(userId) {
    return await fetchJson(`/.netlify/functions/get-my-points-riders?userId=${encodeURIComponent(userId)}`);
  },

  async getPrikbordMessages() {
    return await fetchJson('/.netlify/functions/get-prikbord-messages');
  },

  async postPrikbordMessage({ userId, message }) {
    return await fetchJson('/.netlify/functions/post-prikbord-message', {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    });
  },

  async getLatestStage() {
    return await fetchJson('/.netlify/functions/get-latest-stage');
  },

  async getTeamRiders(userId) {
    return await fetchJson(`/.netlify/functions/get-team-riders?userId=${encodeURIComponent(userId)}`);
  },

  async getTeamJerseys(userId) {
    return await fetchJson(`/.netlify/functions/get-team-jerseys?userId=${encodeURIComponent(userId)}`);
  },

  async checkFirstStageHasResults() {
    return await fetchJson('/.netlify/functions/check-first-stage-has-results');
  },

  async saveParticipant({ userId, teamName, email, avatarUrl, newsletter }) {
    return await fetchJson('/.netlify/functions/save-participant', {
      method: 'POST',
      body: JSON.stringify({ userId, teamName, email, avatarUrl, newsletter }),
    });
  },

  async getDailyWinners() {
    // Get latest stage first, then get top 3 teams for that stage
    const latestStageRes = await fetchJson('/.netlify/functions/get-latest-stage');
    if (!latestStageRes?.ok || !latestStageRes?.stage) {
      return { ok: true, winners: [] };
    }
    const stageNumber = latestStageRes.stage.stage_number;
    const teamPointsRes = await fetchJson(`/.netlify/functions/get-stage-team-points?stage_number=${encodeURIComponent(stageNumber)}`);
    if (!teamPointsRes?.ok || !Array.isArray(teamPointsRes.teams)) {
      return { ok: true, winners: [] };
    }
    // Return top 3 teams
    return {
      ok: true,
      winners: teamPointsRes.teams.slice(0, 3),
      stageNumber: stageNumber
    };
  },
};
