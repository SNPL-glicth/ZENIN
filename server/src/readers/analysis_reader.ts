import { getConnection, sql } from '../config/db';

export interface AnalysisResultRow {
  id: string;
  tenant_id: string;
  created_at: Date;
  analyzed_at: Date | null;
  classification: string;
  status: string;
  file_size_bytes: number;
}

export async function getAnalysesByTenant(
  tenantId: string,
  fromDate: Date,
  toDate: Date
): Promise<AnalysisResultRow[]> {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .input('fromDate', sql.DateTime2, fromDate)
      .input('toDate', sql.DateTime2, toDate)
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
  } catch (error) {
    console.error('[AnalysisReader] Error fetching analyses:', error);
    throw error;
  }
}

export async function getAnalysesSummary(tenantId: string): Promise<{
  total: number;
  analyzed: number;
  pending: number;
  processing: number;
  error: number;
  totalSizeBytes: number;
  classificationBreakdown: Record<string, number>;
  lastActivity: Date | null;
}> {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
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

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    const summary = recordsets[0][0];
    const classificationRows = recordsets[1];

    const classificationBreakdown: Record<string, number> = {};
    classificationRows.forEach((row: any) => {
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
  } catch (error) {
    console.error('[AnalysisReader] Error fetching summary:', error);
    throw error;
  }
}

export async function getAllTenantIds(): Promise<string[]> {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT DISTINCT TenantId as tenant_id
      FROM zenin_docs.analysis_results
      WHERE IsDeleted = 0
    `);
    return result.recordset.map((r: any) => r.tenant_id);
  } catch (error) {
    console.error('[AnalysisReader] Error fetching tenant IDs:', error);
    throw error;
  }
}
