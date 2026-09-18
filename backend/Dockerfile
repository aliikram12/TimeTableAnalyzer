# Multi-language base container: Python 3.11 + Node.js 20
FROM python:3.11-slim

# Install system dependencies & Node.js 20
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Compile TypeScript to JavaScript bundle
RUN npm run build

# Ensure storage directories exist
RUN mkdir -p uploads exports data

# Expose HTTP port (Render and Railway inject PORT dynamically)
ENV PORT=3000
ENV NODE_ENV=production
ENV PYTHON_BIN=python3

EXPOSE 3000

# Start compiled Express server
CMD ["node", "dist/server.js"]
