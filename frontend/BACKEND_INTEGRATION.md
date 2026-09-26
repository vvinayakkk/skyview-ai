# Weather Frontend Integration

This is the integrated React/TypeScript frontend connected to your FastAPI backend.

## Setup

### 1. Install Dependencies
```bash
cd weather-frontend/local-weather-view-main
npm install
# or
bun install
```

### 2. Start Development Server
```bash
npm run dev
# or
bun run dev
```

The app will open at: **http://localhost:5173**

### 3. Ensure Backend is Running

Make sure your FastAPI backend is running on `http://localhost:8000`:

```bash
# In project root
python app.py
```

Check health: http://localhost:8000/health

## Configuration

The frontend connects to the backend via environment variables in `.env.local`:

```env
VITE_API_URL=http://localhost:8000/api/sensors
VITE_STATION_ID=WS01
```

Modify `VITE_STATION_ID` to connect to different weather stations.

## Features Integrated

✅ **Real-time Data**: Fetches latest sensor readings
✅ **Historical Charts**: 24-hour temperature, humidity, rainfall trends
✅ **System Health**: Battery, solar, LoRa link status
✅ **Auto-Refresh**: Updates every 30 seconds
✅ **Multi-Language**: English, Hindi, Telugu support
✅ **Responsive Design**: Works on desktop and mobile

## Data Flow

```
Raspberry Pi (LoRa) 
    ↓
FastAPI Backend (localhost:8000/api/sensors/)
    ↓
React Frontend (localhost:5173)
    ↓
Beautiful Dashboard
```

## Available Endpoints Used

- `GET /api/sensors/latest/{station_id}` - Current readings
- `GET /api/sensors/history/{station_id}` - Historical data
- `GET /api/sensors/stats/{station_id}` - Aggregated statistics

## Testing

### Send Test Data
```bash
python lora_client.py --continuous --interval 10
```

### Send Single Reading
```bash
python lora_client.py
```

### View API Docs
http://localhost:8000/docs

## Troubleshooting

### "Unable to connect to the remote server"
- Check if backend is running: `Invoke-RestMethod http://localhost:8000/health`
- Check `.env.local` has correct `VITE_API_URL`
- Ensure no firewall blocking port 8000

### No data appearing in dashboard
- Check browser Console (F12) for errors
- Check Network tab to see API requests
- Verify backend is actually running and has sensor data
- Check `VITE_STATION_ID` matches actual device

### CORS errors
- Backend already allows cross-origin requests
- Verify API URL in `.env.local` is correct

## Build for Production

```bash
npm run build
```

Output goes to `dist/` folder - ready to deploy!

## Learn More

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Your Backend API](http://localhost:8000/docs)
