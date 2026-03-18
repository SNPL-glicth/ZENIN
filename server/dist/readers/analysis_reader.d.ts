export interface AnalysisResultRow {
    id: string;
    tenant_id: string;
    created_at: Date;
    analyzed_at: Date | null;
    classification: string;
    status: string;
    file_size_bytes: number;
}
export declare function getAnalysesByTenant(tenantId: string, fromDate: Date, toDate: Date): Promise<AnalysisResultRow[]>;
export declare function getAnalysesSummary(tenantId: string): Promise<{
    total: number;
    analyzed: number;
    pending: number;
    processing: number;
    error: number;
    totalSizeBytes: number;
    classificationBreakdown: Record<string, number>;
    lastActivity: Date | null;
}>;
export declare function getAllTenantIds(): Promise<string[]>;
//# sourceMappingURL=analysis_reader.d.ts.map