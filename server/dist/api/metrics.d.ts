import { Request, Response } from 'express';
/**
 * GET /metrics/summary?tenantId={id}
 * Returns general metrics summary
 */
export declare function getMetricsSummary(req: Request, res: Response): Promise<void>;
/**
 * GET /metrics/timeline?tenantId={id}&days=30
 * Returns time series of urgency and severity
 */
export declare function getMetricsTimeline(req: Request, res: Response): Promise<void>;
/**
 * GET /metrics/top-documents?tenantId={id}&limit=10
 * Returns top documents by relevance score
 */
export declare function getTopDocuments(req: Request, res: Response): Promise<void>;
/**
 * GET /metrics/domains?tenantId={id}
 * Returns domain distribution with metrics
 */
export declare function getDomainMetrics(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=metrics.d.ts.map