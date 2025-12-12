import { useEffect, useRef } from 'react';
import { Chart } from '../utils/charts';

export function useChart(canvasRef, config, enabled = true) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = canvasRef.current;
    if (!el) return;

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = el.getContext('2d');
    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [canvasRef, enabled, config]);

  return chartRef;
}
