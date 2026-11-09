const profileList = document.querySelector('#profile-list');
const emptyState = document.querySelector('#empty-state');
const profileCount = document.querySelector('#profile-count');
const runningCount = document.querySelector('#running-count');
const panelTitle = document.querySelector('#panel-title');
const panelSubtitle = document.querySelector('#panel-subtitle');
const panelState = document.querySelector('#panel-state');
const panelPrimary = document.querySelector('#panel-primary');
const overviewBack = document.querySelector('#overview-back');
const profileDetails = document.querySelector('#profile-details');
const profileOverview = document.querySelector('#profile-overview');
const overviewList = document.querySelector('#overview-list');
const overviewNoProfiles = document.querySelector('#overview-no-profiles');
const detailsContent = document.querySelector('#details-content');
const browserView = document.querySelector('#browser-view');
const desktopFrame = document.querySelector('#desktop-frame');
const previewEmpty = document.querySelector('#preview-empty');
const loading = document.querySelector('#loading');
const profileDialog = document.querySelector('#profile-dialog');
const profileForm = document.querySelector('#profile-form');
const formError = document.querySelector('#form-error');
const toast = document.querySelector('#toast');

const translations = {
    'en': {},
    'zh-CN': {
        'GeekEZ Browser Manager': 'GeekEZ 浏览器管理器',
        'GeekEZ Browser Manager home': 'GeekEZ 浏览器管理器首页',
        'WORKSPACE': '工作区',
        'Profiles': '配置文件',
        'PROFILES': '配置文件',
        'New profile': '新建配置文件',
        'Refresh profiles': '刷新配置文件',
        'Refresh': '刷新',
        'No profiles yet': '暂无配置文件',
        'Create a profile to start a separate browser session.': '创建配置文件以启动独立浏览器会话。',
        'Create profile': '创建配置文件',
        'Network connection': '网络连接',
        'Available on your local network. No password is configured; do not expose this service to the internet.': '可在局域网内访问。当前未配置密码，请勿将此服务暴露到互联网。',
        'Workspace': '工作区',
        'BROWSER WORKSPACE': '浏览器工作区',
        'Manage isolated browser sessions from one place.': '在一个地方管理相互隔离的浏览器会话。',
        'RUNNING': '运行中',
        'Profile overview': '配置文件总览',
        'All browser profiles at a glance.': '在此查看所有浏览器配置文件。',
        'All profiles': '所有配置文件',
        'Profile': '配置文件',
        'Chrome version': 'Chrome 版本',
        'Tags': '标签',
        'e.g. US, shop': '例如：US, 店铺',
        'NETWORK': '网络',
        'LOCATION & LANGUAGE': '位置与语言',
        'FINGERPRINT': '指纹',
        'NOTES': '备注',
        'Pre-proxy': '前置代理',
        'Supports HTTP/SOCKS proxies, proxies with a username and password, and vmess://, vless://, trojan:// and ss:// links. Credentials are stored on the server and never shown again. Changes apply the next time the profile starts.': '支持 HTTP/SOCKS 代理、带用户名密码的代理，以及 vmess://、vless://、trojan://、ss:// 链接。凭据保存在服务器上，之后不会再显示。更改将在下次启动配置文件时生效。',
        'Traffic reaches the proxy above through this one (a proxy chain).': '流量会先经过前置代理，再到达上面的代理（代理链）。',
        'WebRTC': 'WebRTC',
        'Block IP leaks (WebRTC still works)': '防止泄漏 IP（WebRTC 仍可用）',
        'Disable WebRTC completely': '完全禁用 WebRTC',
        'WebRTC disabled': 'WebRTC 已禁用',
        'Unsupported WebRTC mode.': '不支持的 WebRTC 模式。',
        'Timezone & location': '时区与地理位置',
        'Language': '语言',
        'Default (do not change)': '默认（不修改）',
        'Auto (match proxy IP)': '自动（匹配代理 IP）',
        'Auto detects the proxy\'s exit IP when the profile starts, so the first start can take a few seconds longer.': '“自动”会在启动时检测代理出口 IP，因此启动可能多花几秒。',
        'Randomize': '随机生成',
        'CPU cores': 'CPU 核数',
        'Memory (GB)': '内存 (GB)',
        'User agent': 'User Agent',
        'WebGL graphics card': 'WebGL 显卡',
        'Only the options you choose are changed. Pick values that match each other (for example a Windows user agent with an NVIDIA or Intel card).': '只会修改你选择的项目。请选择相互匹配的值（例如 Windows 的 User Agent 搭配 NVIDIA 或 Intel 显卡）。',
        'Show profile name watermark on pages': '在页面顶部显示环境名称水印',
        'Environment': '环境',
        'Default (nothing modified)': '默认（未修改任何项）',
        'Timezone': '时区',
        'Memory': '内存',
        'WebRTC protected': 'WebRTC 已防泄漏',
        'Watermark': '水印',
        'A pre-proxy needs a profile proxy to chain to.': '前置代理需要配合配置文件的代理使用。',
        'Latest (Stable)': '最新（Stable）',
        'installed': '已安装',
        'Latest follows the Stable channel. A version that is not installed yet is downloaded the first time a profile starts with it.': '“最新”跟随 Stable 通道。尚未安装的版本会在配置文件首次启动时下载。',
        'Downloading Chrome {version}…': '正在下载 Chrome {version}…',
        'Chrome version must be "latest", a major version such as 130, or a full version such as 130.0.6723.58.': 'Chrome 版本须为 latest、主版本号（如 130）或完整版本号（如 130.0.6723.58）。',
        'Actions': '操作',
        'More actions': '更多操作',
        'Select a profile': '选择配置文件',
        'Choose a profile to view its details.': '选择一个配置文件查看详情。',
        'Start': '启动',
        'Edit': '编辑',
        'Delete': '删除',
        'Open browser': '打开浏览器',
        'Starting…': '正在启动…',
        'No profile selected': '未选择配置文件',
        'Choose a profile from the list to see its details.': '从列表中选择一个配置文件以查看详情。',
        'Select profile {name}': '选择配置文件 {name}',
        'BROWSER PROFILE': '浏览器配置文件',
        'Status': '状态',
        'Proxy': '代理',
        'Created': '创建时间',
        'Notes': '备注',
        'Stop browser': '停止浏览器',
        'Edit profile': '编辑配置文件',
        'Delete profile': '删除配置文件',
        'Native Chrome browser': '原生 Chrome 浏览器',
        'Native Chrome desktop': '原生 Chrome 桌面',
        'Connecting to Chrome': '正在连接 Chrome',
        'The native Chrome window will appear here.': '原生 Chrome 窗口将在此处显示。',
        'Connecting to Chrome…': '正在连接 Chrome…',
        'Enter fullscreen': '进入全屏',
        'Exit fullscreen': '退出全屏',
        'Profile name': '配置文件名称',
        'e.g. Work account': '例如：工作账号',
        'Proxy address': '代理地址',
        'OPTIONAL': '可选',
        'Proxy credentials are not stored. Changes apply the next time the profile starts.': '代理凭据不会被保存。更改将在下次启动配置文件时生效。',
        'Add a note about this profile': '添加关于此配置文件的备注',
        'Cancel': '取消',
        'Close': '关闭',
        'Direct connection': '直连',
        'Details': '详情',
        'Stop': '停止',
        'running': '运行中',
        'starting': '正在启动',
        'stopped': '已停止',
        'Unknown': '未知',
        'No notes added.': '暂无备注。',
        'Profile details': '配置文件详情',
        'Native Chrome window': '原生 Chrome 窗口',
        'Select a profile': '选择配置文件',
        'Edit profile': '编辑配置文件',
        'Save changes': '保存更改',
        'Delete "{name}" and permanently remove its browser data?': '确定删除“{name}”并永久移除其浏览器数据吗？',
        'Profile and its browser data deleted.': '配置文件及其浏览器数据已删除。',
        'Profile started.': '配置文件已启动。',
        'Profile stopped.': '配置文件已停止。',
        'Profile updated.': '配置文件已更新。',
        'Profile created.': '配置文件已创建。',
        'Could not enter fullscreen: {error}': '无法进入全屏：{error}',
        'The Chrome desktop connection was lost.': '与 Chrome 桌面的连接已断开。',
        'A valid browser profile is required.': '需要有效的浏览器配置文件。',
        'The desktop requested unexpected credentials.': '桌面连接请求了意外的凭据。',
        'The desktop connection was rejected.': '桌面连接被拒绝。',
        'Request failed ({status}).': '请求失败（{status}）。',
        'Profile not found.': '未找到配置文件。',
        'This profile is already starting or running.': '此配置文件已在启动或运行中。',
        'Start this profile before using browser controls.': '请先启动此配置文件，再使用浏览器控制功能。',
        'Profile name must be 1-64 characters and contain no control characters.': '配置文件名称须为 1 至 64 个字符，且不能包含控制字符。',
        'Notes must be 500 characters or fewer.': '备注不能超过 500 个字符。',
        'Proxy must be direct:// or a valid HTTP(S)/SOCKS proxy URL.': '代理须为 direct:// 或有效的 HTTP(S)/SOCKS 代理地址。',
        'Proxy must be a URL without credentials or a path (for example, socks5://127.0.0.1:1080).': '代理地址不能包含凭据或路径（例如 socks5://127.0.0.1:1080）。',
        'At most {count} profiles can run at once.': '最多可同时运行 {count} 个配置文件。',
        'Chrome is not installed. Check the mounted browser resources.': '未安装 Chrome。请检查挂载的浏览器资源。',
        'Enter a valid website address.': '请输入有效的网站地址。',
        'Only HTTP and HTTPS addresses are supported.': '仅支持 HTTP 和 HTTPS 地址。',
        'Could not find the native Chrome window on the virtual desktop.': '无法在虚拟桌面上找到原生 Chrome 窗口。'
    }
};

