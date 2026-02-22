/**
 * Time Hacked - Main Application
 * 
 * Provides precise UTC time synchronization with visual flash cues
 * for pilot training watch synchronization.
 * 
 * Deployment: Works on Vercel, Netlify, GitHub Pages as static files.
 */

// ============================================================================
// TIME SYNCHRONIZATION MODULE
// ============================================================================

const TimeSyncManager = (() => {
    let authorityUtcMs = 0;           // Last known authoritative UTC time (ms)
    let perfNowAtSync = 0;            // performance.now() value at sync time
    let driftMs = 0;                  // Calculated drift
    let isSynced = false;
    let syncAttempts = 0;
    const MAX_SYNC_ATTEMPTS = 3;
    const SYNC_INTERVAL_MS = 60000;   // Re-sync every 60 seconds

    // Primary time API: worldtimeapi.org (reliable, free, no key required)
    const TIME_APIS = [
        {
            url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
            parser: (data) => new Date(data.utc_datetime).getTime()
        },
        {
            url: 'https://worldtimeapi.org/api/timezone/UTC',
            parser: (data) => new Date(data.utc_datetime).getTime()
        }
    ];

    /**
     * Fetch authoritative UTC time from public API
     * @returns {Promise<number>} UTC time in milliseconds
     */
    async function fetchAuthorityTime() {
        for (let api of TIME_APIS) {
            try {
                const response = await fetch(api.url, { 
                    method: 'GET',
                    cache: 'no-cache'
                });
                if (response.ok) {
                    const data = await response.json();
                    return api.parser(data);
                }
            } catch (e) {
                console.warn(`Time API fetch failed: ${api.url}`, e);
            }
        }
        // Fallback: use system time if all APIs fail
        console.warn('All time APIs failed. Falling back to system time.');
        return Date.now();
    }

    /**
     * Synchronize to authoritative UTC time
     */
    async function sync() {
        try {
            syncAttempts++;
            const fetchedTimeMs = await fetchAuthorityTime();
            
            // Record the sync point
            authorityUtcMs = fetchedTimeMs;
            perfNowAtSync = performance.now();
            driftMs = 0; // Reset drift on successful sync
            isSynced = true;
            syncAttempts = 0;
            
            console.log(`✓ Synced to authoritative UTC: ${new Date(authorityUtcMs).toISOString()}`);
            return true;
        } catch (e) {
            console.error('Sync failed:', e);
            if (syncAttempts < MAX_SYNC_ATTEMPTS) {
                // Retry after short delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                return sync();
            }
            isSynced = false;
            return false;
        }
    }

    /**
     * Get current UTC time with drift compensation
     * Uses high-resolution performance.now() to prevent system clock drift
     * @returns {number} Current UTC time in milliseconds
     */
    function getCurrentUtcMs() {
        if (!isSynced) return Date.now();
        
        const elapsedSinceSync = performance.now() - perfNowAtSync;
        return authorityUtcMs + elapsedSinceSync + driftMs;
    }

    /**
     * Get current UTC time as Date object
     * @returns {Date}
     */
    function getCurrentUtcDate() {
        return new Date(getCurrentUtcMs());
    }

    /**
     * Get current UTC seconds (0-59)
     * @returns {number}
     */
    function getCurrentUtcSeconds() {
        return getCurrentUtcDate().getUTCSeconds();
    }

    /**
     * Get current UTC milliseconds component (0-999)
     * @returns {number}
     */
    function getCurrentUtcMs_Component() {
        return getCurrentUtcDate().getUTCMilliseconds();
    }

    /**
     * Check if currently synced
     * @returns {boolean}
     */
    function getSyncStatus() {
        return isSynced;
    }

    /**
     * Start background re-sync every 60 seconds
     */
    function startBackgroundSync() {
        setInterval(() => {
            sync().catch(e => console.error('Background sync error:', e));
        }, SYNC_INTERVAL_MS);
    }

    return {
        init: async () => {
            await sync();
            startBackgroundSync();
        },
        getCurrentUtcMs,
        getCurrentUtcDate,
        getCurrentUtcSeconds,
        getCurrentUtcMs_Component,
        getSyncStatus
    };
})();

// ============================================================================
// TIMEZONE & DISPLAY MODULE
// ============================================================================

