/**
 * DATA THRESHOLD MODULE
 * 
 * Manages data usage thresholds and alerts
 * Dependencies: state.js, utils.js
 */

'use strict';

import { AppState } from './state.js';
import { $, sanitizeNumber } from './utils.js';

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
export function checkDataThreshold() {
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
            // Import stopPlayback dynamically to avoid circular dependency
            import('./audio-player.js').then(({ stopPlayback }) => {
                stopPlayback();
                alert(`DATA LIMIT REACHED!\n\nYour ${thresholdMB} MB data limit has been reached.\nStream has been automatically stopped to save data.`);
            });
        } else {
            // Alert only
            alert(`DATA LIMIT REACHED!\n\nYou have used ${thresholdMB} MB of data.\nConsider stopping the stream to save data.`);
        }
        
        // Update status
        const statusDiv = $('#threshold-status');
        const statusText = statusDiv.querySelector('.threshold-status-text');
        statusText.textContent = `Limit reached! Used ${thresholdMB} MB`;
    }
}

/**
 * Set data usage threshold
 */
export function setDataThreshold() {
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
    
    const thresholdMB = sanitizeNumber(thresholdInput.value, 1, 100000);
    console.log('Threshold value:', thresholdMB);
    
    if (thresholdMB < 1) {
        alert('Please enter a valid data limit (minimum 1 MB)');
        return;
    }
    
    AppState.dataThreshold = thresholdMB * 1024 * 1024;
    AppState.dataThresholdAction = actionSelect.value;
    AppState.dataThresholdReached = false;
    
    console.log('Threshold set:', {
        bytes: AppState.dataThreshold,
        MB: thresholdMB,
        action: AppState.dataThresholdAction
    });
    
    // Show status
    statusDiv.classList.remove('hidden');
    statusText.textContent = `Limit set at ${thresholdMB} MB - ${actionSelect.value === 'stop' ? 'Will auto-stop stream' : 'Will show alert'}`;
    
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
export function clearDataThreshold() {
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

// Made with Bob
