// Proxy parsing for the web manager: plain HTTP/SOCKS proxies stay a Chrome flag,
// everything else (share links, proxies with credentials, proxy chains) runs through Xray.

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function decodeBase64(value) {
    const text = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
}

function checkEndpoint(host, port, label) {
    const number = Number(port);
    if (!host || !Number.isInteger(number) || number < 1 || number > 65535) {
        throw invalid(`${label} link needs a valid host and port.`);
    }
    return number;
}

function streamSettings(params, address, defaultSecurity = 'none') {
    const network = String(params.type || 'tcp').toLowerCase();
    const security = String(params.security || defaultSecurity).toLowerCase();
    if (!['tcp', 'ws', 'grpc', 'h2', 'http', 'httpupgrade', 'xhttp', 'kcp'].includes(network)) {
        throw invalid(`Unsupported transport "${network}".`);
    }
    if (!['none', 'tls', 'reality'].includes(security)) throw invalid(`Unsupported security "${security}".`);
    const stream = { network: network === 'h2' ? 'http' : network, security };
    const host = params.host || undefined;
    const path = params.path || undefined;
    if (security === 'tls') {
        stream.tlsSettings = {
            serverName: params.sni || params.host || address,
            fingerprint: params.fp || 'chrome',
            alpn: params.alpn ? String(params.alpn).split(',') : undefined,
            allowInsecure: false
        };
    } else if (security === 'reality') {
        if (!params.pbk) throw invalid('A REALITY link needs a public key (pbk).');
        stream.realitySettings = {
            serverName: params.sni || address,
            fingerprint: params.fp || 'chrome',
            publicKey: params.pbk,
            shortId: params.sid || '',
            spiderX: params.spx || ''
        };
    }
    if (network === 'ws') stream.wsSettings = { path: path || '/', headers: host ? { Host: host } : {} };
    else if (network === 'grpc') stream.grpcSettings = { serviceName: params.serviceName || path || '', multiMode: params.mode === 'multi' };
    else if (network === 'httpupgrade') stream.httpupgradeSettings = { path: path || '/', host };
    else if (network === 'xhttp') stream.xhttpSettings = { path: path || '/', host, mode: params.mode || 'auto' };
    else if (network === 'h2' || network === 'http') stream.httpSettings = { path: path || '/', host: host ? [host] : undefined };
    else if (network === 'kcp') stream.kcpSettings = { header: { type: params.headerType || 'none' }, seed: params.seed };
    else if (network === 'tcp' && params.headerType === 'http') {
        stream.tcpSettings = {
            header: { type: 'http', request: { path: [path || '/'], headers: host ? { Host: [host] } : {} } }
        };
    }
    return stream;
}

function paramsOf(url) {
    return Object.fromEntries(url.searchParams.entries());
}

function parseVmess(value) {
    let data;
    try {
        data = JSON.parse(decodeBase64(value.slice('vmess://'.length)));
    } catch {
        throw invalid('This vmess:// link could not be decoded.');
    }
    const port = checkEndpoint(data.add, data.port, 'vmess');
    if (!data.id) throw invalid('This vmess:// link has no user id.');
    const params = {
        type: data.net, security: data.tls === 'tls' ? 'tls' : 'none', host: data.host, path: data.path,
        sni: data.sni, alpn: data.alpn, fp: data.fp, headerType: data.type, serviceName: data.path
    };
    return {
        kind: 'xray',
        display: `vmess://${data.add}:${port}`,
        stored: value,
        outbound: {
            protocol: 'vmess',
            settings: { vnext: [{ address: data.add, port, users: [{ id: data.id, alterId: Number(data.aid || 0), security: data.scy || 'auto' }] }] },
            streamSettings: streamSettings(params, data.add)
        }
    };
}

function parseUrlLink(scheme, value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw invalid(`This ${scheme}:// link is not valid.`);
    }
    const port = checkEndpoint(url.hostname, url.port, scheme);
    const user = decodeURIComponent(url.username);
    if (!user) throw invalid(`This ${scheme}:// link has no ${scheme === 'vless' ? 'user id' : 'password'}.`);
    const params = paramsOf(url);
    const address = url.hostname.replace(/^\[|\]$/g, '');
    const outbound = scheme === 'vless'
        ? {
            protocol: 'vless',
            settings: { vnext: [{ address, port, users: [{ id: user, encryption: params.encryption || 'none', flow: params.flow || undefined }] }] },
            streamSettings: streamSettings(params, address)
        }
        : {
            protocol: 'trojan',
            settings: { servers: [{ address, port, password: user }] },
            streamSettings: streamSettings(params, address, 'tls')
        };
    return { kind: 'xray', display: `${scheme}://${url.host}`, stored: value, outbound };
}

