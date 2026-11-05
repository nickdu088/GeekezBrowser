FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    HOME=/home/geekez

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fonts-liberation \
    fonts-noto-cjk \
    gosu \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    dbus-x11 \
    openbox \
    tigervnc-standalone-server \
    wmctrl \
    websockify \
    xdotool \
    unzip \
    novnc \
    && rm -rf /var/lib/apt/lists/*

# Xray runs per profile for share links (vmess/vless/trojan/ss), proxy credentials and proxy chains.
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && case "${TARGETARCH:-$(dpkg --print-architecture)}" in \
        arm64) XRAY_ASSET=Xray-linux-arm64-v8a.zip ;; \
        amd64) XRAY_ASSET=Xray-linux-64.zip ;; \
        *) echo "Xray has no build for this architecture" >&2; exit 1 ;; \
    esac \
    && curl -fsSL -o /tmp/xray.zip "https://github.com/XTLS/Xray-core/releases/latest/download/${XRAY_ASSET}" \
    && unzip -o /tmp/xray.zip xray -d /tmp/xray \
    && install -m 755 /tmp/xray/xray /usr/local/bin/xray \
    && rm -rf /tmp/xray /tmp/xray.zip /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

RUN useradd --create-home --shell /bin/bash geekez
COPY --chown=geekez:geekez src/main/chromium-path.js ./src/main/chromium-path.js
COPY --chown=geekez:geekez docker-web-manager.js ./
COPY --chown=geekez:geekez docker/web-manager ./docker/web-manager
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /data/manager /app/resources/puppeteer \
    && chown -R geekez:geekez /home/geekez /data/manager /app/resources

EXPOSE 6080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:6080/healthz >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