const TimezoneManager = (() => {
    let selectedTimezone = getDefaultTimezone();

    /**
     * Detect user's browser timezone
     * @returns {string} IANA timezone name
     */
    function getDefaultTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            return 'UTC';
        }
    }

    /**
     * Format Date object to HH:MM:SS in specified timezone
     * @param {Date} utcDate - UTC Date object
     * @param {string} timezone - IANA timezone name
     * @returns {string} Formatted time "HH:MM:SS"
     */
    function formatTimeInTimezone(utcDate, timezone) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(utcDate);
        const timeObj = {};
        parts.forEach(part => {
            timeObj[part.type] = part.value;
        });
        
        return `${timeObj.hour}:${timeObj.minute}:${timeObj.second}`;
    }

    /**
     * Get local time components in specified timezone
     * @param {Date} utcDate - UTC Date object
     * @param {string} timezone - IANA timezone name
     * @returns {object} {hour, minute, second, nextMinute}
     */
    function getTimeComponentsInTimezone(utcDate, timezone) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(utcDate);
        const timeObj = {};
        parts.forEach(part => {
            timeObj[part.type] = part.value;
        });
        
        return {
            hour: parseInt(timeObj.hour, 10),
            minute: parseInt(timeObj.minute, 10),
            second: parseInt(timeObj.second, 10)
        };
    }

    /**
     * Calculate next minute time in specified timezone
     * Handles hour/day rollover correctly
     * @param {Date} utcDate - Current UTC Date
     * @param {string} timezone - IANA timezone name
     * @returns {object} {hour, minute}
     */
    function getNextMinuteInTimezone(utcDate, timezone) {
        // Add 1 minute to current time
        const nextMinuteUtc = new Date(utcDate.getTime() + 60000);
        const components = getTimeComponentsInTimezone(nextMinuteUtc, timezone);
        return { hour: components.hour, minute: components.minute };
    }

    /**
     * Set selected timezone
     * @param {string} tz - IANA timezone name
     */
    function setTimezone(tz) {
        selectedTimezone = tz;
    }

    /**
     * Get currently selected timezone
     * @returns {string}
     */
    function getTimezone() {
        return selectedTimezone;
    }

    return {
        getDefaultTimezone,
        formatTimeInTimezone,
        getTimeComponentsInTimezone,
        getNextMinuteInTimezone,
        setTimezone,
        getTimezone
    };
})();

// ============================================================================
// FLASH & COUNTDOWN MODULE
// ============================================================================

