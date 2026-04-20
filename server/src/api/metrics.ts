import { Request, Response } from 'express';
import { getConnection } from '../config/db';
import sql from 'mssql';

interface MetricsSummary {
  totalDocuments: number;
  bySeverity: { critical: number; warning: number; info: number };
  byDomain: Record<string, number>;
  avgConfidence: number;
  avgUrgency: number;
  documentsWithAnomalies: number;
  lastAnalyzedAt: string | null;
}

interface TimelineDataPoint {
  date: string;
  avgUrgency: number;
  critical: number;
  warning: number;
  info: number;
}

interface TopDocument {
  id: string;
  filename: string;
  score: number;
  severity: string;
  urgency: number;
  confidence: number;
  domain: string;
  analyzedAt: string;
  conclusion: string;
}

interface DomainMetric {
  domain: string;
  count: number;
  avgUrgency: number;
  criticalCount: number;
}

/**
 * Parse MlResult JSON to extract metrics
 */
function parseMlResult(mlResult: string | null): {
  severity: string;
  urgency: number;
  confidence: number;
  domain: string;
} {
  const defaults = { severity: 'info', urgency: 0, confidence: 0, domain: 'general' };
  
  if (!mlResult) return defaults;
  
  try {
    const parsed = JSON.parse(mlResult);
    return {
      severity: parsed.severity?.severity || 'info',
      urgency: parsed.analysis?.urgency_score || 0,
      confidence: parsed.confidence || 0,
      domain: parsed.domain || 'general'
    };
  } catch (err) {
    return defaults;
  }
}

/**
 * GET /metrics/summary?tenantId={id}
 * Returns general metrics summary
 */
export async function getMetricsSummary(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string;
    
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT 
          Id,
          MlResult,
          AnalyzedAt
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId 
          AND IsDeleted = 0
          AND Status = 'analyzed'
      `);

    const documents = result.recordset;
    
    const summary: MetricsSummary = {
      totalDocuments: documents.length,
      bySeverity: { critical: 0, warning: 0, info: 0 },
      byDomain: {},
      avgConfidence: 0,
      avgUrgency: 0,
      documentsWithAnomalies: 0,
      lastAnalyzedAt: null
    };

    let totalConfidence = 0;
    let totalUrgency = 0;
    let lastDate: Date | null = null as Date | null;

    documents.forEach((doc: any) => {
      const metrics = parseMlResult(doc.MlResult);
      
      // Count by severity
      if (metrics.severity === 'critical') summary.bySeverity.critical++;
      else if (metrics.severity === 'warning') summary.bySeverity.warning++;
      else summary.bySeverity.info++;
      
      // Count by domain
      summary.byDomain[metrics.domain] = (summary.byDomain[metrics.domain] || 0) + 1;
      
      // Accumulate for averages
      totalConfidence += metrics.confidence;
      totalUrgency += metrics.urgency;
      
      // Check for anomalies (urgency > 0.7 or severity critical)
      if (metrics.urgency > 0.7 || metrics.severity === 'critical') {
        summary.documentsWithAnomalies++;
      }
      
      // Track last analyzed date
      if (doc.AnalyzedAt) {
        const analyzedDate = new Date(doc.AnalyzedAt);
        if (!lastDate || analyzedDate > lastDate) {
          lastDate = analyzedDate;
        }
      }
    });

    if (documents.length > 0) {
      summary.avgConfidence = totalConfidence / documents.length;
      summary.avgUrgency = totalUrgency / documents.length;
    }

    if (lastDate) {
      summary.lastAnalyzedAt = lastDate.toISOString();
    }

    res.json(summary);
  } catch (error) {
    console.error('[Metrics] Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get metrics summary' });
  }
}

/**
 * GET /metrics/timeline?tenantId={id}&days=30
 * Returns time series of urgency and severity
 */
export async function getMetricsTimeline(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string;
    const days = parseInt(req.query.days as string || '30');
    
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .input('days', sql.Int, days)
      .query(`
        SELECT 
          CAST(AnalyzedAt AS DATE) as AnalysisDate,
          MlResult
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId 
          AND IsDeleted = 0
          AND Status = 'analyzed'
          AND AnalyzedAt >= DATEADD(day, -@days, GETDATE())
        ORDER BY AnalysisDate
      `);

    const documents = result.recordset;
    
    // Group by date
    const timelineMap = new Map<string, {
      urgencies: number[];
      critical: number;
      warning: number;
      info: number;
    }>();

    documents.forEach((doc: any) => {
      const analysisDate = new Date(doc.AnalysisDate);
      const date = analysisDate.toISOString().split('T')[0];
      const metrics = parseMlResult(doc.MlResult);
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { urgencies: [], critical: 0, warning: 0, info: 0 });
      }
      
      const dayData = timelineMap.get(date)!;
      dayData.urgencies.push(metrics.urgency);
      
      if (metrics.severity === 'critical') dayData.critical++;
      else if (metrics.severity === 'warning') dayData.warning++;
      else dayData.info++;
    });

    // Convert to array
    const timeline: TimelineDataPoint[] = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      avgUrgency: data.urgencies.reduce((a, b) => a + b, 0) / data.urgencies.length,
      critical: data.critical,
      warning: data.warning,
      info: data.info
    }));

    res.json(timeline);
  } catch (error) {
    console.error('[Metrics] Error getting timeline:', error);
    res.status(500).json({ error: 'Failed to get metrics timeline' });
  }
}

/**
 * GET /metrics/top-documents?tenantId={id}&limit=10
 * Returns top documents by relevance score
 */
export async function getTopDocuments(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string;
    const limit = parseInt(req.query.limit as string || '10');
    
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT 
          Id,
          OriginalFilename,
          MlResult,
          Conclusion,
          AnalyzedAt
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId 
          AND IsDeleted = 0
          AND Status = 'analyzed'
      `);

    const documents = result.recordset;
    
    // Calculate score for each document
    const scoredDocs: TopDocument[] = documents.map((doc: any) => {
      const metrics = parseMlResult(doc.MlResult);
      
      // Severity weight: critical=1.0, warning=0.6, info=0.2
      const severityWeight = 
        metrics.severity === 'critical' ? 1.0 :
        metrics.severity === 'warning' ? 0.6 : 0.2;
      
      // Score formula: (urgency * 0.4) + (severity_weight * 0.4) + (confidence * 0.2)
      const score = (metrics.urgency * 0.4) + (severityWeight * 0.4) + (metrics.confidence * 0.2);
      
      return {
        id: doc.Id,
        filename: doc.OriginalFilename || 'Unknown',
        score: Math.round(score * 100) / 100,
        severity: metrics.severity,
        urgency: Math.round(metrics.urgency * 100) / 100,
        confidence: Math.round(metrics.confidence * 100) / 100,
        domain: metrics.domain,
        analyzedAt: doc.AnalyzedAt ? new Date(doc.AnalyzedAt).toISOString() : '',
        conclusion: doc.Conclusion || ''
      };
    });

    // Sort by score descending and limit
    scoredDocs.sort((a, b) => b.score - a.score);
    const topDocs = scoredDocs.slice(0, limit);

    res.json(topDocs);
  } catch (error) {
    console.error('[Metrics] Error getting top documents:', error);
    res.status(500).json({ error: 'Failed to get top documents' });
  }
}

