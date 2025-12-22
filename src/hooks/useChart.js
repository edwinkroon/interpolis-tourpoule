import { useEffect, useRef } from 'react';
import { Chart } from '../utils/charts';

export function useChart(canvasRef, config, enabled = true) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = canvasRef.current;
    if (!el) return;
    if (!config) return;

    // Destroy previous instance first
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      chartRef.current = null;
    }

    // Check if canvas is already in use by another chart instance
    // Chart.js stores chart instances on the canvas element
    const existingChart = Chart.getChart(el);
    if (existingChart) {
      try {
        existingChart.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    let rafId;
    const initChart = () => {
      // Double check that canvas is still available
      const existingChart = Chart.getChart(el);
      if (existingChart) {
        try {
          existingChart.destroy();
        } catch (error) {
          // Ignore errors
        }
      }

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
    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(initChart);
    });

    return () => {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Destroy chart instance
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch (error) {
          // Ignore errors during cleanup
        }
        chartRef.current = null;
      }

      // Also check and destroy any chart on the canvas element
      const existingChart = Chart.getChart(el);
      if (existingChart) {
        try {
          existingChart.destroy();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [canvasRef, enabled, config]);

  return chartRef;
}
