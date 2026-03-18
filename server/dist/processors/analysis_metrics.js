"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAnalysisCountMetric = computeAnalysisCountMetric;
exports.computeCompletionRateMetric = computeCompletionRateMetric;
exports.computeProcessingLatencyMetric = computeProcessingLatencyMetric;
const analysis_reader_1 = require("../readers/analysis_reader");
const lttb_1 = require("./lttb");
async function computeAnalysisCountMetric(tenantId, fromDate, toDate) {
    const analyses = await (0, analysis_reader_1.getAnalysesByTenant)(tenantId, fromDate, toDate);
    // Group by day
    const dailyCounts = new Map();
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
    const { points, originalCount, lttbApplied } = (0, lttb_1.prepareLTTBData)(rawData, 200);
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
async function computeCompletionRateMetric(tenantId, fromDate, toDate) {
    const analyses = await (0, analysis_reader_1.getAnalysesByTenant)(tenantId, fromDate, toDate);
    // Group by day and calculate completion rate
    const dailyStats = new Map();
    analyses.forEach((a) => {
        const day = a.created_at.toISOString().split('T')[0];
        const stats = dailyStats.get(day) || { total: 0, analyzed: 0 };
        stats.total++;
        if (a.status === 'analyzed')
            stats.analyzed++;
        dailyStats.set(day, stats);
    });
    const rawData = Array.from(dailyStats.entries()).map(([date, stats]) => ({
        timestamp: new Date(date + 'T00:00:00Z'),
        value: stats.total > 0 ? (stats.analyzed / stats.total) * 100 : 0,
    }));
    rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const { points, originalCount, lttbApplied } = (0, lttb_1.prepareLTTBData)(rawData, 200);
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
async function computeProcessingLatencyMetric(tenantId, fromDate, toDate) {
    const analyses = await (0, analysis_reader_1.getAnalysesByTenant)(tenantId, fromDate, toDate);
    // Group by day and calculate average latency
    const dailyLatencies = new Map();
    analyses.forEach((a) => {
        if (a.status === 'analyzed' && a.analyzed_at) {
            const day = a.created_at.toISOString().split('T')[0];
            const latencySeconds = (a.analyzed_at.getTime() - a.created_at.getTime()) / 1000;
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
    const { points, originalCount, lttbApplied } = (0, lttb_1.prepareLTTBData)(rawData, 200);
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
//# sourceMappingURL=analysis_metrics.js.map