export interface DocumentRow {
    id: string;
    tenant_id: string;
    uploaded_at: Date;
    file_size_bytes: number | null;
    content_type: string;
    status: string;
}
export declare function getDocumentsByTenant(tenantId: string, fromDate: Date, toDate: Date): Promise<DocumentRow[]>;
export declare function getDocumentsSummary(tenantId: string): Promise<{
    total: number;
    totalSizeBytes: number;
}>;
//# sourceMappingURL=document_reader.d.ts.map