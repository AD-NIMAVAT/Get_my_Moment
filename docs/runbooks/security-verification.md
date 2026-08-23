# Get My Moment - Security Verification Runbook

**Environment:** Production AWS EC2

---

## 1. AUTOMATED SECURITY TEST SUITES

Run all security, tenancy, and isolation tests:
`ash
docker exec getmymoment_prod_api pytest /app/tests/security/ /app/tests/tenancy/ /app/tests/chaos/ -v
`

---

## 2. PORT EXPOSURE AUDIT

Verify that only intended ports are listening:
`ash
sudo ss -tlpn | grep -E '5432|6379'
# Expected output: EMPTY (no public listening on 5432 or 6379)
`

---

## 3. SECURITY HEADERS AUDIT

`ash
curl -sI https://www.getmymoment.fun/api/v1/health | grep -E 'x-content-type|x-frame|strict-transport|x-xss'
`
