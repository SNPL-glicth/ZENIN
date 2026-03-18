import { getConnection, sql } from '../config/db';
import { DataPoint } from '../processors/lttb';

export async function writeChartData(
  tenantId: string,
  metricType: string,
  seriesKey: string,
  dataPoints: DataPoint[],
  periodStart: Date,
  periodEnd: Date,
  originalPointCount: number,
  lttbApplied: boolean
): Promise<void> {
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .input('metricType', sql.NVarChar(50), metricType)
      .input('seriesKey', sql.NVarChar(100), seriesKey)
      .input('dataPoints', sql.NVarChar(sql.MAX), JSON.stringify(dataPoints))
      .input('periodStart', sql.DateTime2, periodStart)
      .input('periodEnd', sql.DateTime2, periodEnd)
      .input('originalPointCount', sql.Int, originalPointCount)
      .input('lttbApplied', sql.Bit, lttbApplied ? 1 : 0)
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
  } catch (error) {
    console.error('[MetricsWriter] Error writing chart data:', error);
    throw error;
  }
}

export async function writeSummaryCache(
  tenantId: string,
  summary: {
    totalAnalyses: number;
    totalFiles: number;
    totalSizeBytes: number;
    analysesThisWeek: number;
    analysesToday: number;
    completionRatePercent: number | null;
    errorRatePercent: number | null;
    avgProcessingSeconds: number | null;
    lastActivity: Date | null;
    classificationBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
  }
): Promise<void> {
  try {
    const pool = await getConnection();
    await pool
      .request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .input('totalAnalyses', sql.Int, summary.totalAnalyses)
      .input('totalFiles', sql.Int, summary.totalFiles)
      .input('totalSizeBytes', sql.BigInt, summary.totalSizeBytes)
      .input('analysesThisWeek', sql.Int, summary.analysesThisWeek)
      .input('analysesToday', sql.Int, summary.analysesToday)
      .input('completionRatePercent', sql.Decimal(5, 2), summary.completionRatePercent)
      .input('errorRatePercent', sql.Decimal(5, 2), summary.errorRatePercent)
      .input('avgProcessingSeconds', sql.Decimal(10, 2), summary.avgProcessingSeconds)
      .input('lastActivity', sql.DateTime2, summary.lastActivity)
      .input('classificationBreakdown', sql.NVarChar(sql.MAX), JSON.stringify(summary.classificationBreakdown))
      .input('statusBreakdown', sql.NVarChar(sql.MAX), JSON.stringify(summary.statusBreakdown))
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
  } catch (error) {
    console.error('[MetricsWriter] Error writing summary cache:', error);
    throw error;
  }
}
