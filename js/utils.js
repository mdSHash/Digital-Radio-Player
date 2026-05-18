/**
 * UTILITY FUNCTIONS MODULE
 * 
 * Core utility functions used throughout the application
 * No dependencies - foundation module
 */

'use strict';

// DOM selector shortcuts
export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

// Country code to flag emoji mapping
export const COUNTRY_FLAGS = {
    'EG': '🇪🇬', 'SA': '🇸🇦', 'AE': '🇦🇪', 'MA': '🇲🇦', 'JO': '🇯🇴',
    'LB': '🇱🇧', 'IQ': '🇮🇶', 'SY': '🇸🇾', 'YE': '🇾🇪', 'KW': '🇰🇼',
    'OM': '🇴🇲', 'QA': '🇶🇦', 'BH': '🇧🇭', 'PS': '🇵🇸', 'TN': '🇹🇳',
    'DZ': '🇩🇿', 'LY': '🇱🇾', 'SD': '🇸🇩', 'MR': '🇲🇷', 'SO': '🇸🇴',
    'DJ': '🇩🇯', 'KM': '🇰🇲', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
    'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸', 'TR': '🇹🇷', 'RU': '🇷🇺'
};

// Egyptian radio stations master database
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

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url) {
    if (!url) return '';
    const urlStr = String(url).trim().toLowerCase();
    if (urlStr.startsWith('javascript:') || urlStr.startsWith('data:') || urlStr.startsWith('vbscript:')) {
        return '';
    }
    return String(url).trim();
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(value, min = 0, max = Infinity) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
}

/**
 * Validate and sanitize text input
 */
export function sanitizeText(text, maxLength = 1000) {
    if (!text) return '';
    return String(text).trim().slice(0, maxLength);
}

/**
 * Show alert message
 */
export function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.setAttribute('role', 'alert');
    return alert;
}

/**
 * Debounce function for search input with cleanup
 */
export function debounce(func, wait, key = 'default', debounceTimeouts) {
    return function executedFunction(...args) {
        const existingTimeout = debounceTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        
        const timeout = setTimeout(() => {
            debounceTimeouts.delete(key);
            func(...args);
        }, wait);
        
        debounceTimeouts.set(key, timeout);
    };
}

/**
 * Extract FM frequency from station name
 */
export function extractFrequency(stationName) {
    if (!stationName) return null;
    const match = stationName.match(/(\d{2,3}\.\d)\s*FM/i);
    return match ? `${match[1]} FM` : null;
}

/**
 * Normalize stream URL for duplicate detection
 */
export function normalizeStreamUrl(url) {
    if (!url) return '';
    
    // Remove protocol
    let normalized = url.toLowerCase().replace(/^https?:\/\//, '');
    
    // Remove query parameters
    normalized = normalized.split('?')[0];
    
    // Remove common CDN prefixes (n12, n0c, n0e, etc.)
    normalized = normalized.replace(/^n\d+[a-z]?\./, '');
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/$/, '');
    
    return normalized;
}

/**
 * Categorize station genre based on tags
 */
export function categorizeGenre(tags) {
    if (!tags) return 'General';
    const tagLower = tags.toLowerCase();
    
    if (tagLower.includes('news') || tagLower.includes('talk')) return 'News & Talk';
    if (tagLower.includes('music') || tagLower.includes('pop')) return 'Music';
    if (tagLower.includes('sport')) return 'Sports';
    if (tagLower.includes('classic')) return 'Classic';
    if (tagLower.includes('religious') || tagLower.includes('quran')) return 'Religious';
    
    return 'General';
}

/**
 * Sanitize station data
 */
export function sanitizeStation(station) {
    return {
        name: station.name || 'Unknown Station',
        url: station.url_resolved || station.url || '',
        frequency: station.frequency || extractFrequency(station.name) || 'Web Stream',
        genre: station.genre || categorizeGenre(station.tags || ''),
        bitrate: station.bitrate || 128,
        codec: station.codec || 'MP3',
        country: station.countrycode || station.country || 'EG',
        state: station.state || '',
        language: station.language || ''
    };
}

/**
 * Get country flag emoji
 */
export function getCountryFlag(countryCode) {
    return COUNTRY_FLAGS[countryCode?.toUpperCase()] || '🌍';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(3)} GB`;
}

/**
 * Format seconds to HMS
 */
export function formatTime(seconds) {
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
    return `${sec}s`;
}

/**
 * Calculate bytes from bitrate and time
 */
export function calculateBytes(seconds, kbps) {
    return seconds * (kbps * 1000 / 8);
}

// Made with Bob