/**
 * GET /metrics/domains?tenantId={id}
 * Returns domain distribution with metrics
 */
export async function getDomainMetrics(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenantId as string;
    
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const pool = await getConnection();
    
    const result = await pool.request()
      .input('tenantId', sql.UniqueIdentifier, tenantId)
      .query(`
        SELECT 
          MlResult
        FROM zenin_docs.analysis_results
        WHERE TenantId = @tenantId 
          AND IsDeleted = 0
          AND Status = 'analyzed'
      `);

    const documents = result.recordset;
    
    // Group by domain
    const domainMap = new Map<string, {
      count: number;
      urgencies: number[];
      criticalCount: number;
    }>();

    documents.forEach((doc: any) => {
      const metrics = parseMlResult(doc.MlResult);
      
      if (!domainMap.has(metrics.domain)) {
        domainMap.set(metrics.domain, { count: 0, urgencies: [], criticalCount: 0 });
      }
      
      const domainData = domainMap.get(metrics.domain)!;
      domainData.count++;
      domainData.urgencies.push(metrics.urgency);
      
      if (metrics.severity === 'critical') {
        domainData.criticalCount++;
      }
    });

    // Convert to array
    const domainMetrics: DomainMetric[] = Array.from(domainMap.entries()).map(([domain, data]) => ({
      domain,
      count: data.count,
      avgUrgency: Math.round((data.urgencies.reduce((a, b) => a + b, 0) / data.urgencies.length) * 100) / 100,
      criticalCount: data.criticalCount
    }));

    // Sort by count descending
    domainMetrics.sort((a, b) => b.count - a.count);

    res.json(domainMetrics);
  } catch (error) {
    console.error('[Metrics] Error getting domain metrics:', error);
    res.status(500).json({ error: 'Failed to get domain metrics' });
  }
}
