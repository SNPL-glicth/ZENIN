"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalysesByTenant = getAnalysesByTenant;
exports.getAnalysesSummary = getAnalysesSummary;
exports.getAllTenantIds = getAllTenantIds;
const db_1 = require("../config/db");
async function getAnalysesByTenant(tenantId, fromDate, toDate) {
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
          CreatedAt as created_at,
          AnalyzedAt as analyzed_at,
          Classification as classification,
          Status as status,
          FileSizeBytes as file_size_bytes
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId
          AND CreatedAt >= @fromDate
          AND CreatedAt <= @toDate
          AND IsDeleted = 0
        ORDER BY CreatedAt ASC
      `);
        return result.recordset;
    }
    catch (error) {
        console.error('[AnalysisReader] Error fetching analyses:', error);
        throw error;
    }
}
async function getAnalysesSummary(tenantId) {
    try {
        const pool = await (0, db_1.getConnection)();
        const result = await pool
            .request()
            .input('tenantId', db_1.sql.UniqueIdentifier, tenantId)
            .query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN Status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
          SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN Status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN Status = 'error' THEN 1 ELSE 0 END) as error,
          SUM(FileSizeBytes) as total_size_bytes,
          MAX(CreatedAt) as last_activity
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId AND IsDeleted = 0;

        SELECT 
          Classification,
          COUNT(*) as count
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId AND IsDeleted = 0
        GROUP BY Classification;
      `);
        const summary = result.recordsets[0][0];
        const classificationRows = result.recordsets[1];
        const classificationBreakdown = {};
        classificationRows.forEach((row) => {
            classificationBreakdown[row.Classification] = row.count;
        });
        return {
            total: summary.total || 0,
            analyzed: summary.analyzed || 0,
            pending: summary.pending || 0,
            processing: summary.processing || 0,
            error: summary.error || 0,
            totalSizeBytes: summary.total_size_bytes || 0,
            classificationBreakdown,
            lastActivity: summary.last_activity,
        };
    }
    catch (error) {
        console.error('[AnalysisReader] Error fetching summary:', error);
        throw error;
    }
}
async function getAllTenantIds() {
    try {
        const pool = await (0, db_1.getConnection)();
        const result = await pool.request().query(`
      SELECT DISTINCT TenantId as tenant_id
      FROM zenin_docs.analysis_results
      WHERE IsDeleted = 0
    `);
        return result.recordset.map((r) => r.tenant_id);
    }
    catch (error) {
        console.error('[AnalysisReader] Error fetching tenant IDs:', error);
        throw error;
    }
}
//# sourceMappingURL=analysis_reader.js.map