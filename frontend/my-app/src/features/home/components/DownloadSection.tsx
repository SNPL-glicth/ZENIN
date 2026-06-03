export function DownloadSection(): React.ReactElement {
  return (
    <section className="download-section" id="download">
      <div className="download-grid-floor" />
      <div className="download-grid-ceil" />

      <div className="orb orb-download-left" />
      <div className="orb orb-download-right" />

      <div className="scanlines" />

      <div className="download-content">
        <div className="status-pill">
          <span className="status-dot" />
          Mobile Application · Android
        </div>

        <h2 className="download-title">
          <span className="main-word" data-text="DEMO">DEMO</span>
        </h2>

        <p className="download-sub">
          Lleva ZENIN en tu bolsillo.<br />
          Monitorea sensores, recibe alertas y controla tu flota desde cualquier lugar.
        </p>

        <p className="hero-terminal">
          {'>'} APK listo para instalación. Versión demo incluida.
          <span className="cursor" />
        </p>

        <div className="cta-group">
          <a
            href="/ZENIN.apk"
            download
            className="btn-primary btn-download"
          >
            Descarga aquí la demo
          </a>
          <span className="download-meta">
            Android 8.0+ · APK · ~72 MB
          </span>
        </div>
      </div>
    </section>
  );
}
