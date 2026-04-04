export const classificationColor = (cls) => {
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
};

export const statusColor = (status) => {
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
};

export const severityColor = (severity) => {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
};

export const getSeverityHex = (severity) => {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    moderate: '#f59e0b',
    low: '#22c55e'
  };
  return colors[severity] || '#6b7280';
};

export const regimeColor = (regime) => {
  const colors = {
    stable: 'bg-green-100 text-green-800',
    trending: 'bg-blue-100 text-blue-800',
    volatile: 'bg-orange-100 text-orange-800',
    noisy: 'bg-red-100 text-red-800'
  };
  return colors[regime?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const priorityLabel = (priority) => {
  const labels = {
    1: 'CRÍTICA',
    2: 'ALTA',
    3: 'MEDIA',
    4: 'BAJA'
  };
  return labels[priority] || 'NORMAL';
};

export const priorityColor = (priority) => {
  const colors = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const circuitBreakerColor = (status) => {
  const colors = {
    closed: 'bg-green-100 text-green-800',
    half_open: 'bg-yellow-100 text-yellow-800',
    open: 'bg-red-100 text-red-800'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const healthColor = (status) => {
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};
