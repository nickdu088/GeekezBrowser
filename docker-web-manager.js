const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { promisify } = require('node:util');
const puppeteer = require('puppeteer');
const presets = require('./docker/web-manager/presets');
const { parseProxy, buildXrayConfig } = require('./docker/web-manager/proxy');
const { buildEnvironment, installEnvironment } = require('./docker/web-manager/environment');

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, 'docker', 'web-manager');
const NOVNC_ROOT = '/usr/share/novnc';
const DATA_ROOT = '/data/manager';
const PROFILE_ROOT = path.join(DATA_ROOT, 'profiles');
const PROFILE_FILE = path.join(DATA_ROOT, 'profiles.json');
const HOST = process.env.WEB_CONTROL_HOST || '0.0.0.0';
const PORT = Number(process.env.WEB_CONTROL_PORT || 6080);
const WIDTH = Number(process.env.BROWSER_WIDTH || 1440);
const HEIGHT = Number(process.env.BROWSER_HEIGHT || 900);
const MAX_RUNNING = Number(process.env.MAX_RUNNING_PROFILES || 4);
const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHROME_CACHE = '/app/resources/puppeteer';
const XRAY_PATH = process.env.XRAY_PATH || '/usr/local/bin/xray';
const CHROME_SPEC = /^(latest|\d+(\.\d+){0,3})$/;
const profiles = new Map();
const resolvedBuilds = new Map();
const CHROME_PLATFORMS = {
    linux: 'linux64', linux_arm: 'linux-arm64', mac: 'mac-x64', mac_arm: 'mac-arm64', win32: 'win32', win64: 'win64'
};
const CHROME_VERSION_LIST_URL = 'https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json';
const CHROME_VERSION_LIST_TTL = 60 * 60 * 1000;
const CHROME_VERSION_LIST_LIMIT = 40;
let chromeVersionList = { at: 0, versions: [] };
const chromeInstalls = new Map();
const sessions = new Map();
const displays = new Set();

