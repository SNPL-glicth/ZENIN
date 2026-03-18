import cron from 'node-cron';
import { getAllTenantIds } from '../readers/analysis_reader';
import {
  computeAnalysisCountMetric,
  computeCompletionRateMetric,
  computeProcessingLatencyMetric,
} from '../processors/analysis_metrics';
import {
  computeUploadVolumeMetric,
  computeFileSizeTrendMetric,
} from '../processors/document_metrics';
import { computeSummaryMetrics } from '../processors/summary_metrics';
import { writeChartData, writeSummaryCache } from '../writers/metrics_writer';

async function processMetricsForTenant(tenantId: string): Promise<void> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`[MetricsJob] Processing tenant: ${tenantId}`);

    // Compute all metrics in parallel
    const [
      analysisCount,
      completionRate,
      processingLatency,
      uploadVolume,
      fileSizeTrend,
      summary,
    ] = await Promise.all([
      computeAnalysisCountMetric(tenantId, thirtyDaysAgo, now).catch((e) => {
        console.error(`[MetricsJob] Error computing analysis_count for ${tenantId}:`, e);
        return null;
      }),
      computeCompletionRateMetric(tenantId, thirtyDaysAgo, now).catch((e) => {
        console.error(`[MetricsJob] Error computing completion_rate for ${tenantId}:`, e);
        return null;
      }),
      computeProcessingLatencyMetric(tenantId, thirtyDaysAgo, now).catch((e) => {
        console.error(`[MetricsJob] Error computing processing_latency for ${tenantId}:`, e);
        return null;
      }),
      computeUploadVolumeMetric(tenantId, thirtyDaysAgo, now).catch((e) => {
        console.error(`[MetricsJob] Error computing upload_volume for ${tenantId}:`, e);
        return null;
      }),
      computeFileSizeTrendMetric(tenantId, thirtyDaysAgo, now).catch((e) => {
        console.error(`[MetricsJob] Error computing file_size_trend for ${tenantId}:`, e);
        return null;
      }),
      computeSummaryMetrics(tenantId).catch((e) => {
        console.error(`[MetricsJob] Error computing summary for ${tenantId}:`, e);
        return null;
      }),
    ]);

    // Write metrics to database
    const writePromises: Promise<void>[] = [];

    if (analysisCount && analysisCount.dataPoints.length > 0) {
      writePromises.push(
        writeChartData(
          tenantId,
          analysisCount.metricType,
          analysisCount.seriesKey,
          analysisCount.dataPoints,
          analysisCount.periodStart,
          analysisCount.periodEnd,
          analysisCount.originalCount,
          analysisCount.lttbApplied
        )
      );
    }

    if (completionRate && completionRate.dataPoints.length > 0) {
      writePromises.push(
        writeChartData(
          tenantId,
          completionRate.metricType,
          completionRate.seriesKey,
          completionRate.dataPoints,
          completionRate.periodStart,
          completionRate.periodEnd,
          completionRate.originalCount,
          completionRate.lttbApplied
        )
      );
    }

    if (processingLatency && processingLatency.dataPoints.length > 0) {
      writePromises.push(
        writeChartData(
          tenantId,
          processingLatency.metricType,
          processingLatency.seriesKey,
          processingLatency.dataPoints,
          processingLatency.periodStart,
          processingLatency.periodEnd,
          processingLatency.originalCount,
          processingLatency.lttbApplied
        )
      );
    }

    if (uploadVolume && uploadVolume.dataPoints.length > 0) {
      writePromises.push(
        writeChartData(
          tenantId,
          uploadVolume.metricType,
          uploadVolume.seriesKey,
          uploadVolume.dataPoints,
          uploadVolume.periodStart,
          uploadVolume.periodEnd,
          uploadVolume.originalCount,
          uploadVolume.lttbApplied
        )
      );
    }

    if (fileSizeTrend && fileSizeTrend.dataPoints.length > 0) {
      writePromises.push(
        writeChartData(
          tenantId,
          fileSizeTrend.metricType,
          fileSizeTrend.seriesKey,
          fileSizeTrend.dataPoints,
          fileSizeTrend.periodStart,
          fileSizeTrend.periodEnd,
          fileSizeTrend.originalCount,
          fileSizeTrend.lttbApplied
        )
      );
    }

    if (summary) {
      writePromises.push(writeSummaryCache(tenantId, summary));
    }

    await Promise.all(writePromises);
    console.log(`[MetricsJob] Successfully processed tenant: ${tenantId}`);
  } catch (error) {
    console.error(`[MetricsJob] Fatal error processing tenant ${tenantId}:`, error);
  }
}

async function runMetricsJob(): Promise<void> {
  try {
    console.log('[MetricsJob] Starting metrics computation...');
    const tenantIds = await getAllTenantIds();

    if (tenantIds.length === 0) {
      console.log('[MetricsJob] No tenants found, skipping');
      return;
    }

    console.log(`[MetricsJob] Processing ${tenantIds.length} tenants`);

    // Process tenants sequentially to avoid overwhelming the database
    for (const tenantId of tenantIds) {
      await processMetricsForTenant(tenantId);
    }

    console.log('[MetricsJob] Metrics computation completed');
  } catch (error) {
    console.error('[MetricsJob] Fatal error in metrics job:', error);
  }
}

export function startMetricsScheduler(): void {
  const intervalMinutes = parseInt(process.env.METRICS_INTERVAL_MINUTES || '5');
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(`[MetricsScheduler] Starting with cron: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    await runMetricsJob();
  });

  // Run immediately on startup
  setTimeout(() => {
    runMetricsJob().catch((error) => {
      console.error('[MetricsScheduler] Error in initial run:', error);
    });
  }, 5000);
}