let language = localStorage.getItem('geekez-language') === 'zh-CN' ? 'zh-CN' : 'en';
let profiles = [];
let selectedId = null;
let viewMode = 'details';
let editingId = null;
let toastTimer;
let refreshTimer;

function translate(message) {
    const translated = translations[language][message];
    if (translated) return translated;
    const runningLimit = message.match(/^At most (\d+) profiles can run at once\.$/);
    if (language === 'zh-CN' && runningLimit) {
        return translations[language]['At most {count} profiles can run at once.'].replace('{count}', runningLimit[1]);
    }
    const downloading = message.match(/^Downloading Chrome (.+)…$/);
    if (language === 'zh-CN' && downloading) {
        return translations[language]['Downloading Chrome {version}…'].replace('{version}', downloading[1]);
    }
    return message;
}

function applyLanguage() {
    document.documentElement.lang = language;
    document.title = translate('GeekEZ Browser Manager');
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = translate(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        element.placeholder = translate(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
        element.title = translate(element.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
    });
    document.querySelector('#language-toggle').textContent = language === 'en' ? '中文' : 'EN';
    document.querySelector('#language-toggle').setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    if (profileDialog.open) {
        document.querySelector('#dialog-title').textContent = translate(editingId ? 'Edit profile' : 'Create profile');
        document.querySelector('#dialog-save').textContent = translate(editingId ? 'Save changes' : 'Create profile');
    }
    renderProfiles();
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const result = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : {};
    if (!response.ok) throw new Error(result.error || translate('Request failed ({status}).').replace('{status}', response.status));
    return result;
}

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function button(text, action, className = 'small-button', disabled = false) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = text;
    element.dataset.action = action;
    element.disabled = disabled;
    return element;
}

