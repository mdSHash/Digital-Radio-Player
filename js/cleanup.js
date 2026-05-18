/**
 * CLEANUP MODULE
 * 
 * Handles cleanup of resources and event listeners
 * Dependencies: state.js, audio-player.js
 */

'use strict';

import { AppState, clearAllDebounceTimeouts, cancelActiveRequests } from './state.js';
import { stopPlayback, removeAudioEventListeners } from './audio-player.js';

/**
 * Cleanup all resources
 */
export function cleanupResources() {
    console.log('Cleaning up resources...');
    
    // Stop playback
    if (AppState.isPlaying) {
        stopPlayback();
    }
    
    // Clear all intervals
    if (AppState.dataMonitorInterval) {
        clearInterval(AppState.dataMonitorInterval);
        AppState.dataMonitorInterval = null;
    }
    
    if (AppState.sleepTimerInterval) {
        clearInterval(AppState.sleepTimerInterval);
        AppState.sleepTimerInterval = null;
    }
    
    // Clear all debounce timeouts
    clearAllDebounceTimeouts();
    
    // Cancel all active requests
    cancelActiveRequests();
    
    // Remove audio event listeners
    removeAudioEventListeners();
    
    // Suspend audio context
    if (AppState.audioContext) {
        AppState.audioContext.suspend();
    }
    
    console.log('Cleanup complete');
}

// Made with Bob
