/**
 * MAIN APPLICATION MODULE
 * 
 * Entry point for the Egypt Radio Stream Player
 * Imports all modules and initializes the application
 */

'use strict';

import { AppState } from './state.js';
import { $, $$, debounce, sanitizeNumber } from './utils.js';
import { CONFIG } from './config.js';
import { loadFavorites, loadListeningHistory, clearHistory } from './storage.js';
import { updateDataDashboard } from './data-monitor.js';
import { setDataThreshold, clearDataThreshold } from './threshold.js';
import { initAudioVisualizer, playStation, stopPlayback, updateVolume, toggleMute } from './audio-player.js';
import { setSleepTimer } from './sleep-timer.js';
import { showTab, renderFavorites, renderHistory, openSidePanel, closeSidePanel } from './ui-components.js';
import { scanStations } from './scanner.js';
import { searchStations } from './search.js';
import { cleanupResources } from './cleanup.js';

/**
 * Initialize application
 */
function initApp() {
    console.log('Initializing Egypt Radio Stream Player...');

    // Load favorites and history from localStorage
    loadFavorites();
    loadListeningHistory();
    renderFavorites();
    renderHistory();
    
    // Initialize audio visualizer
    initAudioVisualizer();
    
    // Initialize data dashboard
    updateDataDashboard();
    
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
    const debouncedSearch = debounce(searchStations, CONFIG.SEARCH_DEBOUNCE, 'search', AppState.debounceTimeouts);
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
        const customMinutes = sanitizeNumber($('#custom-sleep-minutes').value, 1, 720);
        if (customMinutes >= 1 && customMinutes <= 720) {
            setSleepTimer(customMinutes);
            $('#custom-sleep-minutes').value = '';
        } else {
            alert('Please enter a valid number of minutes (1-720)');
        }
    });
    
    // Clear history button
    const clearHistoryBtn = $('#clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (clearHistory()) {
                renderHistory();
                updateDataDashboard();
            }
        });
    }
    
    // Data threshold controls
    $('#set-threshold-btn').addEventListener('click', setDataThreshold);
    $('#clear-threshold-btn').addEventListener('click', clearDataThreshold);

    // Initialize volume
    updateVolume(80);
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', cleanupResources);
    window.addEventListener('unload', cleanupResources);

    console.log('Application initialized successfully');
}

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

// Handle errors globally with better logging
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (event.error && event.error.stack) {
        console.error('Stack trace:', event.error.stack);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default handling for AbortError (expected when cancelling requests)
    if (event.reason && event.reason.name === 'AbortError') {
        event.preventDefault();
        console.log('Request was cancelled (expected behavior)');
        return;
    }
    
    // Log stack trace if available
    if (event.reason && event.reason.stack) {
        console.error('Stack trace:', event.reason.stack);
    }
});

console.log('Egypt Radio Stream Player loaded');

// Made with Bob
