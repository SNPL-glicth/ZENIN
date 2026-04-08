/**
 * PreviewSection - Mock dashboard preview.
 *
 * Visual demonstration of the platform interface:
 * - Terminal-style layout
 * - Fake graph visualization
 * - Status badges (CRITICAL / WARNING / INFO)
 */
export function PreviewSection(): React.ReactElement {
  return (
    <section id="preview" className="border-t border-gray-900 bg-[#0a0a0a] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Operations Terminal
          </h2>
          <p className="mx-auto max-w-2xl font-[family-name:var(--font-mono)] text-sm text-gray-500">
            {'>'} MONITORING ACTIVE STREAMS
          </p>
        </div>

        {/* Terminal Window */}
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0f0f0f] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Terminal Header */}
          <div className="flex items-center justify-between border-b border-gray-800 bg-[#111] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-gray-500">
              zsh — zenin-monitor — 80x24
            </div>
            <div className="w-16" />
          </div>

          {/* Terminal Content */}
          <div className="p-6 sm:p-8">
            {/* Dashboard Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Chart Panel */}
              <div className="lg:col-span-2 rounded-md border border-gray-800 bg-[#111] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold text-gray-300">
                    {'$'} stream_status --live
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse-glow rounded-full bg-emerald-500 text-emerald-500" />
                    <span className="font-[family-name:var(--font-mono)] text-xs text-emerald-400">LIVE</span>
                  </div>
                </div>

                {/* Fake Chart */}
                <div className="relative h-48 w-full">
                  <svg className="h-full w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,120 Q50,80 100,100 T200,60 T300,80 T400,40 T500,70 T600,30 T700,50 L700,180 L0,180 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M0,120 Q50,80 100,100 T200,60 T300,80 T400,40 T500,70 T600,30 T700,50"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    />
                  </svg>

                  {/* Data points */}
                  <div className="absolute top-1/3 left-1/4 h-2 w-2 rounded-full bg-violet-400" />
                  <div className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full bg-violet-400" />
                  <div className="absolute top-1/4 left-3/4 h-2 w-2 rounded-full bg-violet-400" />
                </div>

                {/* Legend */}
                <div className="mt-4 flex gap-6 font-[family-name:var(--font-mono)] text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <span>temp_sensor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>pressure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>telemetry_rate</span>
                  </div>
                </div>
              </div>

              {/* Alert Panel */}
              <div className="space-y-3">
                <StatusCard
                  level="critical"
                  code="ERR-503"
                  message="api_gateway spike detected"
                  count={3}
                />
                <StatusCard
                  level="warning"
                  code="WARN-12"
                  message="temp_variance > threshold"
                  count={12}
                />
                <StatusCard
                  level="info"
                  code="INFO-28"
                  message="pattern_analysis complete"
                  count={28}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface StatusCardProps {
  level: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  count: number;
}

function StatusCard({ level, code, message, count }: StatusCardProps): React.ReactElement {
  const styles = {
    critical: 'border-red-900/50 bg-red-950/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
    warning: 'border-yellow-900/50 bg-yellow-950/30 text-yellow-400',
    info: 'border-blue-900/50 bg-blue-950/30 text-blue-400',
  } as const;

  const levelIndicators = {
    critical: <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />,
    warning: <span className="h-2 w-2 rounded-full bg-yellow-500" />,
    info: <span className="h-2 w-2 rounded-full bg-blue-500" />,
  } as const;

  return (
    <div className={`flex items-center justify-between rounded-md border p-3 font-[family-name:var(--font-mono)] text-xs ${styles[level]}`}>
      <div className="flex items-center gap-3">
        {levelIndicators[level]}
        <div>
          <div className="mb-0.5 font-semibold tracking-wide opacity-90">
            {code}
          </div>
          <div className="opacity-70">{message}</div>
        </div>
      </div>
      <div className="flex h-6 w-6 items-center justify-center rounded bg-current/10 text-xs font-bold">
        {count}
      </div>
    </div>
  );
}
