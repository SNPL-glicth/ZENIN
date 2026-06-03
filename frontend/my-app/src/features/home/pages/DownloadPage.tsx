import { DownloadSection } from '../components/DownloadSection';

/**
 * DownloadPage - Standalone mobile demo download page.
 *
 * Isolated from the home page flow so users can link
 * directly to the APK download without scrolling through
 * the entire landing page.
 */
export function DownloadPage(): React.ReactElement {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DownloadSection />
    </div>
  );
}
