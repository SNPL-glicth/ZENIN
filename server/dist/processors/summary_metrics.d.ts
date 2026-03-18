export declare function computeSummaryMetrics(tenantId: string): Promise<{
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
}>;
//# sourceMappingURL=summary_metrics.d.ts.map