function renderProfiles() {
    profileList.replaceChildren();
    profileCount.textContent = String(profiles.length);
    runningCount.textContent = String(profiles.filter((profile) => profile.state === 'running').length);
    emptyState.hidden = profiles.length > 0;
    profileList.hidden = profiles.length === 0;

    for (const profile of profiles) {
        const card = document.createElement('article');
        card.className = `profile-card${profile.id === selectedId ? ' selected' : ''}`;
        card.dataset.id = profile.id;

        const top = document.createElement('div');
        top.className = 'profile-card-top';
        const avatar = document.createElement('div');
        avatar.className = 'profile-avatar';
        avatar.textContent = profile.name.trim().charAt(0).toUpperCase();
        const info = document.createElement('div');
        info.className = 'profile-info';
        const name = document.createElement('div');
        name.className = 'profile-name';
        name.textContent = profile.name;
        const meta = document.createElement('div');
        meta.className = 'profile-meta';
        meta.textContent = proxyLabel(profile);
        info.append(name, meta);

        const state = document.createElement('span');
        state.className = `state-badge ${profile.state}`;
        state.textContent = translate(profile.state);
        top.append(avatar, info, state);
        card.append(top);
        if (profile.id === selectedId && profile.state === 'running') {
            const actions = document.createElement('div');
            actions.className = 'profile-card-actions';
            const detailsButton = button(translate('Details'), 'details');
            detailsButton.dataset.profileAction = 'details';
            const stopButton = button(translate('Stop'), 'stop', 'small-button stop');
            stopButton.dataset.profileAction = 'stop';
            actions.append(detailsButton, stopButton);
            card.append(actions);
        }

        profileList.append(card);
    }

    renderOverview();
    if (selectedId && !profiles.some((profile) => profile.id === selectedId)) {
        selectedId = null;
    }
    renderWorkspace(profiles.find((item) => item.id === selectedId) || null);
}

