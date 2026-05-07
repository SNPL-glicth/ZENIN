# ZENIN Metrics Server

Background metrics processor for the ZENIN platform using LTTB (Largest-Triangle-Three-Buckets) downsampling algorithm.

Part of the ZENIN ecosystem: Frontend (React) → .NET Backend → Metrics Server (this service) → SQL Server.

## Architecture

```
ML Service → (writes to) zenin_docs.analysis_results
                            ↓
                    Node.js Metrics Server
                    (reads, processes with LTTB)
                            ↓
               zenin_metrics.chart_data (writes)
                            ↓
                    .NET API (reads only)
                            ↓
                       React Frontend
```

## Key Principles

- **ZERO HTTP endpoints for React** - this server is a background processor only
- **React gets ALL data from .NET** - no direct calls to this server
- **Graceful failure** - if DB is down, log and skip cycle
- **No fake data** - only process what exists in the database
- **LTTB downsampling** - reduce data points to max 200 for frontend performance

## Installation

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/server
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Metrics Computed

### Time Series (LTTB-processed)
- **analysis_count** - Analyses per day
- **completion_rate** - Success rate percentage per day
- **processing_latency** - Average processing time in seconds per day
- **upload_volume** - Files uploaded per day
- **file_size_trend** - Total bytes uploaded per day (in MB)

### Summary Cache
- Total analyses, files, size
- Analyses this week/today
- Completion rate, error rate
- Average processing time
- Classification breakdown (numeric/text/mixed)
- Status breakdown (analyzed/pending/processing/error)

## Scheduler

- Runs every 5 minutes (configurable via `METRICS_INTERVAL_MINUTES`)
- Processes all tenants sequentially
- Graceful failure - errors logged, processing continues

## Health Check

```bash
curl http://localhost:3001/health
```

**Note:** This endpoint is for internal monitoring only. React should never call it.

## Database Schema

Requires:
- `zenin_docs.analysis_results` (existing)
- `zenin_docs.documents` (existing)
- `zenin_metrics.chart_data` (migration script provided)
- `zenin_metrics.summary_cache` (migration script provided)

Run migration:
```bash
# From SQL Server Management Studio or sqlcmd
# Execute: database/migrations/zenin_db/002_create_metrics_table.sql
```

## Troubleshooting

### Cannot connect to database
- Check `.env` DB credentials
- Ensure SQL Server is running on port 1434
- Verify `TrustServerCertificate=true` if using self-signed cert

### No metrics being generated
- Check if `analysis_results` table has data with `Status='analyzed'`
- View logs for errors
- Check scheduler is running (should log every 5 minutes)

### LTTB not being applied
- LTTB only applies if original point count > 200
- Check `lttb_applied` field in `zenin_metrics.chart_data`
