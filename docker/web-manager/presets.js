// [id, label, IANA timezone, latitude, longitude]
const CITIES = [
    ['new-york', 'New York', 'America/New_York', 40.7128, -74.0060],
    ['los-angeles', 'Los Angeles', 'America/Los_Angeles', 34.0522, -118.2437],
    ['chicago', 'Chicago', 'America/Chicago', 41.8781, -87.6298],
    ['denver', 'Denver', 'America/Denver', 39.7392, -104.9903],
    ['phoenix', 'Phoenix', 'America/Phoenix', 33.4484, -112.0740],
    ['anchorage', 'Anchorage', 'America/Anchorage', 61.2181, -149.9003],
    ['honolulu', 'Honolulu', 'Pacific/Honolulu', 21.3069, -157.8583],
    ['toronto', 'Toronto', 'America/Toronto', 43.6532, -79.3832],
    ['vancouver', 'Vancouver', 'America/Vancouver', 49.2827, -123.1207],
    ['mexico-city', 'Mexico City', 'America/Mexico_City', 19.4326, -99.1332],
    ['bogota', 'Bogotá', 'America/Bogota', 4.7110, -74.0721],
    ['lima', 'Lima', 'America/Lima', -12.0464, -77.0428],
    ['santiago', 'Santiago', 'America/Santiago', -33.4489, -70.6693],
    ['buenos-aires', 'Buenos Aires', 'America/Argentina/Buenos_Aires', -34.6037, -58.3816],
    ['sao-paulo', 'São Paulo', 'America/Sao_Paulo', -23.5505, -46.6333],
    ['london', 'London', 'Europe/London', 51.5072, -0.1276],
    ['dublin', 'Dublin', 'Europe/Dublin', 53.3498, -6.2603],
    ['lisbon', 'Lisbon', 'Europe/Lisbon', 38.7223, -9.1393],
    ['madrid', 'Madrid', 'Europe/Madrid', 40.4168, -3.7038],
    ['paris', 'Paris', 'Europe/Paris', 48.8566, 2.3522],
    ['amsterdam', 'Amsterdam', 'Europe/Amsterdam', 52.3676, 4.9041],
    ['brussels', 'Brussels', 'Europe/Brussels', 50.8503, 4.3517],
    ['berlin', 'Berlin', 'Europe/Berlin', 52.5200, 13.4050],
    ['zurich', 'Zurich', 'Europe/Zurich', 47.3769, 8.5417],
    ['rome', 'Rome', 'Europe/Rome', 41.9028, 12.4964],
    ['vienna', 'Vienna', 'Europe/Vienna', 48.2082, 16.3738],
    ['stockholm', 'Stockholm', 'Europe/Stockholm', 59.3293, 18.0686],
    ['oslo', 'Oslo', 'Europe/Oslo', 59.9139, 10.7522],
    ['copenhagen', 'Copenhagen', 'Europe/Copenhagen', 55.6761, 12.5683],
    ['helsinki', 'Helsinki', 'Europe/Helsinki', 60.1699, 24.9384],
    ['warsaw', 'Warsaw', 'Europe/Warsaw', 52.2297, 21.0122],
    ['prague', 'Prague', 'Europe/Prague', 50.0755, 14.4378],
    ['budapest', 'Budapest', 'Europe/Budapest', 47.4979, 19.0402],
    ['bucharest', 'Bucharest', 'Europe/Bucharest', 44.4268, 26.1025],
    ['athens', 'Athens', 'Europe/Athens', 37.9838, 23.7275],
    ['istanbul', 'Istanbul', 'Europe/Istanbul', 41.0082, 28.9784],
    ['kyiv', 'Kyiv', 'Europe/Kiev', 50.4501, 30.5234],
    ['moscow', 'Moscow', 'Europe/Moscow', 55.7558, 37.6173],
    ['dubai', 'Dubai', 'Asia/Dubai', 25.2048, 55.2708],
    ['riyadh', 'Riyadh', 'Asia/Riyadh', 24.7136, 46.6753],
    ['tel-aviv', 'Tel Aviv', 'Asia/Jerusalem', 32.0853, 34.7818],
    ['karachi', 'Karachi', 'Asia/Karachi', 24.8607, 67.0011],
    ['delhi', 'Delhi', 'Asia/Kolkata', 28.6139, 77.2090],
    ['mumbai', 'Mumbai', 'Asia/Kolkata', 19.0760, 72.8777],
    ['dhaka', 'Dhaka', 'Asia/Dhaka', 23.8103, 90.4125],
    ['bangkok', 'Bangkok', 'Asia/Bangkok', 13.7563, 100.5018],
    ['ho-chi-minh', 'Ho Chi Minh City', 'Asia/Ho_Chi_Minh', 10.8231, 106.6297],
    ['jakarta', 'Jakarta', 'Asia/Jakarta', -6.2088, 106.8456],
    ['singapore', 'Singapore', 'Asia/Singapore', 1.3521, 103.8198],
    ['kuala-lumpur', 'Kuala Lumpur', 'Asia/Kuala_Lumpur', 3.1390, 101.6869],
    ['manila', 'Manila', 'Asia/Manila', 14.5995, 120.9842],
    ['hong-kong', 'Hong Kong', 'Asia/Hong_Kong', 22.3193, 114.1694],
    ['taipei', 'Taipei', 'Asia/Taipei', 25.0330, 121.5654],
    ['shanghai', 'Shanghai', 'Asia/Shanghai', 31.2304, 121.4737],
    ['seoul', 'Seoul', 'Asia/Seoul', 37.5665, 126.9780],
    ['tokyo', 'Tokyo', 'Asia/Tokyo', 35.6762, 139.6503],
    ['sydney', 'Sydney', 'Australia/Sydney', -33.8688, 151.2093],
    ['melbourne', 'Melbourne', 'Australia/Melbourne', -37.8136, 144.9631],
    ['perth', 'Perth', 'Australia/Perth', -31.9505, 115.8605],
    ['auckland', 'Auckland', 'Pacific/Auckland', -36.8485, 174.7633],
    ['cairo', 'Cairo', 'Africa/Cairo', 30.0444, 31.2357],
    ['lagos', 'Lagos', 'Africa/Lagos', 6.5244, 3.3792],
    ['nairobi', 'Nairobi', 'Africa/Nairobi', -1.2921, 36.8219],
    ['johannesburg', 'Johannesburg', 'Africa/Johannesburg', -26.2041, 28.0473],
    ['casablanca', 'Casablanca', 'Africa/Casablanca', 33.5731, -7.5898]
].map(([id, label, timezone, latitude, longitude]) => ({ id, label, timezone, latitude, longitude }));