function badRequest(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function assertConfig() {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('WEB_CONTROL_PORT must be a valid port.');
    if (!Number.isInteger(WIDTH) || WIDTH < 320 || WIDTH > 3840) throw new Error('BROWSER_WIDTH must be between 320 and 3840.');
    if (!Number.isInteger(HEIGHT) || HEIGHT < 240 || HEIGHT > 2160) throw new Error('BROWSER_HEIGHT must be between 240 and 2160.');
    if (!Number.isInteger(MAX_RUNNING) || MAX_RUNNING < 1 || MAX_RUNNING > 32) throw new Error('MAX_RUNNING_PROFILES must be between 1 and 32.');
}

async function loadProfiles() {
    await fs.mkdir(PROFILE_ROOT, { recursive: true });
    let data;
    try {
        data = JSON.parse(await fs.readFile(PROFILE_FILE, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return;
        throw new Error(`Could not read ${PROFILE_FILE}: ${error.message}`);
    }
    if (!Array.isArray(data)) throw new Error('Profile store must contain a JSON array.');
    for (const profile of data) {
        if (!profile || !PROFILE_ID.test(profile.id) || typeof profile.name !== 'string'
            || typeof profile.proxy !== 'string' || typeof profile.notes !== 'string') {
            throw new Error('Profile store contains an invalid entry; refusing to overwrite it.');
        }
        profiles.set(profile.id, profile);
    }
}

let writeQueue = Promise.resolve();
function saveProfiles() {
    const snapshot = JSON.stringify([...profiles.values()], null, 2);
    const write = writeQueue.catch(() => {}).then(async () => {
        const temporaryPath = `${PROFILE_FILE}.${randomUUID()}.tmp`;
        await fs.writeFile(temporaryPath, snapshot, { mode: 0o600 });
        await fs.rename(temporaryPath, PROFILE_FILE);
        await fs.chmod(PROFILE_FILE, 0o600);
    });
    writeQueue = write;
    return write;
}

function maskProxy(value) {
    if (!value) return '';
    try {
        return parseProxy(value).display;
    } catch {
        return '';
    }
}

// Credentials and share links are stored but never sent back to the browser. The masked text the
// form shows for an existing proxy means "keep the stored one".
function resolveProxy(value, existing, fallback) {
    if (value === undefined) return existing ?? fallback;
    const input = String(value).trim();
    if (!input) return fallback;
    if (existing && input === maskProxy(existing)) return existing;
    const parsed = parseProxy(input);
    return parsed.kind === 'direct' ? fallback : parsed.stored;
}

function normalizeTags(value) {
    const list = Array.isArray(value) ? value : String(value ?? '').split(',');
    const tags = [...new Set(list.map((tag) => String(tag).trim()).filter(Boolean))];
    if (tags.length > 10 || tags.some((tag) => tag.length > 24 || /[\u0000-\u001f\u007f]/.test(tag))) {
        throw badRequest('Use at most 10 tags of up to 24 characters each.');
    }
    return tags;
}

function choice(value, allowed, message) {
    if (!allowed.includes(value)) throw badRequest(message);
    return value;
}

function normalizeFingerprint(input = {}, existing = {}) {
    const merged = { cpuCores: 0, memory: 0, userAgent: '', webgl: '', ...existing, ...input };
    return {
        cpuCores: choice(Number(merged.cpuCores) || 0, [0, ...presets.CPU_CORES], 'Unsupported CPU core count.'),
        memory: choice(Number(merged.memory) || 0, [0, ...presets.MEMORY_GB], 'Unsupported device memory.'),
        userAgent: choice(String(merged.userAgent || ''), ['', ...Object.keys(presets.USER_AGENTS)], 'Unsupported user agent preset.'),
        webgl: choice(String(merged.webgl || ''), ['', ...Object.keys(presets.WEBGL)], 'Unsupported WebGL preset.')
    };
}

function withDefaults(profile) {
    return {
        preProxy: '',
        tags: [],
        webrtcProtect: false,
        watermark: false,
        timezone: '',
        language: '',
        ...profile,
        fingerprint: normalizeFingerprint(profile.fingerprint)
    };
}

function normalizeChrome(value) {
    const input = String(value ?? '').trim().toLowerCase();
    if (!input) return 'latest';
    if (!CHROME_SPEC.test(input)) {
        throw badRequest('Chrome version must be "latest", a major version such as 130, or a full version such as 130.0.6723.58.');
    }
    return input;
}

function normalizeProfile(body, existing = {}) {
    const name = String(body.name ?? existing.name ?? '').trim();
    const notes = String(body.notes ?? existing.notes ?? '').trim();
    if (!name || name.length > 64 || /[\u0000-\u001f\u007f]/.test(name)) {
        throw badRequest('Profile name must be 1-64 characters and contain no control characters.');
    }
    if (notes.length > 500) throw badRequest('Notes must be 500 characters or fewer.');
    const proxy = resolveProxy(body.proxy, existing.proxy, 'direct://');
    const preProxy = resolveProxy(body.preProxy, existing.preProxy, '');
    if (preProxy && proxy === 'direct://') throw badRequest('A pre-proxy needs a profile proxy to chain to.');
    return {
        ...existing,
        name,
        notes,
        proxy,
        preProxy,
        chrome: normalizeChrome(body.chrome ?? existing.chrome ?? 'latest'),
        tags: normalizeTags(body.tags ?? existing.tags ?? []),
        webrtcProtect: Boolean(body.webrtcProtect ?? existing.webrtcProtect ?? false),
        watermark: Boolean(body.watermark ?? existing.watermark ?? false),
        timezone: choice(String(body.timezone ?? existing.timezone ?? ''),
            ['', 'auto', ...presets.CITIES.map((city) => city.id)], 'Unsupported timezone.'),
        language: choice(String(body.language ?? existing.language ?? ''),
            ['', 'auto', ...presets.LANGUAGES.map((language) => language.code)], 'Unsupported language.'),
        fingerprint: normalizeFingerprint(body.fingerprint, existing.fingerprint)
    };
}

function sendJson(response, status, value) {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(value));
}

function publicProfile(profile) {
    const session = sessions.get(profile.id);
    return {
        ...withDefaults(profile),
        proxy: maskProxy(profile.proxy) || 'direct://',
        preProxy: maskProxy(profile.preProxy),
        chrome: profile.chrome || 'latest',
        chromeVersion: session?.buildId || resolvedBuilds.get(specToTag(profile.chrome || 'latest')) || profile.chrome || 'latest',
        message: session?.message || '',
        state: session?.state || 'stopped',
        url: session?.page?.url() || '',
        title: session?.title || ''
    };
}

let browsersModule;
function loadBrowsers() {
    browsersModule ||= import('@puppeteer/browsers');
    return browsersModule;
}

function specToTag(spec) {
    return spec === 'latest' ? 'stable' : spec;
}

function compareVersions(a, b) {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let index = 0; index < 4; index += 1) {
        const difference = (left[index] || 0) - (right[index] || 0);
        if (difference) return difference;
    }
    return 0;
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolveChromeBuild(spec) {
    const { Browser, detectBrowserPlatform, getInstalledBrowsers, resolveBuildId } = await loadBrowsers();
    const platform = detectBrowserPlatform();
    if (!platform) throw new Error('This platform is not supported for Chrome downloads.');
    const tag = specToTag(spec);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(tag)) return { platform, buildId: tag };
    try {
        return { platform, buildId: await resolveBuildId(Browser.CHROME, platform, tag) };
    } catch (error) {
        // Offline or the version service is down: fall back to a matching build that is already installed.
        const installed = (await getInstalledBrowsers({ cacheDir: CHROME_CACHE }))
            .filter((item) => item.browser === Browser.CHROME && item.platform === platform
                && (tag === 'stable' || item.buildId === tag || item.buildId.startsWith(`${tag}.`)))
            .map((item) => item.buildId)
            .sort(compareVersions);
        if (installed.length) return { platform, buildId: installed[installed.length - 1] };
        throw new Error(`Could not resolve Chrome "${spec}": ${error.message}`);
    }
}

async function listChromeVersions() {
    const { Browser, detectBrowserPlatform, getInstalledBrowsers } = await loadBrowsers();
    const platform = detectBrowserPlatform();
    const installed = new Set((await getInstalledBrowsers({ cacheDir: CHROME_CACHE }))
        .filter((item) => item.browser === Browser.CHROME && item.platform === platform)
        .map((item) => item.buildId));

    if (Date.now() - chromeVersionList.at >= CHROME_VERSION_LIST_TTL) {
        try {
            const response = await fetch(CHROME_VERSION_LIST_URL, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const milestones = Object.values((await response.json()).milestones || {});
            const platformName = CHROME_PLATFORMS[platform];
            const matching = milestones.filter((item) => item.downloads?.chrome?.some((file) => file.platform === platformName));
            // If the platform name is not in the list at all, show everything and let the download report errors.
            chromeVersionList = {
                at: Date.now(),
                versions: (matching.length ? matching : milestones).map((item) => item.version)
            };
        } catch (error) {
            console.warn('Could not load the Chrome version list:', error.message);
            chromeVersionList = { ...chromeVersionList, at: Date.now() - CHROME_VERSION_LIST_TTL + 60 * 1000 };
        }
    }
    const remote = [...chromeVersionList.versions].sort(compareVersions).reverse().slice(0, CHROME_VERSION_LIST_LIMIT);
    return [...new Set([...remote, ...installed])]
        .sort(compareVersions).reverse()
        .map((version) => ({ version, installed: installed.has(version) }));
}

async function ensureChrome(spec, session) {
    const { Browser, computeExecutablePath, install } = await loadBrowsers();
    const { platform, buildId } = await resolveChromeBuild(spec);
    resolvedBuilds.set(specToTag(spec), buildId);
    session.buildId = buildId;
    const executablePath = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir: CHROME_CACHE });

    let pending = chromeInstalls.get(buildId);
    if (!pending && !(await fileExists(executablePath))) {
        pending = (async () => {
            // Remove leftovers of an interrupted download so the installer starts clean.
            await fs.rm(path.join(CHROME_CACHE, 'chrome', `${platform}-${buildId}`), { recursive: true, force: true });
            await install({ browser: Browser.CHROME, buildId, cacheDir: CHROME_CACHE });
        })().finally(() => chromeInstalls.delete(buildId));
        chromeInstalls.set(buildId, pending);
    }
    if (pending) {
        session.message = `Downloading Chrome ${buildId}…`;
        await pending;
        session.message = '';
    }
    if (!(await fileExists(executablePath))) {
        throw new Error(`Chrome ${buildId} is not available after installation.`);
    }
    return executablePath;
}

