"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentsByTenant = getDocumentsByTenant;
exports.getDocumentsSummary = getDocumentsSummary;
const db_1 = require("../config/db");
async function getDocumentsByTenant(tenantId, fromDate, toDate) {
    try {
        const pool = await (0, db_1.getConnection)();
        const result = await pool
            .request()
            .input('tenantId', db_1.sql.UniqueIdentifier, tenantId)
            .input('fromDate', db_1.sql.DateTime2, fromDate)
            .input('toDate', db_1.sql.DateTime2, toDate)
            .query(`
        SELECT 
          Id as id,
          TenantId as tenant_id,
          UploadedAt as uploaded_at,
          FileSizeBytes as file_size_bytes,
          ContentType as content_type,
          Status as status
        FROM zenin_docs.documents
        WHERE TenantId = @tenantId
          AND UploadedAt >= @fromDate
          AND UploadedAt <= @toDate
          AND IsDeleted = 0
        ORDER BY UploadedAt ASC
      `);
        return result.recordset;
    }
    catch (error) {
        console.error('[DocumentReader] Error fetching documents:', error);
        throw error;
    }
}
async function getDocumentsSummary(tenantId) {
    try {
        const pool = await (0, db_1.getConnection)();
        const result = await pool
            .request()
            .input('tenantId', db_1.sql.UniqueIdentifier, tenantId)
            .query(`
        SELECT 
          COUNT(*) as total,
          SUM(FileSizeBytes) as total_size_bytes
        FROM zenin_docs.documents
        WHERE TenantId = @tenantId AND IsDeleted = 0
      `);
        const summary = result.recordset[0];
        return {
            total: summary.total || 0,
            totalSizeBytes: summary.total_size_bytes || 0,
        };
    }
    catch (error) {
        console.error('[DocumentReader] Error fetching summary:', error);
        throw error;
    }
}
//# sourceMappingURL=document_reader.js.map