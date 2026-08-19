# Get My Moment - Production Dockerfile for Railway & Cloud Deployment
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install required system packages for OpenCV, ONNX, and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    curl \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy complete project source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p /app/storage /app/data/wireless_incoming

# Expose HTTP API and Camera FTP ports
EXPOSE 8000 2121

# Start FastAPI Application with dynamic Railway PORT binding
CMD ["python", "run.py"]
