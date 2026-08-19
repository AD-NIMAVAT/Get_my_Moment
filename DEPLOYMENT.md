# 🚀 Get My Moment — 1-Click Deployment Guide (Railway Backend + cPanel Frontend)

This guide provides the exact steps to deploy **Get My Moment** with:
* **Backend API & AI Engine**: Hosted on **Railway** (`https://api.getmymoment.fun`)
* **Frontend Web Application**: Hosted on **cPanel** (`https://getmymoment.fun` & `https://www.getmymoment.fun`)

---

## 📋 Architecture & DNS Routing Matrix

| Domain / Subdomain | Target Service | DNS Record Type | DNS Value / Target |
| :--- | :--- | :---: | :--- |
| **`api.getmymoment.fun`** | Railway (FastAPI + AI Engine) | **CNAME** | `<your-railway-cname>.up.railway.app` |
| **`getmymoment.fun`** | cPanel (Next.js Web UI) | **A** | `YOUR_CPANEL_SERVER_IP` (e.g. `123.45.67.89`) |
| **`www.getmymoment.fun`** | cPanel Alias | **CNAME** | `getmymoment.fun` |

---

## ⚡ STEP 1: Deploy Backend to Railway (2 Minutes)

1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "feat: complete production readiness and railway configs for getmymoment.fun"
   git push origin main
   ```
2. Log in to [railway.app](https://railway.app) using your GitHub account.
3. Click **"New Project"** ➡️ Select **"Deploy from GitHub repo"** ➡️ Choose `Get_my_moment`.
4. Railway will automatically detect the **`Dockerfile`** and start building.
5. In your Railway Service:
   * Go to **"Variables"** tab and add:
     ```env
     ENVIRONMENT=production
     DATABASE_URL=sqlite:///./getmymoment.db
     SECRET_KEY=your_production_secret_key_2026_change_me!
     BACKEND_CORS_ORIGINS=["https://getmymoment.fun","https://www.getmymoment.fun","http://localhost:3000"]
     PORT=8000
     ```
   * Go to **"Settings"** tab ➡️ Scroll to **"Networking"** ➡️ Click **"Custom Domain"** ➡️ Enter: `api.getmymoment.fun`.
   * Railway will show you a CNAME record (e.g., `getmymoment-api-production.up.railway.app`).
   * Add this CNAME in your Domain DNS (Hostinger / GoDaddy / Namecheap).
6. Test Health Check:
   Visit `https://api.getmymoment.fun/api/v1/health` in your browser. It will show:
   `{"status": "healthy", "service": "Get My Moment API", ...}`

---

## 🌐 STEP 2: Deploy Frontend on cPanel

### Option A: Via cPanel "Setup Node.js App" (Recommended)
1. Open cPanel ➡️ **"Software"** ➡️ **"Setup Node.js App"**.
2. Click **"Create Application"**:
   * **Node.js version**: `18.x` or `20.x`
   * **Application mode**: `Production`
   * **Application root**: `public_html`
   * **Application URL**: `getmymoment.fun`
   * **Application startup file**: `server.js`
3. Upload the build files to `public_html`:
   * `.next/`
   * `public/`
   * `package.json`
   * `next.config.js`
   * `server.js`
   * `.env.production`
4. Click **"Run NPM Install"** (if needed) and click **"RESTART"**.

### Option B: Via cPanel AutoSSL
1. In cPanel ➡️ **"Security"** ➡️ **"SSL/TLS Status"**.
2. Select `getmymoment.fun` and `www.getmymoment.fun` and click **"Run AutoSSL"**.

---

## 📱 STEP 3: Flutter Mobile App Sync

The Flutter mobile app (`apps/mobile_flutter`) is pre-configured to connect to `https://api.getmymoment.fun/api/v1`.

To build APK:
* Run the GitHub Action `.github/workflows/build_flutter_apk.yml` or run `flutter build apk --release`.

---

## ✅ Deployment Verification Checklist

- [ ] `https://api.getmymoment.fun/api/v1/health` returns `200 OK`.
- [ ] `https://getmymoment.fun` loads home landing page.
- [ ] Studio KYC signup at `https://getmymoment.fun/login` works.
- [ ] Guest selfie matching and QR standee kiosk works.
- [ ] 18% GST invoices and WhatsApp quotes generate properly.