const VisualCueManager = (() => {
    let lastFlashSecond = -1;
    let isCountingDown = false;
    let lastCountdownSecond = -1;

    const DOM = {
        clock: document.getElementById('clock'),
        flashOverlay: document.getElementById('flash-overlay'),
        countdownOverlay: document.getElementById('countdown-overlay'),
        countdownNumber: document.getElementById('countdown-number')
    };

    /**
     * Check if we should trigger flash at this moment
     * Flash occurs at :00 and :30 seconds
     * @param {number} seconds - Current UTC seconds (0-59)
     * @returns {boolean}
     */
    function shouldFlash(seconds) {
        return seconds === 0 || seconds === 30;
    }

    /**
     * Trigger flash(es) with customizable count and style
     * Uses CSS class toggling for performance
     * @param {object} options - {count: number, type: 'regular'|'countdown'}
     */
    function triggerFlash(options = {}) {
        const {
            count = 3,
            type = 'regular'
        } = options;

        let flashCount = 0;
        const FLASH_DURATION_MS = 150;
        const FLASH_INTERVAL_MS = 160;

        function doFlash() {
            if (flashCount >= count) return;
            
            DOM.flashOverlay.classList.add('flash');
            if (type === 'countdown') {
                DOM.flashOverlay.classList.add('flash-countdown');
                DOM.clock.classList.add('flash-text-invert');
            }
            flashCount++;
            
            setTimeout(() => {
                DOM.flashOverlay.classList.remove('flash');
                DOM.flashOverlay.classList.remove('flash-countdown');
                DOM.clock.classList.remove('flash-text-invert');
                if (flashCount < count) {
                    setTimeout(doFlash, FLASH_INTERVAL_MS);
                }
            }, FLASH_DURATION_MS);
        }

        doFlash();
    }

    /**
     * Check if we should show countdown (10 seconds before minute)
     * Countdown starts at :50 seconds
     * @param {number} seconds - Current UTC seconds
     * @returns {boolean}
     */
    function shouldCountdown(seconds) {
        return seconds >= 50;
    }

    /**
     * Get countdown display number (10 down to 1)
     * @param {number} seconds - Current UTC seconds
     * @returns {number}
     */
    function getCountdownNumber(seconds) {
        // At :50, show 10; at :51, show 9; ... at :59, show 1; at :00, hide
        if (seconds < 50) return 0;
        return 60 - seconds;
    }

    /**
     * Update countdown display
     * Single flash per second during countdown period (10 seconds before minute)
     * with inverted colors (black text on white) so time remains visible
     * @param {number} seconds - Current UTC seconds
     */
    function updateCountdown(seconds) {
        if (shouldCountdown(seconds)) {
            const countNum = getCountdownNumber(seconds);
            if (countNum > 0 && countNum <= 10) {
                // Trigger single countdown flash at each second
                if (seconds !== lastCountdownSecond) {
                    triggerFlash({ count: 1, type: 'countdown' });
                    lastCountdownSecond = seconds;
                }
            }
        } else {
            lastCountdownSecond = -1;
        }
    }

    /**
     * Process flash and countdown logic
     * Called on each animation frame
     */
    function processVisualCues() {
        const utcSeconds = TimeSyncManager.getCurrentUtcSeconds();

        // Handle countdown (10 seconds before minute)
        updateCountdown(utcSeconds);

        // Handle flashes at :00 and :30
        if (shouldFlash(utcSeconds) && utcSeconds !== lastFlashSecond) {
            triggerFlash();
            lastFlashSecond = utcSeconds;
        }

        // Reset flash tracking when we leave :00 and :30
        if (!shouldFlash(utcSeconds)) {
            lastFlashSecond = -1;
        }
    }

    return {
        processVisualCues
    };
})();

// ============================================================================
// MAIN DISPLAY MODULE
// ============================================================================

const DisplayManager = (() => {
    const DOM = {
        clock: document.getElementById('clock'),
        upcomingText: document.getElementById('upcoming-text'),
        syncStatusText: document.getElementById('sync-status-text'),
        syncStatus: document.querySelector('.sync-status'),
        tzSelect: document.getElementById('tz-select')
    };

    /**
     * Update main clock display
     * @param {string} timeString - Formatted time "HH:MM:SS"
     */
    function updateClock(timeString) {
        DOM.clock.textContent = timeString;
    }

    /**
     * Update upcoming minute text at bottom
     * Shows either "In one minute..." or "In 30 seconds..."
     */
    function updateUpcomingText() {
        const timezone = TimezoneManager.getTimezone();
        const utcDate = TimeSyncManager.getCurrentUtcDate();
        const components = TimezoneManager.getTimeComponentsInTimezone(utcDate, timezone);
        const secondsToMinute = 60 - components.second;

        let text;
        if (secondsToMinute > 30) {
            // More than 30 seconds away
            const nextMinute = TimezoneManager.getNextMinuteInTimezone(utcDate, timezone);
            const hour = String(nextMinute.hour).padStart(2, '0');
            const minute = String(nextMinute.minute).padStart(2, '0');
            text = `IN ONE MINUTE, THE TIME WILL BE ${hour}:${minute} LOCAL`;
        } else {
            // 30 seconds or less
            const nextMinute = TimezoneManager.getNextMinuteInTimezone(utcDate, timezone);
            const hour = String(nextMinute.hour).padStart(2, '0');
            const minute = String(nextMinute.minute).padStart(2, '0');
            text = `IN 30 SECONDS, THE TIME WILL BE ${hour}:${minute} LOCAL`;
        }

        DOM.upcomingText.textContent = text;
    }

    /**
     * Update sync status indicator
     */
    function updateSyncStatus() {
        const synced = TimeSyncManager.getSyncStatus();
        if (synced) {
            DOM.syncStatus.classList.add('synced');
        } else {
            DOM.syncStatus.classList.remove('synced');
            DOM.syncStatusText.textContent = 'Syncing...';
        }
    }

    /**
     * Set up timezone selector change event
     */
    function setupTimezoneSelector() {
        // Set default value to detected timezone
        const defaultTz = TimezoneManager.getTimezone();
        DOM.tzSelect.value = defaultTz;

        DOM.tzSelect.addEventListener('change', (e) => {
            TimezoneManager.setTimezone(e.target.value);
            updateUpcomingText();
        });
    }

    /**
     * Main update loop - called via requestAnimationFrame
     */
    function update() {
        const timezone = TimezoneManager.getTimezone();
        const utcDate = TimeSyncManager.getCurrentUtcDate();
        const timeString = TimezoneManager.formatTimeInTimezone(utcDate, timezone);
        
        updateClock(timeString);
        updateUpcomingText();
        updateSyncStatus();
        
        // Process visual cues (flashes, countdown)
        VisualCueManager.processVisualCues();

        requestAnimationFrame(update);
    }

    return {
        setupTimezoneSelector,
        startUpdateLoop: () => {
            requestAnimationFrame(update);
        }
    };
})();