function formatCreatedAt(value) {
    const createdAt = new Date(value);
    return Number.isNaN(createdAt.getTime())
        ? translate('Unknown')
        : new Intl.DateTimeFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US', { dateStyle: 'medium' }).format(createdAt);
}

function renderOverview() {
    overviewList.replaceChildren();
    overviewNoProfiles.hidden = profiles.length > 0;
    for (const profile of profiles) {
        const row = document.createElement('tr');
        row.dataset.id = profile.id;
        row.tabIndex = 0;
        row.setAttribute('aria-label', translate('Select profile {name}').replace('{name}', profile.name));

        const profileCell = document.createElement('td');
        const identity = document.createElement('div');
        identity.className = 'overview-profile';
        const avatar = document.createElement('span');
        avatar.className = 'profile-avatar';
        avatar.textContent = profile.name.trim().charAt(0).toUpperCase();
        const name = document.createElement('span');
        name.className = 'overview-profile-name';
        name.textContent = profile.name;
        identity.append(avatar, name);
        profileCell.append(identity);
        if (profile.tags?.length) {
            const tags = document.createElement('div');
            tags.className = 'overview-tags';
            for (const label of profile.tags) {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = label;
                tags.append(tag);
            }
            profileCell.append(tags);
        }

        const versionCell = document.createElement('td');
        versionCell.className = 'overview-version';
        versionCell.textContent = profile.chromeVersion || translate('Unknown');

        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        status.className = `state-badge ${profile.state}`;
        status.textContent = translate(profile.state);
        statusCell.append(status);
        if (profile.message) {
            const note = document.createElement('span');
            note.className = 'state-note';
            note.textContent = translate(profile.message);
            statusCell.append(note);
        }

        const proxyCell = document.createElement('td');
        proxyCell.textContent = proxyLabel(profile);
        proxyCell.title = proxyCell.textContent;

        const notesCell = document.createElement('td');
        notesCell.className = 'overview-notes';
        notesCell.textContent = profile.notes || translate('No notes added.');
        notesCell.title = notesCell.textContent;

        const createdCell = document.createElement('td');
        createdCell.className = 'overview-created';
        createdCell.textContent = formatCreatedAt(profile.createdAt);

        const actionCell = document.createElement('td');
        actionCell.className = 'overview-actions';
        const actionButtons = document.createElement('div');
        actionButtons.className = 'overview-action-buttons';
        const addActionButton = (label, menuAction, className = '', disabled = false) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = `small-button${className ? ` ${className}` : ''}`;
            item.textContent = translate(label);
            item.dataset.profileAction = menuAction;
            item.disabled = disabled;
            actionButtons.append(item);
        };
        addActionButton(profile.state === 'starting' ? 'Starting…' : 'Start', 'start', 'launch', profile.state !== 'stopped');
        addActionButton('Stop', 'stop', 'stop', profile.state !== 'running');
        addActionButton('Edit', 'edit');
        addActionButton('Delete', 'delete', 'danger', profile.state === 'starting');
        actionCell.append(actionButtons);

        row.append(profileCell, versionCell, statusCell, proxyCell, notesCell, createdCell, actionCell);
        overviewList.append(row);
    }
}