function parseShadowsocks(value) {
    const body = value.slice('ss://'.length).split('#')[0];
    const [main, query = ''] = body.split('?');
    if (new URLSearchParams(query).get('plugin')) throw invalid('Shadowsocks plugins are not supported.');
    let userinfo;
    let hostPort;
    try {
        if (main.includes('@')) {
            const at = main.lastIndexOf('@');
            userinfo = decodeURIComponent(main.slice(0, at));
            if (!userinfo.includes(':')) userinfo = decodeBase64(userinfo);
            hostPort = main.slice(at + 1);
        } else {
            const decoded = decodeBase64(decodeURIComponent(main));
            const at = decoded.lastIndexOf('@');
            userinfo = decoded.slice(0, at);
            hostPort = decoded.slice(at + 1);
        }
        const colon = userinfo.indexOf(':');
        const method = userinfo.slice(0, colon);
        const password = userinfo.slice(colon + 1);
        const url = new URL(`ss://${hostPort}`);
        const port = checkEndpoint(url.hostname, url.port, 'ss');
        if (!method || !password) throw new Error('missing credentials');
        const address = url.hostname.replace(/^\[|\]$/g, '');
        return {
            kind: 'xray',
            display: `ss://${url.host}`,
            stored: value,
            outbound: { protocol: 'shadowsocks', settings: { servers: [{ address, port, method, password }] } }
        };
    } catch (error) {
        if (error.status) throw error;
        throw invalid('This ss:// link could not be decoded.');
    }
}

function parseGeneric(value, scheme) {
    let proxy;
    try {
        proxy = new URL(scheme ? value : `http://${value}`);
    } catch {
        throw invalid('Proxy must be direct:// or a valid HTTP(S)/SOCKS proxy URL.');
    }
    if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(proxy.protocol)
        || !proxy.hostname || !['', '/'].includes(proxy.pathname) || proxy.search || proxy.hash) {
        throw invalid('Proxy must be a URL without a path (for example, socks5://127.0.0.1:1080).');
    }
    const display = `${proxy.protocol}//${proxy.host}`;
    const address = proxy.hostname.replace(/^\[|\]$/g, '');
    const port = checkEndpoint(address, proxy.port || (proxy.protocol === 'https:' ? 443 : proxy.protocol === 'http:' ? 80 : 1080), 'proxy');
    const hasCredentials = Boolean(proxy.username || proxy.password);
    if (hasCredentials && proxy.protocol === 'socks4:') throw invalid('SOCKS4 proxies cannot use credentials.');
    const users = hasCredentials
        ? [{ user: decodeURIComponent(proxy.username), pass: decodeURIComponent(proxy.password) }]
        : undefined;
    const isSocks = proxy.protocol.startsWith('socks');
    const outbound = {
        protocol: isSocks ? 'socks' : 'http',
        settings: { servers: [{ address, port, users }] }
    };
    if (proxy.protocol === 'https:') outbound.streamSettings = { security: 'tls', tlsSettings: { serverName: address } };
    return {
        kind: hasCredentials ? 'xray' : 'plain',
        display,
        stored: hasCredentials ? value : display,
        outbound
    };
}

function parseProxy(input) {
    const value = String(input ?? '').trim();
    if (!value || /^direct(:\/\/)?$/i.test(value)) return { kind: 'direct', display: 'direct://', stored: 'direct://' };
    const scheme = value.match(/^([a-z][a-z\d+.-]*):\/\//i)?.[1].toLowerCase();
    if (scheme === 'vmess') return parseVmess(value);
    if (scheme === 'vless' || scheme === 'trojan') return parseUrlLink(scheme, value);
    if (scheme === 'ss') return parseShadowsocks(value);
    return parseGeneric(value, scheme);
}

function buildXrayConfig(main, pre, port) {
    const outbound = structuredClone(main.outbound);
    outbound.tag = 'proxy';
    const outbounds = [outbound];
    if (pre) {
        const preOutbound = structuredClone(pre.outbound);
        preOutbound.tag = 'pre';
        outbound.streamSettings = {
            ...outbound.streamSettings,
            sockopt: { ...outbound.streamSettings?.sockopt, dialerProxy: 'pre' }
        };
        outbounds.push(preOutbound);
    }
    outbounds.push({ protocol: 'freedom', tag: 'direct' });
    return {
        log: { loglevel: 'warning' },
        inbounds: [{ tag: 'in', listen: '127.0.0.1', port, protocol: 'socks', settings: { auth: 'noauth', udp: true } }],
        outbounds
    };
}

module.exports = { parseProxy, buildXrayConfig };
