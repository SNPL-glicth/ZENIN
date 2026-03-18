export declare function computeAnalysisCountMetric(tenantId: string, fromDate: Date, toDate: Date): Promise<{
    metricType: string;
    seriesKey: string;
    dataPoints: Array<{
        timestamp: string;
        value: number;
    }>;
    periodStart: Date;
    periodEnd: Date;
    originalCount: number;
    lttbApplied: boolean;
}>;
export declare function computeCompletionRateMetric(tenantId: string, fromDate: Date, toDate: Date): Promise<{
    metricType: string;
    seriesKey: string;
    dataPoints: Array<{
        timestamp: string;
        value: number;
    }>;
    periodStart: Date;
    periodEnd: Date;
    originalCount: number;
    lttbApplied: boolean;
}>;
export declare function computeProcessingLatencyMetric(tenantId: string, fromDate: Date, toDate: Date): Promise<{
    metricType: string;
    seriesKey: string;
    dataPoints: Array<{
        timestamp: string;
        value: number;
    }>;
    periodStart: Date;
    periodEnd: Date;
    originalCount: number;
    lttbApplied: boolean;
}>;
//# sourceMappingURL=analysis_metrics.d.ts.map