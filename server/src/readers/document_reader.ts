import { getConnection, sql } from '../config/db';

export interface DocumentRow {
  id: string;
  tenant_id: string;
  uploaded_at: Date;
  file_size_bytes: number | null;
  content_type: string;
  status: string;
}

export async function getDocumentsByTenant(
  tenantId: string,
  fromDate: Date,
  toDate: Date
): Promise<DocumentRow[]> {
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
  } catch (error) {
    console.error('[DocumentReader] Error fetching documents:', error);
    throw error;
  }
}

export async function getDocumentsSummary(tenantId: string): Promise<{
  total: number;
  totalSizeBytes: number;
}> {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
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
  } catch (error) {
    console.error('[DocumentReader] Error fetching summary:', error);
    throw error;
  }
}
