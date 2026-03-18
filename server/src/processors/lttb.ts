/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * Reference: https://github.com/sveinn-steinarsson/flot-downsample
 * 
 * Reduces time series data to a target number of points while preserving visual shape.
 * Used to downsample large datasets (e.g., 10,000 points) to ~200 points for frontend charts.
 */

export interface DataPoint {
  timestamp: string;
  value: number;
}

export function lttbDownsample(data: DataPoint[], threshold: number): DataPoint[] {
  if (data.length <= threshold) {
    return data;
  }

  const sampled: DataPoint[] = [];
  const dataLength = data.length;

  // Always include first point
  sampled.push(data[0]);

  const bucketSize = (dataLength - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (for triangle area)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeEnd2 = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    let avgTimestamp = 0;
    let avgValue = 0;
    let avgRangeLength = avgRangeEnd2 - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd2; j++) {
      avgTimestamp += new Date(data[j].timestamp).getTime();
      avgValue += data[j].value;
    }
    avgTimestamp /= avgRangeLength;
    avgValue /= avgRangeLength;

    // Get the range for this bucket
    const rangeOffs = Math.floor((i + 0) * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointATimestamp = new Date(data[a].timestamp).getTime();
    const pointAValue = data[a].value;

    let maxArea = -1;
    let maxAreaPoint = 0;

    for (let j = rangeOffs; j < rangeTo; j++) {
      // Calculate triangle area over three buckets
      const pointBTimestamp = new Date(data[j].timestamp).getTime();
      const pointBValue = data[j].value;

      const area =
        Math.abs(
          (pointATimestamp - avgTimestamp) * (pointBValue - pointAValue) -
            (pointATimestamp - pointBTimestamp) * (avgValue - pointAValue)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  // Always include last point
  sampled.push(data[dataLength - 1]);

  return sampled;
}

export function prepareLTTBData(
  rawData: Array<{ timestamp: Date | string; value: number }>,
  maxPoints: number = 200
): { points: DataPoint[]; originalCount: number; lttbApplied: boolean } {
  const normalized: DataPoint[] = rawData.map((d) => ({
    timestamp: typeof d.timestamp === 'string' ? d.timestamp : d.timestamp.toISOString(),
    value: d.value,
  }));

  if (normalized.length <= maxPoints) {
    return {
      points: normalized,
      originalCount: normalized.length,
      lttbApplied: false,
    };
  }

  const downsampled = lttbDownsample(normalized, maxPoints);
  return {
    points: downsampled,
    originalCount: normalized.length,
    lttbApplied: true,
  };
}
