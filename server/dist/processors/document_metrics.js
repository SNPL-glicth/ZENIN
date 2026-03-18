"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeUploadVolumeMetric = computeUploadVolumeMetric;
exports.computeFileSizeTrendMetric = computeFileSizeTrendMetric;
const document_reader_1 = require("../readers/document_reader");
const lttb_1 = require("./lttb");
async function computeUploadVolumeMetric(tenantId, fromDate, toDate) {
    const documents = await (0, document_reader_1.getDocumentsByTenant)(tenantId, fromDate, toDate);
    // Group by day
    const dailyCounts = new Map();
    documents.forEach((d) => {
        const day = d.uploaded_at.toISOString().split('T')[0];
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    });
    const rawData = Array.from(dailyCounts.entries()).map(([date, count]) => ({
        timestamp: new Date(date + 'T00:00:00Z'),
        value: count,
    }));
    rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const { points, originalCount, lttbApplied } = (0, lttb_1.prepareLTTBData)(rawData, 200);
    return {
        metricType: 'upload_volume',
        seriesKey: tenantId,
        dataPoints: points,
        periodStart: fromDate,
        periodEnd: toDate,
        originalCount,
        lttbApplied,
    };
}
async function computeFileSizeTrendMetric(tenantId, fromDate, toDate) {
    const documents = await (0, document_reader_1.getDocumentsByTenant)(tenantId, fromDate, toDate);
    // Group by day and sum file sizes
    const dailySizes = new Map();
    documents.forEach((d) => {
        const day = d.uploaded_at.toISOString().split('T')[0];
        const sizeBytes = d.file_size_bytes || 0;
        dailySizes.set(day, (dailySizes.get(day) || 0) + sizeBytes);
    });
    // Convert to MB for readability
    const rawData = Array.from(dailySizes.entries()).map(([date, bytes]) => ({
        timestamp: new Date(date + 'T00:00:00Z'),
        value: bytes / (1024 * 1024), // Convert to MB
    }));
    rawData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const { points, originalCount, lttbApplied } = (0, lttb_1.prepareLTTBData)(rawData, 200);
    return {
        metricType: 'file_size_trend',
        seriesKey: tenantId,
        dataPoints: points,
        periodStart: fromDate,
        periodEnd: toDate,
        originalCount,
        lttbApplied,
    };
}
//# sourceMappingURL=document_metrics.js.map