const LANGUAGES = [
    ['en-US', 'English (United States)'], ['en-GB', 'English (United Kingdom)'], ['en-AU', 'English (Australia)'],
    ['en-CA', 'English (Canada)'], ['en-IN', 'English (India)'], ['zh-CN', '中文 (简体)'], ['zh-TW', '中文 (繁體，台灣)'],
    ['zh-HK', '中文 (繁體，香港)'], ['ja-JP', '日本語'], ['ko-KR', '한국어'], ['fr-FR', 'Français (France)'],
    ['fr-CA', 'Français (Canada)'], ['de-DE', 'Deutsch (Deutschland)'], ['de-CH', 'Deutsch (Schweiz)'],
    ['es-ES', 'Español (España)'], ['es-MX', 'Español (México)'], ['es-AR', 'Español (Argentina)'],
    ['pt-BR', 'Português (Brasil)'], ['pt-PT', 'Português (Portugal)'], ['it-IT', 'Italiano'], ['nl-NL', 'Nederlands'],
    ['ru-RU', 'Русский'], ['uk-UA', 'Українська'], ['pl-PL', 'Polski'], ['cs-CZ', 'Čeština'], ['sv-SE', 'Svenska'],
    ['da-DK', 'Dansk'], ['nb-NO', 'Norsk bokmål'], ['fi-FI', 'Suomi'], ['tr-TR', 'Türkçe'], ['ar-SA', 'العربية (السعودية)'],
    ['ar-EG', 'العربية (مصر)'], ['he-IL', 'עברית'], ['hi-IN', 'हिन्दी'], ['bn-BD', 'বাংলা'], ['th-TH', 'ไทย'],
    ['vi-VN', 'Tiếng Việt'], ['id-ID', 'Bahasa Indonesia'], ['ms-MY', 'Bahasa Melayu'], ['fil-PH', 'Filipino'],
    ['el-GR', 'Ελληνικά'], ['hu-HU', 'Magyar'], ['ro-RO', 'Română'], ['bg-BG', 'Български'], ['fa-IR', 'فارسی']
].map(([code, label]) => ({ code, label }));

const COUNTRY_LOCALE = {
    US: 'en-US', GB: 'en-GB', AU: 'en-AU', CA: 'en-CA', IN: 'en-IN', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-HK',
    JP: 'ja-JP', KR: 'ko-KR', FR: 'fr-FR', DE: 'de-DE', CH: 'de-CH', ES: 'es-ES', MX: 'es-MX', AR: 'es-AR',
    BR: 'pt-BR', PT: 'pt-PT', IT: 'it-IT', NL: 'nl-NL', RU: 'ru-RU', UA: 'uk-UA', PL: 'pl-PL', CZ: 'cs-CZ',
    SE: 'sv-SE', DK: 'da-DK', NO: 'nb-NO', FI: 'fi-FI', TR: 'tr-TR', SA: 'ar-SA', EG: 'ar-EG', IL: 'he-IL',
    TH: 'th-TH', VN: 'vi-VN', ID: 'id-ID', MY: 'ms-MY', PH: 'fil-PH', GR: 'el-GR', HU: 'hu-HU', RO: 'ro-RO',
    BG: 'bg-BG', IR: 'fa-IR', BD: 'bn-BD'
};

const WEBGL = {
    nvidia: { label: 'NVIDIA GeForce RTX 3060', vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    intel: { label: 'Intel UHD Graphics 630', vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    amd: { label: 'AMD Radeon RX 6600', vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    apple: { label: 'Apple M1', vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)' }
};

const USER_AGENTS = {
    windows: {
        label: 'Windows 10 (Chrome)', platform: 'Win32', uaPlatform: 'Windows', platformVersion: '15.0.0', architecture: 'x86',
        string: (major) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
    },
    mac: {
        label: 'macOS (Chrome)', platform: 'MacIntel', uaPlatform: 'macOS', platformVersion: '14.5.0', architecture: 'arm',
        string: (major) => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
    },
    linux: {
        label: 'Linux (Chrome)', platform: 'Linux x86_64', uaPlatform: 'Linux', platformVersion: '6.5.0', architecture: 'x86',
        string: (major) => `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
    }
};

const CPU_CORES = [2, 4, 6, 8, 12, 16];
// Chrome never reports more than 8 GB for navigator.deviceMemory.
const MEMORY_GB = [2, 4, 8];

module.exports = { CITIES, LANGUAGES, COUNTRY_LOCALE, WEBGL, USER_AGENTS, CPU_CORES, MEMORY_GB };
