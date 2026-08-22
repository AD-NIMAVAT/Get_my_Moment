# 🚀 Get My Moment — Cloud Deployment Guide (AWS EC2 Backend + Next.js Frontend)

This guide provides the exact steps to manage **Get My Moment** with:
* **Backend API & AI Engine**: Hosted on **AWS EC2** (`https://getmymoment.fun/api/v1`)
* **Frontend Web Application**: Served via **Nginx on AWS EC2** (`https://getmymoment.fun`)

---

## 🖥️ AWS EC2 Server Details

| Item | Value |
| :--- | :--- |
| **Public IP** | `16.170.81.162` |
| **OS** | Ubuntu Linux |
| **SSH Key** | `pro_technologies_124336.pem` |
| **SSH Command** | `ssh -i "pro_technologies_124336.pem" ubuntu@16.170.81.162` |

---

## 📋 Architecture & DNS Routing Matrix

| Domain / Subdomain | Target | DNS Record Type | Target / Value |
| :--- | :--- | :---: | :--- |
| **`getmymoment.fun`** | AWS EC2 Nginx | **A** | `16.170.81.162` |
| **`www.getmymoment.fun`** | AWS EC2 Nginx | **A** | `16.170.81.162` |
| **`api.getmymoment.fun`** *(Optional)* | AWS EC2 Nginx | **A** | `16.170.81.162` |

---

## 🐳 Docker Containers on EC2

| Container | Image | Port | Status |
| :--- | :--- | :--- | :--- |
| `getmymoment_prod_api` | FastAPI/Uvicorn | 8000, 2121, 30000-30100 | ✅ Running |
| `getmymoment_prod_web` | Next.js | 3000 | ✅ Running |
| `getmymoment_prod_worker` | Celery Worker | - | ✅ Running |
| `getmymoment_prod_redis` | Redis 7 | 6379 | ✅ Running |
| `getmymoment_prod_postgres` | pgvector PostgreSQL | 5432 | ✅ Running |

---

## ⚡ STEP 1: SSH into EC2

```bash
ssh -i "C:\Users\himalaya\Downloads\pro_technologies_124336.pem" ubuntu@16.170.81.162
```

---

## 🔄 STEP 2: Deploy Latest Code

```bash
cd /home/ubuntu/Get_my_Moment
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🌐 STEP 3: Nginx (System Service — NOT Docker)

Nginx runs as a **system service** on EC2, not inside Docker.

```bash
# Status check
sudo systemctl status nginx

# Reload config
sudo systemctl reload nginx

# Config test
sudo nginx -t
```

Config file: `/etc/nginx/sites-enabled/getmymoment`

---

## 📷 Wireless Camera FTP

| Item | Value |
| :--- | :--- |
| **FTP Host** | `16.170.81.162` |
| **FTP Port** | `2121` |
| **Passive Ports** | `30000 - 30100` |
| **Users** | `camera/shoot123`, `sony/sony123`, `canon/canon123`, `nikon/nikon123`, `fuji/fuji123` |

---

## ✅ Deployment Verification Checklist

- [x] Backend API Health: `https://getmymoment.fun/api/v1/health` returns `200 OK`
- [x] Frontend: `https://getmymoment.fun` loads landing page
- [x] SSL Certificate (Let's Encrypt): Active ✅
- [x] Docker containers: All 5 running ✅
- [x] Wireless Camera FTP: Port 2121 listening ✅
