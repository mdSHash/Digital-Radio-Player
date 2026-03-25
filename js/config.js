/**
 * APPLICATION CONFIGURATION
 * Constants, API endpoints, and static data
 */

export const CONFIG = {
    RADIO_BROWSER_API: 'https://de1.api.radio-browser.info/json',
    RADIO_BROWSER_MIRRORS: [
        'https://de1.api.radio-browser.info/json',
        'https://nl1.api.radio-browser.info/json',
        'https://at1.api.radio-browser.info/json'
    ],
    STORAGE_KEY: 'egypt-radio-favorites',
    STORAGE_KEY_HISTORY: 'egypt-radio-history',
    STORAGE_KEY_TOTAL: 'egypt-radio-total-bytes',
    USER_AGENT: 'EgyptRadioStreamPlayer/1.0',
    DEFAULT_COUNTRY: 'EG',
    SCAN_TIMEOUT: 5000,
    SEARCH_DEBOUNCE: 300,
    DATA_UPDATE_INTERVAL: 1000,
    BANDWIDTH_HISTORY_LENGTH: 60
};

export const COUNTRY_FLAGS = {
    'EG': '🇪🇬', 'SA': '🇸🇦', 'AE': '🇦🇪', 'MA': '🇲🇦', 'JO': '🇯🇴',
    'LB': '🇱🇧', 'IQ': '🇮🇶', 'SY': '🇸🇾', 'YE': '🇾🇪', 'KW': '🇰🇼',
    'OM': '🇴🇲', 'QA': '🇶🇦', 'BH': '🇧🇭', 'PS': '🇵🇸', 'TN': '🇹🇳',
    'DZ': '🇩🇿', 'LY': '🇱🇾', 'SD': '🇸🇩', 'MR': '🇲🇷', 'SO': '🇸🇴',
    'DJ': '🇩🇯', 'KM': '🇰🇲', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
    'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸', 'TR': '🇹🇷', 'RU': '🇷🇺'
};

export const EGYPT_MASTER_DB = [
    {
        name: 'Om Kalthoum Radio',
        url: 'https://stream.zeno.fm/zsgrfxg71s8uv',
        frequency: 'Web Stream',
        genre: 'Classic',
        country: 'EG',
        bitrate: 128,
        codec: 'MP3'
    },
    {
        name: 'Nogoum FM',
        url: 'https://stream.radiojar.com/nogoumfm',
        frequency: '100.6 FM',
        genre: 'Music',
        country: 'EG'
    },
    {
        name: 'Nile FM',
        url: 'https://stream.radiojar.com/nilefm',
        frequency: '104.2 FM',
        genre: 'Music',
        country: 'EG'
    },
    {
        name: 'Radio Masr',
        url: 'https://radio.garden/api/ara/content/listen/acJLKP1I/channel.mp3',
        frequency: '88.7 FM',
        genre: 'News & Talk',
        country: 'EG'
    },
    {
        name: 'Mega FM',
        url: 'https://stream.radiojar.com/megafm',
        frequency: '92.7 FM',
        genre: 'Music',
        country: 'EG'
    }
];
