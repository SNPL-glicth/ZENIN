# PHASE 1: Data Analysis Report
**Date:** 2026-03-17  
**Purpose:** Analyze existing zenin_db tables to determine what metrics can be computed without inventing data

---

## 1. Available Tables & Fields

### `zenin_docs.analysis_results`
**Existing Fields:**
- `Id` (Guid)
- `TenantId` (Guid) ✓ **REQUIRED FOR MULTI-TENANCY**
- `UserId` (Guid)
- `OriginalFilename` (string)
- `FileExtension` (string)
- `FileSizeBytes` (long) ✓ **AGGREGATABLE**
- `Classification` (string: "numeric" | "text" | "mixed" | "unknown") ✓ **AGGREGATABLE**
- `NumericSummary` (JSON nullable)
- `TextSummary` (JSON nullable)
- `MlResult` (JSON nullable) ⚠️ **NEEDS INSPECTION**
- `Conclusion` (string nullable)
- `MlDocId` (string nullable)
- `Status` (string: "pending" | "processing" | "analyzed" | "error") ✓ **AGGREGATABLE**
- `ErrorMessage` (string nullable)
- `AnalyzedAt` (DateTime nullable) ✓ **TIME SERIES**
- `CreatedAt` (DateTime) ✓ **TIME SERIES**
- `UpdatedAt` (DateTime nullable)
- `IsDeleted` (bool)

**MISSING FIELDS:**
- ❌ `urgency` - NOT IN SCHEMA
- ❌ `sentiment` - NOT IN SCHEMA  
- ❌ `severity` - NOT IN SCHEMA (only in Anomaly table, not here)

**JSON Fields to Parse:**
- `MlResult` - May contain nested urgency/sentiment/severity if ML Service writes them
- `TextSummary` - May contain sentiment analysis results
- `NumericSummary` - May contain statistical metrics

---

### `zenin_docs.documents`
**Existing Fields:**
- `Id` (Guid)
- `TenantId` (Guid) ✓ **REQUIRED FOR MULTI-TENANCY**
- `UploadedBy` (Guid)
- `OriginalFilename` (string)
- `FileSizeBytes` (long nullable) ✓ **AGGREGATABLE**
- `ContentType` (string: "binary" | other) ✓ **AGGREGATABLE**
- `Status` (string: "pending" | "analyzed" | "error") ✓ **AGGREGATABLE**
- `MlResult` (JSON nullable) ⚠️ **NEEDS INSPECTION**
- `Conclusion` (string nullable)
- `UploadedAt` (DateTimeOffset) ✓ **TIME SERIES**
- `AnalyzedAt` (DateTimeOffset nullable) ✓ **TIME SERIES**
- `CreatedAt` (DateTime)
- `IsDeleted` (bool)

---

### `dbo.anomalies` (IoT/Series Anomalies)
**Existing Fields:**
- `Id` (Guid)
- `TenantId` (Guid) ✓ **REQUIRED FOR MULTI-TENANCY**
- `SeriesId` (Guid)
- `DetectedAt` (DateTimeOffset) ✓ **TIME SERIES**
- `AnomalyScore` (decimal) ✓ **AGGREGATABLE**
- `Severity` (string: "none" | other) ✓ **AGGREGATABLE** ⚠️ **DIFFERENT DOMAIN (IoT, not Documents)**
- `Confidence` (decimal nullable)
- `IsAcknowledged` (bool) ✓ **AGGREGATABLE**

**NOTE:** This table is for IoT sensor anomalies, NOT document analysis severity.

---

## 2. What Can Be Aggregated (WITHOUT Inventing Data)

### ✅ **Safe Aggregations from Existing Fields**

#### From `analysis_results`:
1. **Analyses Count Over Time**
   - `COUNT(*) GROUP BY DATE(CreatedAt), TenantId`
   - Time series: daily/hourly analysis counts
   - LTTB candidate: YES (if > 200 data points)

2. **File Size Distribution Over Time**
   - `AVG(FileSizeBytes), SUM(FileSizeBytes) GROUP BY DATE(CreatedAt), TenantId`
   - Time series: average file size per day
   - LTTB candidate: YES

