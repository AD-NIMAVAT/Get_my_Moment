# Get My Moment — Production Deployment & Rollback Runbook

## 1. Pre-Deployment Verification
- Run test suite locally: pytest tests/ -q
- Verify git status is clean: git status
- Ensure database migrations are compatible

## 2. Standard Deployment Procedure
`ash
# SSH into EC2 production server
ssh -i key.pem ubuntu@16.170.81.162

# Pull latest main branch
cd /home/ubuntu/Get_my_Moment
git pull origin main

# Rebuild and restart updated containers
docker compose -f docker-compose.prod.yml up -d --build api ai_worker

# Run full regression test suite inside container
docker exec getmymoment_prod_api pytest /app/tests/ -q

# Verify production health endpoint
curl -s https://www.getmymoment.fun/api/v1/health
`

## 3. Rollback Procedure
`ash
# Rollback git commit to previous stable release
git log -n 5 --oneline
git checkout <previous_commit_hash>

# Rebuild containers to previous release
docker compose -f docker-compose.prod.yml up -d --build api ai_worker
`
