FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and ONNX runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY workers/ai_worker/requirements.txt /app/workers/ai_worker/requirements.txt
RUN pip install --no-cache-dir -r /app/workers/ai_worker/requirements.txt

COPY packages /app/packages
COPY apps /app/apps
COPY workers /app/workers

ENV PYTHONPATH=/app

CMD ["sh", "-c", "celery -A workers.ai_worker.worker worker --loglevel=info --concurrency=${CELERY_WORKER_CONCURRENCY:-2} --prefetch-multiplier=${CELERY_WORKER_PREFETCH_MULTIPLIER:-1}"]
