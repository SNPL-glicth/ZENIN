# ZENIN Metrics Server - Deployment Guide

Complete setup guide for the Node.js metrics server with LTTB processing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend (React) ──────────────────────────────────────────┐   │
│                                                              │   │
│                                                              ▼   │
│  .NET API ◄──────────────── zenin_metrics.* tables ◄──── Node.js│
│     │                              ▲                      Metrics│
│     │                              │                      Server │
│     ▼                              │                        │   │
│  zenin_docs.* ────────────────────┘                        │   │
│  (read only)         (processes every 5 min)               │   │
│                                                             │   │
│  ML Service ────► zenin_docs.analysis_results ────────────┘   │
│                   (writes analysis data)                        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle:** React NEVER calls Node.js server directly - only .NET API.

---

## Phase 1: Database Migration

### Step 1.1: Run Migration Script

```bash
# Option A: Using SQL Server Management Studio (SSMS)
# 1. Open SSMS
# 2. Connect to localhost,1434
# 3. Open file: database/migrations/zenin_db/002_create_metrics_table.sql
# 4. Execute (F5)

# Option B: Using sqlcmd (if available)
sqlcmd -S localhost,1434 -U sa -P YourPassword \
  -i database/migrations/zenin_db/002_create_metrics_table.sql
```

### Step 1.2: Verify Tables Created

```sql
-- Verify schema exists
SELECT * FROM sys.schemas WHERE name = 'zenin_metrics';

-- Verify tables exist
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'zenin_metrics';

-- Should show:
-- zenin_metrics.chart_data
-- zenin_metrics.summary_cache
```

---

## Phase 2: Node.js Server Setup

### Step 2.1: Install Dependencies

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/server
npm install
```

**Expected packages:**
- express (HTTP server for health check only)
- mssql (SQL Server connector)
- node-cron (scheduler)
- typescript, ts-node (TypeScript runtime)

### Step 2.2: Configure Environment

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/server
cp .env.example .env
nano .env  # or your preferred editor
```

**Update `.env` with:**
```env
DB_SERVER=localhost
DB_PORT=1434
DB_DATABASE=zenin_db
DB_USER=sa
DB_PASSWORD=Sandevistan2510
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

PORT=3001
NODE_ENV=production

METRICS_INTERVAL_MINUTES=5
LTTB_MAX_POINTS=200
```

### Step 2.3: Build TypeScript

```bash
npm run build
```

**Expected output:**
```
dist/
├── config/
├── processors/
├── readers/
├── writers/
├── scheduler/
├── api/
└── index.js
```

### Step 2.4: Test Server

```bash
# Start in development mode
npm run dev

# Should see:
# [DB] Connected to zenin_db
# [MetricsScheduler] Starting with cron: */5 * * * *
# [Server] ZENIN Metrics Server running on port 3001
# [MetricsJob] Starting metrics computation...
```

**Test health endpoint:**
```bash
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "service": "zenin-metrics-server",
  "timestamp": "2026-03-17T...",
  "database": "connected"
}
```

### Step 2.5: Run as Background Service (Production)

**Option A: Using PM2 (recommended)**
```bash
npm install -g pm2
cd /home/nicolas/Documentos/Iot_System/ZENIN/server
pm2 start dist/index.js --name zenin-metrics
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

**Option B: Using systemd**
```bash
sudo nano /etc/systemd/system/zenin-metrics.service
```

```ini
[Unit]
Description=ZENIN Metrics Server
After=network.target mssql-server.service

[Service]
Type=simple
User=nicolas
WorkingDirectory=/home/nicolas/Documentos/Iot_System/ZENIN/server
ExecStart=/usr/bin/node /home/nicolas/Documentos/Iot_System/ZENIN/server/dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable zenin-metrics
sudo systemctl start zenin-metrics
sudo systemctl status zenin-metrics
```

---

## Phase 3: .NET API Integration

### Step 3.1: Verify MetricsController

File already created at:
`/home/nicolas/Documentos/Iot_System/ZENIN/backend/src/Zenin.API/Controllers/MetricsController.cs`

### Step 3.2: Rebuild .NET API

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/backend
dotnet build
```

### Step 3.3: Test .NET Endpoints

**Start .NET API:**
```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/backend
dotnet run --project src/Zenin.API
```

