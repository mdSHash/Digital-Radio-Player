/**
 * UI COMPONENTS MODULE
 * 
 * Handles UI rendering and component interactions
 * Dependencies: state.js, utils.js, storage.js, audio-player.js, data-monitor.js
 */

'use strict';

import { AppState } from './state.js';
import { $, $$, escapeHtml, sanitizeUrl, getCountryFlag, COUNTRY_FLAGS, formatBytes, formatTime } from './utils.js';
import { isFavorite, addToFavorites, removeFromFavorites } from './storage.js';
import { playStation } from './audio-player.js';
import { updateDataDashboard } from './data-monitor.js';

/**
 * Show specific tab
 */
export function showTab(tabName) {
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

/**
 * Create station card element
 */
export function createStationCard(station, showFavoriteBtn = true) {
    const isCurrentlyPlaying = AppState.currentStation && AppState.currentStation.url === station.url;
    const isFav = isFavorite(station.url);
    const countryFlag = getCountryFlag(station.country);
    const locationText = station.state ? `${escapeHtml(station.state)}, ${escapeHtml(station.country)}` : escapeHtml(station.country);

    const card = document.createElement('div');
    card.className = `station-card ${isCurrentlyPlaying ? 'playing' : ''}`;

    // Create station name div
    const stationNameDiv = document.createElement('div');
    stationNameDiv.className = 'station-name';
    stationNameDiv.textContent = `${countryFlag} ${station.name}`;
    
    if (station.country && station.country !== 'EG') {
        const locationBadge = document.createElement('span');
        locationBadge.className = 'location-badge';
        locationBadge.textContent = locationText;
        stationNameDiv.appendChild(document.createTextNode(' '));
        stationNameDiv.appendChild(locationBadge);
    }
    
    // Create station meta div
    const stationMetaDiv = document.createElement('div');
    stationMetaDiv.className = 'station-meta';
    
    const freqSpan = document.createElement('span');
    freqSpan.className = 'freq';
    freqSpan.textContent = station.frequency || 'Web Stream';
    stationMetaDiv.appendChild(freqSpan);
    
    if (station.genre) {
        const genreSpan = document.createElement('span');
        genreSpan.className = 'genre';
        genreSpan.textContent = station.genre;
        stationMetaDiv.appendChild(genreSpan);
    }
    
    if (station.bitrate) {
        const bitrateSpan = document.createElement('span');
        bitrateSpan.textContent = `${station.bitrate} kbps`;
        stationMetaDiv.appendChild(bitrateSpan);
    }
    
    if (station.codec) {
        const codecSpan = document.createElement('span');
        codecSpan.textContent = station.codec;
        stationMetaDiv.appendChild(codecSpan);
    }
    
    card.appendChild(stationNameDiv);
    card.appendChild(stationMetaDiv);
    
    // Add playing badge if currently playing
    if (isCurrentlyPlaying) {
        const playingBadge = document.createElement('div');
        playingBadge.className = 'station-playing-badge';
        const blinkDot = document.createElement('span');
        blinkDot.className = 'blink-dot';
        playingBadge.appendChild(blinkDot);
        playingBadge.appendChild(document.createTextNode('LIVE'));
        card.appendChild(playingBadge);
    }
    
    // Create button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    
    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'btn play-btn';
    playBtn.setAttribute('data-url', sanitizeUrl(station.url));
    playBtn.setAttribute('data-name', station.name);
    playBtn.setAttribute('data-bitrate', station.bitrate || 128);
    playBtn.textContent = isCurrentlyPlaying ? '▶ PLAYING' : '▶ PLAY';
    btnGroup.appendChild(playBtn);
    
    // Favorite or Remove button
    if (showFavoriteBtn) {
        const favBtn = document.createElement('button');
        favBtn.className = `btn ${isFav ? 'btn-success' : ''}`;
        favBtn.className += ' favorite-btn';
        favBtn.textContent = isFav ? '✓ FAVORITED' : '♥ ADD TO FAVORITES';
        favBtn._stationData = station;
        btnGroup.appendChild(favBtn);
    } else {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger remove-btn';
        removeBtn.setAttribute('data-url', sanitizeUrl(station.url));
        removeBtn.textContent = '🗑 REMOVE';
        btnGroup.appendChild(removeBtn);
    }
    
    card.appendChild(btnGroup);

    return card;
}

/**
 * Attach event listeners to station cards
 */
export function attachCardEventListeners(container) {
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
            renderFavorites();
        });
    });
}

/**
 * Render favorites list
 */
export function renderFavorites() {
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

/**
 * Render listening history
 */
export function renderHistory() {
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
    
    historyList.innerHTML = '';
    AppState.listeningHistory.forEach(session => {
        const historyRow = document.createElement('div');
        historyRow.className = 'history-row';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'history-name';
        nameSpan.textContent = session.name;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'history-time';
        timeSpan.textContent = `${formatTime(session.duration)} · ${session.stoppedAt}`;
        
        const dataSpan = document.createElement('span');
        dataSpan.className = 'history-data';
        dataSpan.textContent = formatBytes(session.bytes);
        
        historyRow.appendChild(nameSpan);
        historyRow.appendChild(timeSpan);
        historyRow.appendChild(dataSpan);
        historyList.appendChild(historyRow);
    });
    
    // Update footer
    const totalHistoryBytes = AppState.listeningHistory.reduce((sum, s) => sum + s.bytes, 0);
    $('#history-total').textContent = formatBytes(totalHistoryBytes);
    historyFooter.style.display = 'flex';
    clearBtn.style.display = 'block';
}

/**
 * Side panel management
 */
let currentPanelContent = null;

/**
 * Open side panel with specific content
 */
export function openSidePanel(contentType) {
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
export function closeSidePanel() {
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

// Made with Bob
