/**
 * SCANNER MODULE
 * 
 * Handles radio station scanning from Radio Browser API
 * Dependencies: state.js, utils.js, config.js, ui-components.js
 */

'use strict';

import { AppState } from './state.js';
import { $, showAlert, normalizeStreamUrl, sanitizeStation } from './utils.js';
import { CONFIG } from './config.js';
import { createStationCard, attachCardEventListeners } from './ui-components.js';

/**
 * Render scan results
 */
export function renderScanResults(stations) {
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

/**
 * Scan for radio stations
 */
export async function scanStations() {
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

// Made with Bob
