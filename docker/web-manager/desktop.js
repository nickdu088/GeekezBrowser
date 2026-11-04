import RFB from '/novnc/core/rfb.js';

const screen = document.querySelector('#screen');
const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
const profileId = new URLSearchParams(location.search).get('profile');

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId || '')) {
    parent.postMessage({ type: 'desktop-error', message: 'A valid browser profile is required.' }, location.origin);
    throw new Error('A valid browser profile is required.');
}

const rfb = new RFB(screen, `${scheme}//${location.host}/websockify/${profileId}`);

rfb.scaleViewport = true;
rfb.resizeSession = true;
rfb.showDotCursor = true;

rfb.addEventListener('connect', () => {
    parent.postMessage({ type: 'desktop-connected' }, location.origin);
});
rfb.addEventListener('disconnect', (event) => {
    parent.postMessage({
        type: 'desktop-disconnected',
        clean: event.detail.clean,
        reason: event.detail.reason
    }, location.origin);
});
rfb.addEventListener('credentialsrequired', () => {
    parent.postMessage({ type: 'desktop-error', message: 'The desktop requested unexpected credentials.' }, location.origin);
});
rfb.addEventListener('securityfailure', (event) => {
    parent.postMessage({ type: 'desktop-error', message: event.detail.reason || 'The desktop connection was rejected.' }, location.origin);
});
