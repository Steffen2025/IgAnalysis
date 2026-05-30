FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATABASE_URL=postgres://botlogix:botlogix@postgres:5432/botlogix
ENV CHROME_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/reports

EXPOSE 5057

CMD ["npm", "run", "admin"]
