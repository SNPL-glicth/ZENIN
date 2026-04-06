# Arquitectura de Comunicación Paralela ZENIN

## Resumen

Sistema de dos canales para separar datos persistentes (DB → .NET → React) de datos en tiempo real (ML → Relay WebSocket → React).

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/TS)                            │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐      │
│  │  usePredictionData  │    │         useCognitiveGraph            │      │
│  │  ─────────────────  │    │  ──────────────────────────────────  │      │
│  │  HTTP REST (.NET)    │    │  WebSocket (Metrics Server)          │      │
│  │  • Predicciones      │    │  • Cognitive Diagnostic              │      │
│  │  • Anomalías         │    │  • Pesos de motores                  │      │
│  │  • Patrones          │    │  • Activación de neuronas            │      │
│  │  • Explicaciones     │    │  • Señal en tiempo real              │      │
│  └──────────┬──────────┘    └──────────────────┬───────────────────┘      │
│             │                                     │                         │
│             │ HTTP                                │ WS                      │
│             ▼                                     ▼                         │
└─────────────────────────────────────────────────────────────────────────────┘
             │                                     │
             │                                     │
┌────────────┴─────────────┐     ┌─────────────────┴─────────────────────────┐
│   BACKEND (.NET)         │     │   METRICS SERVER (TypeScript)             │
│   ───────────────        │     │   ─────────────────────────               │
│   Port: 5000/7000        │     │   HTTP Port: 4423                         │
│   ───────────────        │     │   WS Port: 4424                             │
│   • PredictionRepository │     │   ─────────────────────────               │
│   • AnomaliesController  │     │   Endpoints:                              │
│   • PatternsController   │     │   • POST /relay/cognitive-diagnostic      │
│                          │     │   • POST /relay/feedback                  │
│   SQL Server DB          │     │   • GET  /relay/cognitive-state           │
│   • zenin_ml.predictions │     │                                           │
│   • dbo.anomalies        │     │   WebSocket Broadcast:                    │
│   • dbo.patterns         │     │   • cognitive_diagnostic                  │
│                          │     │                                           │
└──────────────────────────┘     └─────────────────┬─────────────────────────┘
                                                    │
                                                    │ HTTP POST
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ML SERVICE (Python)                              │
│  • MetaCognitiveOrchestrator                                                │
│  • prediction.metadata con cognitive_diagnostic                             │
│  • POST al relay cuando hay nueva predicción                                │
│                                                                             │
│  Configuración en .env:                                                     │
│  METRICS_RELAY_URL=http://localhost:4423/relay/cognitive-diagnostic         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Puertos y URLs

### Desarrollo Local

| Servicio | Puerto | URL Base | CORS Orígenes |
|----------|--------|----------|---------------|
| .NET Backend | 5000 | http://localhost:5000/api | http://localhost:3000, http://localhost:5173 |
| Metrics Server HTTP | 4423 | http://localhost:4423 | http://localhost:3000, http://localhost:5173 |
| Metrics Server WS | 4424 | ws://localhost:4424 | http://localhost:3000, http://localhost:5173 |
| ML Service | 8002 | http://localhost:8002 | - |
| Frontend (Vite) | 5173 | http://localhost:5173 | - |
| Frontend (React) | 3000 | http://localhost:3000 | - |

### Variables de Entorno Frontend

```bash
# .env del frontend
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:4424
VITE_RELAY_URL=http://localhost:4423
```

### Variables de Entorno Metrics Server

```bash
# server/.env
PORT=4423
WS_PORT=4424
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ML_SERVICE_URL=http://localhost:8002
DB_SERVER=localhost
DB_PORT=1434
DB_DATABASE=zenin_db
DB_USER=sa
DB_PASSWORD=YourPasswordHere
```

## Flujos de Datos

### Canal 1: Datos Persistentes (HTTP REST)

```typescript
// Hook: usePredictionData
const { predictions, anomalies, patterns, loading, error, refetch } = usePredictionData();

// Hace polling cada 30 segundos a:
// GET /api/predictions/recent?limit=20
// GET /api/anomalies
// GET /api/patterns
```

**Datos incluidos:**
- Predicciones con confidence, regime, explanation
- Anomalías con severity, methodVotes, anomalyScore
- Patrones detectados

### Canal 2: Gráfos en Tiempo Real (WebSocket)

```typescript
// Hook: useCognitiveGraph
const { diagnostic, isConnected, error, sendFeedback } = useCognitiveGraph();

// Se conecta a: ws://localhost:4424
// Recibe: cognitive_diagnostic en tiempo real
// Envía: POST /relay/feedback
```

**Datos incluidos:**
- Signal profile (noise_ratio, slope, curvature, regime)
- Engine perceptions (cada motor, su predicción, confianza, peso)
- Inhibition states (motores inhibidos y por qué)
- Fusion weights (pesos finales después de plasticidad)
- Plasticity adjustments (cambios en pesos por régimen)

## Endpoints del Relay

### POST /relay/cognitive-diagnostic
Recibe diagnóstico del ML Service y lo retransmite por WebSocket.

