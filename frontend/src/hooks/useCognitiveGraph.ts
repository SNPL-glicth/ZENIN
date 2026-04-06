import { useEffect, useRef, useState, useCallback } from 'react';

export interface CognitiveDiagnostic {
  seriesId: string;
  predictedValue: number;
  confidence: number;
  trend: string;
  regime: string;
  signalProfile?: {
    noiseRatio: number;
    slope: number;
    curvature: number;
    stability: number;
  };
  enginePerceptions?: Array<{
    engineName: string;
    predictedValue: number;
    confidence: number;
    weight: number;
    inhibited?: boolean;
  }>;
  fusionWeights?: Record<string, number>;
  inhibitionStates?: Array<{
    engineName: string;
    reason: string;
    suppressionFactor: number;
  }>;
  plasticityAdjustments?: Array<{
    engineName: string;
    oldWeight: number;
    newWeight: number;
    regime: string;
  }>;
  timestamp: string;
}

export interface UseCognitiveGraphReturn {
  diagnostic: CognitiveDiagnostic | null;
  isConnected: boolean;
  error: string | null;
  sendFeedback: (feedback: UserFeedback) => void;
}

export interface UserFeedback {
  predictionId?: string;
  seriesId: string;
  confidence: number; // 0-1, user confidence in the prediction
  feedback?: string; // text feedback
  isCorrect?: boolean; // was the prediction correct?
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4424';
const RELAY_HTTP_URL = import.meta.env.VITE_RELAY_URL || 'http://localhost:4423';

export function useCognitiveGraph(): UseCognitiveGraphReturn {
  const [diagnostic, setDiagnostic] = useState<CognitiveDiagnostic | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected to cognitive relay');
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'cognitive_diagnostic') {
            setDiagnostic(message.data);
          } else if (message.type === 'connection') {
            console.log('[WebSocket] Server says:', message.status);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setError('WebSocket connection error');
        setIsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('[WebSocket] Setup error:', err);
    }
  }, []);

  // Send feedback to ML Service via relay
  const sendFeedback = useCallback(async (feedback: UserFeedback) => {
    try {
      const response = await fetch(`${RELAY_HTTP_URL}/relay/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedback,
          userId: 'frontend-user', // Could be replaced with actual user ID from auth
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[Feedback] Sent successfully:', result);
    } catch (err) {
      console.error('[Feedback] Error sending feedback:', err);
      setError('Failed to send feedback');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    diagnostic,
    isConnected,
    error,
    sendFeedback,
  };
}
