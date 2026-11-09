// Applies a profile's environment settings (timezone, location, language, fingerprint, watermark)
// to every page of a running browser through the DevTools protocol.
const presets = require('./presets');

const IP_LOOKUP_URL = 'http://ip-api.com/json/?fields=status,message,countryCode,timezone,lat,lon,query';

// Runs inside every page, frame and worker before their own scripts (so it must only use globals
// that exist in all three, and everything it needs is declared inside it).
function pageScript(options) {
    const originals = new WeakMap();
    const disguise = (original, handler) => {
        const fake = new Proxy(original, handler);
        originals.set(fake, original);
        return fake;
    };
    // Make the replaced functions print like the native ones.
    Function.prototype.toString = disguise(Function.prototype.toString, {
        apply: (target, thisArg, args) => Reflect.apply(target, originals.get(thisArg) || thisArg, args)
    });
    const defineGetter = (prototype, property, value) => {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
            if (!descriptor || !descriptor.get) return;
            Object.defineProperty(prototype, property, {
                ...descriptor,
                get: disguise(descriptor.get, { apply: () => value })
            });
        } catch {
            // Leave the property untouched if the browser refuses.
        }
    };
    if (options.disableWebRtc) {
        // Remove every WebRTC interface (RTCPeerConnection, RTCDataChannel, ...) before the page can grab it.
        for (const name of Object.getOwnPropertyNames(globalThis)) {
            if (/^(webkitRTC|RTC)/.test(name)) {
                try {
                    delete globalThis[name];
                } catch {
                    // Leave it if the browser refuses.
                }
            }
        }
    }
    const navigatorPrototype = typeof Navigator !== 'undefined' ? Navigator.prototype : WorkerNavigator.prototype;
    if (options.platform) defineGetter(navigatorPrototype, 'platform', options.platform);
    if (options.cpuCores) defineGetter(navigatorPrototype, 'hardwareConcurrency', options.cpuCores);
    if (options.memory) defineGetter(navigatorPrototype, 'deviceMemory', options.memory);
    if (options.webgl) {
        for (const context of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
            if (!context) continue;
            context.prototype.getParameter = disguise(context.prototype.getParameter, {
                apply(target, thisArg, args) {
                    if (args[0] === 37445) return options.webgl.vendor;
                    if (args[0] === 37446) return options.webgl.renderer;
                    return Reflect.apply(target, thisArg, args);
                }
            });
        }
    }
    if (options.watermark && typeof window !== 'undefined' && window.top === window) {
        const mount = () => {
            const host = document.createElement('div');
            host.style.cssText = 'all:initial;position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none';
            const label = document.createElement('div');
            label.textContent = options.watermark;
            label.style.cssText = 'font:600 12px system-ui,sans-serif;color:#fff;background:rgba(40,30,80,.82);padding:3px 14px;border-radius:0 0 8px 8px;letter-spacing:.3px';
            host.attachShadow({ mode: 'closed' }).append(label);
            document.documentElement.append(host);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
        else mount();
    }
}

async function openClient(page) {
    return typeof page.createCDPSession === 'function' ? page.createCDPSession() : page.target().createCDPSession();
}