async function readJson(request) {
    let body = '';
    for await (const chunk of request) {
        body += chunk;
        if (body.length > 16 * 1024) throw badRequest('Request body is too large.', 413);
    }
    let parsed;
    try {
        parsed = body ? JSON.parse(body) : {};
    } catch {
        throw badRequest('Request body must be valid JSON.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw badRequest('Request body must be a JSON object.');
    }
    return parsed;
}

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
    .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

function isPrivateIPv4(hostname) {
    if (net.isIP(hostname) !== 4) return false;
    const [first, second] = hostname.split('.').map(Number);
    return first === 10
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168);
}

function getLocalHost(request) {
    const host = String(request.headers.host || '').toLowerCase();
    if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) return true;
    const hostname = host.replace(/:\d{1,5}$/, '');
    return isPrivateIPv4(hostname) || ALLOWED_HOSTS.includes(hostname);
}

function isSameOrigin(request) {
    const origin = request.headers.origin;
    if (!origin) return request.headers['sec-fetch-site'] !== 'cross-site';
    try {
        return new URL(origin).host.toLowerCase() === String(request.headers.host || '').toLowerCase();
    } catch {
        return false;
    }
}

function securityHeaders() {
    return {
          'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' ws: wss:; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-store'
    };
}

async function serveStatic(request, response, pathname) {
    const files = {
        '/': ['index.html', 'text/html; charset=utf-8'],
        '/app.css': ['app.css', 'text/css; charset=utf-8'],
        '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
        '/desktop.html': ['desktop.html', 'text/html; charset=utf-8'],
        '/desktop.css': ['desktop.css', 'text/css; charset=utf-8'],
        '/desktop.js': ['desktop.js', 'text/javascript; charset=utf-8']
    };
    const entry = files[pathname];
    if (!entry || request.method !== 'GET') return false;
    try {
        const content = await fs.readFile(path.join(ROOT, entry[0]));
        const headers = pathname === '/desktop.html'
            ? {
                ...securityHeaders(),
                'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
                'X-Frame-Options': 'SAMEORIGIN'
            }
            : securityHeaders();
        response.writeHead(200, { ...headers, 'Content-Type': entry[1] });
        response.end(content);
    } catch (error) {
        console.error(`Static file error (${entry[0]}):`, error);
        sendJson(response, 500, { error: 'Could not load the web manager.' });
    }
    return true;
}

