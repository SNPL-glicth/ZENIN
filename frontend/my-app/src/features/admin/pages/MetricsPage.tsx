import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getTenantId } from '../../../services/authService';
import {
  getMetricsSummary,
  getMetricsTimeline,
  getTopDocuments,
  getDomainMetrics,
  type MetricsSummary,
  type TimelineDataPoint,
  type TopDocument,
  type DomainMetric
} from '../../../services/metricsService';

/**
 * MetricsPage - Dashboard de métricas y estadísticas
 * 
 * ARQUITECTURA:
 * - Frontend obtiene tenantId del JWT (localStorage)
 * - Consulta directamente al servidor TypeScript (puerto 4423)
 * - Servidor TypeScript lee zenin_docs.analysis_results de SQL Server
 * - NO pasa por .NET backend para las métricas
 * - .NET solo se usa para autenticación inicial
 * 
 * ENDPOINTS CONSUMIDOS:
 * - GET /metrics/summary?tenantId={id}
 * - GET /metrics/timeline?tenantId={id}&days={n}
 * - GET /metrics/top-documents?tenantId={id}&limit={n}
 * - GET /metrics/domains?tenantId={id}
 */
export function MetricsPage(): React.ReactElement {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [topDocs, setTopDocs] = useState<TopDocument[]>([]);
  const [domains, setDomains] = useState<DomainMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [selectedDoc, setSelectedDoc] = useState<TopDocument | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [days]);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tenantId = getTenantId();
      
      if (!tenantId) {
        throw new Error('No tenant ID found. Please log in again.');
      }

      const [summaryData, timelineData, topDocsData, domainsData] = await Promise.all([
        getMetricsSummary(tenantId),
        getMetricsTimeline(tenantId, days),
        getTopDocuments(tenantId, 10),
        getDomainMetrics(tenantId)
      ]);

      setSummary(summaryData);
      setTimeline(timelineData);
      setTopDocs(topDocsData);
      setDomains(domainsData);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'; // red-500
      case 'warning': return '#f59e0b'; // amber-500
      default: return '#10b981'; // emerald-500
    }
  };

  const DOMAIN_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="text-xl font-bold text-white">Análisis & Métricas</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-sm text-gray-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
            </select>
            
            <button
              onClick={loadMetrics}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2 font-mono text-sm text-emerald-400 transition-colors hover:bg-emerald-900/50 disabled:opacity-50"
            >
              <svg 
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {error ? (
          <ErrorState message={error} onRetry={loadMetrics} />
        ) : isLoading ? (
          <LoadingState />
        ) : summary ? (
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Documentos"
                value={summary.totalDocuments.toString()}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                color="text-blue-400"
              />
              
              <MetricCard
                label="Críticos"
                value={summary.bySeverity.critical.toString()}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
                color="text-red-400"
              />
              
              <MetricCard
                label="Confianza Promedio"
                value={`${(summary.avgConfidence * 100).toFixed(0)}%`}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="text-emerald-400"
              />
              
              <MetricCard
                label="Con Anomalías"
                value={summary.documentsWithAnomalies.toString()}
                icon={
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                color="text-amber-400"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Timeline Chart */}
              <div className="lg:col-span-2">
                <ChartCard title="Tendencia de Urgencia">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="urgencyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avgUrgency" 
                        stroke="#10b981" 
                        fill="url(#urgencyGradient)" 
                        name="Urgencia Promedio"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Domain Distribution */}
              <div>
                <ChartCard title="Distribución por Dominio">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={domains}
                        dataKey="count"
                        nameKey="domain"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {domains.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DOMAIN_COLORS[index % DOMAIN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </div>

            {/* Top Documents Table */}
            <div className="rounded-lg border border-gray-800 bg-gray-900/50">
              <div className="border-b border-gray-800 px-4 py-3">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Top Documentos Más Relevantes
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">Severidad</th>
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">Urgencia</th>
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="cursor-pointer border-b border-gray-800 transition-colors hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-gray-300">{doc.filename}</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-emerald-400">{doc.score.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span 
                            className="inline-flex items-center rounded border px-2 py-1 font-mono text-xs"
                            style={{ 
                              color: getSeverityColor(doc.severity),
                              borderColor: getSeverityColor(doc.severity) + '80'
                            }}
                          >
                            {doc.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-gray-700">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${doc.urgency * 100}%`,
                                  backgroundColor: doc.urgency > 0.7 ? '#ef4444' : doc.urgency > 0.4 ? '#f59e0b' : '#10b981'
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs text-gray-400">{(doc.urgency * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {new Date(doc.analyzedAt).toLocaleDateString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentDetailModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="mb-1 font-mono text-xs text-gray-500">{label}</div>
          <div className={`font-mono text-3xl font-bold ${color}`}>{value}</div>
        </div>
        <div className={`${color} opacity-50`}>{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DocumentDetailModal({ document, onClose }: {
  document: TopDocument;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-lg border border-gray-800 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="font-mono text-lg font-bold text-white">{document.filename}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* Metrics */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div>
              <div className="mb-2 font-mono text-xs text-gray-500">Urgencia</div>
              <div className="h-3 w-full rounded-full bg-gray-700">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${document.urgency * 100}%`,
                    backgroundColor: document.urgency > 0.7 ? '#ef4444' : document.urgency > 0.4 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
              <div className="mt-1 font-mono text-sm text-gray-300">{(document.urgency * 100).toFixed(0)}%</div>
            </div>

            <div>
              <div className="mb-2 font-mono text-xs text-gray-500">Confianza</div>
              <div className="h-3 w-full rounded-full bg-gray-700">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: `${document.confidence * 100}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-sm text-gray-300">{(document.confidence * 100).toFixed(0)}%</div>
            </div>

            <div>
              <div className="mb-2 font-mono text-xs text-gray-500">Severidad</div>
              <span 
                className="inline-flex items-center rounded border px-3 py-1 font-mono text-sm"
                style={{ 
                  color: document.severity === 'critical' ? '#ef4444' : document.severity === 'warning' ? '#f59e0b' : '#10b981',
                  borderColor: (document.severity === 'critical' ? '#ef4444' : document.severity === 'warning' ? '#f59e0b' : '#10b981') + '80'
                }}
              >
                {document.severity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Conclusion */}
          {document.conclusion && (
            <div className="mb-6">
              <h3 className="mb-2 font-mono text-sm font-semibold uppercase tracking-wider text-gray-500">
                Conclusión
              </h3>
              <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                <p className="font-mono text-sm leading-relaxed text-gray-300">
                  {document.conclusion}
                </p>
              </div>
            </div>
          )}

          {/* Domain */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-semibold uppercase tracking-wider text-gray-500">
              Dominio
            </h3>
            <span className="inline-flex items-center rounded border border-purple-800 bg-purple-950/30 px-3 py-1 font-mono text-sm text-purple-400">
              {document.domain}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300 transition-colors hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg bg-gray-800 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg bg-gray-800" />
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-gray-800" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6 max-w-md">
        <svg className="h-12 w-12 text-red-500 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="font-mono text-sm text-red-400 text-center mb-4">ERROR: {message}</p>
        <button
          onClick={onRetry}
          className="w-full rounded-lg border border-red-800 bg-red-950/30 px-4 py-2 font-mono text-sm text-red-400 hover:bg-red-900/50 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
