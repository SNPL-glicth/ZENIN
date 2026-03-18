"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
const db_1 = require("../config/db");
async function healthCheck(req, res) {
    try {
        const pool = await (0, db_1.getConnection)();
        await pool.request().query('SELECT 1 AS health');
        res.status(200).json({
            status: 'healthy',
            service: 'zenin-metrics-server',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'zenin-metrics-server',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
//# sourceMappingURL=health.js.map