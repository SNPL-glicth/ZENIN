import { ChevronDown, ChevronRight, LineChart, ShieldAlert } from 'lucide-react';
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Card, StatusBadge } from '../ui';
import { formatDate } from '../../utils/formatters';

const DetectionMethods = ({ methods }) => (
  <div className="flex flex-wrap gap-1">
    {methods?.map((method) => (
      <span key={method} className="px-2 py-0.5 bg-gray-100 text-xs font-medium rounded">
        {method}
      </span>
    ))}
  </div>
);

export const AnomalyCard = ({ anomaly, expanded, onToggle }) => {
  const chartData = anomaly.windowValues?.map((v, i) => ({
    index: i,
    value: v,
    isAnomaly: i === anomaly.anomalyIndex
  })) || [];

  return (
    <Card className={`overflow-hidden ${anomaly.severity === 'CRITICAL' ? 'border-red-500' : ''}`}>
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggle(expanded ? null : anomaly.id)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold">{anomaly.seriesId}</p>
              <StatusBadge type="severity" value={anomaly.severity?.toLowerCase()} />
              {anomaly.severity === 'CRITICAL' && <ShieldAlert size={16} className="text-red-500" />}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Score: <strong>{anomaly.anomalyScore?.toFixed(3)}</strong></span>
              <span>Valor: <strong>{anomaly.anomalousValue?.toFixed(2)}</strong></span>
              <span>{formatDate(anomaly.detectedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t-2 border-black p-4 bg-gray-50">
          <div className="mb-4">
            <p className="text-sm font-bold mb-2">Métodos de Detección</p>
            <DetectionMethods methods={anomaly.methodVotes} />
          </div>

          {chartData.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                <LineChart size={16} /> Contexto de la Ventana
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <ReLineChart data={chartData}>
                  <XAxis dataKey="index" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={2} dot={false} />
                  <ReferenceDot x={anomaly.anomalyIndex} y={anomaly.anomalousValue} r={6} fill="#ef4444" stroke="none" />
                </ReLineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-1">Punto rojo = valor anómalo detectado</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-gray-500">Z-Score</p><p className="font-medium">{anomaly.zScore?.toFixed(2) || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">IQR Factor</p><p className="font-medium">{anomaly.iqrFactor?.toFixed(2) || 'N/A'}</p></div>
            <div><p className="text-xs text-gray-500">Velocidad</p><p className="font-medium">{anomaly.velocityZ?.toFixed(2) || 'N/A'}</p></div>
          </div>

          {anomaly.explanation && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm font-medium text-yellow-800">{anomaly.explanation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AnomalyCard;
