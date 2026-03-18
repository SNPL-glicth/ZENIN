export declare function computeUploadVolumeMetric(tenantId: string, fromDate: Date, toDate: Date): Promise<{
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
export declare function computeFileSizeTrendMetric(tenantId: string, fromDate: Date, toDate: Date): Promise<{
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
//# sourceMappingURL=document_metrics.d.ts.map