**Test endpoints with authentication:**
```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'

# 2. Use token in subsequent requests
TOKEN="your_jwt_token_here"

# 3. Test summary endpoint
curl http://localhost:5000/api/metrics/summary \
  -H "Authorization: Bearer $TOKEN"

# 4. Test chart data endpoint
curl "http://localhost:5000/api/metrics/chart-data?type=analysis_count" \
  -H "Authorization: Bearer $TOKEN"

# 5. Test recent activity endpoint
curl "http://localhost:5000/api/metrics/recent-activity?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Phase 4: Frontend Integration (OPTIONAL - for new dashboard)

### Update React Service (if using new dashboard pages)

Create `/home/nicolas/Documentos/Iot_System/ZENIN/frontend/src/services/metricsService.js`:

```javascript
import api from './api';

export const metricsService = {
  getSummary: () => api.get('/metrics/summary'),
  
  getChartData: (type, from = null, to = null) => {
    const params = { type };
    if (from) params.from = from;
    if (to) params.to = to;
    return api.get('/metrics/chart-data', { params });
  },
  
  getRecentActivity: (limit = 10) =>
    api.get('/metrics/recent-activity', { params: { limit } }),
};
```

**Use in Dashboard component:**
```javascript
import { metricsService } from '../services/metricsService';

// In useEffect:
const summary = await metricsService.getSummary();
const analysisChart = await metricsService.getChartData('analysis_count');
```

---

## Verification Checklist

### ✅ Database
- [ ] `zenin_metrics` schema exists
- [ ] `zenin_metrics.chart_data` table exists
- [ ] `zenin_metrics.summary_cache` table exists

### ✅ Node.js Server
- [ ] Dependencies installed (`node_modules/` exists)
- [ ] TypeScript compiled (`dist/` exists)
- [ ] `.env` configured with correct DB credentials
- [ ] Server starts without errors
- [ ] Health check returns `{"status":"healthy"}`
- [ ] Logs show `[MetricsJob] Processing X tenants` every 5 minutes

### ✅ .NET API
- [ ] MetricsController.cs exists
- [ ] API builds without errors
- [ ] `/api/metrics/summary` returns data
- [ ] `/api/metrics/chart-data?type=analysis_count` returns data
- [ ] `/api/metrics/recent-activity` returns data

### ✅ Data Flow
- [ ] After 5 minutes, `SELECT * FROM zenin_metrics.chart_data` shows rows
- [ ] After 5 minutes, `SELECT * FROM zenin_metrics.summary_cache` shows rows
- [ ] .NET endpoints return non-empty data from metrics tables

---

## Troubleshooting

### Problem: Node.js server cannot connect to database

**Symptoms:**
```
[DB] Error: Connection failed
```

**Solutions:**
1. Check SQL Server is running: `systemctl status mssql-server`
2. Verify port 1434 is open: `netstat -an | grep 1434`
3. Test connection with sqlcmd: `sqlcmd -S localhost,1434 -U sa -P YourPassword`
4. Check `.env` credentials match `appsettings.json`
5. Verify `TrustServerCertificate=true` in `.env`

---

### Problem: No metrics being generated

**Symptoms:**
```
[MetricsJob] No tenants found, skipping
```

**Solutions:**
1. Verify data exists:
   ```sql
   SELECT COUNT(*) FROM zenin_docs.analysis_results WHERE Status='analyzed';
   ```
2. Check if tenants exist:
   ```sql
   SELECT DISTINCT TenantId FROM zenin_docs.analysis_results;
   ```
3. If zero rows, upload and analyze a file first
4. Check Node.js logs for errors

---

### Problem: LTTB not being applied

**Symptoms:**
`lttb_applied=0` even with many data points

**Solutions:**
1. LTTB only applies if original point count > 200
2. Check `original_point_count` column:
   ```sql
   SELECT metric_type, original_point_count, lttb_applied 
   FROM zenin_metrics.chart_data;
   ```
3. If `original_point_count` < 200, this is expected behavior

---

### Problem: .NET endpoints return empty data

**Symptoms:**
```json
{"dataPoints": []}
```

**Solutions:**
1. Wait 5+ minutes after starting Node.js server
2. Verify metrics tables have data:
   ```sql
   SELECT COUNT(*) FROM zenin_metrics.chart_data;
   SELECT COUNT(*) FROM zenin_metrics.summary_cache;
   ```
3. Check Node.js logs for processing errors
4. Manually trigger job (restart Node.js server)

---

## Metrics Reference

### Available Metric Types

| Type | Description | Unit | LTTB Applied |
|------|-------------|------|--------------|
| `analysis_count` | Analyses per day | Count | Yes |
| `completion_rate` | Success rate per day | Percentage (0-100) | Yes |
| `processing_latency` | Avg processing time | Seconds | Yes |
| `upload_volume` | Uploads per day | Count | Yes |
| `file_size_trend` | Total bytes per day | Megabytes | Yes |

### Summary Metrics

| Field | Type | Description |
|-------|------|-------------|
| `totalAnalyses` | int | Total completed analyses |
| `totalFiles` | int | Total uploaded files |
| `totalSizeBytes` | long | Total bytes uploaded |
| `analysesThisWeek` | int | Analyses in last 7 days |
| `analysesToday` | int | Analyses today |
| `completionRatePercent` | decimal | Success rate % |
| `errorRatePercent` | decimal | Error rate % |
| `avgProcessingSeconds` | decimal | Avg processing time |
| `lastActivity` | DateTime | Last analysis timestamp |
| `classificationBreakdown` | JSON | `{"numeric":123,"text":456}` |
| `statusBreakdown` | JSON | `{"analyzed":1100,"pending":34}` |

---

## Monitoring

### Check Server Status
```bash
# PM2
pm2 status zenin-metrics
pm2 logs zenin-metrics --lines 50

