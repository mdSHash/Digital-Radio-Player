/**
 * EGYPT RADIO STREAM PLAYER - MAIN APPLICATION
 * 
 * A production-ready web application for streaming Egyptian radio stations
 * Features: Favorites management, Station scanner, Multi-criteria search, 
 * Live audio player with Web Audio API visualization
 * 
 * @author Egypt Radio Stream
 * @version 1.0.0
 */

'use strict';

// ============================================
// APPLICATION STATE MANAGEMENT
// ============================================

const AppState = {
    favorites: [],
    currentStation: null,
    audioContext: null,
    analyser: null,
    audioSource: null,
    isPlaying: false,
    isMuted: false,
    currentVolume: 0.8,
    // Data monitoring
    sessionStartTime: null,
    sessionBytes: 0,
    totalBytes: 0,
    currentBitrate: 128,
    listeningHistory: [],
    bandwidthData: [],
    lastUpdateTime: null,
    dataMonitorInterval: null,
    bandwidthCanvas: null,
    bandwidthCtx: null,
    // Sleep timer
    sleepTimerEnd: null,
    sleepTimerInterval: null,
    // Data threshold
    dataThreshold: null,
    dataThresholdAction: 'alert',
    dataThresholdReached: false
};

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CONFIG = {
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

// Country code to flag emoji mapping
const COUNTRY_FLAGS = {
    'EG': '🇪🇬', 'SA': '🇸🇦', 'AE': '🇦🇪', 'MA': '🇲🇦', 'JO': '🇯🇴',
    'LB': '🇱🇧', 'IQ': '🇮🇶', 'SY': '🇸🇾', 'YE': '🇾🇪', 'KW': '🇰🇼',
    'OM': '🇴🇲', 'QA': '🇶🇦', 'BH': '🇧🇭', 'PS': '🇵🇸', 'TN': '🇹🇳',
    'DZ': '🇩🇿', 'LY': '🇱🇾', 'SD': '🇸🇩', 'MR': '🇲🇷', 'SO': '🇸🇴',
    'DJ': '🇩🇯', 'KM': '🇰🇲', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
    'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸', 'TR': '🇹🇷', 'RU': '🇷🇺'
};

// Egyptian radio stations master database
const EGYPT_MASTER_DB = [
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * DOM selector shortcuts
 */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.setAttribute('role', 'alert');
    return alert;
}

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Extract FM frequency from station name
 */
function extractFrequency(stationName) {
    if (!stationName) return null;
    const match = stationName.match(/(\d{2,3}\.\d)\s*FM/i);
    return match ? `${match[1]} FM` : null;
}

/**
 * Normalize stream URL for duplicate detection
 */
function normalizeStreamUrl(url) {
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
function categorizeGenre(tags) {
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
function sanitizeStation(station) {
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
function getCountryFlag(countryCode) {
    return COUNTRY_FLAGS[countryCode?.toUpperCase()] || '🌍';
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(3)} GB`;
}

/**
 * Format seconds to HMS
 */
function formatTime(seconds) {
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
function calculateBytes(seconds, kbps) {
    return seconds * (kbps * 1000 / 8);
}
// ============================================
// DATA MONITORING & BANDWIDTH TRACKING
// ============================================

/**
 * Load listening history from localStorage
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY_HISTORY);
        AppState.listeningHistory = stored ? JSON.parse(stored) : [];
        const totalStored = localStorage.getItem(CONFIG.STORAGE_KEY_TOTAL);
        AppState.totalBytes = totalStored ? parseInt(totalStored) : 0;
    } catch (error) {
        console.error('Error loading history:', error);
        AppState.listeningHistory = [];
        AppState.totalBytes = 0;
    }
}

/**
 * Save listening history to localStorage
 */
function saveHistory() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(AppState.listeningHistory));
        localStorage.setItem(CONFIG.STORAGE_KEY_TOTAL, AppState.totalBytes.toString());
    } catch (error) {
        console.error('Error saving history:', error);
    }
}

/**
 * Start data monitoring
 */
function startDataMonitoring() {
    if (AppState.dataMonitorInterval) {
        clearInterval(AppState.dataMonitorInterval);
    }
    
    AppState.sessionStartTime = Date.now();
    AppState.sessionBytes = 0;
    AppState.lastUpdateTime = Date.now();
    AppState.bandwidthData = [];
    
    // Initialize bandwidth canvas
    initBandwidthCanvas();
    
    // Update every second
    AppState.dataMonitorInterval = setInterval(updateDataDashboard, CONFIG.DATA_UPDATE_INTERVAL);
    
    // Update UI immediately
    updateDataDashboard();
}

/**
 * Stop data monitoring and save session
 */
function stopDataMonitoring() {
    if (AppState.dataMonitorInterval) {
        clearInterval(AppState.dataMonitorInterval);
        AppState.dataMonitorInterval = null;
    }
    
    // Save session to history if it was longer than 2 seconds
    if (AppState.sessionStartTime && AppState.sessionBytes > 0) {
        const duration = (Date.now() - AppState.sessionStartTime) / 1000;
        if (duration > 2) {
            const session = {
                name: AppState.currentStation?.name || 'Unknown',
                duration: duration,
                bytes: AppState.sessionBytes,
                timestamp: new Date().toISOString(),
                stoppedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };
            
            AppState.listeningHistory.unshift(session);
            AppState.listeningHistory = AppState.listeningHistory.slice(0, 10); // Keep last 10
            AppState.totalBytes += AppState.sessionBytes;
            saveHistory();
            renderHistory();
        }
    }
    
    AppState.sessionStartTime = null;
    AppState.sessionBytes = 0;
    AppState.bandwidthData = [];
    updateDataDashboard();
}

/**
 * Update data dashboard display
 */
function updateDataDashboard() {
    const now = Date.now();
    
    if (!AppState.sessionStartTime) {
        // Idle state
        $('#stream-status').classList.remove('live');
        $('#live-badge').textContent = 'IDLE';
        $('#live-badge').classList.remove('active');
        $('#session-data').textContent = '0 B';
        $('#listening-time').textContent = '0s';
        $('#total-data').textContent = formatBytes(AppState.totalBytes);
        return;
    }
    
    // Calculate elapsed time
    const elapsedSeconds = (now - AppState.sessionStartTime) / 1000;
    
    // Calculate bytes consumed
    const bytesThisSecond = calculateBytes(1, AppState.currentBitrate);
    AppState.sessionBytes += bytesThisSecond;
    
    // Update bandwidth data for graph
    AppState.bandwidthData.push({
        time: now,
        bytesPerSecond: bytesThisSecond
    });
    
    // Keep only last 60 seconds
    if (AppState.bandwidthData.length > CONFIG.BANDWIDTH_HISTORY_LENGTH) {
        AppState.bandwidthData.shift();
    }
    
    // Calculate metrics
    const sessionMB = AppState.sessionBytes / (1024 * 1024);
    const totalMB = (AppState.totalBytes + AppState.sessionBytes) / (1024 * 1024);
    const hourMB = calculateBytes(3600, AppState.currentBitrate) / (1024 * 1024);
    const dayMB = hourMB * 24;
    const perMinKB = calculateBytes(60, AppState.currentBitrate) / 1024;
    
    // Update status indicators
    $('#stream-status').classList.add('live');
    $('#live-badge').textContent = 'LIVE';
    $('#live-badge').classList.add('active');
    
    // Update data cells
    $('#session-data').textContent = formatBytes(AppState.sessionBytes);
    $('#session-data').className = 'data-value' + (sessionMB < 50 ? '' : sessionMB < 150 ? ' warn' : ' alert');
    
    $('#listening-time').textContent = formatTime(elapsedSeconds);
    
    $('#total-data').textContent = formatBytes(AppState.totalBytes + AppState.sessionBytes);
    $('#total-data').className = 'data-value' + (totalMB < 50 ? '' : totalMB < 150 ? ' warn' : ' alert');
    
    // Update progress bar
    const progressPercent = Math.min(100, (sessionMB / hourMB) * 100);
    const progressBar = $('#data-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.className = 'progress-bar-fill' + (sessionMB < 50 ? '' : sessionMB < 150 ? ' warn' : ' alert');
    
    // Update progress labels
    $('#progress-text').textContent = `${sessionMB.toFixed(1)} MB used this session`;
    $('#rate-text').textContent = `≈ ${hourMB.toFixed(0)} MB/hr at ${AppState.currentBitrate} kbps`;
    
    // Update rate pills
    $('#bitrate-display').textContent = `${AppState.currentBitrate} kbps`;
    $('#per-min-display').textContent = `${perMinKB.toFixed(0)} KB/min`;
    $('#per-hour-display').textContent = `${hourMB.toFixed(0)} MB/hr`;
    $('#per-day-display').textContent = `${dayMB.toFixed(0)} MB/day`;
    
    // Update dot colors
    $('#per-hour-dot').className = 'dot ' + (hourMB > 50 ? 'dot-yellow' : 'dot-green');
    $('#per-day-dot').className = 'dot ' + (dayMB > 500 ? 'dot-yellow' : 'dot-green');
    
    // Update bandwidth graph
    drawBandwidthGraph();
}

/**
 * Initialize bandwidth canvas
 */
function initBandwidthCanvas() {
    const canvas = $('#bandwidth-canvas');
    if (!canvas) return;
    
    AppState.bandwidthCanvas = canvas;
    AppState.bandwidthCtx = canvas.getContext('2d');
    
    // Set canvas size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 24;
    canvas.height = 80;
}

/**
 * Draw bandwidth graph
 */
function drawBandwidthGraph() {
    if (!AppState.bandwidthCtx || !AppState.bandwidthCanvas) return;
    
    const ctx = AppState.bandwidthCtx;
    const canvas = AppState.bandwidthCanvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (AppState.bandwidthData.length < 2) return;
    
    // Find max value for scaling
    const maxBytes = Math.max(...AppState.bandwidthData.map(d => d.bytesPerSecond));
    const scale = maxBytes > 0 ? (height - 10) / maxBytes : 1;
    
    // Draw grid lines
    ctx.strokeStyle = '#1e1e30';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw bandwidth line
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const pointSpacing = width / (CONFIG.BANDWIDTH_HISTORY_LENGTH - 1);
    
    AppState.bandwidthData.forEach((point, index) => {
        const x = index * pointSpacing;
        const y = height - (point.bytesPerSecond * scale) - 5;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw fill gradient
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

/**
 * Render listening history
 */
function renderHistory() {
    const historyList = $('#history-list');
    const historyFooter = $('#history-footer');
    const clearBtn = $('#clear-history-btn');
    
    if (!historyList) return;
    
    if (AppState.listeningHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state-small">No listening history yet</div>';
        historyFooter.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
    }
    
    historyList.innerHTML = AppState.listeningHistory.map(session => `
        <div class="history-row">
            <span class="history-name">${session.name}</span>
            <span class="history-time">${formatTime(session.duration)} · ${session.stoppedAt}</span>
            <span class="history-data">${formatBytes(session.bytes)}</span>
        </div>
    `).join('');
    
    // Update footer
    const totalHistoryBytes = AppState.listeningHistory.reduce((sum, s) => sum + s.bytes, 0);
    $('#history-total').textContent = formatBytes(totalHistoryBytes);
    historyFooter.style.display = 'flex';
    clearBtn.style.display = 'block';
}

/**
 * Clear listening history
 */
function clearHistory() {
    if (confirm('Clear all listening history? This cannot be undone.')) {
        AppState.listeningHistory = [];
        AppState.totalBytes = 0;
        saveHistory();
        renderHistory();
        updateDataDashboard();
    }
}


// ============================================
// LOCAL STORAGE MANAGEMENT
// ============================================

/**
 * Load favorites from localStorage
 */
function loadFavorites() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        AppState.favorites = stored ? JSON.parse(stored) : [];
        console.log('Favorites loaded:', AppState.favorites.length);
    } catch (error) {
        console.error('Error loading favorites:', error);
        AppState.favorites = [];
    }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(AppState.favorites));
        console.log('Favorites saved:', AppState.favorites.length);
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

/**
 * Add station to favorites
 */
function addToFavorites(station) {
    const exists = AppState.favorites.some(fav => fav.url === station.url);
    if (!exists) {
        AppState.favorites.push(sanitizeStation(station));
        saveFavorites();
        renderFavorites();
        return true;
    }
    return false;
}

/**
 * Remove station from favorites
 */
function removeFromFavorites(stationUrl) {
    AppState.favorites = AppState.favorites.filter(fav => fav.url !== stationUrl);
    saveFavorites();
    renderFavorites();
}

/**
 * Check if station is in favorites
 */
function isFavorite(stationUrl) {
    return AppState.favorites.some(fav => fav.url === stationUrl);
}

// ============================================
// TAB NAVIGATION
// ============================================

/**
 * Show specific tab
 */
function showTab(tabName) {
    // Update tab buttons
    $$('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    
    // Update tab content
    $$('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const activeBtn = $(`.tab-btn[data-tab="${tabName}"]`);
    const activeContent = $(`#tab-${tabName}`);

    if (activeBtn && activeContent) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-selected', 'true');
        activeContent.classList.add('active');
    }
}

// ============================================
// STATION CARD RENDERING
// ============================================

/**
 * Create station card element
 */
function createStationCard(station, showFavoriteBtn = true) {
    const isCurrentlyPlaying = AppState.currentStation && AppState.currentStation.url === station.url;
    const isFav = isFavorite(station.url);
    const countryFlag = getCountryFlag(station.country);
    const locationText = station.state ? `${station.state}, ${station.country}` : station.country;

    const card = document.createElement('div');
    card.className = `station-card ${isCurrentlyPlaying ? 'playing' : ''}`;

    card.innerHTML = `
        <div class="station-name">
            ${countryFlag} ${station.name}
            ${station.country && station.country !== 'EG' ? `<span class="location-badge">${locationText}</span>` : ''}
        </div>
        <div class="station-meta">
            <span class="freq">${station.frequency || 'Web Stream'}</span>
            ${station.genre ? `<span class="genre">${station.genre}</span>` : ''}
            ${station.bitrate ? `<span>${station.bitrate} kbps</span>` : ''}
            ${station.codec ? `<span>${station.codec}</span>` : ''}
        </div>
        ${isCurrentlyPlaying ? '<div class="station-playing-badge"><span class="blink-dot"></span>LIVE</div>' : ''}
        <div class="btn-group">
            <button class="btn play-btn" data-url="${station.url}" data-name="${station.name}" data-bitrate="${station.bitrate || 128}">
                ${isCurrentlyPlaying ? '▶ PLAYING' : '▶ PLAY'}
            </button>
            ${showFavoriteBtn ? `
                <button class="btn ${isFav ? 'btn-success' : ''} favorite-btn">
                    ${isFav ? '✓ FAVORITED' : '♥ ADD TO FAVORITES'}
                </button>
            ` : `
                <button class="btn btn-danger remove-btn" data-url="${station.url}">
                    🗑 REMOVE
                </button>
            `}
        </div>
    `;

    // Store station data on the button element
    if (showFavoriteBtn) {
        const favBtn = card.querySelector('.favorite-btn');
        favBtn._stationData = station;
    }

    return card;
}

/**
 * Attach event listeners to station cards
 */
function attachCardEventListeners(container) {
    // Play button listeners
    container.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Get the full station data from the card
            const card = btn.closest('.station-card');
            const stationName = card.querySelector('.station-name').textContent.trim();
            const countryMatch = stationName.match(/^(🇪🇬|🇸🇦|🇦🇪|🇲🇦|🇯🇴|🇱🇧|🇮🇶|🇸🇾|🇾🇪|🇰🇼|🇴🇲|🇶🇦|🇧🇭|🇵🇸|🇹🇳|🇩🇿|🇱🇾|🇸🇩|🇲🇷|🇸🇴|🇩🇯|🇰🇲|🇺🇸|🇬🇧|🇫🇷|🇩🇪|🇮🇹|🇪🇸|🇹🇷|🇷🇺|🌍)/);
            
            // Find country code from flag
            let countryCode = 'EG';
            if (countryMatch) {
                const flag = countryMatch[1];
                for (const [code, emoji] of Object.entries(COUNTRY_FLAGS)) {
                    if (emoji === flag) {
                        countryCode = code;
                        break;
                    }
                }
            }
            
            playStation({
                url: btn.dataset.url,
                name: btn.dataset.name,
                bitrate: parseInt(btn.dataset.bitrate) || 128,
                country: countryCode
            });
        });
    });

    // Favorite button listeners
    container.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                const station = btn._stationData;
                if (station && addToFavorites(station)) {
                    btn.textContent = '✓ FAVORITED';
                    btn.classList.add('btn-success');
                    console.log('Added to favorites:', station.name);
                }
            } catch (error) {
                console.error('Error adding to favorites:', error);
            }
        });
    });

    // Remove button listeners
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromFavorites(btn.dataset.url);
        });
    });
}

