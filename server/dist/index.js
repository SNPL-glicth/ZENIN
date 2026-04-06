"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const db_1 = require("./config/db");
const health_1 = require("./api/health");
const metrics_job_1 = require("./scheduler/metrics_job");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4423');
const WS_PORT = parseInt(process.env.WS_PORT || '4424');
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json());
// Store connected WebSocket clients
const wss = new ws_1.WebSocketServer({ port: WS_PORT });
const clients = new Set();
// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    clients.add(ws);
    // Send initial connection confirmation
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
    }));
    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        clients.delete(ws);
    });
    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
        clients.delete(ws);
    });
});
// Broadcast cognitive diagnostic to all connected clients
function broadcastCognitiveDiagnostic(data) {
    const message = JSON.stringify({
        type: 'cognitive_diagnostic',
        data,
        timestamp: new Date().toISOString()
    });
    clients.forEach(client => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(message);
        }
    });
}
// Health check endpoint (internal use only)
app.get('/health', health_1.healthCheck);
// Endpoint to receive cognitive diagnostic from ML Service
app.post('/relay/cognitive-diagnostic', (req, res) => {
    try {
        const diagnostic = req.body;
        console.log('[Relay] Received cognitive diagnostic:', diagnostic.seriesId || 'unknown');
        // Broadcast to all connected WebSocket clients
        broadcastCognitiveDiagnostic(diagnostic);
        res.status(200).json({
            status: 'ok',
            message: 'Diagnostic relayed to clients',
            clientsConnected: clients.size
        });
    }
    catch (error) {
        console.error('[Relay] Error processing diagnostic:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to relay diagnostic'
        });
    }
});
// Endpoint to receive user feedback and forward to ML Service
app.post('/relay/feedback', async (req, res) => {
    try {
        const { seriesId, predictionId, confidence, feedback, userId } = req.body;
        console.log('[Relay] Received user feedback:', { seriesId, predictionId, confidence, userId });
        // Forward to ML Service (configuration needed)
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8002';
        try {
            const response = await fetch(`${mlServiceUrl}/ml/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    series_id: seriesId,
                    prediction_id: predictionId,
                    confidence_score: confidence,
                    feedback_text: feedback,
                    user_id: userId,
                    timestamp: new Date().toISOString()
                })
            });
            if (response.ok) {
                res.status(200).json({
                    status: 'ok',
                    message: 'Feedback forwarded to ML Service'
                });
            }
            else {
                throw new Error(`ML Service responded with ${response.status}`);
            }
        }
        catch (fetchError) {
            console.error('[Relay] Failed to forward to ML Service:', fetchError);
            // Still acknowledge receipt to user
            res.status(202).json({
                status: 'accepted',
                message: 'Feedback received, will be processed asynchronously'
            });
        }
    }
    catch (error) {
        console.error('[Relay] Error processing feedback:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process feedback'
        });
    }
});
// Get current cognitive state (last diagnostic received)
let lastCognitiveDiagnostic = null;
app.get('/relay/cognitive-state', (req, res) => {
    res.json({
        status: 'ok',
        lastDiagnostic: lastCognitiveDiagnostic,
        clientsConnected: clients.size,
        timestamp: new Date().toISOString()
    });
});
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
            console.log(`[Server] WebSocket server running on port ${WS_PORT}`);
            console.log(`[Server] Health check: http://localhost:${PORT}/health`);
            console.log(`[Server] Cognitive relay: http://localhost:${PORT}/relay/cognitive-diagnostic`);
            console.log(`[Server] Feedback endpoint: http://localhost:${PORT}/relay/feedback`);
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
    wss.close();
    await (0, db_1.closeConnection)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('[Server] Shutting down gracefully...');
    wss.close();
    await (0, db_1.closeConnection)();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map