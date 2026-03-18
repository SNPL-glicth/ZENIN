import { Request, Response } from 'express';
import { getConnection } from '../config/db';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const pool = await getConnection();
    await pool.request().query('SELECT 1 AS health');
    
    res.status(200).json({
      status: 'healthy',
      service: 'zenin-metrics-server',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'zenin-metrics-server',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
