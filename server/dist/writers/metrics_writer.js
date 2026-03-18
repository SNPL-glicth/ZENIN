"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeChartData = writeChartData;
exports.writeSummaryCache = writeSummaryCache;
const db_1 = require("../config/db");
async function writeChartData(tenantId, metricType, seriesKey, dataPoints, periodStart, periodEnd, originalPointCount, lttbApplied) {
    try {
        const pool = await (0, db_1.getConnection)();
        await pool
            .request()
            .input('tenantId', db_1.sql.UniqueIdentifier, tenantId)
            .input('metricType', db_1.sql.NVarChar(50), metricType)
            .input('seriesKey', db_1.sql.NVarChar(100), seriesKey)
            .input('dataPoints', db_1.sql.NVarChar(db_1.sql.MAX), JSON.stringify(dataPoints))
            .input('periodStart', db_1.sql.DateTime2, periodStart)
            .input('periodEnd', db_1.sql.DateTime2, periodEnd)
            .input('originalPointCount', db_1.sql.Int, originalPointCount)
            .input('lttbApplied', db_1.sql.Bit, lttbApplied ? 1 : 0)
            .query(`
        -- Delete existing metric for same tenant/type/period
        DELETE FROM zenin_metrics.chart_data
        WHERE tenant_id = @tenantId
          AND metric_type = @metricType
          AND series_key = @seriesKey
          AND period_start = @periodStart
          AND period_end = @periodEnd;

        -- Insert new metric
        INSERT INTO zenin_metrics.chart_data (
          tenant_id, metric_type, series_key, data_points,
          period_start, period_end, original_point_count, lttb_applied
        )
        VALUES (
          @tenantId, @metricType, @seriesKey, @dataPoints,
          @periodStart, @periodEnd, @originalPointCount, @lttbApplied
        );
      `);
    }
    catch (error) {
        console.error('[MetricsWriter] Error writing chart data:', error);
        throw error;
    }
}
async function writeSummaryCache(tenantId, summary) {
    try {
        const pool = await (0, db_1.getConnection)();
        await pool
            .request()
            .input('tenantId', db_1.sql.UniqueIdentifier, tenantId)
            .input('totalAnalyses', db_1.sql.Int, summary.totalAnalyses)
            .input('totalFiles', db_1.sql.Int, summary.totalFiles)
            .input('totalSizeBytes', db_1.sql.BigInt, summary.totalSizeBytes)
            .input('analysesThisWeek', db_1.sql.Int, summary.analysesThisWeek)
            .input('analysesToday', db_1.sql.Int, summary.analysesToday)
            .input('completionRatePercent', db_1.sql.Decimal(5, 2), summary.completionRatePercent)
            .input('errorRatePercent', db_1.sql.Decimal(5, 2), summary.errorRatePercent)
            .input('avgProcessingSeconds', db_1.sql.Decimal(10, 2), summary.avgProcessingSeconds)
            .input('lastActivity', db_1.sql.DateTime2, summary.lastActivity)
            .input('classificationBreakdown', db_1.sql.NVarChar(db_1.sql.MAX), JSON.stringify(summary.classificationBreakdown))
            .input('statusBreakdown', db_1.sql.NVarChar(db_1.sql.MAX), JSON.stringify(summary.statusBreakdown))
            .query(`
        -- Delete existing summary
        DELETE FROM zenin_metrics.summary_cache WHERE tenant_id = @tenantId;

        -- Insert new summary
        INSERT INTO zenin_metrics.summary_cache (
          tenant_id, total_analyses, total_files, total_size_bytes,
          analyses_this_week, analyses_today, completion_rate_percent,
          error_rate_percent, avg_processing_seconds, last_activity,
          classification_breakdown, status_breakdown
        )
        VALUES (
          @tenantId, @totalAnalyses, @totalFiles, @totalSizeBytes,
          @analysesThisWeek, @analysesToday, @completionRatePercent,
          @errorRatePercent, @avgProcessingSeconds, @lastActivity,
          @classificationBreakdown, @statusBreakdown
        );
      `);
    }
    catch (error) {
        console.error('[MetricsWriter] Error writing summary cache:', error);
        throw error;
    }
}
//# sourceMappingURL=metrics_writer.js.map