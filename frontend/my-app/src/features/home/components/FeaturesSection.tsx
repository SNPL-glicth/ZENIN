/**
 * FeaturesSection - Core capabilities showcase.
 *
 * Three feature cards highlighting the platform's key strengths:
 * - Real-time analysis
 * - Cognitive engine
 * - Anomaly detection
 */
export function FeaturesSection(): React.ReactElement {
  const features = [
    {
      title: 'Real-Time IoT Processing',
      description:
        'Ingest and analyze telemetry and sensor data streams in real time. Millisecond-latency detection of anomalies in temperature, pressure, and critical metrics.',
      icon: <ActivityIcon />,
    },
    {
      title: 'Log Monitoring via API',
      description:
        'Connect external systems via API to analyze server logs, application traces, and infrastructure events. Automated pattern detection in structured and semi-structured data.',
      icon: <BrainIcon />,
    },
    {
      title: 'Cognitive Document Analysis',
      description:
        'Process documents to detect patterns, extract insights, and surface anomalies in unstructured content. Natural language understanding combined with statistical analysis.',
      icon: <ShieldIcon />,
    },
  ] as const;

  return (
    <section className="border-t border-gray-900 bg-[#0a0a0a] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            System Capabilities
          </h2>
          <p className="mx-auto max-w-2xl font-[family-name:var(--font-mono)] text-sm text-gray-500">
            {'>'} PROCESSING MODULES INITIALIZED
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactElement;
}

function FeatureCard({ title, description, icon }: FeatureCardProps): React.ReactElement {
  return (
    <div className="group relative rounded-lg border border-gray-800 bg-[#111] p-8 transition-all duration-300 hover:border-violet-500/40 hover:bg-[#161616] hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]">
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-6 inline-flex rounded-md border border-violet-500/20 bg-violet-500/5 p-3 text-violet-400 transition-all duration-300 group-hover:border-violet-500/40 group-hover:bg-violet-500/10 group-hover:text-violet-300">
          {icon}
        </div>

        <h3 className="mb-3 text-lg font-semibold tracking-wide text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function ActivityIcon(): React.ReactElement {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function BrainIcon(): React.ReactElement {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ShieldIcon(): React.ReactElement {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