// ============================================
// FAVORITES RENDERING
// ============================================

/**
 * Render favorites list
 */
function renderFavorites() {
    const container = $('#favorites-list');
    container.innerHTML = '';

    if (AppState.favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                📻<br>
                No favorites yet<br>
                Use the scanner or search to discover stations<br>
                Click "ADD TO FAVORITES" to save them here
            </div>
        `;
        return;
    }

    // Group by genre
    const grouped = {};
    AppState.favorites.forEach(station => {
        const genre = station.genre || 'General';
        if (!grouped[genre]) grouped[genre] = [];
        grouped[genre].push(station);
    });

    // Render each genre group
    Object.keys(grouped).sort().forEach(genre => {
        const label = document.createElement('div');
        label.className = 'sub-section-label';
        label.textContent = `${genre} (${grouped[genre].length})`;
        container.appendChild(label);

        grouped[genre].forEach(station => {
            const card = createStationCard(station, false);
            container.appendChild(card);
        });
    });

    attachCardEventListeners(container);
}

// ============================================
// AUDIO PLAYER & VISUALIZATION
// ============================================

/**
 * Initialize audio visualizer bars
 */
function initAudioVisualizer() {
    const visualizer = $('#visualizer');
    visualizer.innerHTML = '';
    
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.animationDelay = `${-Math.random() * 1.2}s`;
        visualizer.appendChild(bar);
    }
}

/**
 * Initialize Web Audio API for advanced visualization
 * DISABLED: Causes audio output issues, using CSS-only visualization instead
 */
function initWebAudioAPI() {
    // Disabled to prevent audio playback issues
    console.log('Using CSS-only visualization for better compatibility');
}

/**
 * Play radio station
 */
function playStation(station) {
    // Stop previous session if any
    if (AppState.isPlaying) {
        stopDataMonitoring();
    }
    
    AppState.currentStation = station;
    AppState.currentBitrate = station.bitrate || 128;
    AppState.isPlaying = true; // Set immediately so FABs appear
    
    const audio = $('#audio-player');
    const visualizer = $('#visualizer');

    // Update UI with correct country flag
    const countryCode = station.country || station.countrycode || 'EG';
    $('#player-station-name').textContent = `${getCountryFlag(countryCode)} ${station.name}`;
    $('#player-station-url').textContent = station.url;
    $('#stream-url-code').textContent = station.url;
    
    // Show inline player
    $('#inline-player').classList.remove('hidden');
    
    // Update FAB visibility (player and timer FABs will appear)
    updateFABVisibility();

    // Set audio source and play
    audio.src = station.url;
    audio.volume = AppState.currentVolume;
    audio.load();
    
    // Play with better error handling
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Playing:', station.name);
            // Start data monitoring when playback actually starts
            startDataMonitoring();
        }).catch(error => {
            console.error('Playback error:', error);
            alert('Failed to play station. The stream may be offline or blocked by CORS policy.\n\nTry another station or check your internet connection.');
        });
    }

    // Audio event listeners
    audio.onplay = () => {
        visualizer.classList.add('playing');
        AppState.isPlaying = true;
        console.log('Playback started');
        if (!AppState.dataMonitorInterval) {
            startDataMonitoring();
        }
    };

    audio.onpause = () => {
        visualizer.classList.remove('playing');
        AppState.isPlaying = false;
        stopDataMonitoring();
    };

    audio.onerror = () => {
        visualizer.classList.remove('playing');
        AppState.isPlaying = false;
        stopDataMonitoring();
        console.error('Stream error for:', station.url);
        alert('Stream failed to load. The station may be offline.');
    };

    audio.onwaiting = () => {
        console.log('Buffering...');
    };

    audio.oncanplay = () => {
        console.log('Ready to play');
    };
    
    // Update favorites display
    renderFavorites();
}

/**
 * Stop playback
 */
function stopPlayback() {
    const audio = $('#audio-player');
    
    // Stop data monitoring and save session
    stopDataMonitoring();
    
    // Clear sleep timer
    if (AppState.sleepTimerInterval) {
        clearInterval(AppState.sleepTimerInterval);
        AppState.sleepTimerInterval = null;
        AppState.sleepTimerEnd = null;
        $('#sleep-timer-countdown').classList.add('hidden');
        // Reset active button
        document.querySelectorAll('.btn-sleep-preset').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.minutes === '0') {
                btn.classList.add('active');
            }
        });
    }
    
    audio.pause();
    audio.src = '';
    AppState.currentStation = null;
    AppState.isPlaying = false;

    $('#visualizer').classList.remove('playing');
    
    // Update FAB visibility and close panel if open
    updateFABVisibility();
    closeSidePanel();

    renderFavorites();
    console.log('Playback stopped');
}

/**
 * Update volume
 */
function updateVolume(value) {
    const audio = $('#audio-player');
    const volumeValue = $('#volume-value');
    const muteBtn = $('#mute-btn');
    
    AppState.currentVolume = value / 100;
    audio.volume = AppState.currentVolume;
    volumeValue.textContent = `${value}%`;
}

// ============================================
// DATA THRESHOLD MANAGEMENT
// ============================================

/**
 * Set data usage threshold
 */
function setDataThreshold() {
    console.log('setDataThreshold called');
    
    const thresholdInput = $('#data-threshold-input');
    const actionSelect = $('#threshold-action');
    const statusDiv = $('#threshold-status');
    const progressDiv = $('#threshold-progress');
    const setBtn = $('#set-threshold-btn');
    const clearBtn = $('#clear-threshold-btn');
    
    if (!thresholdInput || !actionSelect || !statusDiv || !progressDiv) {
        console.error('Missing threshold elements:', {
            thresholdInput: !!thresholdInput,
            actionSelect: !!actionSelect,
            statusDiv: !!statusDiv,
            progressDiv: !!progressDiv
        });
        alert('Error: Threshold controls not found. Please refresh the page.');
        return;
    }
    
    const statusText = statusDiv.querySelector('.threshold-status-text');
    if (!statusText) {
        console.error('Status text element not found');
        return;
    }
    
    const thresholdMB = parseInt(thresholdInput.value);
    console.log('Threshold value:', thresholdMB);
    
    if (!thresholdMB || thresholdMB < 1) {
        alert('Please enter a valid data limit (minimum 1 MB)');
        return;
    }
    
    AppState.dataThreshold = thresholdMB * 1024 * 1024; // Convert to bytes
    AppState.dataThresholdAction = actionSelect.value;
    AppState.dataThresholdReached = false;
    
    console.log('Threshold set:', {
        bytes: AppState.dataThreshold,
        MB: thresholdMB,
        action: AppState.dataThresholdAction
    });
    
    // Show status
    statusDiv.classList.remove('hidden');
    statusText.textContent = `✅ Limit set at ${thresholdMB} MB - ${actionSelect.value === 'stop' ? 'Will auto-stop stream' : 'Will show alert'}`;
    
    // Show and initialize progress bar
    progressDiv.classList.remove('hidden');
    const limitSpan = $('#threshold-limit');
    if (limitSpan) {
        limitSpan.textContent = `${thresholdMB} MB`;
    }
    updateThresholdProgress();
    
    // Toggle buttons
    if (setBtn) setBtn.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'inline-block';
    
    console.log('Data threshold set successfully');
}

/**
 * Clear data usage threshold
 */
function clearDataThreshold() {
    AppState.dataThreshold = null;
    AppState.dataThresholdAction = 'alert';
    AppState.dataThresholdReached = false;
    
    const statusDiv = $('#threshold-status');
    const progressDiv = $('#threshold-progress');
    const setBtn = $('#set-threshold-btn');
    const clearBtn = $('#clear-threshold-btn');
    
    statusDiv.classList.add('hidden');
    progressDiv.classList.add('hidden');
    setBtn.style.display = 'inline-block';
    clearBtn.style.display = 'none';
    
    console.log('Data threshold cleared');
}

/**
 * Update threshold progress display
 */
function updateThresholdProgress() {
    if (!AppState.dataThreshold) {
        return;
    }
    
    const totalBytes = AppState.totalBytes + AppState.sessionBytes;
    const thresholdMB = AppState.dataThreshold / (1024 * 1024);
    const usedMB = totalBytes / (1024 * 1024);
    const remainingMB = Math.max(0, thresholdMB - usedMB);
    const percentage = Math.min(100, (usedMB / thresholdMB) * 100);
    
    // Update progress bar
    $('#threshold-progress-fill').style.width = `${percentage}%`;
    
    // Update text
    $('#threshold-used').textContent = `${usedMB.toFixed(1)} MB`;
    $('#threshold-remaining').textContent = `(${remainingMB.toFixed(1)} MB remaining)`;
    
    // Change color based on usage
    const progressFill = $('#threshold-progress-fill');
    if (percentage >= 90) {
        progressFill.style.background = 'var(--accent-red)';
    } else if (percentage >= 70) {
        progressFill.style.background = 'var(--accent-orange)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, var(--accent-green) 0%, var(--accent-orange) 70%, var(--accent-red) 100%)';
    }
}

/**
 * Check if data threshold has been reached
 */
function checkDataThreshold() {
    if (!AppState.dataThreshold) {
        return;
    }
    
    // Update progress display
    updateThresholdProgress();
    
    if (AppState.dataThresholdReached || !AppState.isPlaying) {
        return;
    }
    
    const totalBytes = AppState.totalBytes + AppState.sessionBytes;
    
    if (totalBytes >= AppState.dataThreshold) {
        AppState.dataThresholdReached = true;
        
        const thresholdMB = (AppState.dataThreshold / (1024 * 1024)).toFixed(0);
        
        if (AppState.dataThresholdAction === 'stop') {
            // Auto-stop stream
            stopPlayback();
            alert(`⚠️ DATA LIMIT REACHED!\n\nYour ${thresholdMB} MB data limit has been reached.\nStream has been automatically stopped to save data.`);
        } else {
            // Alert only
            alert(`⚠️ DATA LIMIT REACHED!\n\nYou have used ${thresholdMB} MB of data.\nConsider stopping the stream to save data.`);
        }
        
        // Update status
        const statusDiv = $('#threshold-status');
        const statusText = statusDiv.querySelector('.threshold-status-text');
        statusText.textContent = `🛑 Limit reached! Used ${thresholdMB} MB`;
    }
}

/**
 * Toggle mute
 */
function toggleMute() {
    const audio = $('#audio-player');
    const volumeSlider = $('#volume-slider');
    const muteBtn = $('#mute-btn');
    
    if (AppState.isMuted) {
        // Currently muted, unmute
        AppState.isMuted = false;
        const targetVolume = AppState.currentVolume || 0.8;
        audio.volume = targetVolume;
        volumeSlider.value = targetVolume * 100;
        $('#volume-value').textContent = `${Math.round(targetVolume * 100)}%`;
        muteBtn.textContent = targetVolume < 0.5 ? '🔉' : '🔊';
    } else {
        // Currently unmuted, mute
        AppState.isMuted = true;
        audio.volume = 0;
        volumeSlider.value = 0;
        $('#volume-value').textContent = '0%';
        muteBtn.textContent = '🔇';
    }
}

// ============================================
// SLEEP TIMER FUNCTIONALITY
// ============================================

/**
 * Set sleep timer
 */
function setSleepTimer(minutes) {
    // Clear existing timer
    if (AppState.sleepTimerInterval) {
        clearInterval(AppState.sleepTimerInterval);
        AppState.sleepTimerInterval = null;
    }
    
    // Clear active state from all preset buttons
    $$('.btn-sleep-preset').forEach(btn => btn.classList.remove('active'));
    
    const timerBadge = $('#timer-badge');
    
    if (minutes === 0) {
        // Turn off timer
        AppState.sleepTimerEnd = null;
        $('#sleep-timer-countdown').classList.add('hidden');
        $('[data-minutes="0"]').classList.add('active');
        
        // Hide badge
        if (timerBadge) {
            timerBadge.classList.add('hidden');
        }
        
        return;
    }
    
    // Set new timer
    AppState.sleepTimerEnd = Date.now() + (minutes * 60 * 1000);
    $('#sleep-timer-countdown').classList.remove('hidden');
    
    // Show badge
    if (timerBadge) {
        timerBadge.classList.remove('hidden');
    }
    
    // Mark active preset button if it exists
    const presetBtn = $(`[data-minutes="${minutes}"]`);
    if (presetBtn) {
        presetBtn.classList.add('active');
    }
    
    // Update countdown every second
    AppState.sleepTimerInterval = setInterval(updateSleepTimerCountdown, 1000);
    updateSleepTimerCountdown();
}

/**
 * Update sleep timer countdown display
 */
function updateSleepTimerCountdown() {
    if (!AppState.sleepTimerEnd) {
        return;
    }
    
    const remaining = AppState.sleepTimerEnd - Date.now();
    
    if (remaining <= 0) {
        // Timer expired - stop playback
        stopPlayback();
        setSleepTimer(0);
        return;
    }
    
    // Format remaining time
    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Update countdown text in panel
    const countdownText = $('#sleep-countdown-text');
    if (countdownText) {
        countdownText.textContent = `${minutes}m ${seconds}s`;
    }
    
    // Update badge on FAB button
    const timerBadge = $('#timer-badge');
    if (timerBadge) {
        timerBadge.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// ============================================
// SIDE PANEL MANAGEMENT
// ============================================

let currentPanelContent = null;

/**
 * Open side panel with specific content
 */
function openSidePanel(contentType) {
    const sidePanel = $('#side-panel');
    const panelBody = $('#panel-body');
    const fabPlayer = $('#fab-player');
    const fabData = $('#fab-data');
    const fabTimer = $('#fab-timer');
    
    // Get the content element
    let contentElement;
    if (contentType === 'player') {
        contentElement = $('#inline-player');
        fabPlayer.classList.add('fab-active');
        fabData.classList.remove('fab-active');
        fabTimer.classList.remove('fab-active');
    } else if (contentType === 'data') {
        contentElement = $('#data-dashboard');
        fabData.classList.add('fab-active');
        fabPlayer.classList.remove('fab-active');
        fabTimer.classList.remove('fab-active');
    } else if (contentType === 'timer') {
        contentElement = $('#sleep-timer-panel');
        fabTimer.classList.add('fab-active');
        fabPlayer.classList.remove('fab-active');
        fabData.classList.remove('fab-active');
    }
    
    if (!contentElement) {
        return;
    }
    
    // Store current content reference
    currentPanelContent = {
        element: contentElement,
        originalParent: contentElement.parentElement,
        originalNextSibling: contentElement.nextElementSibling
    };
    
    // Move content to panel
    panelBody.innerHTML = '';
    panelBody.appendChild(contentElement);
    
    // Force display
    contentElement.style.display = 'block';
    contentElement.style.visibility = 'visible';
    contentElement.style.opacity = '1';
    contentElement.classList.remove('hidden');
    
    // Show panel
    sidePanel.classList.add('active');
}

/**
 * Close side panel and restore content
 */
function closeSidePanel() {
    const sidePanel = $('#side-panel');
    const fabPlayer = $('#fab-player');
    const fabData = $('#fab-data');
    const fabTimer = $('#fab-timer');
    
    // Remove active state from all FABs
    fabPlayer.classList.remove('fab-active');
    fabData.classList.remove('fab-active');
    fabTimer.classList.remove('fab-active');
    
    // Restore content to original position
    if (currentPanelContent) {
        const { element, originalParent, originalNextSibling } = currentPanelContent;
        
        if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
            originalParent.insertBefore(element, originalNextSibling);
        } else {
            originalParent.appendChild(element);
        }
        
        // Content will be hidden by CSS rules automatically
        currentPanelContent = null;
    }
    
    // Hide panel
    sidePanel.classList.remove('active');
}

/**
 * Update FAB visibility based on app state
 */
function updateFABVisibility() {
    const fabPlayer = $('#fab-player');
    const fabTimer = $('#fab-timer');
    
    console.log('updateFABVisibility called. isPlaying:', AppState.isPlaying);
    console.log('fabPlayer element:', fabPlayer);
    console.log('fabTimer element:', fabTimer);
    
    if (AppState.isPlaying) {
        console.log('Showing player and timer FABs');
        if (fabPlayer) fabPlayer.classList.remove('fab-hidden');
        if (fabTimer) fabTimer.classList.remove('fab-hidden');
    } else {
        console.log('Hiding player and timer FABs');
        if (fabPlayer) fabPlayer.classList.add('fab-hidden');
        if (fabTimer) fabTimer.classList.add('fab-hidden');
    }
}


// ============================================
// STATION SCANNER
// ============================================

/**
 * Scan for radio stations
 */
async function scanStations() {
    const country = $('#scan-country').value;
    const limit = parseInt($('#scan-limit').value) || 20;
    const progressContainer = $('#scan-progress');
    const progressFill = $('#scan-progress-fill');
    const statusText = $('#scan-status');
    const resultsContainer = $('#scan-results');
    const scanBtn = $('#start-scan-btn');

    // Disable button and show progress
    scanBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    try {
        statusText.textContent = 'Fetching stations from Radio Browser API...';
        progressFill.style.width = '20%';
        progressFill.setAttribute('aria-valuenow', '20');

        // Build API request
        const params = new URLSearchParams({
            limit: limit * 2,
            hidebroken: 'true',
            order: 'votes',
            reverse: 'true'
        });

        if (country) {
            params.append('countrycode', country);
        }

        // Try multiple mirrors
        let stations = [];
        for (const mirror of CONFIG.RADIO_BROWSER_MIRRORS) {
            try {
                const response = await fetch(`${mirror}/stations/search?${params}`, {
                    headers: { 'User-Agent': CONFIG.USER_AGENT },
                    signal: AbortSignal.timeout(CONFIG.SCAN_TIMEOUT)
                });
                
                if (response.ok) {
                    stations = await response.json();
                    break;
                }
            } catch (error) {
                console.warn(`Mirror ${mirror} failed:`, error);
            }
        }

        if (stations.length === 0) {
            throw new Error('No stations found');
        }

        progressFill.style.width = '60%';
        progressFill.setAttribute('aria-valuenow', '60');
        statusText.textContent = `Processing ${stations.length} stations...`;

        // Process, sanitize, and deduplicate stations
        const seenUrls = new Set();
        const processedStations = [];
        
        for (const station of stations) {
            const normalized = normalizeStreamUrl(station.url_resolved || station.url);
            if (!seenUrls.has(normalized)) {
                seenUrls.add(normalized);
                processedStations.push(sanitizeStation(station));
                if (processedStations.length >= limit) break;
            }
        }

        progressFill.style.width = '100%';
        progressFill.setAttribute('aria-valuenow', '100');
        statusText.textContent = `Scan complete! Found ${processedStations.length} unique stations.`;

        // Render results after delay
        setTimeout(() => {
            progressContainer.classList.add('hidden');
            renderScanResults(processedStations);
        }, 1000);

    } catch (error) {
        console.error('Scan error:', error);
        statusText.textContent = 'Scan failed. Please try again.';
        resultsContainer.appendChild(showAlert('Failed to scan stations. Please check your connection and try again.', 'error'));
    } finally {
        scanBtn.disabled = false;
    }
}

/**
 * Render scan results
 */
function renderScanResults(stations) {
    const container = $('#scan-results');
    container.innerHTML = '<div class="section-label">Discovered Stations</div>';

    if (stations.length === 0) {
        container.appendChild(showAlert('No stations found. Try different search criteria.', 'warning'));
        return;
    }

    // Group by genre
    const grouped = {};
    stations.forEach(station => {
        const genre = station.genre || 'General';
        if (!grouped[genre]) grouped[genre] = [];
        grouped[genre].push(station);
    });

    // Render each genre group
    Object.keys(grouped).sort().forEach(genre => {
        const label = document.createElement('div');
        label.className = 'sub-section-label';
        label.textContent = `${genre} (${grouped[genre].length})`;
        container.appendChild(label);

        grouped[genre].forEach(station => {
            const card = createStationCard(station);
            container.appendChild(card);
        });
    });

    attachCardEventListeners(container);
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

/**
 * Search for radio stations
 */
async function searchStations() {
    const query = $('#search-input').value.trim();
    const genre = $('#search-genre').value;
    const country = $('#search-country').value;
    const resultsContainer = $('#search-results');
    const searchBtn = $('#search-btn');

    if (!query) {
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(showAlert('Please enter a search query.', 'warning'));
        return;
    }

    searchBtn.disabled = true;
    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Searching stations...</div>';

    try {
        // Build search parameters
        const params = new URLSearchParams({
            name: query,
            limit: 20,
            hidebroken: 'true',
            order: 'votes',
            reverse: 'true'
        });

        if (country) {
            params.append('countrycode', country);
        }

        if (genre) {
            params.append('tag', genre);
        }

        // Try multiple mirrors
        let stations = [];
        for (const mirror of CONFIG.RADIO_BROWSER_MIRRORS) {
            try {
                const response = await fetch(`${mirror}/stations/search?${params}`, {
                    headers: { 'User-Agent': CONFIG.USER_AGENT },
                    signal: AbortSignal.timeout(CONFIG.SCAN_TIMEOUT)
                });
                
                if (response.ok) {
                    stations = await response.json();
                    break;
                }
            } catch (error) {
                console.warn(`Mirror ${mirror} failed:`, error);
            }
        }

        // Deduplicate search results
        const seenUrls = new Set();
        const processedStations = [];
        
        for (const station of stations) {
            const normalized = normalizeStreamUrl(station.url_resolved || station.url);
            if (!seenUrls.has(normalized)) {
                seenUrls.add(normalized);
                processedStations.push(sanitizeStation(station));
            }
        }
        
        renderSearchResults(processedStations, query);

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(showAlert('Search failed. Please try again.', 'error'));
    } finally {
        searchBtn.disabled = false;
    }
}

/**
 * Render search results
 */
function renderSearchResults(stations, query) {
    const container = $('#search-results');
    container.innerHTML = `<div class="section-label">${stations.length} Results for "${query}"</div>`;

    if (stations.length === 0) {
        container.appendChild(showAlert('No stations found. Try a different search term.', 'warning'));
        return;
    }

    stations.forEach(station => {
        const card = createStationCard(station);
        container.appendChild(card);
    });

    attachCardEventListeners(container);
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

/**
 * Initialize application
 */
function initApp() {
    console.log('Initializing Egypt Radio Stream Player...');

    // Load favorites and history from localStorage
    loadFavorites();
    loadHistory();
    renderFavorites();
    renderHistory();
    
    // Initialize audio visualizer
    initAudioVisualizer();
    
    // Initialize data dashboard
    updateDataDashboard();
    
    // Initialize FAB visibility
    updateFABVisibility();
    
    // Side panel controls
    $('#fab-player').addEventListener('click', () => openSidePanel('player'));
    $('#fab-data').addEventListener('click', () => openSidePanel('data'));
    $('#fab-timer').addEventListener('click', () => openSidePanel('timer'));
    $('#panel-close').addEventListener('click', closeSidePanel);
    $('#panel-overlay').addEventListener('click', closeSidePanel);

    // Tab navigation
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showTab(btn.dataset.tab);
        });
    });

    // Scanner controls
    $('#start-scan-btn').addEventListener('click', scanStations);

    // Search controls
    $('#search-btn').addEventListener('click', searchStations);
    
    // Search on Enter key
    $('#search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStations();
        }
    });

    // Real-time search with debounce
    const debouncedSearch = debounce(searchStations, CONFIG.SEARCH_DEBOUNCE);
    $('#search-input').addEventListener('input', debouncedSearch);

    // Player controls
    $('#stop-btn').addEventListener('click', stopPlayback);
    
    $('#refresh-btn').addEventListener('click', () => {
        if (AppState.currentStation) {
            playStation(AppState.currentStation);
        }
    });

    // Volume controls
    $('#volume-slider').addEventListener('input', (e) => {
        updateVolume(e.target.value);
    });

    $('#mute-btn').addEventListener('click', toggleMute);
    
    // Sleep timer preset buttons
    $$('.btn-sleep-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            setSleepTimer(minutes);
        });
    });
    
    // Custom sleep timer
    $('#set-custom-sleep-btn').addEventListener('click', () => {
        const customMinutes = parseInt($('#custom-sleep-minutes').value);
        if (customMinutes && customMinutes > 0 && customMinutes <= 720) {
            setSleepTimer(customMinutes);
            $('#custom-sleep-minutes').value = '';
        } else {
            alert('Please enter a valid number of minutes (1-720)');
        }
    });
    
    // Clear history button
    const clearHistoryBtn = $('#clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Data threshold controls
    $('#set-threshold-btn').addEventListener('click', setDataThreshold);
    $('#clear-threshold-btn').addEventListener('click', clearDataThreshold);

    // Initialize volume
    updateVolume(80);

    console.log('Application initialized successfully');
}

// ============================================
// APPLICATION START
// ============================================

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && AppState.audioContext) {
        AppState.audioContext.suspend();
    } else if (!document.hidden && AppState.audioContext) {
        AppState.audioContext.resume();
    }
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('Egypt Radio Stream Player loaded');