3. **Classification Distribution**
   - `COUNT(*) GROUP BY Classification, TenantId`
   - Pie chart: numeric vs text vs mixed
   - LTTB candidate: NO (categorical, not time series)

4. **Status Distribution Over Time**
   - `COUNT(*) GROUP BY Status, DATE(CreatedAt), TenantId`
   - Stacked area chart: pending/processing/analyzed/error over time
   - LTTB candidate: YES (per status line)

5. **Analysis Completion Rate**
   - `COUNT(*) WHERE Status='analyzed' / COUNT(*) GROUP BY DATE(CreatedAt), TenantId`
   - Time series: success rate percentage
   - LTTB candidate: YES

6. **Analysis Latency (AnalyzedAt - CreatedAt)**
   - `AVG(DATEDIFF(second, CreatedAt, AnalyzedAt)) GROUP BY DATE(CreatedAt), TenantId WHERE Status='analyzed'`
   - Time series: average processing time in seconds
   - LTTB candidate: YES

#### From `documents`:
7. **Upload Volume Over Time**
   - `COUNT(*) GROUP BY DATE(UploadedAt), TenantId`
   - Time series: daily uploads
   - LTTB candidate: YES

8. **Upload Size Trend**
   - `SUM(FileSizeBytes) GROUP BY DATE(UploadedAt), TenantId`
   - Time series: total bytes uploaded per day
   - LTTB candidate: YES

#### From `anomalies` (IoT only):
9. **Anomaly Detection Rate**
   - `COUNT(*) GROUP BY DATE(DetectedAt), TenantId`
   - Time series: anomalies detected per day
   - LTTB candidate: YES
   - ⚠️ **NOTE:** This is for IoT sensors, not document analysis

---

### ❌ **Cannot Aggregate (Data Does Not Exist)**

1. **Urgency Over Time**
   - ❌ No `urgency` field in `analysis_results`
   - ❌ No `urgency` field in `documents`
   - ⚠️ **MAY exist in `MlResult` JSON** - needs runtime inspection

2. **Sentiment Over Time**
   - ❌ No `sentiment` field in `analysis_results`
   - ❌ No `sentiment` field in `documents`
   - ⚠️ **MAY exist in `MlResult` or `TextSummary` JSON** - needs runtime inspection

3. **Document Severity Distribution**
   - ❌ No `severity` field in `analysis_results`
   - ❌ No `severity` field in `documents`
   - ⚠️ Anomaly.Severity exists but is for IoT sensor anomalies, NOT documents
   - ⚠️ **MAY exist in `MlResult` JSON** - needs runtime inspection

4. **Any metric derived from urgency/sentiment/severity**
   - Cannot compute without these fields existing

---

## 3. JSON Field Inspection Required

**Before proceeding to PHASE 2, we MUST:**

1. Query actual `analysis_results.MlResult` JSON samples to check if it contains:
   ```json
   {
     "urgency": number,
     "sentiment": "positive" | "negative" | "neutral",
     "severity": "critical" | "moderate" | "low"
   }
   ```

2. Query actual `documents.MlResult` JSON samples

3. Query actual `analysis_results.TextSummary` JSON samples

**SQL to run:**
```sql
-- Get sample MlResult structures
SELECT TOP 5 
    MlResult, 
    TextSummary, 
    NumericSummary 
FROM zenin_docs.analysis_results 
WHERE MlResult IS NOT NULL 
  AND Status = 'analyzed';

-- Get sample Document MlResult
SELECT TOP 5 
    MlResult 
FROM zenin_docs.documents 
WHERE MlResult IS NOT NULL;
```

**Decision Tree:**
- **IF urgency/sentiment/severity exist in JSON** → Extract and aggregate them
- **IF they do NOT exist** → Remove them from metrics requirements or implement ML extraction first

---

## 4. Recommended .NET Endpoints for React Dashboard

### **Endpoint 1: GET `/api/metrics/chart-data`**
**Purpose:** Serve LTTB-processed time series data for charts