async function serveNoVnc(request, response, pathname) {
    if (!pathname.startsWith('/novnc/') || request.method !== 'GET') return false;
    const relativePath = decodeURIComponent(pathname.slice('/novnc/'.length));
    const filePath = path.resolve(NOVNC_ROOT, relativePath);
    if (!filePath.startsWith(`${NOVNC_ROOT}${path.sep}`)) {
        sendJson(response, 404, { error: 'Not found.' });
        return true;
    }
    const types = {
        '.css': 'text/css; charset=utf-8',
        '.gif': 'image/gif',
        '.html': 'text/html; charset=utf-8',
        '.ico': 'image/x-icon',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.wasm': 'application/wasm'
    };
    try {
        const content = await fs.readFile(filePath);
        response.writeHead(200, {
            ...securityHeaders(),
            'Content-Type': types[path.extname(filePath)] || 'application/octet-stream'
        });
        response.end(content);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            sendJson(response, 404, { error: 'Not found.' });
        } else {
            console.error('noVNC static file error:', error);
            sendJson(response, 500, { error: 'Could not load the desktop client.' });
        }
    }
    return true;
}

function startProcess(command, args, env) {
    const child = spawn(command, args, { env, stdio: 'ignore' });
    child.on('error', (error) => {
        console.error(`Could not start ${command}:`, error);
    });
    return child;
}

async function allocatePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    return port;
}

async function waitForProcess(child, name, probe) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        if (child.exitCode !== null || child.signalCode !== null) {
            throw new Error(`${name} exited before it became ready.`);
        }
        try {
            await probe();
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    throw new Error(`${name} did not become ready.`);
}

async function waitForPort(child, name, port) {
    await waitForProcess(child, name, () => new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: '127.0.0.1', port });
        socket.once('connect', () => {
            socket.destroy();
            resolve();
        });
        socket.once('error', reject);
    }));
}

