import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

let configured = false;

export function ensureChartsConfigured() {
  if (configured) return;

  Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
    Filler
  );

  // Set global font defaults (safe initialization)
  if (Chart.defaults.font) {
    Chart.defaults.font.family = "'Open Sans', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
  }
  
  Chart.defaults.color = '#00334e';
  
  if (Chart.defaults.animation) {
    Chart.defaults.animation.duration = 1000;
    Chart.defaults.animation.easing = 'easeOutQuart';
  }
  
  // Set legend defaults (safe initialization)
  if (Chart.defaults.plugins?.legend) {
    Chart.defaults.plugins.legend.display = true;
    Chart.defaults.plugins.legend.position = 'bottom';
    
    if (Chart.defaults.plugins.legend.labels) {
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.padding = 15;
      
      // Initialize font object if it doesn't exist
      if (!Chart.defaults.plugins.legend.labels.font) {
        Chart.defaults.plugins.legend.labels.font = {};
      }
      Chart.defaults.plugins.legend.labels.font.size = 13;
    }
  }

  configured = true;
}

export function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

export { Chart };
