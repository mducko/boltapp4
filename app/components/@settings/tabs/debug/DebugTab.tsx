import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PerformanceMonitor } from '~/lib/modules/llm/android/monitoring/PerformanceMonitor';
import { Line } from 'react-chartjs-2';
import { classNames } from '~/utils/classNames';
import { formatBytes } from '~/utils/formatSize';

interface MetricsData {
  current: {
    cpuUsage: number;
    memoryUsage: number;
    batteryLevel: number;
    fps: number;
    temperature: number;
  };
  average: {
    cpuUsage: number;
    memoryUsage: number;
    batteryLevel: number;
    fps: number;
    temperature: number;
  };
  peaks: {
    cpuUsage: number;
    memoryUsage: number;
    batteryLevel: number;
    fps: number;
    temperature: number;
  };
}

export default function DebugTab() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [chartData, setChartData] = useState<any>(null);
  const performanceMonitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const report = await performanceMonitor.getPerformanceReport();
        setMetrics(report);
      } catch (error) {
        console.error('Failed to get performance metrics:', error);
      }
    };

    // Update metrics every second
    const interval = setInterval(updateMetrics, 1000);
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const MetricCard = ({ title, value, unit, thresholds }: {
    title: string;
    value: number;
    unit: string;
    thresholds: { warning: number; critical: number };
  }) => (
    <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4">
      <h3 className="text-sm font-medium text-bolt-elements-textSecondary mb-2">{title}</h3>
      <div className="flex items-end gap-2">
        <span className={classNames(
          'text-2xl font-bold',
          getStatusColor(value, thresholds)
        )}>
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-bolt-elements-textTertiary">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="i-ph:bug-duotone text-xl text-purple-500" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">System Diagnostics</h2>
      </motion.div>

      {/* Performance Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="CPU Usage"
            value={metrics.current.cpuUsage}
            unit="%"
            thresholds={{ warning: 70, critical: 90 }}
          />
          <MetricCard
            title="Memory Usage"
            value={metrics.current.memoryUsage}
            unit="%"
            thresholds={{ warning: 80, critical: 90 }}
          />
          <MetricCard
            title="Battery Level"
            value={metrics.current.batteryLevel}
            unit="%"
            thresholds={{ warning: 20, critical: 10 }}
          />
          <MetricCard
            title="FPS"
            value={metrics.current.fps}
            unit="fps"
            thresholds={{ warning: 30, critical: 20 }}
          />
          <MetricCard
            title="Temperature"
            value={metrics.current.temperature}
            unit="°C"
            thresholds={{ warning: 40, critical: 45 }}
          />
        </div>
      )}

      {/* Performance Chart */}
      <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-bolt-elements-textPrimary">Performance History</h3>
          <div className="flex gap-2">
            {(['1m', '5m', '15m', '1h'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={classNames(
                  'px-2 py-1 rounded text-xs font-medium',
                  selectedTimeRange === range
                    ? 'bg-purple-500 text-white'
                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          {metrics && (
            <Line
              data={{
                labels: Array(20).fill(''),
                datasets: [
                  {
                    label: 'CPU',
                    data: Array(20).fill(null).map(() => metrics.current.cpuUsage),
                    borderColor: '#9333ea',
                    tension: 0.4,
                  },
                  {
                    label: 'Memory',
                    data: Array(20).fill(null).map(() => metrics.current.memoryUsage),
                    borderColor: '#2563eb',
                    tension: 0.4,
                  },
                  {
                    label: 'FPS',
                    data: Array(20).fill(null).map(() => metrics.current.fps),
                    borderColor: '#16a34a',
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                  },
                },
                animation: {
                  duration: 0,
                },
              }}
            />
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4">
        <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-4">System Information</h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-bolt-elements-borderColor">
            <span className="text-sm text-bolt-elements-textSecondary">Device</span>
            <span className="text-sm text-bolt-elements-textPrimary">Android {Platform.Version}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-bolt-elements-borderColor">
            <span className="text-sm text-bolt-elements-textSecondary">App Version</span>
            <span className="text-sm text-bolt-elements-textPrimary">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-bolt-elements-borderColor">
            <span className="text-sm text-bolt-elements-textSecondary">Build Number</span>
            <span className="text-sm text-bolt-elements-textPrimary">1</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-bolt-elements-textSecondary">Bundle ID</span>
            <span className="text-sm text-bolt-elements-textPrimary">com.bolt.droid</span>
          </div>
        </div>
      </div>

      {/* Debug Tools */}
      <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4">
        <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-4">Debug Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => performanceMonitor.clearCache()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4"
          >
            <div className="i-ph:broom-duotone" />
            <span>Clear Cache</span>
          </button>
          <button
            onClick={() => AsyncStorage.clear()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4"
          >
            <div className="i-ph:eraser-duotone" />
            <span>Clear Storage</span>
          </button>
          <button
            onClick={() => console.log('Generating logs...')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4"
          >
            <div className="i-ph:file-text-duotone" />
            <span>Export Logs</span>
          </button>
          <button
            onClick={() => console.log('Resetting app...')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            <div className="i-ph:warning-circle-duotone" />
            <span>Reset App</span>
          </button>
        </div>
      </div>
    </div>
  );
}