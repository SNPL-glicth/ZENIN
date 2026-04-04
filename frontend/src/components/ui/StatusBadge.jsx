import { classificationColor, statusColor, severityColor, regimeColor, priorityColor, circuitBreakerColor, healthColor } from '../../utils/statusColors';

const colorFnMap = {
  classification: classificationColor,
  status: statusColor,
  severity: severityColor,
  regime: regimeColor,
  priority: priorityColor,
  circuitBreaker: circuitBreakerColor,
  health: healthColor
};

export const StatusBadge = ({ type = 'status', value, label, className = '' }) => {
  const colorFn = colorFnMap[type] || statusColor;
  const displayLabel = label || value;

  return (
    <span className={`px-2 py-0.5 text-xs font-bold ${colorFn(value)} ${className}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