async function lookupExit(page) {
    await page.goto(IP_LOOKUP_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const data = JSON.parse(await page.evaluate(() => document.body.innerText));
    if (data.status !== 'success') throw new Error(data.message || 'lookup failed');
    return data;
}

function userAgentOverride(profile, version, defaultUserAgent, acceptLanguage) {
    const preset = presets.USER_AGENTS[profile.fingerprint.userAgent];
    if (!preset && !acceptLanguage) return null;
    const override = { userAgent: defaultUserAgent };
    if (acceptLanguage) override.acceptLanguage = acceptLanguage;
    if (preset) {
        const major = version.split('.')[0];
        override.userAgent = preset.string(major);
        override.platform = preset.platform;
        override.userAgentMetadata = {
            brands: [
                { brand: 'Chromium', version: major },
                { brand: 'Google Chrome', version: major },
                { brand: 'Not.A/Brand', version: '24' }
            ],
            fullVersionList: [
                { brand: 'Chromium', version },
                { brand: 'Google Chrome', version },
                { brand: 'Not.A/Brand', version: '24.0.0.0' }
            ],
            platform: preset.uaPlatform,
            platformVersion: preset.platformVersion,
            architecture: preset.architecture,
            bitness: '64',
            model: '',
            mobile: false,
            wow64: false
        };
    }
    return override;
}

// Works out everything that depends on the browser or the proxy exit; call once after launch.
async function buildEnvironment(profile, browser, page) {
    const wantsLookup = profile.timezone === 'auto' || profile.language === 'auto';
    let exit = null;
    if (wantsLookup) {
        try {
            exit = await lookupExit(page);
        } catch (error) {
            console.warn(`Could not detect the exit IP location for profile ${profile.id}:`, error.message);
        }
    }

    let location = null;
    if (profile.timezone === 'auto') {
        if (exit) location = { timezone: exit.timezone, latitude: exit.lat, longitude: exit.lon };
    } else if (profile.timezone) {
        location = presets.CITIES.find((city) => city.id === profile.timezone) || null;
    }

    let locale = '';
    if (profile.language === 'auto') locale = exit ? (presets.COUNTRY_LOCALE[exit.countryCode] || 'en-US') : '';
    else if (profile.language) locale = profile.language;
    const base = locale.split('-')[0];
    const acceptLanguage = locale ? (base === locale ? locale : `${locale},${base}`) : '';

    const [, version = '0.0.0.0'] = (await browser.version()).match(/(\d+\.\d+\.\d+\.\d+)/) || [];
    const override = userAgentOverride(profile, version, await browser.userAgent(), acceptLanguage);

    const script = {
        platform: presets.USER_AGENTS[profile.fingerprint.userAgent]?.platform || '',
        cpuCores: profile.fingerprint.cpuCores || 0,
        memory: profile.fingerprint.memory || 0,
        webgl: presets.WEBGL[profile.fingerprint.webgl] || null,
        watermark: profile.watermark ? profile.name : '',
        disableWebRtc: profile.webrtc === 'disable'
    };
    const needsScript = Boolean(script.disableWebRtc || script.platform || script.cpuCores || script.memory || script.webgl || script.watermark);
    return { location, locale, override, script, needsScript };
}

async function sendQuietly(session, method, params) {
    try {
        await session.send(method, params);
    } catch {
        // Not every kind of target supports every command.
    }
}

// Sends every command at once (they are processed in order) instead of waiting for each reply.
function applyEmulation(session, environment) {
    const steps = [];
    if (environment.location) {
        steps.push(sendQuietly(session, 'Emulation.setTimezoneOverride', { timezoneId: environment.location.timezone }));
        steps.push(sendQuietly(session, 'Emulation.setGeolocationOverride', {
            latitude: environment.location.latitude, longitude: environment.location.longitude, accuracy: 50
        }));
    }
    if (environment.locale) steps.push(sendQuietly(session, 'Emulation.setLocaleOverride', { locale: environment.locale }));
    if (environment.override) steps.push(sendQuietly(session, 'Emulation.setUserAgentOverride', environment.override));
    return Promise.all(steps);
}

function scriptSource(environment) {
    return `(${pageScript.toString()})(${JSON.stringify(environment.script)})`;
}

async function setUpTarget(session, type, environment) {
    // Popups only leave a moment before their first document runs, so everything is sent in one batch with
    // the script first. In this order the script also reaches tabs the browser opens itself.
    const steps = [];
    if (type === 'page' || type === 'iframe') {
        if (environment.needsScript) {
            steps.push(sendQuietly(session, 'Page.addScriptToEvaluateOnNewDocument', { source: scriptSource(environment) }));
        }
        steps.push(sendQuietly(session, 'Page.enable'));
        steps.push(applyEmulation(session, environment));
        steps.push(watchChildTargets(session, environment));
    } else if (type === 'worker' || type === 'shared_worker' || type === 'service_worker') {
        if (environment.needsScript) steps.push(sendQuietly(session, 'Runtime.evaluate', { expression: scriptSource(environment) }));
        steps.push(applyEmulation(session, environment));
        steps.push(watchChildTargets(session, environment));
    } else if (type === 'tab') {
        steps.push(watchChildTargets(session, environment));
    }
    await Promise.all(steps);
}

// Every new target (tab, popup, cross-site frame, worker) is paused when it is created, gets the profile's
// settings, and is then always resumed, so even its very first script already sees them.
async function attachChild(parent, { sessionId, targetInfo }, environment) {
    const child = parent.connection()?.session(sessionId);
    if (!child) return;
    try {
        await setUpTarget(child, targetInfo.type, environment);
    } catch (error) {
        console.warn(`Could not apply the profile environment to a ${targetInfo.type}:`, error.message);
    } finally {
        await sendQuietly(child, 'Runtime.runIfWaitingForDebugger');
    }
}

async function watchChildTargets(session, environment) {
    session.on('Target.attachedToTarget', (event) => attachChild(session, event, environment));
    await sendQuietly(session, 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
}

// Emulation overrides only last while the DevTools session that set them stays attached, so the root
// session (and with it every child session) is kept until the browser closes.
const rootSessions = new Set();

async function installEnvironment(browser, environment) {
    const root = await browser.target().createCDPSession();
    rootSessions.add(root);
    browser.once('disconnected', () => rootSessions.delete(root));

    // Pages that already exist are not paused, so wait until they have their settings before returning.
    const expected = browser.targets().filter((target) => target.type() === 'page').length;
    let attached = 0;
    const pending = new Set();
    root.on('Target.attachedToTarget', (event) => {
        if (event.targetInfo.type === 'page') attached += 1;
        const work = attachChild(root, event, environment);
        pending.add(work);
        work.finally(() => pending.delete(work));
    });
    await sendQuietly(root, 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
    const deadline = Date.now() + 1500;
    while (attached < expected && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    await Promise.all([...pending]);
}

module.exports = { buildEnvironment, installEnvironment };
