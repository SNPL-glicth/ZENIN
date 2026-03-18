import express from 'express';
import { getConnection, closeConnection } from './config/db';
import { healthCheck } from './api/health';
import { startMetricsScheduler } from './scheduler/metrics_job';

const app = express();
const PORT = parseInt(process.env.PORT || '4423');

app.use(express.json());

// Health check endpoint (internal use only)
app.get('/health', healthCheck);

async function startServer(): Promise<void> {
  try {
    // Test database connection
    await getConnection();
    console.log('[Server] Database connection established');

    // Start metrics scheduler
    startMetricsScheduler();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`[Server] ZENIN Metrics Server running on port ${PORT}`);
      console.log('[Server] Health check: http://localhost:${PORT}/health');
      console.log('[Server] This server is for INTERNAL USE ONLY - no React endpoints');
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Server] Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

startServer();
