FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for building python packages and running rhubarb/ffmpeg if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure rhubarb is executable
RUN chmod +x ./bin/rhubarb || true

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
