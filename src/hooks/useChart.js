import { useEffect, useRef } from 'react';
import { Chart } from '../utils/charts';

export function useChart(canvasRef, config, enabled = true) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = canvasRef.current;
    if (!el) return;
    if (!config) return;

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Use requestAnimationFrame to ensure DOM is ready
    const initChart = () => {
      const ctx = el.getContext('2d');
      if (ctx) {
        try {
          chartRef.current = new Chart(ctx, config);
        } catch (error) {
          console.error('Chart initialization error:', error);
        }
      }
    };

    // Wait for next frame to ensure container has dimensions
    requestAnimationFrame(() => {
      requestAnimationFrame(initChart);
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [canvasRef, enabled, config]);

  return chartRef;
}
