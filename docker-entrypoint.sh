#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
    mkdir -p /app/resources/puppeteer /data/manager
    chown geekez:geekez /app/resources/puppeteer /data /data/manager
    mkdir -p /tmp/.X11-unix
    chmod 1777 /tmp/.X11-unix
    exec gosu geekez "$0" "$@"
fi

exec node /app/docker-web-manager.js
