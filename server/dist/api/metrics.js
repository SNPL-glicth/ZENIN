"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetricsSummary = getMetricsSummary;
exports.getMetricsTimeline = getMetricsTimeline;
exports.getTopDocuments = getTopDocuments;
exports.getDomainMetrics = getDomainMetrics;
const db_1 = require("../config/db");
const mssql_1 = __importDefault(require("mssql"));
/**
 * Parse MlResult JSON to extract metrics
 */
function parseMlResult(mlResult) {
    const defaults = { severity: 'info', urgency: 0, confidence: 0, domain: 'general' };
    if (!mlResult)
        return defaults;
    try {
        const parsed = JSON.parse(mlResult);
        return {
            severity: parsed.severity?.severity || 'info',
            urgency: parsed.analysis?.urgency_score || 0,
            confidence: parsed.confidence || 0,
            domain: parsed.domain || 'general'
        };
    }
    catch (err) {
        return defaults;
    }
}
/**
 * GET /metrics/summary?tenantId={id}
 * Returns general metrics summary
 */
async function getMetricsSummary(req, res) {
    try {
        const tenantId = req.query.tenantId;
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId is required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const result = await pool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
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
        const summary = {
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
        let lastDate = null;
        documents.forEach((doc) => {
            const metrics = parseMlResult(doc.MlResult);
            // Count by severity
            if (metrics.severity === 'critical')
                summary.bySeverity.critical++;
            else if (metrics.severity === 'warning')
                summary.bySeverity.warning++;
            else
                summary.bySeverity.info++;
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
    }
    catch (error) {
        console.error('[Metrics] Error getting summary:', error);
        res.status(500).json({ error: 'Failed to get metrics summary' });
    }
}
/**
 * GET /metrics/timeline?tenantId={id}&days=30
 * Returns time series of urgency and severity
 */
async function getMetricsTimeline(req, res) {
    try {
        const tenantId = req.query.tenantId;
        const days = parseInt(req.query.days || '30');
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId is required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const result = await pool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .input('days', mssql_1.default.Int, days)
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
        const timelineMap = new Map();
        documents.forEach((doc) => {
            const analysisDate = new Date(doc.AnalysisDate);
            const date = analysisDate.toISOString().split('T')[0];
            const metrics = parseMlResult(doc.MlResult);
            if (!timelineMap.has(date)) {
                timelineMap.set(date, { urgencies: [], critical: 0, warning: 0, info: 0 });
            }
            const dayData = timelineMap.get(date);
            dayData.urgencies.push(metrics.urgency);
            if (metrics.severity === 'critical')
                dayData.critical++;
            else if (metrics.severity === 'warning')
                dayData.warning++;
            else
                dayData.info++;
        });
        // Convert to array
        const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
            date,
            avgUrgency: data.urgencies.reduce((a, b) => a + b, 0) / data.urgencies.length,
            critical: data.critical,
            warning: data.warning,
            info: data.info
        }));
        res.json(timeline);
    }
    catch (error) {
        console.error('[Metrics] Error getting timeline:', error);
        res.status(500).json({ error: 'Failed to get metrics timeline' });
    }
}
/**
 * GET /metrics/top-documents?tenantId={id}&limit=10
 * Returns top documents by relevance score
 */
async function getTopDocuments(req, res) {
    try {
        const tenantId = req.query.tenantId;
        const limit = parseInt(req.query.limit || '10');
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId is required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const result = await pool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
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
        const scoredDocs = documents.map((doc) => {
            const metrics = parseMlResult(doc.MlResult);
            // Severity weight: critical=1.0, warning=0.6, info=0.2
            const severityWeight = metrics.severity === 'critical' ? 1.0 :
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
    }
    catch (error) {
        console.error('[Metrics] Error getting top documents:', error);
        res.status(500).json({ error: 'Failed to get top documents' });
    }
}
/**
 * GET /metrics/domains?tenantId={id}
 * Returns domain distribution with metrics
 */
async function getDomainMetrics(req, res) {
    try {
        const tenantId = req.query.tenantId;
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId is required' });
            return;
        }
        const pool = await (0, db_1.getConnection)();
        const result = await pool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
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
        const domainMap = new Map();
        documents.forEach((doc) => {
            const metrics = parseMlResult(doc.MlResult);
            if (!domainMap.has(metrics.domain)) {
                domainMap.set(metrics.domain, { count: 0, urgencies: [], criticalCount: 0 });
            }
            const domainData = domainMap.get(metrics.domain);
            domainData.count++;
            domainData.urgencies.push(metrics.urgency);
            if (metrics.severity === 'critical') {
                domainData.criticalCount++;
            }
        });
        // Convert to array
        const domainMetrics = Array.from(domainMap.entries()).map(([domain, data]) => ({
            domain,
            count: data.count,
            avgUrgency: Math.round((data.urgencies.reduce((a, b) => a + b, 0) / data.urgencies.length) * 100) / 100,
            criticalCount: data.criticalCount
        }));
        // Sort by count descending
        domainMetrics.sort((a, b) => b.count - a.count);
        res.json(domainMetrics);
    }
    catch (error) {
        console.error('[Metrics] Error getting domain metrics:', error);
        res.status(500).json({ error: 'Failed to get domain metrics' });
    }
}
//# sourceMappingURL=metrics.js.map