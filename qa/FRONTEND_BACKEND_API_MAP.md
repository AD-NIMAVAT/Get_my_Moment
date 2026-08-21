# QA-003: Frontend ↔ Backend API Mapping

| Frontend Function in `api.ts` | Method | Target Backend Path | Status |
| :--- | :--- | :--- | :--- |
| `api.login()` | POST | `/api/v1/auth/login` | VERIFIED |
| `api.signup()` | POST | `/api/v1/auth/signup` | VERIFIED |
| `api.getEvents()` | GET | `/api/v1/events` | VERIFIED |
| `api.createEvent()` | POST | `/api/v1/events` | VERIFIED |
| `api.createWeddingPresets()` | POST | `/api/v1/events/{id}/folders/wedding-presets` | VERIFIED |
| `api.getFolders()` | GET | `/api/v1/events/{id}/folders` | VERIFIED |
| `api.createFolder()` | POST | `/api/v1/events/{id}/folders` | VERIFIED |
| `api.bulkMovePhotos()` | POST | `/api/v1/events/{id}/photos/bulk-move` | VERIFIED |
| `api.uploadPhoto()` | POST | `/api/v1/events/{id}/photos/upload` | VERIFIED |
| `api.getPublicEvent()` | GET | `/api/v1/events/public/{token}` | VERIFIED |
| `api.registerGuest()` | POST | `/api/v1/events/{id}/guests/register` | VERIFIED |
| `api.guestLogin()` | POST | `/api/v1/events/{id}/guests/login` | VERIFIED |
| `api.validateGuestSession()` | GET | `/api/v1/events/{id}/guests/{id}/session/validate` | VERIFIED |
| `api.getCachedGuestMatch()` | GET | `/api/v1/events/{id}/guests/{id}/cached-match` | VERIFIED |
| `api.searchSelfie()` | POST | `/api/v1/events/{id}/guests/{id}/search` | VERIFIED |
| `api.getSelectionData()` | GET | `/api/v1/selection/{token}` | VERIFIED |
| `api.toggleSelection()` | POST | `/api/v1/selection/{token}/toggle` | VERIFIED |
| `api.submitSelection()` | POST | `/api/v1/selection/{token}/submit` | VERIFIED |
| `api.crewLogin()` | POST | `/api/v1/crew/login` | VERIFIED |
| `api.crewSetActiveCeremony()` | POST | `/api/v1/crew/active-ceremony` | VERIFIED |
| `api.adminLogin()` | POST | `/api/v1/admin/auth/login` | VERIFIED |
| `api.adminGetStats()` | GET | `/api/v1/admin/stats` | VERIFIED |
