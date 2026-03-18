"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./config/db");
const health_1 = require("./api/health");
const metrics_job_1 = require("./scheduler/metrics_job");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4423');
app.use(express_1.default.json());
// Health check endpoint (internal use only)
app.get('/health', health_1.healthCheck);
async function startServer() {
    try {
        // Test database connection
        await (0, db_1.getConnection)();
        console.log('[Server] Database connection established');
        // Start metrics scheduler
        (0, metrics_job_1.startMetricsScheduler)();
        // Start HTTP server
        app.listen(PORT, () => {
            console.log(`[Server] ZENIN Metrics Server running on port ${PORT}`);
            console.log('[Server] Health check: http://localhost:${PORT}/health');
            console.log('[Server] This server is for INTERNAL USE ONLY - no React endpoints');
        });
    }
    catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('[Server] Shutting down gracefully...');
    await (0, db_1.closeConnection)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('[Server] Shutting down gracefully...');
    await (0, db_1.closeConnection)();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map