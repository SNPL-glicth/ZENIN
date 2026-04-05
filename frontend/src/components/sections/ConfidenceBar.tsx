export interface ConfidenceBarProps {
  value: number;
}

export const ConfidenceBar = ({ value }: ConfidenceBarProps): React.ReactElement => (
  <div className="w-full bg-gray-200 h-2 rounded">
    <div
      className={`h-2 rounded transition-all ${
        value >= 0.8 ? 'bg-green-500' : value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
      }`}
      style={{ width: `${value * 100}%` }}
    />
  </div>
);

export default ConfidenceBar;
