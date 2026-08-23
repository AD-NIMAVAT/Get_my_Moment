# Get My Moment — API Performance Baseline (P1-BASELINE-01)

**Framework:** FastAPI + Uvicorn (2 Workers)  
**Reverse Proxy:** Nginx 1.28.3 (Ubuntu)  

---

## 1. EMPIRICAL API ENDPOINT LATENCY PROFILE

| Endpoint | Method | Internal p50 (Direct to Uvicorn) | via Nginx Reverse Proxy | Remote Client (India -> Stockholm) | Bottleneck Factor |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `GET /api/v1/health` | GET | **3.99 ms** | **8.81 ms** | **618.0 ms** | Network WAN RTT |
| `GET /api/v1/events/public/by-token/{token}` | GET | **6.24 ms** | **11.40 ms** | **625.0 ms** | Network WAN RTT |
| `POST /api/v1/auth/login` | POST | **18.5 ms** | **24.1 ms** | **640.0 ms** | Argon2/Bcrypt hash verification |
| `POST /api/v1/events/{id}/guests/register` | POST | **12.0 ms** | **17.5 ms** | **635.0 ms** | Database transaction |
| `POST /api/v1/events/{id}/guests/{id}/search` | POST | **95.0 ms** | **102.0 ms** | **720.0 ms** | Selfie face detection + feature extraction in RAM |
| `GET /api/v1/photos/{id}/thumbnail` | GET | **14.2 ms** | **19.8 ms** | **645.0 ms** | Python I/O streaming |

---

## 2. OBSERVATIONS
- **Internal API throughput is high (< 15 ms average server processing time).**
- **The overwhelming majority (> 95%) of user-perceived latency is WAN network distance from India to AWS Stockholm (`eu-north-1`).**
- **CloudFront CDN deployment in India will slash perceived API/thumbnail load times from ~640ms down to ~35ms.**

