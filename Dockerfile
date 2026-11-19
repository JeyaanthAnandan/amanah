# Amanah — hackathon prototype image (synthetic data only).
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV DATABASE_URL="file:./dev.db" MATCHING_MODE=psi DEMO_FAST=1 NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
EXPOSE 3000
# Creates the SQLite schema and seeds demo personas + 400 simulated checks on start.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run db:seed && npm start"]
