import { DataPoint } from '../processors/lttb';
export declare function writeChartData(tenantId: string, metricType: string, seriesKey: string, dataPoints: DataPoint[], periodStart: Date, periodEnd: Date, originalPointCount: number, lttbApplied: boolean): Promise<void>;
export declare function writeSummaryCache(tenantId: string, summary: {
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
}): Promise<void>;
//# sourceMappingURL=metrics_writer.d.ts.map