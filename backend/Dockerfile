# Python 3.11 lightweight base
FROM python:3.11-slim

# Prevent python from writing pyc and enable unbuffered output for real-time logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install system dependencies required by reportlab (PDF generation) and postgresql client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies first to take advantage of Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase into /app/backend to preserve absolute package imports
COPY . /app/backend

# Expose FastAPI port
EXPOSE 8000

# Health check to ensure FastAPI is up and responsive
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Launch Sentinel-Net API
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
