# TRINETRA AI — Production image (GCP Cloud Run / GKE)
# Region recommendation: asia-south1 (Mumbai) for India data residency

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV LOCAL_DEV=false

# Install APKTool + JADX for full forensic reverse engineering
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless wget unzip ca-certificates dumb-init \
  && wget -q https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar -O /usr/local/bin/apktool.jar \
  && echo '#!/bin/sh\njava -jar /usr/local/bin/apktool.jar "$@"' > /usr/local/bin/apktool && chmod +x /usr/local/bin/apktool \
  && wget -q https://github.com/skylot/jadx/releases/download/v1.5.0/jadx-1.5.0.zip -O /tmp/jadx.zip \
  && unzip -q /tmp/jadx.zip -d /opt/jadx \
  && ln -s /opt/jadx/bin/jadx /usr/local/bin/jadx \
  && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/*

RUN addgroup --system trinetra && adduser --system --ingroup trinetra trinetra

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Create temp directory for APK analysis
RUN mkdir -p /tmp/trinetra-work && chown trinetra:trinetra /tmp/trinetra-work

USER trinetra

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/trpc/system.health?input='+encodeURIComponent(JSON.stringify({json:{timestamp:Date.now()}}))).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
