import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getUserId } from '../utils/auth0';
import { ensureChartsConfigured, createGradient } from '../utils/charts';
import { useChart } from '../hooks/useChart';

export function StatisticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState(null);
  const [topRiders, setTopRiders] = useState(null);
  const [mostSelected, setMostSelected] = useState(null);
  const [stageWinners, setStageWinners] = useState(null);
  const [openPopup, setOpenPopup] = useState(null);

  const topRidersRef = useRef(null);
  const teamPerformanceRef = useRef(null);
  const mostSelectedRef = useRef(null);
  const stageWinnersRef = useRef(null);

  useEffect(() => {
    ensureChartsConfigured();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getUserId();
      const userRes = await api.getUser(userId);
      const participantId = userRes?.participant?.id;

      const [overviewRes, topRidersRes, mostSelectedRes, stageWinnersRes, teamPerfRes] = await Promise.all([
        api.getStatisticsOverview(),
        api.getTopRidersStats(),
        api.getMostSelectedRiders(),
        api.getStageWinnersStats(),
        participantId ? api.getTeamPerformanceStats(participantId) : Promise.resolve(null),
      ]);

      if (cancelled) return;
      setStats(overviewRes?.ok ? overviewRes.statistics : null);
      setTopRiders(topRidersRes?.ok ? topRidersRes : null);
      setMostSelected(mostSelectedRes?.ok ? mostSelectedRes : null);
      setStageWinners(stageWinnersRes?.ok ? stageWinnersRes : null);
      setTeamPerformance(teamPerfRes?.ok ? teamPerfRes : null);
    })().catch(() => {
      // keep silent like legacy page
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Close popups on outside click
  useEffect(() => {
    function onDocClick(e) {
      const inside = e.target.closest?.('.info-popup') || e.target.closest?.('.info-icon-button');
      if (!inside) setOpenPopup(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const topRidersChartConfig = useMemo(() => {
    const labels = topRiders?.riders?.length ? topRiders.riders.map((r) => r.name) : ['Geen data beschikbaar'];
    const points = topRiders?.riders?.length ? topRiders.riders.map((r) => r.points) : [0];

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Punten',
            data: points,
            backgroundColor: (ctx) =>
              createGradient(ctx.chart.ctx, 'rgba(0, 202, 198, 0.8)', 'rgba(0, 202, 198, 0.2)'),
            borderColor: '#00cac6',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `Punten: ${context.parsed.x}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(205, 215, 220, 0.3)', drawBorder: false },
            ticks: { color: '#668494', font: { size: 12 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#00334e', font: { size: 13, weight: '500' } },
          },
        },
      },
    };
  }, [topRiders]);

  const mostSelectedChartConfig = useMemo(() => {
    const labels = mostSelected?.riders?.length ? mostSelected.riders.map((r) => r.name) : ['Geen data beschikbaar'];
    const counts = mostSelected?.riders?.length ? mostSelected.riders.map((r) => r.selectionCount) : [0];

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Aantal teams',
            data: counts,
            backgroundColor: (ctx) =>
              createGradient(ctx.chart.ctx, 'rgba(0, 170, 46, 0.8)', 'rgba(0, 202, 198, 0.8)'),
            borderColor: '#00aa2e',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `In ${context.parsed.x} team${context.parsed.x !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(205, 215, 220, 0.3)', drawBorder: false },
            ticks: { color: '#668494', font: { size: 12 }, stepSize: 1 },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#00334e', font: { size: 13, weight: '500' } },
          },
        },
      },
    };
  }, [mostSelected]);

  const stageWinnersChartConfig = useMemo(() => {
    const labels = stageWinners?.teamWins?.length ? stageWinners.teamWins.map((t) => t.team) : ['Geen data beschikbaar'];
    const wins = stageWinners?.teamWins?.length ? stageWinners.teamWins.map((t) => t.wins) : [0];

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Etappe Overwinningen',
            data: wins,
            backgroundColor: (ctx) =>
              createGradient(ctx.chart.ctx, 'rgba(0, 170, 46, 0.8)', 'rgba(0, 202, 198, 0.8)'),
            borderColor: '#00aa2e',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.parsed.y} overwinning${context.parsed.y !== 1 ? 'en' : ''}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#00334e', font: { size: 12, weight: '500' } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(205, 215, 220, 0.3)', drawBorder: false },
            ticks: { color: '#668494', font: { size: 12 }, stepSize: 1 },
          },
        },
      },
    };
  }, [stageWinners]);

  const teamPerformanceChartConfig = useMemo(() => {
    const labels = teamPerformance?.stages || [];
    const teams = teamPerformance?.teams || [];

    // Fallback if no data
    if (!labels.length || !teams.length) {
      return {
        type: 'line',
        data: { labels: ['-'], datasets: [{ label: 'Geen data', data: [0], borderColor: '#00cac6' }] },
        options: { responsive: true, maintainAspectRatio: false },
      };
    }

    return {
      type: 'line',
      data: {
        labels,
        datasets: teams.map((team, i) => {
          const borderColor = i === 0 ? '#00cac6' : i === 1 ? '#00aa2e' : i === 2 ? '#00334e' : '#668494';
          return {
            label: team.label || team.teamName || team.name || `Team ${i + 1}`,
            data: team.points || team.data || [],
            borderColor,
            backgroundColor: `${borderColor}15`,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            pointBorderColor: borderColor,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.9)',
            padding: 12,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y} punten`,
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(205, 215, 220, 0.3)', drawBorder: false }, ticks: { color: '#668494' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(205, 215, 220, 0.3)', drawBorder: false },
            ticks: { color: '#668494' },
          },
        },
      },
    };
  }, [teamPerformance]);

  useChart(topRidersRef, topRidersChartConfig, true);
  useChart(mostSelectedRef, mostSelectedChartConfig, true);
  useChart(stageWinnersRef, stageWinnersChartConfig, true);
  useChart(teamPerformanceRef, teamPerformanceChartConfig, true);

  return (
    <>
      <div id="build-info" className="build-info" />

      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-top">
                <a
                  href="#"
                  className="back-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/home.html');
                  }}
                >
                  <img src="/assets/arrow.svg" alt="" className="back-arrow" aria-hidden="true" />
                  <span>Terug</span>
                </a>
                <div className="header-title">Interpolis tourspel</div>
              </div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <h1 className="welcome-heading">Statistieken</h1>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content page">
        <div className="grid">
          <div className="col-12">
            <div className="dashboard-grid statistics-grid">
              <div className="dashboard-column col-12">
                <div className="stats-cards-row">
                  <div className="stat-card">
                    <div className="stat-value" id="stat-riders">
                      {stats ? `${stats.activeRiders} / ${stats.totalRiders}` : '-'}
                    </div>
                    <div className="stat-label" id="stat-riders-label">
                      Renners (actief / totaal)
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" id="stat-stages">
                      {stats ? `${stats.stagesWithResults} / ${stats.totalStages}` : '-'}
                    </div>
                    <div className="stat-label" id="stat-stages-label">
                      Etappes (gereden / totaal)
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" id="stat-teams">
                      {stats ? stats.teamsCount || 0 : '-'}
                    </div>
                    <div className="stat-label">Teams</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" id="stat-points">
                      {stats ? Math.round(stats.averagePoints || 0).toLocaleString('nl-NL') : '-'}
                    </div>
                    <div className="stat-label">Gemiddeld punten per team</div>
                  </div>
                </div>
              </div>

              <div className="dashboard-column">
                <div className="dashboard-section chart-tile">
                  <div className="team-card-header">
                    <h2 className="dashboard-section-title">Top Renners</h2>
                    <button
                      className="info-icon-button"
                      type="button"
                      aria-label="Informatie over top renners"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPopup(openPopup === 'top' ? null : 'top');
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
                          i
                        </text>
                      </svg>
                    </button>
                    <div className="info-popup" style={{ display: openPopup === 'top' ? 'block' : 'none' }}>
                      <div className="info-popup-content">
                        <h3>Top Renners</h3>
                        <p>
                          Hier zie je de top 10 renners met de meeste punten. De punten worden berekend op basis van etappe
                          posities en truien.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="chart-container">
                    <canvas ref={topRidersRef} />
                  </div>
                </div>

                <div className="dashboard-section chart-tile">
                  <div className="team-card-header">
                    <h2 className="dashboard-section-title">Team Prestaties</h2>
                    <button
                      className="info-icon-button"
                      type="button"
                      aria-label="Informatie over team prestaties"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPopup(openPopup === 'team' ? null : 'team');
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
                          i
                        </text>
                      </svg>
                    </button>
                    <div className="info-popup" style={{ display: openPopup === 'team' ? 'block' : 'none' }}>
                      <div className="info-popup-content">
                        <h3>Team Prestaties</h3>
                        <p>Hier zie je de ontwikkeling van je team punten per etappe vergeleken met andere teams.</p>
                      </div>
                    </div>
                  </div>
                  <div className="chart-container">
                    <canvas ref={teamPerformanceRef} />
                  </div>
                </div>
              </div>

              <div className="dashboard-column">
                <div className="dashboard-section chart-tile">
                  <div className="team-card-header">
                    <h2 className="dashboard-section-title">Meest Geselecteerde Renners</h2>
                    <button
                      className="info-icon-button"
                      type="button"
                      aria-label="Informatie over meest geselecteerde renners"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPopup(openPopup === 'most' ? null : 'most');
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
                          i
                        </text>
                      </svg>
                    </button>
                    <div className="info-popup" style={{ display: openPopup === 'most' ? 'block' : 'none' }}>
                      <div className="info-popup-content">
                        <h3>Meest Geselecteerde Renners</h3>
                        <p>Deze grafiek toont welke renners het populairst zijn en in de meeste teams zitten.</p>
                      </div>
                    </div>
                  </div>
                  <div className="chart-container">
                    <canvas ref={mostSelectedRef} />
                  </div>
                </div>

                <div className="dashboard-section chart-tile">
                  <h2 className="dashboard-section-title">Etappe Winnaars</h2>
                  <div className="chart-container">
                    <canvas ref={stageWinnersRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