**Query Parameters:**
- `type` (required): `analysis_count` | `file_size_avg` | `completion_rate` | `upload_volume` | `processing_latency`
- `from` (optional): ISO 8601 date, default = 30 days ago
- `to` (optional): ISO 8601 date, default = now
- `resolution` (optional): `hour` | `day` | `week` | `month`, default = auto

**Response:**
```json
{
  "metric_type": "analysis_count",
  "series_key": "tenant_123",
  "period_start": "2026-02-15T00:00:00Z",
  "period_end": "2026-03-17T00:00:00Z",
  "data_points": [
    { "timestamp": "2026-02-15T00:00:00Z", "value": 12 },
    { "timestamp": "2026-02-16T00:00:00Z", "value": 18 },
    ...
  ],
  "computed_at": "2026-03-17T19:24:00Z",
  "point_count": 150,
  "original_point_count": 720,
  "lttb_applied": true
}
```

---

### **Endpoint 2: GET `/api/metrics/summary`**
**Purpose:** Current snapshot metrics for dashboard cards

**Response:**
```json
{
  "total_analyses": 1234,
  "total_files": 1234,
  "total_size_bytes": 5368709120,
  "last_activity": "2026-03-17T18:45:00Z",
  "analyses_this_week": 87,
  "analyses_today": 12,
  "average_processing_time_seconds": 45.3,
  "completion_rate_percent": 94.2,
  "error_rate_percent": 2.1,
  "classification_breakdown": {
    "numeric": 456,
    "text": 678,
    "mixed": 100
  },
  "status_breakdown": {
    "analyzed": 1100,
    "pending": 34,
    "processing": 12,
    "error": 88
  }
}
```

---

### **Endpoint 3: GET `/api/metrics/recent-activity`**
**Purpose:** Recent analyses for dashboard "Recent Activity" section

**Query Parameters:**
- `limit` (optional): default = 10, max = 50

**Response:**
```json
{
  "recent_analyses": [
    {
      "id": "guid",
      "filename": "data.csv",
      "classification": "numeric",
      "status": "analyzed",
      "created_at": "2026-03-17T18:30:00Z",
      "analyzed_at": "2026-03-17T18:31:23Z",
      "processing_time_seconds": 83
    }
  ]
}
```

---

## 5. Next Steps

### **BEFORE PHASE 2:**
1. ✅ **Run SQL queries** to inspect `MlResult`, `TextSummary`, `NumericSummary` JSON structures
2. ✅ **Determine** if urgency/sentiment/severity exist in JSON
3. ✅ **Decide** final metric list based on available data
4. ✅ **Confirm** with user which metrics are actually needed

### **PHASE 2: Database Migration**
- Create `zenin_metrics.chart_data` table
- Fields: `id`, `tenant_id`, `metric_type`, `series_key`, `data_points` (JSON), `period_start`, `period_end`, `computed_at`, `source`

### **PHASE 3: Node.js Metrics Server**
- Implement LTTB algorithm
- Create processors for confirmed metrics only
- Read from `analysis_results` and `documents`
- Write to `zenin_metrics.chart_data`
- Run every 5 minutes via cron

### **PHASE 4: .NET Endpoints**
- Add 3 endpoints listed above
- Read from `zenin_metrics.chart_data`
- Serve to React

---

## 6. Critical Questions for User

1. **Do urgency/sentiment/severity actually exist in MlResult JSON?**
   - If NO → Remove them from requirements OR implement ML extraction first
   - If YES → Provide sample JSON structure

2. **Which metrics are ACTUALLY needed for the dashboard?**
   - All 9 safe aggregations?
   - Only specific ones?

3. **Should we aggregate IoT anomaly severity or only document analysis?**
   - Current Anomaly.Severity is for IoT sensors, not documents

4. **What is the expected data volume?**
   - How many analyses per day per tenant?
   - Determines LTTB threshold (> 200 points?)

---

**STATUS:** ⚠️ **BLOCKED - Waiting for JSON structure inspection and user confirmation**
