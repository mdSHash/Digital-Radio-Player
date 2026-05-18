/**
 * STORAGE MANAGEMENT MODULE
 * 
 * Handles localStorage operations for favorites and listening history
 * Dependencies: state.js, utils.js, config.js
 */

'use strict';

import { AppState } from './state.js';
import { sanitizeStation } from './utils.js';
import { CONFIG } from './config.js';

/**
 * Load favorites from localStorage
 */
export function loadFavorites() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        AppState.favorites = stored ? JSON.parse(stored) : [];
        console.log('Favorites loaded:', AppState.favorites.length);
    } catch (error) {
        console.error('Error loading favorites:', error);
        AppState.favorites = [];
    }
}

/**
 * Save favorites to localStorage
 */
export function saveFavorites() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(AppState.favorites));
        console.log('Favorites saved:', AppState.favorites.length);
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

/**
 * Add station to favorites
 */
export function addToFavorites(station) {
    const exists = AppState.favorites.some(fav => fav.url === station.url);
    if (!exists) {
        AppState.favorites.push(sanitizeStation(station));
        saveFavorites();
        return true;
    }
    return false;
}

/**
 * Remove station from favorites
 */
export function removeFromFavorites(stationUrl) {
    AppState.favorites = AppState.favorites.filter(fav => fav.url !== stationUrl);
    saveFavorites();
}

/**
 * Check if station is in favorites
 */
export function isFavorite(stationUrl) {
    return AppState.favorites.some(fav => fav.url === stationUrl);
}

/**
 * Load listening history from localStorage
 */
export function loadListeningHistory() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY_HISTORY);
        AppState.listeningHistory = stored ? JSON.parse(stored) : [];
        // Don't load totalBytes from storage - reset on each page load
        AppState.totalBytes = 0;
    } catch (error) {
        console.error('Error loading history:', error);
        AppState.listeningHistory = [];
        AppState.totalBytes = 0;
    }
}

/**
 * Save listening history to localStorage
 */
export function saveListeningHistory() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(AppState.listeningHistory));
        // Don't save totalBytes - it should reset on page refresh
    } catch (error) {
        console.error('Error saving history:', error);
    }
}

/**
 * Clear listening history
 */
export function clearHistory() {
    if (confirm('Clear all listening history? This cannot be undone.')) {
        AppState.listeningHistory = [];
        AppState.totalBytes = 0;
        saveListeningHistory();
        return true;
    }
    return false;
}

// Made with Bob
