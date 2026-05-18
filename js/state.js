/**
 * STATE MANAGEMENT MODULE
 * 
 * Centralized application state management
 * Dependencies: None (self-contained)
 */

'use strict';

/**
 * Application State Object
 * Contains all runtime state for the application
 */
export const AppState = {
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
    dataThresholdReached: false,
    // Async safety
    activeAbortControllers: new Set(),
    audioEventListeners: new Map(),
    playbackLock: false,
    currentPlaybackToken: null,
    debounceTimeouts: new Map()
};

/**
 * Clear all debounce timeouts
 */
export function clearAllDebounceTimeouts() {
    AppState.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    AppState.debounceTimeouts.clear();
}

/**
 * Cancel all active requests
 */
export function cancelActiveRequests() {
    AppState.activeAbortControllers.forEach(controller => {
        try {
            controller.abort();
        } catch (error) {
            console.warn('Error aborting request:', error);
        }
    });
    AppState.activeAbortControllers.clear();
}

// Made with Bob
