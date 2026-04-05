import {
  classificationColor,
  statusColor,
  severityColor,
  regimeColor,
  priorityColor,
  circuitBreakerColor,
  healthColor,
  ClassificationType,
  StatusType,
  SeverityType,
  RegimeType,
  PriorityType,
  CircuitBreakerStatus,
  HealthStatus
} from '../../utils/statusColors';

export type BadgeType = 'classification' | 'status' | 'severity' | 'regime' | 'priority' | 'circuitBreaker' | 'health';

export type BadgeValue = ClassificationType | StatusType | SeverityType | RegimeType | PriorityType | CircuitBreakerStatus | HealthStatus;

const colorFnMap: Record<BadgeType, (value: BadgeValue) => string> = {
  classification: classificationColor as (value: BadgeValue) => string,
  status: statusColor as (value: BadgeValue) => string,
  severity: severityColor as (value: BadgeValue) => string,
  regime: regimeColor as (value: BadgeValue) => string,
  priority: priorityColor as (value: BadgeValue) => string,
  circuitBreaker: circuitBreakerColor as (value: BadgeValue) => string,
  health: healthColor as (value: BadgeValue) => string
};

export interface StatusBadgeProps {
  type?: BadgeType;
  value: BadgeValue;
  label?: string;
  className?: string;
}

export const StatusBadge = ({ type = 'status', value, label, className = '' }: StatusBadgeProps): React.ReactElement => {
  const colorFn = colorFnMap[type] || statusColor;
  const displayLabel = label || String(value);

  return (
    <span className={`px-2 py-0.5 text-xs font-bold ${colorFn(value)} ${className}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
