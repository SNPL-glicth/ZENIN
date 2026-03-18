import { getAnalysesSummary, getAnalysesByTenant } from '../readers/analysis_reader';
import { getDocumentsSummary } from '../readers/document_reader';

export async function computeSummaryMetrics(tenantId: string): Promise<{
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
}> {
  const [analysisSummary, documentSummary] = await Promise.all([
    getAnalysesSummary(tenantId),
    getDocumentsSummary(tenantId),
  ]);

  // Get analyses for this week
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekAnalyses = await getAnalysesByTenant(tenantId, weekAgo, now);
  const todayAnalyses = await getAnalysesByTenant(tenantId, todayStart, now);

  // Calculate completion and error rates
  const completionRatePercent =
    analysisSummary.total > 0
      ? (analysisSummary.analyzed / analysisSummary.total) * 100
      : null;

  const errorRatePercent =
    analysisSummary.total > 0
      ? (analysisSummary.error / analysisSummary.total) * 100
      : null;

  // Calculate average processing time
  const analyzedWithTimes = weekAnalyses.filter(
    (a) => a.status === 'analyzed' && a.analyzed_at
  );
  const avgProcessingSeconds =
    analyzedWithTimes.length > 0
      ? analyzedWithTimes.reduce((sum, a) => {
          const latency = (a.analyzed_at!.getTime() - a.created_at.getTime()) / 1000;
          return sum + latency;
        }, 0) / analyzedWithTimes.length
      : null;

  // Status breakdown
  const statusBreakdown = {
    analyzed: analysisSummary.analyzed,
    pending: analysisSummary.pending,
    processing: analysisSummary.processing,
    error: analysisSummary.error,
  };

  return {
    totalAnalyses: analysisSummary.analyzed,
    totalFiles: documentSummary.total,
    totalSizeBytes: analysisSummary.totalSizeBytes + documentSummary.totalSizeBytes,
    analysesThisWeek: weekAnalyses.length,
    analysesToday: todayAnalyses.length,
    completionRatePercent,
    errorRatePercent,
    avgProcessingSeconds,
    lastActivity: analysisSummary.lastActivity,
    classificationBreakdown: analysisSummary.classificationBreakdown,
    statusBreakdown,
  };
}
