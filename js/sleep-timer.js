/**
 * SLEEP TIMER MODULE
 * 
 * Manages sleep timer functionality for auto-stopping playback
 * Dependencies: state.js, utils.js, audio-player.js
 */

'use strict';

import { AppState } from './state.js';
import { $, $$ } from './utils.js';

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
        import('./audio-player.js').then(({ stopPlayback }) => {
            stopPlayback();
            setSleepTimer(0);
        });
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

/**
 * Set sleep timer
 */
export function setSleepTimer(minutes) {
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
 * Start sleep timer (alias for setSleepTimer)
 */
export function startSleepTimer(minutes) {
    setSleepTimer(minutes);
}

/**
 * Stop sleep timer
 */
export function stopSleepTimer() {
    setSleepTimer(0);
}

// Made with Bob
