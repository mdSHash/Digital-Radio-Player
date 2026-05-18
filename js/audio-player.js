/**
 * AUDIO PLAYER MODULE
 * 
 * Handles audio playback, visualization, and volume control
 * Dependencies: state.js, utils.js, data-monitor.js, ui-components.js
 */

'use strict';

import { AppState } from './state.js';
import { $, sanitizeUrl, getCountryFlag } from './utils.js';
import { startDataMonitoring, stopDataMonitoring } from './data-monitor.js';

/**
 * Initialize audio visualizer bars
 */
export function initAudioVisualizer() {
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
 * Remove audio event listeners
 */
export function removeAudioEventListeners() {
    const audio = $('#audio-player');
    if (!audio) return;
    
    AppState.audioEventListeners.forEach((listener, event) => {
        audio.removeEventListener(event, listener);
    });
    AppState.audioEventListeners.clear();
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

/**
 * Play radio station with race condition protection
 */
export async function playStation(station) {
    // Prevent multiple simultaneous play calls
    if (AppState.playbackLock) {
        console.log('Playback operation already in progress');
        return;
    }
    
    AppState.playbackLock = true;
    const playbackToken = Date.now();
    AppState.currentPlaybackToken = playbackToken;
    
    try {
        // Stop previous session if any
        if (AppState.isPlaying) {
            stopDataMonitoring();
        }
        
        // Remove old event listeners
        removeAudioEventListeners();
        
        AppState.currentStation = station;
        AppState.currentBitrate = station.bitrate || 128;
        AppState.isPlaying = true;
        
        const audio = $('#audio-player');
        const visualizer = $('#visualizer');

        // Update UI with correct country flag
        const countryCode = station.country || station.countrycode || 'EG';
        const playerStationName = $('#player-station-name');
        playerStationName.textContent = `${getCountryFlag(countryCode)} ${station.name}`;
        
        const playerStationUrl = $('#player-station-url');
        playerStationUrl.textContent = sanitizeUrl(station.url);
        
        const streamUrlCode = $('#stream-url-code');
        streamUrlCode.textContent = sanitizeUrl(station.url);
        
        // Show inline player
        $('#inline-player').classList.remove('hidden');
        
        // Update FAB visibility
        updateFABVisibility();

        // Set audio source
        audio.src = sanitizeUrl(station.url);
        audio.volume = AppState.currentVolume;
        audio.load();
        
        // Add event listeners with tracking
        const onPlay = () => {
            if (AppState.currentPlaybackToken !== playbackToken) return;
            visualizer.classList.add('playing');
            AppState.isPlaying = true;
            console.log('Playback started');
            if (!AppState.dataMonitorInterval) {
                startDataMonitoring();
            }
        };
        
        const onPause = () => {
            visualizer.classList.remove('playing');
            AppState.isPlaying = false;
            stopDataMonitoring();
        };
        
        const onError = () => {
            if (AppState.currentPlaybackToken !== playbackToken) return;
            visualizer.classList.remove('playing');
            AppState.isPlaying = false;
            stopDataMonitoring();
            console.error('Stream error for:', station.url);
            alert('Stream failed to load. The station may be offline.');
        };
        
        const onWaiting = () => {
            console.log('Buffering...');
        };
        
        const onCanPlay = () => {
            console.log('Ready to play');
        };
        
        // Store listeners for cleanup
        AppState.audioEventListeners.set('play', onPlay);
        AppState.audioEventListeners.set('pause', onPause);
        AppState.audioEventListeners.set('error', onError);
        AppState.audioEventListeners.set('waiting', onWaiting);
        AppState.audioEventListeners.set('canplay', onCanPlay);
        
        // Attach listeners
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('error', onError);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('canplay', onCanPlay);
        
        // Play with error handling
        try {
            await audio.play();
            console.log('Playing:', station.name);
            startDataMonitoring();
        } catch (error) {
            console.error('Playback error:', error);
            alert('Failed to play station. The stream may be offline or blocked by CORS policy.\n\nTry another station or check your internet connection.');
            AppState.isPlaying = false;
        }
        
        // Import and call renderFavorites dynamically to avoid circular dependency
        import('./ui-components.js').then(({ renderFavorites }) => {
            renderFavorites();
        });
        
    } finally {
        AppState.playbackLock = false;
    }
}

/**
 * Stop playback
 */
export function stopPlayback() {
    const audio = $('#audio-player');
    
    // Invalidate current playback token
    AppState.currentPlaybackToken = null;
    
    // Stop data monitoring and save session
    stopDataMonitoring();
    
    // Clear sleep timer
    if (AppState.sleepTimerInterval) {
        clearInterval(AppState.sleepTimerInterval);
        AppState.sleepTimerInterval = null;
        AppState.sleepTimerEnd = null;
        $('#sleep-timer-countdown').classList.add('hidden');
        document.querySelectorAll('.btn-sleep-preset').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.minutes === '0') {
                btn.classList.add('active');
            }
        });
    }
    
    // Remove event listeners
    removeAudioEventListeners();
    
    audio.pause();
    audio.src = '';
    AppState.currentStation = null;
    AppState.isPlaying = false;

    $('#visualizer').classList.remove('playing');
    
    // Update FAB visibility and close panel if open
    updateFABVisibility();
    
    // Import and call closeSidePanel and renderFavorites dynamically
    import('./ui-components.js').then(({ closeSidePanel, renderFavorites }) => {
        closeSidePanel();
        renderFavorites();
    });

    console.log('Playback stopped');
}

/**
 * Update volume
 */
export function updateVolume(value) {
    const audio = $('#audio-player');
    const volumeValue = $('#volume-value');
    
    AppState.currentVolume = value / 100;
    audio.volume = AppState.currentVolume;
    volumeValue.textContent = `${value}%`;
}

/**
 * Toggle mute
 */
export function toggleMute() {
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

// Made with Bob
