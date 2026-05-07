# ZENIN Frontend

Dashboard unificado para la plataforma ZENIN — análisis de datos con ingesta asíncrona, ML y visualizaciones interactivas.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Recharts

---

## Architecture

El frontend sigue el principio de **único cliente del Backend .NET**. Nunca llama directamente al ML Service ni al Metrics Server.

```
Frontend (React)
  → HTTP → .NET Backend (único API gateway)
              → polling /api/ingest/analysis/{id}  (resultados ML async)
              → /api/query  (consultas semánticas relay)
              → /api/dashboard/overview  (stats)
```

**Flujo de ingesta async:**
1. Usuario sube archivo → `POST /api/ingest/upload`
2. Backend responde inmediatamente con `queueId`
3. Frontend inicia polling cada 3s vía `GET /api/ingest/analysis/{id}`
4. Cuando ML Service termina, status cambia a `analyzed` y se muestra el resultado

---

## Features

- **Dashboard unificado** — consultas, upload y estadísticas en una sola vista
- **Upload con estado** — analyzing / pending / analyzed / error con polling automático
- **Consultas semánticas** — preguntas en lenguaje natural relay al ML Service
- **Visualizaciones** — charts interactivos con Recharts (LTTB-downsampled desde Metrics Server)
- **Tailwind CSS** — diseño minimalista blanco y negro
- **Lucide React** — iconografía consistente

---

## Project Structure

```
src/
├── App.tsx                 # Root component → AppRouter
├── main.tsx                # Entry point
├── router/
│   └── AppRouter.tsx       # React Router DOM config
├── pages/
│   ├── Dashboard.tsx       # Vista unificada (consultar + upload + stats)
│   ├── Upload.tsx          # Upload standalone (full page)
│   ├── Query.tsx           # Consultas standalone (full page)
│   └── ...
├── features/
│   ├── auth/               # Login, register, JWT handling
│   ├── admin/              # Admin panel
│   ├── chat/               # Chat / consultas UI
│   └── home/               # Home / landing
├── components/
│   └── Layout.tsx          # Sidebar + main content
├── services/
│   ├── ingestService.ts    # upload + pollForResult
│   ├── queryService.ts     # ask (POST /query)
│   └── dashboardService.ts # getOverview
├── styles/
│   └── ...                 # Tailwind + custom CSS
└── assets/
    └── ...                 # Static assets
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Backend .NET running (`http://localhost:5000`)

### Install

```bash
cd /home/nicolas/Documentos/Iot_System/ZENIN/frontend/my-app
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env
VITE_API_URL=http://localhost:5000/api
```

### Run Development

```bash
npm run dev
```

Frontend en `http://localhost:5173`

### Build Production

```bash
npm run build
```

Output en `dist/`, servido por nginx en producción.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **All API calls via .NET Backend** | Single source of truth, CORS simplificado, auth centralizado |
| **Polling cada 3s (max 40 intentos)** | Balance entre UX y carga del servidor |
| **LTTB downsampling** | El backend recibe datos ya downsampled a ≤200 puntos para performance |
| **Tailwind CSS v4** | Zero-config, utility-first, bundle size optimizado |
| **React 19 + Vite** | Compiler-ready, HMR instantáneo, build rápido |

---

## License

MIT