async function refreshProfiles() {
    try {
        profiles = await api('/api/profiles');
        renderProfiles();
    } catch (error) {
        showToast(error.message, true);
    }
}

function renderWorkspace(profile) {
    if (viewMode === 'browser' && profile?.state !== 'running') viewMode = 'details';
    const isBrowserView = viewMode === 'browser' && profile;

    profileDetails.hidden = Boolean(isBrowserView);
    browserView.hidden = !isBrowserView;
    document.body.classList.toggle('browser-active', Boolean(isBrowserView));
    panelState.hidden = !profile;
    panelPrimary.hidden = !profile || isBrowserView;
    document.querySelector('#detail-stop').hidden = profile?.state !== 'running';
    document.querySelector('#edit-profile').disabled = !profile;
    document.querySelector('#delete-profile').disabled = !profile;

    if (!profile) {
        desktopFrame.dataset.profileId = '';
        desktopFrame.src = 'about:blank';
        panelTitle.textContent = translate('Profile overview');
        panelSubtitle.textContent = translate('All browser profiles at a glance.');
        overviewBack.hidden = true;
        profileOverview.hidden = false;
        detailsContent.hidden = true;
        panelState.textContent = translate('stopped');
        panelState.className = 'state-badge stopped';
        desktopFrame.hidden = true;
        previewEmpty.hidden = true;
        loading.hidden = true;
        return;
    }

    profileOverview.hidden = true;
    overviewBack.hidden = isBrowserView;
    panelTitle.textContent = profile.name;
    panelSubtitle.textContent = isBrowserView ? translate('Native Chrome window') : translate('Profile details');
    panelState.textContent = translate(profile.state);
    panelState.className = `state-badge ${profile.state}`;
    panelPrimary.textContent = translate(profile.state === 'running' ? 'Open browser' : profile.state === 'starting' ? 'Starting…' : 'Start');
    panelPrimary.dataset.action = profile.state === 'running' ? 'open' : 'start';
    panelPrimary.disabled = profile.state === 'starting';
    detailsContent.hidden = false;
    document.querySelector('#detail-avatar').textContent = profile.name.trim().charAt(0).toUpperCase();
    document.querySelector('#detail-name').textContent = profile.name;
    document.querySelector('#detail-status').textContent = translate(profile.state);
    document.querySelector('#detail-chrome').textContent = profile.chromeVersion === profile.chrome || !profile.chromeVersion
        ? (profile.chrome || 'latest')
        : `${profile.chrome} (${profile.chromeVersion})`;
    document.querySelector('#detail-proxy').textContent = proxyLabel(profile);
    document.querySelector('#detail-tags').textContent = (profile.tags || []).join(', ') || '—';
    document.querySelector('#detail-environment').textContent = environmentSummary(profile);
    document.querySelector('#detail-notes').textContent = profile.notes || translate('No notes added.');
    document.querySelector('#detail-created').textContent = formatCreatedAt(profile.createdAt);

    if (!isBrowserView) {
        desktopFrame.dataset.profileId = '';
        desktopFrame.src = 'about:blank';
        desktopFrame.hidden = true;
        previewEmpty.hidden = true;
        loading.hidden = true;
        return;
    }

    if (desktopFrame.dataset.profileId !== profile.id) {
        desktopFrame.dataset.profileId = profile.id;
        desktopFrame.src = 'about:blank';
        desktopFrame.hidden = true;
        previewEmpty.hidden = false;
        loading.hidden = true;
        connectDesktop(profile.id);
    }
}

