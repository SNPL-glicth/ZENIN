import { ChevronDown, ChevronRight, TrendingUp, AlertTriangle, LineChart } from 'lucide-react';
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, StatusBadge } from '../ui';
import { formatDate } from '../../utils/formatters';
import { regimeColor } from '../../utils/statusColors';
import { ConfidenceBar } from './ConfidenceBar';

export const PredictionCard = ({ prediction, expanded, onToggle }) => {
  const chartData = prediction.historicalValues?.map((v, i) => ({
    index: i,
    value: v,
    isPrediction: i >= prediction.historicalValues.length - 1
  })) || [];

  const isHighRisk = prediction.confidence < 0.6 || prediction.regime === 'volatile';

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggle(expanded ? null : prediction.id)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold">{prediction.seriesId}</p>
              <StatusBadge type="regime" value={prediction.regime} />
              {isHighRisk && <AlertTriangle size={16} className="text-red-500" />}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Predicción: <strong>{prediction.predictedValue?.toFixed(2)}</strong></span>
              <span>Confianza: <strong>{Math.round(prediction.confidence * 100)}%</strong></span>
              <span>{formatDate(prediction.predictedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t-2 border-black p-4 bg-gray-50">
          {chartData.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                <LineChart size={16} /> Serie Temporal
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <ReLineChart data={chartData}>
                  <XAxis dataKey="index" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={2} dot={false} />
                  <ReferenceLine x={chartData.length - 1} stroke="#ef4444" strokeDasharray="3 3" />
                </ReLineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-1">Línea roja = punto de predicción</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Engine</p>
              <p className="font-medium">{prediction.selectedEngine}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Guard Level</p>
              <p className="font-medium">{prediction.guardLevel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trend</p>
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className={prediction.trend === 'up' ? 'text-green-500' : 'text-red-500'} />
                <p className="font-medium">{prediction.trend}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Confianza</p>
              <ConfidenceBar value={prediction.confidence} />
            </div>
          </div>

          {isHighRisk && (
            <div className="bg-red-50 border-2 border-red-400 p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-red-600" />
                <p className="font-bold text-red-600">Alerta de Predicción</p>
              </div>
              <p className="text-sm text-red-700 mb-3">
                {prediction.confidence < 0.6
                  ? 'Confianza baja. Verificar manualmente.'
                  : 'Régimen volátil. Posible inestabilidad.'}
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-red-600 text-white text-sm font-bold hover:bg-red-700">
                  Escalar
                </button>
                <button className="px-3 py-1 border-2 border-red-600 text-red-600 text-sm font-bold hover:bg-red-50">
                  Notificar
                </button>
              </div>
            </div>
          )}

          <button
            className="text-blue-600 text-sm font-bold hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/explainability?prediction=${prediction.id}`;
            }}
          >
            Ver Explainability →
          </button>
        </div>
      )}
    </Card>
  );
};

export default PredictionCard;
