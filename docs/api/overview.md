# 🔌 SkyView Backend API Overview

The SkyView platform is powered by a high-throughput, asynchronous FastAPI backend. The API handles real-time IoT telemetry, AI agricultural reasoning, user authentication, and marketplace barter transactions.

---

## 🌐 Server Base URLs

| Environment | Base URL | Access |
| :--- | :--- | :--- |
| **Production (Render)** | `https://brics-agrin-platform.onrender.com` | Public HTTPS |
| **Local Development** | `http://localhost:8000` | Localhost |
| **Frontend Production** | `https://skyview-ai.vercel.app` | Public Web App |

---

## 🔐 Authentication & Session Flow

SkyView utilizes passwordless mobile phone authentication designed for accessibility and operational cost efficiency:

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer / Mobile User
    participant App as Web / Mobile Client
    participant API as FastAPI Backend (/api/auth)
    participant SMS as Fast2SMS Gateway Pool
    participant DB as Neon PostgreSQL

    Note over Farmer,DB: Phase 1: Registration / Signup (Live SMS Dispatched)
    Farmer->>App: Enter Phone & Farmer Profile Details
    App->>API: POST /api/auth/send-otp { phone, is_signup: true }
    API->>API: Generate Secure 6-Digit OTP
    API->>SMS: Dispatch Live OTP SMS via Fast2SMS Pool
    SMS-->>Farmer: Real SMS arrives on mobile handset
    Farmer->>App: Enter Received 6-Digit OTP
    App->>API: POST /api/auth/verify-otp { phone, otp }
    API->>DB: Save verified phone, name, & profile OTP
    API-->>App: Session Token Issued

    Note over Farmer,DB: Phase 2: Subsequent Login (Zero SMS Credits Burned)
    Farmer->>App: Enter Phone Number
    App->>API: POST /api/auth/send-otp { phone, is_signup: false }
    API->>DB: Fetch Saved Profile OTP (0 SMS Credits Used)
    API-->>App: Return Success Notice
    Farmer->>App: Enter Saved Profile OTP
    App->>API: POST /api/auth/verify-otp { phone, otp }
    API-->>App: Session Token Issued
```

### Fast2SMS Key Pool Failover
The backend supports comma-separated API keys via `FAST2SMS_API_KEY`:
```env
FAST2SMS_API_KEY=key_alpha,key_beta,key_gamma
```
If `key_alpha` runs out of credits or encounters an HTTP error, the system automatically fails over to `key_beta` and `key_gamma` sequentially without dropping the user's SMS request.
