import React, { useMemo, useRef } from 'react';
import { useChart } from '../hooks/useChart';
import { ensureChartsConfigured, createGradient } from '../utils/charts';

export function TeamPerformanceChart({ performanceData, teamName, className = '' }) {
  const canvasRef = useRef(null);

  React.useEffect(() => {
    ensureChartsConfigured();
  }, []);

  const chartConfig = useMemo(() => {
    if (!performanceData || !performanceData.stages || !performanceData.teams || performanceData.teams.length === 0) {
      return null;
    }

    const teamData = performanceData.teams.find(t => t.teamName === teamName) || performanceData.teams[0];
    if (!teamData || !teamData.points || teamData.points.length === 0) {
      return null;
    }

    const labels = performanceData.stages || [];
    const points = teamData.points || [];

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Totaal punten',
            data: points,
            borderColor: '#00cac6',
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: chartCtx, chartArea } = chart;
              if (!chartArea) return 'rgba(0, 202, 198, 0.1)';
              return createGradient(chartCtx, 'rgba(0, 202, 198, 0.2)', 'rgba(0, 202, 198, 0.05)');
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#00cac6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#00aa2e',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 51, 78, 0.95)',
            padding: 12,
            titleFont: { size: 14, weight: '600' },
            bodyFont: { size: 13 },
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (context) => {
                const index = context.dataIndex;
                const currentPoints = context.parsed.y;
                const prevPoints = index > 0 ? points[index - 1] : 0;
                const stagePointsEarned = currentPoints - prevPoints;
                return [
                  `Totaal: ${currentPoints} punten`,
                  index > 0 ? `+${stagePointsEarned} punten deze etappe` : 'Start',
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#668494',
              font: { size: 12 },
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(205, 215, 220, 0.3)',
              drawBorder: false,
            },
            ticks: {
              color: '#668494',
              font: { size: 12 },
              callback: function(value) {
                return value;
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    };
  }, [performanceData, teamName]);

  useChart(canvasRef, chartConfig, !!chartConfig);

  if (!performanceData || !performanceData.stages || performanceData.stages.length === 0) {
    return (
      <div className={`team-performance-chart ${className}`} style={{ padding: '2rem', textAlign: 'center', color: '#668494' }}>
        Nog geen prestatiegegevens beschikbaar
      </div>
    );
  }

  return (
    <div className={`team-performance-chart ${className}`} style={{ position: 'relative', height: '300px', width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

