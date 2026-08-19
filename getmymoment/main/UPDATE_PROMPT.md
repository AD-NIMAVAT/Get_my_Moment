# Get My Moment — Update Prompt & Context

## Project Status: Production Ready (v1.0.0)
- **All 30 Phases Completed**: `P01` through `P30` fully implemented, tested, and verified.
- **Automated Test Suite**: 19/19 tests passing (100%) in `pytest`.
- **Production Build**: Next.js 14 production build verified with 0 type errors across all static and dynamic routes.
- **AI Models & Licensing**: Commercial-ready OpenCV YuNet (detection) and SFace (128-d recognition) under Apache 2.0.
- **Hardware Benchmarks**: 23,890 QPS peak throughput; 0.038ms mean search latency @ 1,000 photos; 0.105ms @ 10,000 photos.
- **Storage**: Dual-driver architecture supporting zero-cost local filesystem and scalable S3 / Cloudflare R2 object storage.
- **Infrastructure**: Production Docker Compose stack with Nginx reverse proxy, SSL/Gzip, rate limiting, and named volumes.

## Key Run Commands
- **Run Full Automated Tests**: `& "d:\Get_my_moment\.venv\Scripts\pytest.exe" -v`
- **Run Security Penetration Suite**: `& "d:\Get_my_moment\.venv\Scripts\pytest.exe" tests/test_security_privacy.py -v`
- **Run E2E Lifecycle Suite**: `& "d:\Get_my_moment\.venv\Scripts\pytest.exe" tests/test_e2e_flow.py -v`
- **Run Concurrency Load Benchmark**: `& "d:\Get_my_moment\.venv\Scripts\python.exe" tools/benchmark/load_test.py`
- **Start Local FastAPI Backend**: `& "d:\Get_my_moment\.venv\Scripts\python.exe" -m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000`
- **Start Local Next.js Frontend**: `npm --prefix "d:\Get_my_moment\apps\web" run dev`
- **Start Production Docker Stack**: `docker-compose -f docker-compose.prod.yml up -d --build`