**Request:**
```json
{
  "seriesId": "123",
  "predictedValue": 23.5,
  "confidence": 0.85,
  "regime": "stable",
  "signalProfile": {
    "noiseRatio": 0.12,
    "slope": 0.45,
    "curvature": -0.02,
    "stability": 0.89
  },
  "enginePerceptions": [
    { "engineName": "taylor", "predictedValue": 23.7, "confidence": 0.82, "weight": 0.6 },
    { "engineName": "baseline", "predictedValue": 23.2, "confidence": 0.78, "weight": 0.4 }
  ],
  "fusionWeights": { "taylor": 0.6, "baseline": 0.4 },
  "inhibitionStates": [],
  "plasticityAdjustments": []
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Diagnostic relayed to clients",
  "clientsConnected": 3
}
```

### POST /relay/feedback
Recibe feedback del usuario y lo reenvía al ML Service.

**Request:**
```json
{
  "seriesId": "123",
  "predictionId": "456",
  "confidence": 0.9,
  "feedback": "La predicción fue correcta",
  "isCorrect": true,
  "userId": "user-789",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /relay/cognitive-state
Estado actual del relay.

**Response:**
```json
{
  "status": "ok",
  "lastDiagnostic": { ... },
  "clientsConnected": 3,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### WebSocket: ws://localhost:4424

**Mensajes del servidor:**

1. **Connection confirmation:**
```json
{
  "type": "connection",
  "status": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

2. **Cognitive diagnostic broadcast:**
```json
{
  "type": "cognitive_diagnostic",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuración ML Service para Enviar al Relay

Agregar en `ml_service/config/settings.py` o `.env`:

```python
METRICS_RELAY_ENABLED = True
METRICS_RELAY_URL = "http://localhost:4423/relay/cognitive-diagnostic"
```

Y en `application/use_cases/predict_sensor_value.py`:

```python
import requests

def _persist(self, prediction, sensor_id):
    # ... código existente de persistencia ...
    
    # Enviar al relay si está habilitado
    if settings.METRICS_RELAY_ENABLED:
        try:
            cognitive_diagnostic = prediction.metadata.get('cognitive_diagnostic')
            if cognitive_diagnostic:
                requests.post(
                    settings.METRICS_RELAY_URL,
                    json=cognitive_diagnostic,
                    timeout=2
                )
        except Exception as e:
            logger.warning(f"Failed to send to relay: {e}")
```

## Uso en Componentes React

### Ejemplo: Dashboard con ambos canales

```typescript
import { usePredictionData, useCognitiveGraph } from '../hooks';

function MLDashboard() {
  // Canal 1: Datos persistentes desde .NET
  const { predictions, anomalies, loading: dataLoading } = usePredictionData();
  
  // Canal 2: Datos en tiempo real desde Relay
  const { diagnostic, isConnected, sendFeedback } = useCognitiveGraph();
  
  return (
    <div>
      {/* Anomalías desde DB (.NET) */}
      <AnomaliesList anomalies={anomalies} />
      
      {/* Grafo en tiempo real (WebSocket) */}
      {isConnected && diagnostic && (
        <CognitiveGraph 
          engines={diagnostic.enginePerceptions}
          regime={diagnostic.regime}
          onFeedback={(feedback) => sendFeedback({
            seriesId: diagnostic.seriesId,
            confidence: feedback.confidence,
            feedback: feedback.text
          })}
        />
      )}
      
      {/* Predicciones desde DB (.NET) */}
      <PredictionsTable predictions={predictions} />
    </div>
  );
}
```

## CORS Configuración

El Metrics Server acepta conexiones desde:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)
- Orígenes configurados en `CORS_ORIGINS` env var

El .NET Backend tiene CORS configurado en `Program.cs`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(builder.Configuration["Cors:AllowedOrigins"]!.Split(','))
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

## Seguridad en Producción

1. **WebSocket wss://** en lugar de ws://
2. **Autenticación JWT** en headers del WebSocket handshake
3. **Rate limiting** en endpoints /relay
4. **Validación** de payloads antes de retransmisión
5. **Logs** de todas las conexiones y mensajes relay

## Iniciar el Sistema

```bash
# 1. SQL Server (ya corriendo en Docker)
docker start sqlserver

# 2. ML Service
cd iot_machine_learning
python -m ml_service.main

# 3. Metrics Server (con WebSocket)
cd ZENIN/server
npm install  # Instalar nuevas dependencias ws y cors
npm run dev

# 4. .NET Backend
cd ZENIN/backend/src/Zenin.API
dotnet run

# 5. Frontend
cd ZENIN/frontend
npm run dev
```

## Verificación

```bash
# Verificar endpoints
curl http://localhost:4423/health
curl http://localhost:4423/relay/cognitive-state

# Verificar WebSocket (usando wscat)
npm install -g wscat
wscat -c ws://localhost:4424

# Enviar test diagnostic
curl -X POST http://localhost:4423/relay/cognitive-diagnostic \
  -H "Content-Type: application/json" \
  -d '{"seriesId": "test", "confidence": 0.9, "regime": "stable"}'
```
