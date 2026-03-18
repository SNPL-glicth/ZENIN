import { getAnalysesByTenant } from '../readers/analysis_reader';
import { prepareLTTBData } from './lttb';

export async function computeAnalysisCountMetric(
  tenantId: string,
  fromDate: Date,
  toDate: Date
): Promise<{
  metricType: string;
  seriesKey: string;
  dataPoints: Array<{ timestamp: string; value: number }>;
  periodStart: Date;
  periodEnd: Date;
  originalCount: number;
  lttbApplied: boolean;
}> {
  const analyses = await getAnalysesByTenant(tenantId, fromDate, toDate);

  // Group by day
  const dailyCounts = new Map<string, number>();
  analyses.forEach((a) => {
    const day = a.created_at.toISOString().split('T')[0];
    dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
  });

  // Convert to time series
  const rawData = Array.from(dailyCounts.entries()).map(([date, count]) => ({
    timestamp: new Date(date + 'T00:00:00Z'),
    value: count,
  }));

  rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const { points, originalCount, lttbApplied } = prepareLTTBData(rawData, 200);

  return {
    metricType: 'analysis_count',
    seriesKey: tenantId,
    dataPoints: points,
    periodStart: fromDate,
    periodEnd: toDate,
    originalCount,
    lttbApplied,
  };
}

export async function computeCompletionRateMetric(
  tenantId: string,
  fromDate: Date,
  toDate: Date
): Promise<{
  metricType: string;
  seriesKey: string;
  dataPoints: Array<{ timestamp: string; value: number }>;
  periodStart: Date;
  periodEnd: Date;
  originalCount: number;
  lttbApplied: boolean;
}> {
  const analyses = await getAnalysesByTenant(tenantId, fromDate, toDate);

  // Group by day and calculate completion rate
  const dailyStats = new Map<string, { total: number; analyzed: number }>();
  analyses.forEach((a) => {
    const day = a.created_at.toISOString().split('T')[0];
    const stats = dailyStats.get(day) || { total: 0, analyzed: 0 };
    stats.total++;
    if (a.status === 'analyzed') stats.analyzed++;
    dailyStats.set(day, stats);
  });

  const rawData = Array.from(dailyStats.entries()).map(([date, stats]) => ({
    timestamp: new Date(date + 'T00:00:00Z'),
    value: stats.total > 0 ? (stats.analyzed / stats.total) * 100 : 0,
  }));

  rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const { points, originalCount, lttbApplied } = prepareLTTBData(rawData, 200);

  return {
    metricType: 'completion_rate',
    seriesKey: tenantId,
    dataPoints: points,
    periodStart: fromDate,
    periodEnd: toDate,
    originalCount,
    lttbApplied,
  };
}

export async function computeProcessingLatencyMetric(
  tenantId: string,
  fromDate: Date,
  toDate: Date
): Promise<{
  metricType: string;
  seriesKey: string;
  dataPoints: Array<{ timestamp: string; value: number }>;
  periodStart: Date;
  periodEnd: Date;
  originalCount: number;
  lttbApplied: boolean;
}> {
  const analyses = await getAnalysesByTenant(tenantId, fromDate, toDate);

  // Group by day and calculate average latency
  const dailyLatencies = new Map<string, number[]>();
  analyses.forEach((a) => {
    if (a.status === 'analyzed' && a.analyzed_at) {
      const day = a.created_at.toISOString().split('T')[0];
      const latencySeconds =
        (a.analyzed_at.getTime() - a.created_at.getTime()) / 1000;
      const latencies = dailyLatencies.get(day) || [];
      latencies.push(latencySeconds);
      dailyLatencies.set(day, latencies);
    }
  });

  const rawData = Array.from(dailyLatencies.entries()).map(([date, latencies]) => {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return {
      timestamp: new Date(date + 'T00:00:00Z'),
      value: avgLatency,
    };
  });

  rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const { points, originalCount, lttbApplied } = prepareLTTBData(rawData, 200);

  return {
    metricType: 'processing_latency',
    seriesKey: tenantId,
    dataPoints: points,
    periodStart: fromDate,
    periodEnd: toDate,
    originalCount,
    lttbApplied,
  };
}
