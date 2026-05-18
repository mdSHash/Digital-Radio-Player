/**
 * SEARCH MODULE
 * 
 * Handles radio station search functionality
 * Dependencies: state.js, utils.js, config.js, ui-components.js
 */

'use strict';

import { AppState, cancelActiveRequests } from './state.js';
import { $, sanitizeText, showAlert, normalizeStreamUrl, sanitizeStation } from './utils.js';
import { CONFIG } from './config.js';
import { createStationCard, attachCardEventListeners } from './ui-components.js';

/**
 * Render search results
 */
export function renderSearchResults(stations, query) {
    const container = $('#search-results');
    container.innerHTML = '';
    
    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'section-label';
    sectionLabel.textContent = `${stations.length} Results for "${sanitizeText(query, 100)}"`;
    container.appendChild(sectionLabel);

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

/**
 * Search for radio stations
 */
export async function searchStations() {
    const query = sanitizeText($('#search-input').value, 200);
    const genre = $('#search-genre').value;
    const country = $('#search-country').value;
    const resultsContainer = $('#search-results');
    const searchBtn = $('#search-btn');

    if (!query) {
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(showAlert('Please enter a search query.', 'warning'));
        return;
    }

    // Cancel previous search requests
    cancelActiveRequests();

    const abortController = new AbortController();
    AppState.activeAbortControllers.add(abortController);

    searchBtn.disabled = true;
    resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Searching stations...</div>';

    try {
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

        let stations = [];
        for (const mirror of CONFIG.RADIO_BROWSER_MIRRORS) {
            if (abortController.signal.aborted) {
                throw new Error('Request cancelled');
            }
            
            try {
                const response = await fetch(`${mirror}/stations/search?${params}`, {
                    headers: { 'User-Agent': CONFIG.USER_AGENT },
                    signal: abortController.signal
                });
                
                if (response.ok) {
                    stations = await response.json();
                    break;
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }
                console.warn(`Mirror ${mirror} failed:`, error);
            }
        }

        const seenUrls = new Set();
        const processedStations = [];
        
        for (const station of stations) {
            if (abortController.signal.aborted) {
                throw new Error('Request cancelled');
            }
            const normalized = normalizeStreamUrl(station.url_resolved || station.url);
            if (!seenUrls.has(normalized)) {
                seenUrls.add(normalized);
                processedStations.push(sanitizeStation(station));
            }
        }
        
        if (!abortController.signal.aborted) {
            renderSearchResults(processedStations, query);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Search cancelled');
        } else {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(showAlert('Search failed. Please try again.', 'error'));
        }
    } finally {
        AppState.activeAbortControllers.delete(abortController);
        searchBtn.disabled = false;
    }
}

// Made with Bob
