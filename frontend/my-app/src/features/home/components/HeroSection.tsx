export function HeroSection(): React.ReactElement {
  const scrollToSection = (id: string): void => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero" id="hero">
      {/* 3D perspective grids */}
      <div className="grid-floor" />
      <div className="grid-ceil" />

      {/* Ambient glow orbs */}
      <div className="orb orb-left" />
      <div className="orb orb-right" />
      <div className="orb orb-bottom" />

      {/* Scanlines overlay */}
      <div className="scanlines" />

      {/* Main content */}
      <div className="hero-content">
        <div className="status-pill">
          <span className="status-dot" />
          Cognitive Analysis · Live
        </div>

        <h1 className="hero-title">
          <span className="main-word" data-text="ZENIN">ZENIN</span>
        </h1>

        <p className="hero-sub">
          Real-time cognitive analysis for IoT data,<br />logs, and documents.
        </p>

        <p className="hero-terminal">
          {'>'} Detect anomalies. Understand patterns. Act with intelligence.
          <span className="cursor" />
        </p>

        <div className="cta-group">
          <button
            className="btn-primary"
            onClick={() => scrollToSection('preview')}
          >
            View Demo
          </button>
          <button
            className="btn-secondary"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </button>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat">
            <div className="stat-val"><span>12ms</span></div>
            <div className="stat-label">Avg latency</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat-val"><span>99.9%</span></div>
            <div className="stat-label">Uptime</div>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <div className="stat-val"><span>∞</span></div>
            <div className="stat-label">Data streams</div>
          </div>
        </div>
      </div>
    </section>
  );
}