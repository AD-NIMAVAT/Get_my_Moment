# 🚀 Get My Moment — Cloud Deployment Guide (Railway Backend + Vercel Frontend)

This guide provides the exact steps to deploy **Get My Moment** with:
* **Backend API & AI Engine**: Hosted on **Railway** (`https://web-production-08582.up.railway.app`)
* **Frontend Web Application**: Hosted on **Vercel** (`https://getmymoment.fun` & `https://www.getmymoment.fun`)

---

## 📋 Architecture & DNS Routing Matrix (Hostinger / GoDaddy)

| Domain / Subdomain | Target Platform | DNS Record Type | Target / Value |
| :--- | :--- | :---: | :--- |
| **`getmymoment.fun`** | Vercel (Next.js Frontend) | **A** | `76.76.21.21` |
| **`www.getmymoment.fun`** | Vercel Alias | **CNAME** | `cname.vercel-dns.com.` |
| **`api.getmymoment.fun`** *(Optional)* | Railway Backend Alias | **CNAME** | `web-production-08582.up.railway.app` |

---

## ⚡ STEP 1: Backend on Railway (ALREADY LIVE! ✅)
* Live API Endpoint: `https://web-production-08582.up.railway.app/api/v1`
* Live Health Check: `https://web-production-08582.up.railway.app/api/v1/health`

---

## 🌐 STEP 2: Deploy Frontend on Vercel (In 1 Minute)

1. Log in to **[vercel.com](https://vercel.com)** with your GitHub account.
2. Click **"Add New..."** ➡️ **"Project"**.
3. Select your repository: **`AD-NIMAVAT/Get_my_Moment`** and click **Import**.
4. In the **Configure Project** screen:
   * **Framework Preset**: Next.js (automatically detected)
   * **Root Directory**: Click **Edit** ➡️ Select **`apps/web`** ➡️ Click **Continue**.
   * **Environment Variables**: Add the following:
     | Name | Value |
     | :--- | :--- |
     | `NEXT_PUBLIC_API_URL` | `https://web-production-08582.up.railway.app/api/v1` |
     | `NEXT_PUBLIC_APP_URL` | `https://getmymoment.fun` |
5. Click **"Deploy"**!
6. Vercel will build and launch your site in ~45 seconds.

---

## 🔗 STEP 3: Connect Your Domain (`getmymoment.fun`) on Vercel

1. In your Vercel Project ➡️ Go to **"Settings"** ➡️ **"Domains"**.
2. Type `getmymoment.fun` and click **Add**.
3. Vercel will prompt you to also add `www.getmymoment.fun` (recommended).
4. In your DNS Provider (Hostinger DNS Table):
   * Set **A Record** for `@` pointing to: `76.76.21.21`
   * Set **CNAME Record** for `www` pointing to: `cname.vercel-dns.com.`
5. Vercel will automatically issue a free SSL/TLS certificate!

---

## ✅ Deployment Verification Checklist

- [x] Backend API Health: `https://web-production-08582.up.railway.app/api/v1/health` returns `200 OK`
- [ ] Vercel Frontend: `https://getmymoment.fun` loads landing page
- [ ] Studio Registration & Login at `/login` connects to Railway API
- [ ] Guest Selfie Search & QR Standee matching connects seamlessly