async function connectDesktop(profileId) {
    try {
        await api(`/api/profiles/${profileId}/focus`, { method: 'POST', body: '{}' });
        if (selectedId !== profileId || viewMode !== 'browser') return;
        loading.hidden = false;
        previewEmpty.hidden = true;
        desktopFrame.hidden = false;
        desktopFrame.src = `/desktop.html?profile=${encodeURIComponent(profileId)}&session=${Date.now()}`;
    } catch (error) {
        if (selectedId === profileId) showToast(error.message, true);
    }
}

function selectProfile(profile) {
    selectedId = profile.id;
    viewMode = profile.state === 'running' ? 'browser' : 'details';
    renderProfiles();
}

function proxyLabel(profile) {
    const main = profile.proxy === 'direct://' ? translate('Direct connection') : profile.proxy;
    return profile.preProxy ? `${profile.preProxy} → ${main}` : main;
}

function environmentSummary(profile) {
    const fingerprint = profile.fingerprint || {};
    const parts = [];
    const shown = (value) => (value === 'auto' ? translate('Auto (match proxy IP)') : value);
    if (profile.timezone) parts.push(`${translate('Timezone')}: ${shown(profile.timezone)}`);
    if (profile.language) parts.push(`${translate('Language')}: ${shown(profile.language)}`);
    if (fingerprint.cpuCores) parts.push(`${translate('CPU cores')}: ${fingerprint.cpuCores}`);
    if (fingerprint.memory) parts.push(`${translate('Memory')}: ${fingerprint.memory} GB`);
    if (fingerprint.userAgent) parts.push(`${translate('User agent')}: ${fingerprint.userAgent}`);
    if (fingerprint.webgl) parts.push(`WebGL: ${fingerprint.webgl}`);
    if (profile.webrtc === 'protect') parts.push(translate('WebRTC protected'));
    if (profile.webrtc === 'disable') parts.push(translate('WebRTC disabled'));
    if (profile.watermark) parts.push(translate('Watermark'));
    return parts.join(' · ') || translate('Default (nothing modified)');
}

let presetsPromise = null;

async function fillLocationOptions(timezone, language) {
    const fill = (select, items, selected) => {
        select.replaceChildren(
            new Option(translate('Default (do not change)'), ''),
            new Option(translate('Auto (match proxy IP)'), 'auto')
        );
        for (const item of items) select.append(new Option(item.label, item.value));
        if (selected && ![...select.options].some((option) => option.value === selected)) {
            select.append(new Option(selected, selected));
        }
        select.value = selected;
    };
    const timezoneSelect = document.querySelector('#profile-timezone');
    const languageSelect = document.querySelector('#profile-language');
    fill(timezoneSelect, [], timezone);
    fill(languageSelect, [], language);
    try {
        presetsPromise ||= api('/api/presets');
        const presets = await presetsPromise;
        fill(timezoneSelect, presets.cities.map((city) => ({ value: city.id, label: city.label })), timezoneSelect.value);
        fill(languageSelect, presets.languages.map((item) => ({ value: item.code, label: `${item.label} (${item.code})` })), languageSelect.value);
    } catch (error) {
        presetsPromise = null;
        showToast(error.message, true);
    }
}

function randomizeFingerprint() {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const userAgent = pick(['windows', 'mac', 'linux']);
    const cards = { windows: ['nvidia', 'intel', 'amd'], mac: ['apple'], linux: ['nvidia', 'intel', 'amd'] }[userAgent];
    document.querySelector('#profile-cpu').value = pick(['4', '8', '12', '16']);
    document.querySelector('#profile-memory').value = pick(['4', '8']);
    document.querySelector('#profile-ua').value = userAgent;
    document.querySelector('#profile-webgl').value = pick(cards);
}