// ============================================================================
// FULLSCREEN MODE MODULE
// ============================================================================

const PresentationMode = (() => {
    let isFullscreen = false;
    let wakeLock = null;

    const DOM = {
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        body: document.body
    };

    /**
     * Enable Wake Lock (prevent screen dimming)
     */
    async function enableWakeLock() {
        if ('wakeLock' in navigator) {
            if (!wakeLock) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Wake Lock acquired - screen will stay on');
                } catch (e) {
                    console.warn('Wake Lock request failed:', e);
                }
            }
        } else {
            console.warn('Wake Lock API not supported in this browser');
        }
    }

    /**
     * Handle visibility change - re-acquire wake lock if needed
     */
    function handleVisibilityChange() {
        if (document.hidden && wakeLock !== null) {
            // Screen went to sleep, wake lock was released
            wakeLock = null;
        } else if (!document.hidden && wakeLock === null) {
            // Screen turned back on, try to re-acquire wake lock
            enableWakeLock();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    async function toggleFullscreen() {
        if (!isFullscreen) {
            try {
                if (DOM.body.requestFullscreen) {
                    await DOM.body.requestFullscreen();
                } else if (DOM.body.webkitRequestFullscreen) {
                    await DOM.body.webkitRequestFullscreen();
                }
                isFullscreen = true;
                DOM.body.classList.add('fullscreen');
                DOM.fullscreenBtn.style.opacity = '0.5';
            } catch (e) {
                console.warn('Fullscreen request denied:', e);
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
                isFullscreen = false;
                DOM.body.classList.remove('fullscreen');
                DOM.fullscreenBtn.style.opacity = '1';
            } catch (e) {
                console.warn('Fullscreen exit error:', e);
            }
        }
    }

    /**
     * Handle fullscreen change events
     */
    function handleFullscreenChange() {
        const inFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!inFullscreen) {
            isFullscreen = false;
            DOM.body.classList.remove('fullscreen');
            DOM.fullscreenBtn.style.opacity = '1';
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        DOM.fullscreenBtn.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return {
        init: () => {
            setupEventListeners();
            enableWakeLock();
        }
    };
})();

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

async function initApp() {
    try {
        console.log('Initializing Time Hacked...');

        // Initialize time sync first
        await TimeSyncManager.init();

        // Set up timezone selector
        DisplayManager.setupTimezoneSelector();

        // Set up fullscreen and wake lock controls
        PresentationMode.init();

        // Start main render loop
        DisplayManager.startUpdateLoop();

        console.log('✓ Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ============================================================================
// DEPLOYMENT NOTES
// ============================================================================
/*
 * DEPLOYMENT INSTRUCTIONS
 * 
 * This is a static site with no build step required.
 * 
 * Option 1: GitHub Pages
 * - Push files to GitHub repo
 * - Enable Pages in Settings → Pages
 * - Select "Deploy from Branch" → main
 * - Site available at https://username.github.io/repo
 * 
 * Option 2: Vercel
 * - Connect GitHub repo to Vercel
 * - Auto-deploys on push
 * - Site available at https://project-name.vercel.app
 * 
 * Option 3: Netlify
 * - Connect GitHub repo to Netlify
 * - Auto-deploys on push
 * - Site available at https://project-name.netlify.app
 * 
 * No environment variables, backend, or build tools required.
 */