async function stopProcess(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

async function startXray(session, main, pre) {
    try {
        await fs.access(XRAY_PATH);
    } catch {
        throw new Error('Xray is not installed in this image. Rebuild the image to enable share links, proxy credentials and chains.');
    }
    const port = await allocatePort();
    const configPath = path.join(os.tmpdir(), `geekez-xray-${randomUUID()}.json`);
    await fs.writeFile(configPath, JSON.stringify(buildXrayConfig(main, pre, port)), { mode: 0o600 });
    let output = '';
    const child = spawn(XRAY_PATH, ['run', '-c', configPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    session.xray = child;
    const collect = (chunk) => { output = (output + chunk).slice(-600); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (error) => console.error('Could not start Xray:', error));
    try {
        await waitForPort(child, 'Xray', port);
    } catch (error) {
        throw new Error(`${error.message} ${output.trim()}`.trim());
    } finally {
        await fs.rm(configPath, { force: true });
    }
    return port;
}

async function startDesktop(session) {
    let display = 100;
    while (displays.has(display)) display += 1;
    displays.add(display);
    const desktop = {
        display: `:${display}`,
        env: { ...process.env, DISPLAY: `:${display}` },
        xServer: null,
        windowManager: null,
        websockify: null,
        wsPort: null
    };
    session.desktop = desktop;
    try {
        const vncPort = await allocatePort();
        desktop.xServer = startProcess('Xtigervnc', [
            desktop.display,
            '-geometry', `${WIDTH}x${HEIGHT}`,
            '-depth', '24',
            '-rfbport', String(vncPort),
            '-localhost', 'yes',
            '-SecurityTypes', 'None',
            '-AcceptSetDesktopSize',
            '-AlwaysShared'
        ], desktop.env);
        await waitForProcess(desktop.xServer, 'TigerVNC', () =>
            execFileAsync('xdotool', ['getdisplaygeometry'], { env: desktop.env }));
        await waitForPort(desktop.xServer, 'TigerVNC', vncPort);

        desktop.windowManager = startProcess('openbox', ['--sm-disable'], desktop.env);
        await waitForProcess(desktop.windowManager, 'Openbox', () =>
            execFileAsync('wmctrl', ['-m'], { env: desktop.env }));

        desktop.wsPort = await allocatePort();
        desktop.websockify = startProcess('websockify', [
            `127.0.0.1:${desktop.wsPort}`,
            `127.0.0.1:${vncPort}`
        ], desktop.env);
        await waitForPort(desktop.websockify, 'websockify', desktop.wsPort);
    } catch (error) {
        await stopDesktop(session);
        throw error;
    }
}

async function stopDesktop(session) {
    // Also tears down the profile's Xray proxy, which lives and dies with the virtual desktop.
    await stopProcess(session.xray);
    session.xray = null;
    const desktop = session.desktop;
    if (!desktop) return;
    session.desktop = null;
    for (const child of [desktop.websockify, desktop.windowManager, desktop.xServer]) {
        await stopProcess(child);
    }
    displays.delete(Number(desktop.display.slice(1)));
}

function requireSession(id) {
    const session = sessions.get(id);
    if (!session || session.state !== 'running' || !session.page) {
        const error = new Error('Start this profile before using browser controls.');
        error.status = 409;
        throw error;
    }
    return session;
}

async function focusSession(session) {
    const processId = session.browser.process()?.pid;
    if (!processId) throw new Error('Could not determine the Chrome window process.');
    const env = session.desktop.env;
    let windowId;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            const result = await execFileAsync('xdotool', [
                'search', '--onlyvisible', '--pid', String(processId)
            ], { env });
            windowId = result.stdout.trim().split(/\s+/)[0];
            if (windowId) break;
        } catch (error) {
            if (error.code !== 1) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!windowId) throw new Error('Could not find the native Chrome window on the virtual desktop.');
    await execFileAsync('xdotool', ['windowactivate', '--sync', windowId], { env });
    await execFileAsync('wmctrl', ['-ir', windowId, '-b', 'add,maximized_vert,maximized_horz'], { env });
}

async function focusProfile(id) {
    await focusSession(requireSession(id));
}

async function clearChromiumSingletons(id) {
    const profilePath = path.join(PROFILE_ROOT, id);
    for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
        const lockPath = path.join(profilePath, name);
        try {
            const lock = await fs.lstat(lockPath);
            if (lock.isSymbolicLink()) await fs.unlink(lockPath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

async function startProfile(id) {
    const profile = profiles.get(id);
    if (!profile) {
        const error = new Error('Profile not found.');
        error.status = 404;
        throw error;
    }
    if (sessions.has(id)) {
        const error = new Error('This profile is already starting or running.');
        error.status = 409;
        throw error;
    }
    if (sessions.size >= MAX_RUNNING) {
        const error = new Error(`At most ${MAX_RUNNING} profiles can run at once.`);
        error.status = 409;
        throw error;
    }
    const session = { state: 'starting', browser: null, page: null, title: '', buildId: '', message: '' };
    sessions.set(id, session);
    try {
        const executablePath = await ensureChrome(profile.chrome || 'latest', session);
        await startDesktop(session);
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--disable-breakpad',
            '--start-maximized',
            `--window-size=${WIDTH},${HEIGHT}`
        ];
        const main = parseProxy(profile.proxy);
        const pre = profile.preProxy ? parseProxy(profile.preProxy) : null;
        if (main.kind === 'xray' || (pre && main.kind !== 'direct')) {
            const xrayPort = await startXray(session, main, pre);
            args.push(`--proxy-server=socks5://127.0.0.1:${xrayPort}`);
        } else if (main.kind === 'plain') {
            args.push(`--proxy-server=${main.display}`);
        }
        // Also set at launch so the user agent and timezone are right for new tabs and workers from the first request.
        const userAgentPreset = presets.USER_AGENTS[withDefaults(profile).fingerprint.userAgent];
        if (userAgentPreset) args.push(`--user-agent=${userAgentPreset.string(session.buildId.split('.')[0])}`);
        const city = presets.CITIES.find((item) => item.id === profile.timezone);
        if (profile.webrtcProtect) args.push('--webrtc-ip-handling-policy=disable_non_proxied_udp', '--force-webrtc-ip-handling-policy');
        if (/^[a-z]{2,3}-[A-Z]{2}$/.test(profile.language || '')) args.push(`--lang=${profile.language}`, `--accept-lang=${profile.language}`);
        // Without this Chrome reports navigator.webdriver = true because it was started by automation.
        args.push('--disable-blink-features=AutomationControlled');
        const browser = await puppeteer.launch({
            executablePath,
            headless: false,
            ignoreDefaultArgs: ['--enable-automation'],
            userDataDir: path.join(PROFILE_ROOT, id),
            defaultViewport: null,
            env: city ? { ...session.desktop.env, TZ: city.timezone } : session.desktop.env,
            args
        });
        session.browser = browser;
        [session.page] = await browser.pages();
        await installEnvironment(browser, await buildEnvironment(withDefaults({ ...profile, id }), browser, session.page));
        await session.page.goto('about:blank');
        session.state = 'running';
        await focusSession(session);
        session.page.on('framenavigated', () => {
            session.title = '';
            session.page.title().then((title) => { session.title = title; }).catch((error) => {
                console.warn(`Could not read page title for profile ${id}:`, error.message);
            });
        });
        browser.on('disconnected', () => {
            if (sessions.get(id) === session) {
                sessions.delete(id);
                stopDesktop(session).catch((error) => {
                    console.error(`Could not stop desktop for profile ${id}:`, error);
                });
            }
        });
        return publicProfile(profile);
    } catch (error) {
        sessions.delete(id);
        if (session.browser) {
            try {
                await session.browser.close();
                await clearChromiumSingletons(id);
            } catch (closeError) {
                console.error(`Could not close partially started profile ${id}:`, closeError);
            }
        }
        await stopDesktop(session);
        throw new Error(`Could not start Chrome: ${error.message}`);
    }
}

async function stopProfile(id) {
    const session = sessions.get(id);
    if (!session) return;
    if (session.state !== 'running') {
        const error = new Error('Profile is still starting. Try stopping it again shortly.');
        error.status = 409;
        throw error;
    }
    sessions.delete(id);
    try {
        await session.browser.close();
    } finally {
        await clearChromiumSingletons(id);
        await stopDesktop(session);
    }
}

async function navigate(session, value) {
    const input = String(value ?? '').trim();
    let url;
    try {
        url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
    } catch {
        throw badRequest('Enter a valid website address.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw badRequest('Only HTTP and HTTPS addresses are supported.');
    await session.page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { url: session.page.url() };
}

async function sendScreenshot(response, id) {
    const session = requireSession(id);
    const image = await session.page.screenshot({ type: 'jpeg', quality: 65 });
    response.writeHead(200, {
        ...securityHeaders(),
        'Content-Type': 'image/jpeg',
        'Content-Length': image.length
    });
    response.end(image);
}

async function handleApi(request, response, url) {
    const pathname = url.pathname;
    if (pathname === '/api/config' && request.method === 'GET') {
        sendJson(response, 200, { width: WIDTH, height: HEIGHT });
        return;
    }
    if (pathname === '/api/presets' && request.method === 'GET') {
        sendJson(response, 200, {
            cities: presets.CITIES.map(({ id, label, timezone }) => ({ id, label: `${label} (${timezone})` })),
            languages: presets.LANGUAGES,
            webgl: Object.entries(presets.WEBGL).map(([id, item]) => ({ id, label: item.label })),
            userAgents: Object.entries(presets.USER_AGENTS).map(([id, item]) => ({ id, label: item.label })),
            cpuCores: presets.CPU_CORES,
            memory: presets.MEMORY_GB
        });
        return;
    }
    if (pathname === '/api/chrome-versions' && request.method === 'GET') {
        sendJson(response, 200, { versions: await listChromeVersions() });
        return;
    }
    if (pathname === '/api/profiles' && request.method === 'GET') {
        sendJson(response, 200, [...profiles.values()].map(publicProfile));
        return;
    }
    if (pathname === '/api/profiles' && request.method === 'POST') {
        const body = await readJson(request);
        const profile = { id: randomUUID(), ...normalizeProfile(body), createdAt: new Date().toISOString() };
        profiles.set(profile.id, profile);
        await saveProfiles();
        sendJson(response, 201, publicProfile(profile));
        return;
    }
    const match = pathname.match(/^\/api\/profiles\/([0-9a-f-]{36})(?:\/(start|stop|focus|navigate|back|forward|reload|click|scroll|key|type|screenshot))?$/i);
    if (!match || !PROFILE_ID.test(match[1])) {
        sendJson(response, 404, { error: 'Not found.' });
        return;
    }
    const [, id, action] = match;
    const profile = profiles.get(id);
    if (!profile) {
        sendJson(response, 404, { error: 'Profile not found.' });
        return;
    }
    if (action === 'screenshot' && request.method === 'GET') {
        await sendScreenshot(response, id);
        return;
    }
    if (!action && request.method === 'PATCH') {
        const body = await readJson(request);
        profiles.set(id, { ...normalizeProfile(body, profile), id, createdAt: profile.createdAt });
        await saveProfiles();
        sendJson(response, 200, publicProfile(profiles.get(id)));
        return;
    }
    if (!action && request.method === 'DELETE') {
        if (sessions.get(id)?.state === 'starting') {
            sendJson(response, 409, { error: 'Wait for this profile to finish starting before deleting it.' });
            return;
        }
        if (sessions.has(id)) await stopProfile(id);
        profiles.delete(id);
        await saveProfiles();
        await fs.rm(path.join(PROFILE_ROOT, id), { recursive: true, force: true });
        sendJson(response, 200, { ok: true });
        return;
    }
    if (action === 'start' && request.method === 'POST') {
        sendJson(response, 200, await startProfile(id));
        return;
    }
    if (action === 'stop' && request.method === 'POST') {
        await stopProfile(id);
        sendJson(response, 200, { ok: true });
        return;
    }
    if (action === 'focus' && request.method === 'POST') {
        await focusProfile(id);
        sendJson(response, 200, { ok: true });
        return;
    }
    if (request.method !== 'POST' || !action) {
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
    }

    const session = requireSession(id);
    const body = await readJson(request);
    let result = { ok: true };
    switch (action) {
    case 'navigate':
        result = await navigate(session, body.url);
        break;
    case 'back':
        await session.page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((error) => {
            if (!/Navigation timeout/.test(error.message)) throw error;
        });
        break;
    case 'forward':
        await session.page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch((error) => {
            if (!/Navigation timeout/.test(error.message)) throw error;
        });
        break;
    case 'reload':
        await session.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
    case 'click': {
        const x = Number(body.x);
        const y = Number(body.y);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > WIDTH || y > HEIGHT) {
            throw badRequest('Click coordinates are outside the browser viewport.');
        }
        await session.page.mouse.click(x, y);
        break;
    }
    case 'scroll': {
        const deltaY = Number(body.deltaY);
        if (!Number.isFinite(deltaY) || Math.abs(deltaY) > 2000) throw badRequest('Invalid scroll distance.');
        await session.page.mouse.wheel({ deltaY });
        break;
    }
    case 'key': {
        const key = String(body.key ?? '');
        if (!/^[\w ]{1,20}$/.test(key)) throw badRequest('Invalid keyboard key.');
        await session.page.keyboard.press(key);
        break;
    }
    case 'type': {
        const text = String(body.text ?? '');
        if (text.length > 2000) throw badRequest('Text is too long.');
        await session.page.keyboard.type(text);
        break;
    }
    default:
        sendJson(response, 404, { error: 'Not found.' });
        return;
    }
    sendJson(response, 200, result);
}

async function handleRequest(request, response) {
    if (!getLocalHost(request)) {
        sendJson(response, 403, { error: 'This manager only accepts localhost or configured host connections.' });
        return;
    }
    let url;
    try {
        url = new URL(request.url, `http://${request.headers.host}`);
    } catch {
        sendJson(response, 400, { error: 'Invalid request URL.' });
        return;
    }
    if (url.pathname === '/healthz' && request.method === 'GET') {
        sendJson(response, 200, { ok: true });
        return;
    }
    if (url.pathname.startsWith('/api/')) {
        if (!isSameOrigin(request)) {
            sendJson(response, 403, { error: 'Cross-origin requests are not allowed.' });
            return;
        }
        try {
            await handleApi(request, response, url);
        } catch (error) {
            console.error(`API error (${request.method} ${url.pathname}):`, error);
            sendJson(response, error.status || 500, { error: error.message || 'Request failed.' });
        }
        return;
    }
    if (await serveNoVnc(request, response, url.pathname)) return;
    if (await serveStatic(request, response, url.pathname)) return;
    sendJson(response, 404, { error: 'Not found.' });
}

async function shutdown() {
    await Promise.all([...sessions.entries()].map(async ([id, session]) => {
        try {
            if (session.browser) await session.browser.close();
            await clearChromiumSingletons(id);
        } catch (error) {
            console.error(`Could not close Chrome profile ${id} during shutdown:`, error);
        } finally {
            await stopDesktop(session);
        }
    }));
    process.exit(0);
}

async function main() {
    assertConfig();
    await loadProfiles();
    const server = http.createServer((request, response) => {
        handleRequest(request, response).catch((error) => {
            console.error('Unhandled request error:', error);
            if (!response.headersSent) sendJson(response, 500, { error: 'Internal server error.' });
            else response.destroy(error);
        });
    });
    server.on('upgrade', (request, socket, head) => {
        let url;
        try {
            url = new URL(request.url, `http://${request.headers.host}`);
        } catch {
            socket.destroy();
            return;
        }
        const match = url.pathname.match(/^\/websockify\/([0-9a-f-]{36})$/i);
        const id = match?.[1];
        const session = id && PROFILE_ID.test(id) ? sessions.get(id) : null;
        if (!getLocalHost(request) || !isSameOrigin(request) || !session?.desktop?.wsPort) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        const desktop = net.createConnection({ host: '127.0.0.1', port: session.desktop.wsPort });
        desktop.once('connect', () => {
            const headers = [];
            for (let index = 0; index < request.rawHeaders.length; index += 2) {
                headers.push(`${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}`);
            }
            desktop.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers.join('\r\n')}\r\n\r\n`);
            if (head.length) desktop.write(head);
            socket.pipe(desktop).pipe(socket);
        });
        desktop.on('error', (error) => {
            console.error('Desktop WebSocket proxy error:', error.message);
            socket.destroy();
        });
        socket.on('error', () => desktop.destroy());
    });
    server.listen(PORT, HOST, () => {
        console.log(`GeekEZ web manager listening on ${HOST}:${PORT}; localhost access only.`);
    });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}

main().catch((error) => {
    console.error('Could not start the GeekEZ web manager:', error);
    process.exitCode = 1;
});