async function fillChromeOptions(selected) {
    const select = document.querySelector('#profile-chrome');
    const ensureOption = (value) => {
        if (value && ![...select.options].some((option) => option.value === value)) {
            select.append(new Option(`Chrome ${value}`, value));
        }
    };
    select.replaceChildren(new Option(translate('Latest (Stable)'), 'latest'));
    ensureOption(selected);
    select.value = selected || 'latest';
    try {
        const { versions } = await api('/api/chrome-versions');
        const current = select.value;
        select.replaceChildren(new Option(translate('Latest (Stable)'), 'latest'));
        for (const item of versions) {
            const label = `Chrome ${item.version}${item.installed ? ` (${translate('installed')})` : ''}`;
            select.append(new Option(label, item.version));
        }
        ensureOption(current);
        select.value = current;
    } catch (error) {
        showToast(error.message, true);
    }
}

function openDialog(profile = null) {
    editingId = profile?.id || null;
    formError.hidden = true;
    formError.textContent = '';
    document.querySelector('#dialog-title').textContent = translate(editingId ? 'Edit profile' : 'Create profile');
    document.querySelector('#dialog-save').textContent = translate(editingId ? 'Save changes' : 'Create profile');
    document.querySelector('#profile-name').value = profile?.name || '';
    fillChromeOptions(profile?.chrome || 'latest');
    document.querySelector('#profile-tags').value = (profile?.tags || []).join(', ');
    document.querySelector('#profile-proxy').value = profile?.proxy || 'direct://';
    document.querySelector('#profile-preproxy').value = profile?.preProxy || '';
    document.querySelector('#profile-webrtc').value = profile?.webrtc || '';
    fillLocationOptions(profile?.timezone || '', profile?.language || '');
    const fingerprint = profile?.fingerprint || {};
    document.querySelector('#profile-cpu').value = String(fingerprint.cpuCores || 0);
    document.querySelector('#profile-memory').value = String(fingerprint.memory || 0);
    document.querySelector('#profile-ua').value = fingerprint.userAgent || '';
    document.querySelector('#profile-webgl').value = fingerprint.webgl || '';
    document.querySelector('#profile-watermark').checked = Boolean(profile?.watermark);
    document.querySelector('#profile-notes').value = profile?.notes || '';
    profileDialog.showModal();
    document.querySelector('#profile-name').focus();
}

async function performAction(id, action) {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return;
    try {
        if (action === 'edit') {
            viewMode = 'details';
            renderWorkspace(profile);
            openDialog(profile);
            return;
        }
        if (action === 'delete') {
            if (!window.confirm(translate('Delete "{name}" and permanently remove its browser data?').replace('{name}', profile.name))) return;
            await api(`/api/profiles/${id}`, { method: 'DELETE' });
            if (selectedId === id) {
                selectedId = null;
                viewMode = 'details';
            }
            showToast(translate('Profile and its browser data deleted.'));
        } else if (action === 'start') {
            selectedId = id;
            await api(`/api/profiles/${id}/start`, { method: 'POST' });
            viewMode = 'browser';
            showToast(translate('Profile started.'));
        } else if (action === 'stop') {
            await api(`/api/profiles/${id}/stop`, { method: 'POST' });
            viewMode = 'details';
            showToast(translate('Profile stopped.'));
        } else if (action === 'open') {
            selectedId = id;
            viewMode = 'browser';
        }
        await refreshProfiles();
    } catch (error) {
        if (action === 'start') {
            viewMode = 'details';
            await refreshProfiles();
        }
        showToast(error.message, true);
    }
}

profileList.addEventListener('click', (event) => {
    const card = event.target.closest('.profile-card');
    if (!card) return;
    const profile = profiles.find((item) => item.id === card.dataset.id);
    const action = event.target.closest('[data-profile-action]')?.dataset.profileAction;
    if (action === 'details') {
        selectedId = profile?.id || null;
        viewMode = 'details';
        renderProfiles();
        return;
    }
    if (action === 'stop') {
        if (profile) performAction(profile.id, 'stop');
        return;
    }
    if (profile) selectProfile(profile);
});

