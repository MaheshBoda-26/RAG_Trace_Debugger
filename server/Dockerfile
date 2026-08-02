# Backend Dockerfile - Python 3.12
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure data directories exist
RUN mkdir -p /app/data/corpus /app/data/queries /app/data/traces /app/data/eval /app/data/embeddings_cache

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "server.main"]
