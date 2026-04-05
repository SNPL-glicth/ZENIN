export type ClassificationType = 'numeric' | 'text' | 'mixed' | string;
export type StatusType = 'analyzed' | 'processing' | 'error' | 'pending' | string;
export type SeverityType = 'critical' | 'high' | 'moderate' | 'low' | string;
export type RegimeType = 'stable' | 'trending' | 'volatile' | 'noisy' | string;
export type PriorityType = 1 | 2 | 3 | 4 | number;
export type CircuitBreakerStatus = 'closed' | 'half_open' | 'open' | string;
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | string;

export function classificationColor(cls: ClassificationType): string {
  switch (cls) {
    case 'numeric':
      return 'bg-blue-100 text-blue-800';
    case 'text':
      return 'bg-purple-100 text-purple-800';
    case 'mixed':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function statusColor(status: StatusType): string {
  switch (status) {
    case 'analyzed':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function severityColor(severity: SeverityType): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
}

export function getSeverityHex(severity: SeverityType): string {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    moderate: '#f59e0b',
    low: '#22c55e'
  };
  return colors[severity] || '#6b7280';
}

export function regimeColor(regime: RegimeType): string {
  const colors: Record<string, string> = {
    stable: 'bg-green-100 text-green-800',
    trending: 'bg-blue-100 text-blue-800',
    volatile: 'bg-orange-100 text-orange-800',
    noisy: 'bg-red-100 text-red-800'
  };
  return colors[regime?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function priorityLabel(priority: PriorityType): string {
  const labels: Record<number, string> = {
    1: 'CRÍTICA',
    2: 'ALTA',
    3: 'MEDIA',
    4: 'BAJA'
  };
  return labels[priority] || 'NORMAL';
}

export function priorityColor(priority: PriorityType): string {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

export function circuitBreakerColor(status: CircuitBreakerStatus): string {
  const colors: Record<string, string> = {
    closed: 'bg-green-100 text-green-800',
    half_open: 'bg-yellow-100 text-yellow-800',
    open: 'bg-red-100 text-red-800'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function healthColor(status: HealthStatus): string {
  const colors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
