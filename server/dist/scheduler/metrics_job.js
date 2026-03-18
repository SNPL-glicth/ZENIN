"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsScheduler = startMetricsScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const analysis_reader_1 = require("../readers/analysis_reader");
const analysis_metrics_1 = require("../processors/analysis_metrics");
const document_metrics_1 = require("../processors/document_metrics");
const summary_metrics_1 = require("../processors/summary_metrics");
const metrics_writer_1 = require("../writers/metrics_writer");
async function processMetricsForTenant(tenantId) {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        console.log(`[MetricsJob] Processing tenant: ${tenantId}`);
        // Compute all metrics in parallel
        const [analysisCount, completionRate, processingLatency, uploadVolume, fileSizeTrend, summary,] = await Promise.all([
            (0, analysis_metrics_1.computeAnalysisCountMetric)(tenantId, thirtyDaysAgo, now).catch((e) => {
                console.error(`[MetricsJob] Error computing analysis_count for ${tenantId}:`, e);
                return null;
            }),
            (0, analysis_metrics_1.computeCompletionRateMetric)(tenantId, thirtyDaysAgo, now).catch((e) => {
                console.error(`[MetricsJob] Error computing completion_rate for ${tenantId}:`, e);
                return null;
            }),
            (0, analysis_metrics_1.computeProcessingLatencyMetric)(tenantId, thirtyDaysAgo, now).catch((e) => {
                console.error(`[MetricsJob] Error computing processing_latency for ${tenantId}:`, e);
                return null;
            }),
            (0, document_metrics_1.computeUploadVolumeMetric)(tenantId, thirtyDaysAgo, now).catch((e) => {
                console.error(`[MetricsJob] Error computing upload_volume for ${tenantId}:`, e);
                return null;
            }),
            (0, document_metrics_1.computeFileSizeTrendMetric)(tenantId, thirtyDaysAgo, now).catch((e) => {
                console.error(`[MetricsJob] Error computing file_size_trend for ${tenantId}:`, e);
                return null;
            }),
            (0, summary_metrics_1.computeSummaryMetrics)(tenantId).catch((e) => {
                console.error(`[MetricsJob] Error computing summary for ${tenantId}:`, e);
                return null;
            }),
        ]);
        // Write metrics to database
        const writePromises = [];
        if (analysisCount && analysisCount.dataPoints.length > 0) {
            writePromises.push((0, metrics_writer_1.writeChartData)(tenantId, analysisCount.metricType, analysisCount.seriesKey, analysisCount.dataPoints, analysisCount.periodStart, analysisCount.periodEnd, analysisCount.originalCount, analysisCount.lttbApplied));
        }
        if (completionRate && completionRate.dataPoints.length > 0) {
            writePromises.push((0, metrics_writer_1.writeChartData)(tenantId, completionRate.metricType, completionRate.seriesKey, completionRate.dataPoints, completionRate.periodStart, completionRate.periodEnd, completionRate.originalCount, completionRate.lttbApplied));
        }
        if (processingLatency && processingLatency.dataPoints.length > 0) {
            writePromises.push((0, metrics_writer_1.writeChartData)(tenantId, processingLatency.metricType, processingLatency.seriesKey, processingLatency.dataPoints, processingLatency.periodStart, processingLatency.periodEnd, processingLatency.originalCount, processingLatency.lttbApplied));
        }
        if (uploadVolume && uploadVolume.dataPoints.length > 0) {
            writePromises.push((0, metrics_writer_1.writeChartData)(tenantId, uploadVolume.metricType, uploadVolume.seriesKey, uploadVolume.dataPoints, uploadVolume.periodStart, uploadVolume.periodEnd, uploadVolume.originalCount, uploadVolume.lttbApplied));
        }
        if (fileSizeTrend && fileSizeTrend.dataPoints.length > 0) {
            writePromises.push((0, metrics_writer_1.writeChartData)(tenantId, fileSizeTrend.metricType, fileSizeTrend.seriesKey, fileSizeTrend.dataPoints, fileSizeTrend.periodStart, fileSizeTrend.periodEnd, fileSizeTrend.originalCount, fileSizeTrend.lttbApplied));
        }
        if (summary) {
            writePromises.push((0, metrics_writer_1.writeSummaryCache)(tenantId, summary));
        }
        await Promise.all(writePromises);
        console.log(`[MetricsJob] Successfully processed tenant: ${tenantId}`);
    }
    catch (error) {
        console.error(`[MetricsJob] Fatal error processing tenant ${tenantId}:`, error);
    }
}
async function runMetricsJob() {
    try {
        console.log('[MetricsJob] Starting metrics computation...');
        const tenantIds = await (0, analysis_reader_1.getAllTenantIds)();
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
    }
    catch (error) {
        console.error('[MetricsJob] Fatal error in metrics job:', error);
    }
}
function startMetricsScheduler() {
    const intervalMinutes = parseInt(process.env.METRICS_INTERVAL_MINUTES || '5');
    const cronExpression = `*/${intervalMinutes} * * * *`;
    console.log(`[MetricsScheduler] Starting with cron: ${cronExpression}`);
    node_cron_1.default.schedule(cronExpression, async () => {
        await runMetricsJob();
    });
    // Run immediately on startup
    setTimeout(() => {
        runMetricsJob().catch((error) => {
            console.error('[MetricsScheduler] Error in initial run:', error);
        });
    }, 5000);
}
//# sourceMappingURL=metrics_job.js.map