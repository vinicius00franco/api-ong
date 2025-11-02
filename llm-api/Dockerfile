# Dockerfile for llm-api (FastAPI)

FROM python:3.9-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt requirements-test.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]