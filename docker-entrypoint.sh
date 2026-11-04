#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
    mkdir -p /app/resources/puppeteer /data/manager
    chown geekez:geekez /app/resources/puppeteer /data /data/manager
    mkdir -p /tmp/.X11-unix
    chmod 1777 /tmp/.X11-unix
    exec gosu geekez "$0" "$@"
fi

if ! node - <<'NODE'
const { getChromiumPath } = require('/app/src/main/chromium-path');
if (!getChromiumPath({ isDev: true, appPath: '/app' })) process.exit(1);
NODE
then
    echo "Chrome is missing; downloading the latest stable Chrome to the mounted data directory."
    ./node_modules/.bin/browsers install chrome@stable --path /app/resources/puppeteer
fi

exec node /app/docker-web-manager.js
