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
export declare function lttbDownsample(data: DataPoint[], threshold: number): DataPoint[];
export declare function prepareLTTBData(rawData: Array<{
    timestamp: Date | string;
    value: number;
}>, maxPoints?: number): {
    points: DataPoint[];
    originalCount: number;
    lttbApplied: boolean;
};
//# sourceMappingURL=lttb.d.ts.map