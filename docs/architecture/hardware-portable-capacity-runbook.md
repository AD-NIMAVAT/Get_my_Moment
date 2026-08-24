# Get My Moment — Hardware-Portable Capacity & Worker Tuning Runbook

## 1. Overview & Portability Principle

All AI processing, worker concurrency, Celery prefetch, and backlog thresholds are **decoupled from application business logic** and driven strictly via environment variables and deployment configuration.

**Portability Invariant:**
Upgrading or migrating Get My Moment to larger compute instances (e.g., 4 vCPUs / 8 GB RAM or 8 vCPUs / 16 GB RAM) **NEVER requires application code changes**. Capacity tuning is strictly an operational sequence of:
CONFIGURATION -> CONTROLLED BENCHMARK -> VERIFICATION -> SAFE PRODUCTION PROMOTION

---

## 2. Hardware-Dependent Settings & Defaults

| Setting Name | Current Prod Value (2 vCPU / 2 GB) | Configuration Location | Requires Restart? | Monitored Telemetry Metric | Safe Rollback Action |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **CELERY_WORKER_CONCURRENCY** | 2 | .env, docker-compose.prod.yml | Container recreate (docker compose up -d) | Host CPU load (< 85%), RAM utilization (< 80%), Swap delta (0 MB) | Revert variable to 2 and recreate i_worker |
| **CELERY_WORKER_PREFETCH_MULTIPLIER** | 1 | .env, docker-compose.prod.yml | Container recreate | Redis Queue depth vs DB Pending count consistency | Revert variable to 1 |
| **CELERY_TASK_ACKS_LATE** | 	rue | .env, pps/api/config.py | Container recreate | Zero task loss on worker SIGKILL | Revert variable to 	rue |
| **CELERY_TASK_REJECT_ON_WORKER_LOST** | 	rue | .env, pps/api/config.py | Container recreate | Unacknowledged tasks re-enqueued on worker restart | Revert variable to 	rue |
| **AI_BACKLOG_WARNING_THRESHOLD** | 25 | .env, pps/api/config.py | API container restart | Event Health status transitions (WARNING) | Adjust threshold based on measured worker drain rate |
| **AI_BACKLOG_CRITICAL_THRESHOLD** | 100 | .env, pps/api/config.py | API container restart | Event Health status transitions (CRITICAL) | Adjust threshold based on peak queue tolerance |
| **AI_QUEUE_AGE_WARNING_SECONDS** | 30 | .env, pps/api/config.py | API container restart | oldest_queue_age_seconds in /health | Adjust threshold based on SLA expectations |
| **AI_QUEUE_AGE_CRITICAL_SECONDS** | 120 | .env, pps/api/config.py | API container restart | oldest_queue_age_seconds in /health | Adjust threshold based on SLA expectations |

> [!IMPORTANT]
> **CURRENT SETTINGS ARE NOT UNIVERSAL CAPACITY TARGETS.**
> Setting CELERY_WORKER_CONCURRENCY=2 and CELERY_WORKER_PREFETCH_MULTIPLIER=1 is optimal specifically for the **current 2-vCPU / 2-GB RAM host**. Do not assume these values are static for larger server profiles.

---

## 3. Future Server Migration & Tuning Runbook

When migrating to a larger hardware profile (e.g. AWS EC2 	3.xlarge 4 vCPUs / 16 GB RAM or c6i.2xlarge 8 vCPUs / 16 GB RAM):

### Step 1: Deploy with Safe Baseline Settings
1. Clone repository to the new host.
2. Initialize environment with baseline settings:
   `ash
   CELERY_WORKER_CONCURRENCY=2
   CELERY_WORKER_PREFETCH_MULTIPLIER=1
   `
3. Start the application stack (docker compose up -d).

### Step 2: Execute Controlled Synthetic Benchmark
1. Run the non-destructive benchmark harness (e.g. 10-photo and 25-photo bursts).
2. Measure:
   - CPU utilization per core (ensure headroom for API and PostgreSQL).
   - RAM utilization and Swap delta (must remain 0 MB swap).
   - Processing latency per photo ($, $, $\max$).

### Step 3: Incrementally Tune Concurrency
1. If host has 4 vCPUs and > 8 GB RAM, test CELERY_WORKER_CONCURRENCY=4.
2. Run benchmark again.
3. If throughput scales linearly without memory thrashing or CPU starvation, update .env:
   `ash
   CELERY_WORKER_CONCURRENCY=4
   `
4. Recreate the worker container:
   `ash
   docker compose -f docker-compose.prod.yml up -d --no-deps ai_worker
   `

### Step 4: Verification & Safe Rollback
1. Query /api/v1/health and verify 200 OK.
2. Verify all regression tests pass.
3. If swap thrashing occurs or API latency spikes, instantly roll back by setting CELERY_WORKER_CONCURRENCY=2 and running docker compose up -d.
