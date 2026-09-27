# 🛰️ WebSockets & Webhooks Integration

SkyView provides real-time streaming capabilities and event-driven inbound webhooks for external messaging networks and field gateways.

---

## ⚡ WebSocket Live Sensor Feed

### Endpoint: `ws://<HOST>/api/sensors/ws`
Allows client interfaces (the React Web Dashboard and Flutter Mobile App) to subscribe to real-time telemetry changes without polling.

```json
{
  "event": "TELEMETRY_UPDATE",
  "data": {
    "station_id": "WS01",
    "timestamp": 1790515320,
    "temperature": 29.1,
    "humidity": 64.0,
    "soil_moisture": 38.2,
    "frost_warning": false
  }
}
```

---

## 📲 Inbound Webhooks

### 1. Twilio / WhatsApp Business Webhook (`POST /api/webhooks/whatsapp`)
Enables farmers without smartphones to send a WhatsApp message or audio voice note to the SkyView agent.
- Receives Twilio messaging payload.
- Passes voice notes to Whisper / Gemini multimodal speech-to-text.
- Replies via WhatsApp sandbox with actionable farming guidance.

### 2. LoRaWAN Gateway Webhook (`POST /api/webhooks/lora-ingest`)
Enables Dragino, Kerlink, or The Things Network (TTN) gateways to forward base64 encoded LoRa packets directly into FastAPI.
