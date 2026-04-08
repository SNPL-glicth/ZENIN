/**
 * HowItWorksSection - Platform workflow visualization.
 *
 * Five-step process flow:
 * Data → Ingestion → Analysis → Detection → Action
 *
 * Responsive: horizontal on desktop, vertical on mobile.
 */
export function HowItWorksSection(): React.ReactElement {
  const steps = [
    {
      number: '01',
      title: 'Data',
      description: 'IoT telemetry, API logs, and documents flow into the system through streaming or batch ingestion.',
    },
    {
      number: '02',
      title: 'Ingestion',
      description: 'Raw data is parsed, validated, and routed to the appropriate processing pipeline.',
    },
    {
      number: '03',
      title: 'Analysis',
      description: 'Cognitive engines apply statistical, temporal, and ML models to detect patterns.',
    },
    {
      number: '04',
      title: 'Detection',
      description: 'Anomalies and insights are identified with confidence scores and severity levels.',
    },
    {
      number: '05',
      title: 'Action',
      description: 'Alerts trigger, dashboards update, and insights surface for immediate response.',
    },
  ] as const;

  return (
    <section id="how-it-works" className="bg-gray-900/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            From data ingestion to actionable intelligence in five continuous steps.
          </p>
        </div>

        <div className="relative">
          {/* Connection line - desktop only */}
          <div className="absolute top-1/2 left-0 right-0 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-5">
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isLast: boolean;
}

function StepCard({ number, title, description, isLast }: StepCardProps): React.ReactElement {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Mobile connector */}
      {!isLast && (
        <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 translate-y-full bg-gradient-to-b from-violet-500/30 to-transparent lg:hidden" />
      )}

      {/* Step number */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-xl font-bold text-violet-400 backdrop-blur-sm">
        {number}
      </div>

      <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
      <p className="max-w-xs text-gray-400">{description}</p>
    </div>
  );
}
