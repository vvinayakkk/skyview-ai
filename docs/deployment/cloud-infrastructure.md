# ☁️ Cloud Infrastructure & Deployment

SkyView is hosted across a modern serverless edge architecture ensuring 99.9% uptime, global CDN distribution, and automatic scaling.

---

## 🏗️ Production Topology

| Component | Platform / Host | Configuration | Production URL |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | Vercel Edge Network | Node.js 20, React 18, Vite static build | `https://skyview-ai.vercel.app` |
| **API Backend** | Render Web Services | Python 3.11, Uvicorn ASGI, auto-deploy on push | `https://brics-agrin-platform.onrender.com` |
| **Database** | Neon Serverless PostgreSQL | PostgreSQL 16 with Connection Pooling | Managed SSL Connection |
| **SMS Gateway** | Fast2SMS Enterprise | Multi-Key Fallback Pool | Live SMS Delivery |

---

## 🛠️ Environment Configuration

### Backend (`.env` or Render Environment Variables)
```env
PORT=8000
DATABASE_URL=postgresql://user:password@ep-round-cloud-a1.ap-southeast-1.aws.neon.tech/skyview?sslmode=require
FAST2SMS_API_KEY=your_primary_key,your_backup_key
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...
GEMINI_API_KEY=AIzaSy...
```

### Frontend (`frontend/.env` or Vercel Environment Variables)
```env
VITE_API_URL=https://brics-agrin-platform.onrender.com
VITE_STATION_ID=WS01
VITE_FAST2SMS_API_KEY=your_primary_key,your_backup_key
```
