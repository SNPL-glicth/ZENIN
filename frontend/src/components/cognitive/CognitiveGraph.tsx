import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, Position, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useCallback, memo } from 'react';
import { Activity, Zap, Minus, Plus, X, Brain, Signal } from 'lucide-react';

interface EnginePerception {
  engineName: string;
  predictedValue: number;
  confidence: number;
  weight: number;
  inhibited?: boolean;
}

interface InhibitionState {
  engineName: string;
  reason: string;
  suppressionFactor: number;
}

interface SignalProfile {
  noiseRatio: number;
  slope: number;
  curvature: number;
  stability: number;
  regime?: string;
}

interface CognitiveDiagnostic {
  seriesId: string;
  predictedValue: number;
  confidence: number;
  trend: string;
  regime: string;
  signalProfile?: SignalProfile;
  enginePerceptions?: EnginePerception[];
  finalWeights?: Record<string, number>;
  inhibitionStates?: InhibitionState[];
  selectedEngine?: string;
  selectionReason?: string;
  timestamp: string;
}

interface FeedbackPanelProps {
  nodeId: string | null;
  nodeData: EnginePerception | null;
  onClose: () => void;
  onFeedback: (action: 'reinforce' | 'penalize') => void;
}

const FeedbackPanel = ({ nodeId, nodeData, onClose, onFeedback }: FeedbackPanelProps) => {
  if (!nodeId || !nodeData) return null;

  return (
    <div className="absolute top-4 right-4 z-10 bg-black border-2 border-cyan-400 rounded-lg p-4 shadow-[0_0_20px_rgba(34,211,238,0.3)] w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Brain size={16} />
          Motor: {nodeData.engineName}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-2 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Confianza:</span>
          <span className="text-cyan-400 font-mono">{(nodeData.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Peso actual:</span>
          <span className="text-purple-400 font-mono">{(nodeData.weight * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Predicción:</span>
          <span className="text-white font-mono">{nodeData.predictedValue?.toFixed(2) || 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onFeedback('reinforce')}
          className="flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          <Plus size={14} />
          Reforzar
        </button>
        <button
          onClick={() => onFeedback('penalize')}
          className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        >
          <Minus size={14} />
          Penalizar
        </button>
      </div>
    </div>
  );
};

const CustomNode = memo(({ data }: { data: any }) => {
  const isSignal = data.type === 'signal';
  const isFusion = data.type === 'fusion';
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
        isSignal 
          ? 'bg-gray-900 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
          : isFusion
            ? 'bg-purple-900/50 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            : data.inhibited 
              ? 'bg-gray-800 border-red-500 opacity-50' 
              : 'bg-gray-800 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {isSignal ? (
          <Signal size={16} className="text-cyan-400" />
        ) : isFusion ? (
          <Activity size={16} className="text-purple-400" />
        ) : (
          <Zap size={16} className={data.inhibited ? 'text-red-400' : 'text-cyan-400'} />
        )}
        <span className={`font-bold text-sm ${isFusion ? 'text-purple-300' : 'text-white'}`}>
          {data.label}
        </span>
      </div>
      {!isSignal && !isFusion && (
        <div className="mt-2 text-xs space-y-1">
          <div className="flex justify-between text-gray-300">
            <span>Peso:</span>
            <span className="font-mono text-cyan-400">{(data.weight * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Conf:</span>
            <span className="font-mono text-green-400">{(data.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
});

const nodeTypes = {
  custom: CustomNode,
};

interface CognitiveGraphProps {
  diagnostic: CognitiveDiagnostic | null;
  onNodeClick?: (nodeId: string, data: EnginePerception) => void;
}

function CognitiveGraph({ diagnostic, onNodeClick }: CognitiveGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Build graph when diagnostic changes
  useEffect(() => {
    if (!diagnostic || !diagnostic.enginePerceptions) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const perceptions = diagnostic.enginePerceptions || [];
    const weights = diagnostic.finalWeights || {};
    const inhibitions = diagnostic.inhibitionStates || [];
    
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Signal input node (left)
    newNodes.push({
      id: 'signal',
      type: 'custom',
      position: { x: 50, y: 200 },
      data: { 
        label: `Señal\n${diagnostic.regime}`,
        type: 'signal',
        profile: diagnostic.signalProfile
      },
      sourcePosition: Position.Right,
    });

    // Engine nodes (middle)
    const engineYSpacing = 80;
    const startY = 100;
    
    perceptions.forEach((engine, index) => {
      const isInhibited = inhibitions.some(i => i.engineName === engine.engineName);
      const finalWeight = weights[engine.engineName] || engine.weight;
      
      const nodeId = `engine-${engine.engineName}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 250, y: startY + (index * engineYSpacing) },
        data: {
          label: engine.engineName,
          weight: finalWeight,
          confidence: engine.confidence,
          inhibited: isInhibited,
          type: 'engine',
          engineData: engine,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      });

      // Edge from signal to engine
      newEdges.push({
        id: `edge-signal-${nodeId}`,
        source: 'signal',
        target: nodeId,
        animated: true,
        style: { 
          stroke: isInhibited ? '#ef4444' : '#06b6d4',
          strokeWidth: isInhibited ? 1 : 2 + (finalWeight * 4),
        },
        type: 'smoothstep',
      });
    });

    // Fusion node (right)
    const selectedEngine = diagnostic.selectedEngine || 'unknown';
    newNodes.push({
      id: 'fusion',
      type: 'custom',
      position: { x: 500, y: 200 },
      data: { 
        label: `Fusión\n${selectedEngine}`,
        type: 'fusion',
        finalValue: diagnostic.predictedValue,
        confidence: diagnostic.confidence,
      },
      targetPosition: Position.Left,
    });

    // Edges from engines to fusion
    perceptions.forEach((engine) => {
      const nodeId = `engine-${engine.engineName}`;
      const finalWeight = weights[engine.engineName] || engine.weight;
      
      newEdges.push({
        id: `edge-${nodeId}-fusion`,
        source: nodeId,
        target: 'fusion',
        animated: finalWeight > 0.3,
        style: { 
          stroke: engine.engineName === selectedEngine ? '#a855f7' : '#06b6d4',
          strokeWidth: 1 + (finalWeight * 6),
          opacity: finalWeight < 0.1 ? 0.2 : 1,
        },
        type: 'smoothstep',
        label: `${(finalWeight * 100).toFixed(0)}%`,
        labelStyle: { fill: '#a855f7', fontSize: 10 },
        labelBgStyle: { fill: '#000', opacity: 0.8 },
      });
    });

    setNodes(newNodes as any);
    setEdges(newEdges as any);
  }, [diagnostic, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.data?.type === 'engine' && node.data?.engineData && onNodeClick) {
      onNodeClick(node.id, node.data.engineData as EnginePerception);
    }
  }, [onNodeClick]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
      <ReactFlow
        nodes={nodes as any}
        edges={edges as any}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-gray-900"
      >
        <Background 
          color="#374151" 
          gap={20} 
          size={1} 
          variant={BackgroundVariant.Dots}
        />
        <Controls 
          className="bg-black border border-gray-700" 
          style={{ color: '#06b6d4' }}
        />
      </ReactFlow>
    </div>
  );
};

export { 
  CognitiveGraph, 
  FeedbackPanel,
  type CognitiveDiagnostic, 
  type EnginePerception, 
  type SignalProfile, 
  type InhibitionState,
  type FeedbackPanelProps 
};

export default CognitiveGraph;