# Systemd
sudo systemctl status zenin-metrics
sudo journalctl -u zenin-metrics -n 50 -f
```

### Check Database
```sql
-- Latest metrics computation
SELECT TOP 10 
    metric_type, 
    computed_at, 
    original_point_count, 
    lttb_applied 
FROM zenin_metrics.chart_data 
ORDER BY computed_at DESC;

-- Summary cache freshness
SELECT tenant_id, computed_at 
FROM zenin_metrics.summary_cache;
```

### Health Check
```bash
# Should return HTTP 200
curl -i http://localhost:3001/health
```

---

## Security Notes

1. **Node.js server port 3001 is NOT exposed to internet** - internal use only
2. **React NEVER calls Node.js directly** - only .NET API
3. **.NET API validates JWT tokens** before serving metrics
4. **Metrics are tenant-scoped** - users only see their own data
5. **No raw SQL injection risk** - all queries use parameterized commands

---

## Performance Considerations

### LTTB Downsampling
- Activates when raw data > 200 points
- Reduces frontend chart render time from ~500ms to ~50ms
- Preserves visual shape of time series data
- No data loss - full resolution still in source tables

### Scheduler Frequency
- Default: every 5 minutes
- Configurable via `METRICS_INTERVAL_MINUTES` in `.env`
- Higher frequency = more DB load, fresher metrics
- Lower frequency = less DB load, stale metrics

### Database Impact
- Node.js reads from existing tables (no writes to source data)
- Metrics tables are small (~KB per tenant per metric)
- Indexes on `tenant_id`, `metric_type`, `computed_at`
- Queries are optimized with TOP 1 and proper filtering

---

## Maintenance

### Clear Old Metrics
```sql
-- Delete metrics older than 90 days
DELETE FROM zenin_metrics.chart_data 
WHERE computed_at < DATEADD(day, -90, GETUTCDATE());
```

### Rebuild Metrics Manually
```bash
# Restart Node.js server to trigger immediate computation
pm2 restart zenin-metrics

# Or via systemd
sudo systemctl restart zenin-metrics
```

### Update LTTB Threshold
```bash
# Edit .env
nano /home/nicolas/Documentos/Iot_System/ZENIN/server/.env

# Change LTTB_MAX_POINTS=200 to desired value
# Restart server
pm2 restart zenin-metrics
```

---

## Complete Startup Sequence

```bash
# 1. Start SQL Server
sudo systemctl start mssql-server

# 2. Start Node.js Metrics Server
pm2 start zenin-metrics
# OR
sudo systemctl start zenin-metrics

# 3. Start .NET API
cd /home/nicolas/Documentos/Iot_System/ZENIN/backend
dotnet run --project src/Zenin.API

# 4. Start React Frontend
cd /home/nicolas/Documentos/Iot_System/ZENIN/frontend
npm run dev

# 5. Verify all services
curl http://localhost:3001/health          # Node.js
curl http://localhost:5000/api/health      # .NET
curl http://localhost:5173                 # React
```

---

## Success Criteria

✅ **Deployment is successful if:**

1. Node.js server shows `[MetricsJob] Successfully processed tenant: <guid>` every 5 minutes
2. Database tables `zenin_metrics.chart_data` and `zenin_metrics.summary_cache` have rows
3. .NET endpoint `/api/metrics/summary` returns non-zero `totalAnalyses` (if data exists)
4. .NET endpoint `/api/metrics/chart-data?type=analysis_count` returns array of `dataPoints`
5. React dashboard (if integrated) displays charts with data

---

## Support

**Logs location:**
- Node.js PM2: `~/.pm2/logs/zenin-metrics-*.log`
- Node.js systemd: `journalctl -u zenin-metrics`
- .NET: Console output
- React: Browser DevTools → Console

**Common issues:** See Troubleshooting section above

**Architecture diagram:** See top of this document
