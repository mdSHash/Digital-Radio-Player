/**
 * DATA MONITORING MODULE
 * 
 * Handles data usage monitoring and bandwidth tracking
 * Dependencies: state.js, utils.js, config.js, storage.js
 */

'use strict';

import { AppState } from './state.js';
import { $, formatBytes, formatTime, calculateBytes } from './utils.js';
import { CONFIG } from './config.js';
import { saveListeningHistory } from './storage.js';

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
export function drawBandwidthGraph() {
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
 * Start data monitoring
 */
export function startDataMonitoring() {
    if (AppState.dataMonitorInterval) {
        clearInterval(AppState.dataMonitorInterval);
        AppState.dataMonitorInterval = null;
    }
    
    AppState.sessionStartTime = Date.now();
    AppState.sessionBytes = 0;
    AppState.lastUpdateTime = Date.now();
    AppState.bandwidthData = [];
    
    // Initialize bandwidth canvas
    initBandwidthCanvas();
    
    // Update every second
    AppState.dataMonitorInterval = setInterval(() => {
        updateDataDashboard();
    }, CONFIG.DATA_UPDATE_INTERVAL);
    
    // Update UI immediately
    updateDataDashboard();
}

/**
 * Stop data monitoring and save session
 */
export function stopDataMonitoring() {
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
            AppState.listeningHistory = AppState.listeningHistory.slice(0, 10);
            AppState.totalBytes += AppState.sessionBytes;
            saveListeningHistory();
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
export function updateDataDashboard() {
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

// Made with Bob