overviewList.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-id]');
    const profile = profiles.find((item) => item.id === row?.dataset.id);
    const action = event.target.closest('[data-profile-action]')?.dataset.profileAction;
    if (action) {
        if (profile) performAction(profile.id, action);
        return;
    }
    if (profile) selectProfile(profile);
});
overviewList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-id]');
    if (event.target !== row) return;
    const profile = profiles.find((item) => item.id === row?.dataset.id);
    if (!profile) return;
    event.preventDefault();
    selectProfile(profile);
});

overviewBack.addEventListener('click', () => {
    selectedId = null;
    viewMode = 'details';
    renderProfiles();
});
panelPrimary.addEventListener('click', () => {
    if (selectedId) performAction(selectedId, panelPrimary.dataset.action);
});
document.querySelector('#edit-profile').addEventListener('click', () => {
    if (selectedId) performAction(selectedId, 'edit');
});
document.querySelector('#delete-profile').addEventListener('click', () => {
    if (selectedId) performAction(selectedId, 'delete');
});
document.querySelector('#detail-stop').addEventListener('click', () => {
    if (selectedId) performAction(selectedId, 'stop');
});

document.querySelector('#new-profile').addEventListener('click', () => openDialog());
document.querySelector('#new-profile-sidebar').addEventListener('click', () => openDialog());
document.querySelector('[data-action="new"]').addEventListener('click', () => openDialog());
document.querySelector('#refresh').addEventListener('click', refreshProfiles);
document.querySelector('#language-toggle').addEventListener('click', () => {
    language = language === 'en' ? 'zh-CN' : 'en';
    localStorage.setItem('geekez-language', language);
    applyLanguage();
});
document.querySelector('#dialog-close').addEventListener('click', () => profileDialog.close());
document.querySelector('#dialog-cancel').addEventListener('click', () => profileDialog.close());

document.querySelector('#randomize-fingerprint').addEventListener('click', randomizeFingerprint);

profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;
    const body = {
        name: document.querySelector('#profile-name').value,
        chrome: document.querySelector('#profile-chrome').value,
        proxy: document.querySelector('#profile-proxy').value,
        preProxy: document.querySelector('#profile-preproxy').value,
        tags: document.querySelector('#profile-tags').value,
        webrtc: document.querySelector('#profile-webrtc').value,
        watermark: document.querySelector('#profile-watermark').checked,
        timezone: document.querySelector('#profile-timezone').value,
        language: document.querySelector('#profile-language').value,
        fingerprint: {
            cpuCores: Number(document.querySelector('#profile-cpu').value),
            memory: Number(document.querySelector('#profile-memory').value),
            userAgent: document.querySelector('#profile-ua').value,
            webgl: document.querySelector('#profile-webgl').value
        },
        notes: document.querySelector('#profile-notes').value
    };
    try {
        const profile = editingId
            ? await api(`/api/profiles/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
            : await api('/api/profiles', { method: 'POST', body: JSON.stringify(body) });
        selectedId = profile.id;
        viewMode = 'details';
        profileDialog.close();
        await refreshProfiles();
        showToast(translate(editingId ? 'Profile updated.' : 'Profile created.'));
    } catch (error) {
        formError.textContent = error.message;
        formError.hidden = false;
    }
});

document.querySelector('#fullscreen-browser').addEventListener('click', async () => {
    try {
        await browserView.requestFullscreen();
    } catch (error) {
        showToast(translate('Could not enter fullscreen: {error}').replace('{error}', error.message), true);
    }
});

window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== desktopFrame.contentWindow) return;
    if (event.data?.type === 'desktop-connected') loading.hidden = true;
    if (event.data?.type === 'desktop-error') {
        loading.hidden = true;
        showToast(translate(event.data.message), true);
    }
    if (event.data?.type === 'desktop-disconnected' && !event.data.clean) {
        loading.hidden = true;
        showToast(translate(event.data.reason || 'The Chrome desktop connection was lost.'), true);
    }
});

applyLanguage();
refreshProfiles();
refreshTimer = setInterval(refreshProfiles, 2500);
window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
