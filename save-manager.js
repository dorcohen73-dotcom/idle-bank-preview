const roundCents = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveTimeout = null;
        this.lastSaveTime = 0;
        this.saveDelay = 3000; // Throttle saves to at most once per 3 seconds
        this.serverTimeOffset = 0;
        this.isServerTimeVerified = false;
        // Snapshot of lastSaveTime taken synchronously at load, consumed once by
        // calculateOfflineEarnings(). Prevents a race where a save executed while
        // fetchServerTime() is in flight overwrites state.lastSaveTime and wipes
        // the player's offline earnings.
        this._offlineAnchor = null;
    }

    async fetchServerTime() {
        // Only attempt to fetch server time if online and not under file:// protocol
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return null;
        }
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
            return null;
        }

        // On Capacitor (native app) window.location.origin is the internal local server —
        // its Date header is meaningless, so skip straight to the external time API.
        const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

        if (!isNative) {
            try {
                // HEAD request with cache-busting query parameter to force fetching real Date header from server
                const response = await fetch(window.location.origin + window.location.pathname + '?cb=' + Date.now(), {
                    method: 'HEAD',
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
                });
                const dateStr = response.headers.get('Date');
                if (dateStr) {
                    const parsedDate = new Date(dateStr);
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        return parsedDate.getTime();
                    }
                }
            } catch {
                // same-origin time fetch failed — fall through to external time API
            }
        }

        // External CORS-enabled time API fallbacks (primary source on the native app).
        // worldtimeapi.org has a history of outages, so a second independent provider
        // is tried before giving up and falling back to unverified local time.
        const timeApis = [
            {
                url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
                parse: (data) => (data && typeof data.unixtime === 'number' && isFinite(data.unixtime))
                    ? data.unixtime * 1000 : null
            },
            {
                url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
                parse: (data) => {
                    if (!data || typeof data.dateTime !== 'string') return null;
                    // dateTime arrives without a timezone suffix but is UTC by request —
                    // append 'Z' so Date.parse doesn't interpret it as local time.
                    const ms = Date.parse(data.dateTime.endsWith('Z') ? data.dateTime : data.dateTime + 'Z');
                    return isFinite(ms) ? ms : null;
                }
            },
        ];
        for (const api of timeApis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(api.url, { cache: 'no-store', signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const t = api.parse(await res.json());
                    if (t !== null) return t;
                }
            } catch {
                // this provider failed — try the next one
            }
        }
        return null;
    }

    async initServerTime() {
        const serverTime = await this.fetchServerTime();
        if (serverTime) {
            this.serverTimeOffset = serverTime - Date.now();
            this.isServerTimeVerified = true;
        } else {
            this.serverTimeOffset = 0;
            this.isServerTimeVerified = false;
        }
        
        // Execute offline calculations now that time verification status is settled
        this.calculateOfflineEarnings();

        // Daily Login Bonus: check once per session after time is verified
        this.checkDailyLogin();

        // Trigger offline earnings modal if there is a pending report
        if (typeof window.showOfflineEarningsModal === 'function') {
            window.showOfflineEarningsModal();
        }

        // Re-check missions after offline progress is loaded
        this.game.checkMissions();

        // Refresh UI elements
        if (typeof window.refreshAllTabs === 'function') {
            window.refreshAllTabs();
        }

        // Show daily login reward modal if pending — NotificationQueue handles waiting
        // for the language/offline modals to close first.
        // pendingLoginRewardShown gates this to one attempt per calendar day: if the
        // player closes/refreshes before the modal (or the collect click) ever runs,
        // the reward stays pending but we won't re-nag them again in the same session/day.
        if (this.game.state.pendingLoginReward && !this.game.state.pendingLoginRewardShown) {
            this.game.state.pendingLoginRewardShown = true;
            this.game.saveGame();
            const hasOffline = this.game.offlineEarningsReport && this.game.offlineEarningsReport > 0;
            const initialDelay = hasOffline ? 2000 : 1500;
            setTimeout(() => {
                if (typeof window.showLoginRewardModal === 'function') {
                    window.showLoginRewardModal();
                }
            }, initialDelay);
        }
    }

    getChecksum(dataString) {
        const salt = atob("QjRua0VtUDFyM19TM2NyM3RfUzRsdF8yMDI2");
        const combined = dataString + salt;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    saveGame(force = false) {
        if (force) {
            this.executeSave();
        } else {
            this.queueSave();
        }
    }

    queueSave() {
        if (this.saveTimeout) {
            return;
        }

        const now = Date.now();
        const elapsed = now - this.lastSaveTime;

        if (elapsed >= this.saveDelay) {
            this.executeSave();
        } else {
            const remaining = this.saveDelay - elapsed;
            this.saveTimeout = setTimeout(() => {
                this.executeSave();
            }, remaining);
        }
    }

    executeSave(force = false) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        if (this.game.isResetting && !force) return;
        
        // Use verified server time if available to prevent local system clock modifications from changing save timestamps
        const now = this.isServerTimeVerified ? (Date.now() + this.serverTimeOffset) : Date.now();
        this.game.state.lastSaveTime = now;

        // Remove checksum key before stringifying to get original data string
        delete this.game.state.checksum;

        try {
            const jsonStr = JSON.stringify(this.game.state);
            const checksum = this.getChecksum(jsonStr);
            this.game.state.checksum = checksum;

            // Construct final JSON string by inserting checksum directly to avoid a second expensive stringify
            const finalJsonStr = jsonStr.slice(0, -1) + `,"checksum":"${checksum}"}`;

            // CRIT-1: Prevent stack overflow for large saves by encoding bytes in chunks
            const bytes = new TextEncoder().encode(finalJsonStr);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            const encryptedState = btoa(binary);
            window.localStorage.setItem('idle_bank_save', encryptedState);
        } catch (e) {
            console.warn('Save failed — localStorage unavailable or state is not serializable:', e);
        }

        this.lastSaveTime = Date.now();
    }

    clearSave() {
        this.game.isResetting = true;
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.game._tempQueueBonusTimeout) { clearTimeout(this.game._tempQueueBonusTimeout); this.game._tempQueueBonusTimeout = null; }
        try {
            window.localStorage.removeItem('idle_bank_save');
        } catch (e) {
            console.warn('Could not clear save from localStorage:', e);
        }
        this.game.initDefaultState();
        // CRIT-4: Pass force=true to allow saving default state even while isResetting is true, and only disable isResetting afterward
        this.executeSave(true); // Force save default state immediately
        this.game.isResetting = false;
    }

    deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        if (!target || typeof target !== 'object') return source;
        
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] instanceof Array) {
                    if (!(target[key] instanceof Array)) {
                        target[key] = [];
                    }
                    for (let i = 0; i < source[key].length; i++) {
                        if (typeof source[key][i] === 'object' && source[key][i] !== null) {
                            target[key][i] = this.deepMerge(target[key][i] || {}, source[key][i]);
                        } else {
                            target[key][i] = source[key][i];
                        }
                    }
                } else if (typeof source[key] === 'object' && source[key] !== null) {
                    target[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    validateAndHealState(state) {
        if (!state || typeof state !== 'object') {
            this.game.initDefaultState();
            return;
        }

        const isNum = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v);
        const isBool = (v) => typeof v === 'boolean';
        const isString = (v) => typeof v === 'string';

        // General numbers
        if (!isNum(state.cash) || state.cash < 0) state.cash = 2000;
        else state.cash = roundCents(state.cash);

        if (!isNum(state.lifetimeCash) || state.lifetimeCash < 0) state.lifetimeCash = state.cash;
        else state.lifetimeCash = roundCents(state.lifetimeCash);

        if (!isNum(state.shares) || state.shares < 0) state.shares = 0;
        else state.shares = Math.floor(state.shares);

        if (!isNum(state.currentBranch) || state.currentBranch < 0 || state.currentBranch >= GAME_CONFIG.BRANCHES.length) state.currentBranch = 0;
        if (!isNum(state.maxBranchUnlocked) || state.maxBranchUnlocked < 0) state.maxBranchUnlocked = state.currentBranch;
        if (!isString(state.language)) state.language = 'he';
        if (!['auto', 'full', 'eco'].includes(state.perfMode)) state.perfMode = 'auto';
        if (!isNum(state.lastMeasuredFps)) state.lastMeasuredFps = 0;

        // Timers
        if (!isNum(state.boost2xTimeLeft) || state.boost2xTimeLeft < 0) state.boost2xTimeLeft = 0;
        if (!isNum(state.lastWeeklyReward) || state.lastWeeklyReward < 0) state.lastWeeklyReward = Date.now();
        if (!isNum(state.tellerSpeedBoostTimer) || state.tellerSpeedBoostTimer < 0) state.tellerSpeedBoostTimer = 0;
        if (!isNum(state.tellerSpeedBoostFactor) || state.tellerSpeedBoostFactor < 1) state.tellerSpeedBoostFactor = 1;
        if (!isNum(state.advBudget) || state.advBudget < 0) state.advBudget = 0;
        if (!isBool(state.advActive)) state.advActive = false;
        if (!isNum(state.queueUpgradeLevel) || state.queueUpgradeLevel < 1) state.queueUpgradeLevel = 1;
        else if (state.queueUpgradeLevel > GAME_CONFIG.QUEUE_MAX_LEVEL) state.queueUpgradeLevel = GAME_CONFIG.QUEUE_MAX_LEVEL;
        if (!isNum(state.missionsCompleted) || state.missionsCompleted < 0) state.missionsCompleted = 0;
        if (!isNum(state.lastSaveTime)) state.lastSaveTime = Date.now();
        if (!isBool(state.notificationsEnabled)) state.notificationsEnabled = true;

        if (!state.stats || typeof state.stats !== 'object') state.stats = {};
        if (!isNum(state.stats.prestigeCount) || state.stats.prestigeCount < 0) state.stats.prestigeCount = 0;
        if (!isBool(state.stats.reviewRequested)) state.stats.reviewRequested = false;

        // Fortune Wheel
        if (!isNum(state.lastSpinTime) || state.lastSpinTime < 0) state.lastSpinTime = 0;
        if (!isNum(state.lastAdSpinTime) || state.lastAdSpinTime < 0) state.lastAdSpinTime = 0;

        // VIP Visitor
        if (!isNum(state.nextVipVisit) || state.nextVipVisit < 0) state.nextVipVisit = 0;
        if (!isBool(state.vipVisitActive)) state.vipVisitActive = false;
        if (!isNum(state.vipVisitExpiry) || state.vipVisitExpiry < 0) state.vipVisitExpiry = 0;
        if (!isNum(state.vipServedTotal) || state.vipServedTotal < 0) state.vipServedTotal = 0;
        if (!isNum(state.guardTripsTotal) || state.guardTripsTotal < 0) state.guardTripsTotal = 0;
        if (state.boost2xUsedEver !== true) state.boost2xUsedEver = false;

        // Daily Login Bonus
        if (!isNum(state.lastLoginDate) || state.lastLoginDate < 0) state.lastLoginDate = 0;
        if (!isNum(state.loginStreak) || state.loginStreak < 0) state.loginStreak = 0;
        if (state.pendingLoginReward !== null && state.pendingLoginReward !== undefined) {
            if (typeof state.pendingLoginReward !== 'object' || !state.pendingLoginReward.type) {
                state.pendingLoginReward = null;
            }
        }
        if (!isBool(state.pendingLoginRewardShown)) state.pendingLoginRewardShown = false;

        // Branch Welcome Bonus
        if (!Array.isArray(state.visitedBranches)) state.visitedBranches = [];

        // Daily Challenges
        if (!isNum(state.lastDailyReset) || state.lastDailyReset < 0) state.lastDailyReset = 0;
        if (!Array.isArray(state.dailyChallenges)) {
            state.dailyChallenges = [];
        } else {
            state.dailyChallenges = state.dailyChallenges.filter(c => c && typeof c === 'object' && isString(c.type));
            state.dailyChallenges.forEach(c => {
                if (!isNum(c.target) || c.target <= 0) c.target = 1;
                if (!isNum(c.progress) || c.progress < 0) c.progress = 0;
                if (!isBool(c.completed)) c.completed = false;
                if (!isBool(c.claimed)) c.claimed = false;
                if (!isNum(c.startProgress) || c.startProgress < 0) c.startProgress = 0;
                if (!isNum(c.baseProgress) || c.baseProgress < 0) c.baseProgress = 0;
                if (!c.reward || typeof c.reward !== 'object') c.reward = { type: 'gold', amount: 1 };
                if (!isNum(c.reward.amount) || c.reward.amount < 1) c.reward.amount = 1;
            });
        }

        // goldUpgrades
        const goldUpgradeMaxLevels = {
            startingCash: 4,
            guardSpeed: 5,
            premiumYield: 5,
            shareEfficiency: 4,
            offlineEarnings: 5,
            tellerCapacityBoost: 5,
            vaultCapacityBoost: 5,
            eventBonus: 5,
            managerDiscount: 4
        };

        if (!state.goldUpgrades || typeof state.goldUpgrades !== 'object') {
            state.goldUpgrades = {
                startingCash: 0, guardSpeed: 0, premiumYield: 0, shareEfficiency: 0,
                offlineEarnings: 0, tellerCapacityBoost: 0, vaultCapacityBoost: 0,
                eventBonus: 0, managerDiscount: 0
            };
        } else {
            Object.keys(goldUpgradeMaxLevels).forEach(k => {
                if (!isNum(state.goldUpgrades[k]) || state.goldUpgrades[k] < 0) {
                    state.goldUpgrades[k] = 0;
                } else {
                    const max = goldUpgradeMaxLevels[k];
                    if (state.goldUpgrades[k] > max) {
                        state.goldUpgrades[k] = max; // CRIT-17: Cap levels to prevent exploit
                    }
                }
            });
        }

        // C-14: backup save before any migration, to allow recovery if migration fails
        try { localStorage.setItem('idle_bank_save_backup', localStorage.getItem('idle_bank_save')); } catch { /* backup best-effort */ }

        // C-15: Deutsche Bank was inserted at index 2, shifting old branches 2→3 and 3→4.
        // Detect old saves by checking the migrations.deutsche flag (previously stored as a string sentinel inside visitedBranches).
        if (!state.migrations) state.migrations = {};
        // Backward compat: if the old sentinel string was already pushed into visitedBranches, promote it to migrations flag and clean the array
        if (Array.isArray(state.visitedBranches) && state.visitedBranches.includes('deutsche_migrated')) {
            state.migrations.deutsche = true;
            state.visitedBranches = state.visitedBranches.filter(v => v !== 'deutsche_migrated');
        }
        if (!state.migrations.deutsche) {
            if (state.currentBranch >= 2) state.currentBranch++;
            if (state.maxBranchUnlocked >= 2) state.maxBranchUnlocked++;
            if (!Array.isArray(state.visitedBranches)) state.visitedBranches = [];
            // Shift existing visited branch indices: 2→3, 3→4
            state.visitedBranches = state.visitedBranches
                .map(idx => (typeof idx === 'number' && idx >= 2) ? idx + 1 : idx)
                .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
            state.migrations.deutsche = true; // flag — never re-run
        }
        // Cap branch indices to valid range after any migration
        const _maxBranchIdx = GAME_CONFIG.BRANCHES.length - 1;
        if (state.currentBranch > _maxBranchIdx) state.currentBranch = _maxBranchIdx;
        if (state.maxBranchUnlocked > _maxBranchIdx) state.maxBranchUnlocked = _maxBranchIdx;

        // Backward compatibility migration from Rachel, Alan, Dan to 6 managers:
        if (state.managers && (state.managers.teller !== undefined || state.managers.guard !== undefined || state.managers.vault !== undefined)) {
            const oldT = state.managers.teller || false;
            const oldG = state.managers.guard !== undefined ? state.managers.guard : true;
            const oldV = state.managers.vault || false;
            
            const oldTUp = (state.managerUpgrades && state.managerUpgrades.teller) ? state.managerUpgrades.teller : { level: 1, skill: null };
            const oldGUp = (state.managerUpgrades && state.managerUpgrades.guard) ? state.managerUpgrades.guard : { level: 1, skill: null };
            const oldVUp = (state.managerUpgrades && state.managerUpgrades.vault) ? state.managerUpgrades.vault : { level: 1, skill: null };
            
            state.managers = {
                customer: oldT,
                finance: oldV,
                operations: oldG,
                service: false,
                accountant: false,
                vip: false,
                marketing: false
            };
            
            state.managerUpgrades = {
                customer: { level: oldTUp.level || 1, skill: null },
                finance: { level: oldVUp.level || 1, skill: null },
                operations: { level: oldGUp.level || 1, skill: null },
                service: { level: 1, skill: null },
                accountant: { level: 1, skill: null },
                vip: { level: 1, skill: null },
                marketing: { level: 1, skill: null }
            };
        }

        // Migration: שמירות ישנות שמכילות logistics/risk/tech/compliance — העבר רמות למנהלים הבולעים
        if (state.managers && state.managerUpgrades) {
            if (state.managers.logistics && state.managerUpgrades.logistics) {
                state.managers.operations = state.managers.operations || true;
                if (state.managerUpgrades.operations && state.managerUpgrades.logistics.level > 1) {
                    state.managerUpgrades.operations.level = Math.max(state.managerUpgrades.operations.level || 1, state.managerUpgrades.logistics.level);
                }
            }
            if (state.managers.risk && state.managerUpgrades.risk) {
                if (state.managerUpgrades.finance && state.managerUpgrades.risk.level > 1) {
                    state.managerUpgrades.finance.level = Math.max(state.managerUpgrades.finance.level || 1, state.managerUpgrades.risk.level);
                }
            }
            if (state.managers.tech && state.managerUpgrades.tech) {
                if (state.managerUpgrades.service && state.managerUpgrades.tech.level > 1) {
                    state.managerUpgrades.service.level = Math.max(state.managerUpgrades.service.level || 1, state.managerUpgrades.tech.level);
                }
            }
            if (state.managers.compliance && state.managerUpgrades.compliance) {
                if (state.managerUpgrades.vip && state.managerUpgrades.compliance.level > 1) {
                    state.managerUpgrades.vip.level = Math.max(state.managerUpgrades.vip.level || 1, state.managerUpgrades.compliance.level);
                }
            }
            // נקה מפתחות ישנים
            ['logistics', 'risk', 'tech', 'compliance'].forEach(k => {
                delete state.managers[k];
                delete state.managerUpgrades[k];
            });
        }

        const newMgrKeys = ['customer', 'finance', 'operations', 'service', 'accountant', 'vip', 'marketing'];

        // managers
        if (!state.managers || typeof state.managers !== 'object') {
            state.managers = {
                customer: false,
                finance: false,
                operations: true,
                service: false,
                accountant: false,
                vip: false,
                marketing: false
            };
        } else {
            newMgrKeys.forEach(k => {
                if (!isBool(state.managers[k])) {
                    state.managers[k] = (k === 'operations'); // Operations default true
                }
            });
        }

        // managerUpgrades
        if (!state.managerUpgrades || typeof state.managerUpgrades !== 'object') {
            state.managerUpgrades = {
                customer: { level: 1, skill: null },
                finance: { level: 1, skill: null },
                operations: { level: 1, skill: null },
                service: { level: 1, skill: null },
                accountant: { level: 1, skill: null },
                vip: { level: 1, skill: null },
                marketing: { level: 1, skill: null }
            };
        } else {
            newMgrKeys.forEach(k => {
                if (!state.managerUpgrades[k] || typeof state.managerUpgrades[k] !== 'object') {
                    state.managerUpgrades[k] = { level: 1, skill: null };
                } else {
                    if (!isNum(state.managerUpgrades[k].level) || state.managerUpgrades[k].level < 1) state.managerUpgrades[k].level = 1;
                    if (state.managerUpgrades[k].level > 5) state.managerUpgrades[k].level = 5; // CAP: max manager level is 5
                    state.managerUpgrades[k].skill = null; // Skill paths are obsolete
                }
            });
        }

        // vault
        if (!state.vault || typeof state.vault !== 'object') {
            state.vault = { level: 1, cashStored: 0, branchBaseCapacity: GAME_CONFIG.VAULT_BASE_CAPACITY };
        } else {
            if (!isNum(state.vault.level) || state.vault.level < 1) state.vault.level = 1;
            if (!isNum(state.vault.cashStored) || state.vault.cashStored < 0) state.vault.cashStored = 0;
            else state.vault.cashStored = roundCents(state.vault.cashStored);
            if (!isNum(state.vault.branchBaseCapacity) || state.vault.branchBaseCapacity < GAME_CONFIG.VAULT_BASE_CAPACITY) {
                state.vault.branchBaseCapacity = GAME_CONFIG.VAULT_BASE_CAPACITY;
            }
        }

        // tellers
        if (!Array.isArray(state.tellers)) {
            state.tellers = [
                { id: 0, unlocked: true, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false },
                { id: 1, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false },
                { id: 2, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false },
                { id: 3, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false }
            ];
        } else {
            state.tellers.forEach((t, i) => {
                if (!t || typeof t !== 'object') {
                    state.tellers[i] = { id: i, unlocked: (i === 0), level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false };
                } else {
                    if (!isNum(t.id)) t.id = i;
                    if (!isBool(t.unlocked)) t.unlocked = (i === 0);
                    if (!isNum(t.level) || t.level < 1) t.level = 1;
                    if (!isNum(t.cashStored) || t.cashStored < 0) t.cashStored = 0;
                    else t.cashStored = roundCents(t.cashStored);
                    if (!isNum(t.processingTimeLeft) || t.processingTimeLeft < 0) t.processingTimeLeft = 0;
                    if (!isBool(t.isProcessing)) t.isProcessing = false;
                }
            });
        }

        // guards
        const _defaultGuard = (i) => ({
            id: i, unlocked: (i === 0), level: 1, loadedCash: 0, position: 0, state: 'idle', timer: 0,
            targetTellerIndex: 0, tellerVisitQueue: [], segmentPosition: 0, carriedAmount: 0, cooldownTimer: 0,
            pendingCollectAmount: 0
        });
        if (!Array.isArray(state.guards)) {
            state.guards = [_defaultGuard(0), _defaultGuard(1), _defaultGuard(2)];
        } else {
            state.guards.forEach((g, i) => {
                if (!g || typeof g !== 'object') {
                    state.guards[i] = _defaultGuard(i);
                } else {
                    if (!isNum(g.id)) g.id = i;
                    if (!isBool(g.unlocked)) g.unlocked = (i === 0);
                    if (!isNum(g.level) || g.level < 1) g.level = 1;
                    if (!isNum(g.loadedCash) || g.loadedCash < 0) g.loadedCash = 0;
                    else g.loadedCash = roundCents(g.loadedCash);
                    if (!isNum(g.position) || g.position < 0) g.position = 0;
                    if (!isString(g.state)) g.state = 'idle';
                    if (!isNum(g.timer) || g.timer < 0) g.timer = 0;
                    // Multi-stop fields — migrate old saves that lack them
                    if (!isNum(g.targetTellerIndex) || g.targetTellerIndex < 0) g.targetTellerIndex = 0;
                    if (!Array.isArray(g.tellerVisitQueue)) g.tellerVisitQueue = [];
                    if (!isNum(g.segmentPosition) || g.segmentPosition < 0) g.segmentPosition = g.position;
                    if (!isNum(g.carriedAmount) || g.carriedAmount < 0) g.carriedAmount = g.loadedCash;
                    else g.carriedAmount = roundCents(g.carriedAmount);
                    if (!isNum(g.cooldownTimer) || g.cooldownTimer < 0) g.cooldownTimer = 0;
                    if (!isNum(g.pendingCollectAmount) || g.pendingCollectAmount < 0) g.pendingCollectAmount = 0;
                    // Normalise states that no longer exist in new machine → idle so game.js rebuilds them
                    const validStates = ['idle', 'moving_to_vault', 'depositing'];
                    const isMultiStop = g.state.startsWith('moving_to_teller_') || g.state.startsWith('collecting_from_teller_');
                    if (!validStates.includes(g.state) && !isMultiStop) {
                        g.state = 'idle';
                        g.carriedAmount = 0;
                        g.loadedCash = 0;
                        g.segmentPosition = 0;
                        g.tellerVisitQueue = [];
                    }
                }
            });
        }

        // departments
        const defaultDepartments = [
            { id: 0, name: 'שירותי קופה בסיסיים', unlocked: true, baseReward: 10, cost: 0 },
            { id: 1, name: 'מחלקת הלוואות ומשכנתאות', unlocked: false, baseReward: 60, cost: 10500 },
            { id: 2, name: 'VIP בנקאות פרטית', unlocked: false, baseReward: 450, cost: 240000 },
            { id: 3, name: 'מסחר במניות וקריפטו', unlocked: false, baseReward: 3500, cost: 3600000 },
            { id: 4, name: 'הלבנת הון "חוקית"', unlocked: false, baseReward: 30000, cost: 75000000 }
        ];
        if (!Array.isArray(state.departments) || state.departments.length === 0) {
            state.departments = defaultDepartments.map(d => Object.assign({}, d));
        } else {
            defaultDepartments.forEach((def) => {
                const match = state.departments.find(d => d && d.id === def.id);
                if (!match) {
                    state.departments.push(Object.assign({}, def));
                } else {
                    if (!isBool(match.unlocked)) match.unlocked = def.unlocked;
                    if (!isNum(match.baseReward)) match.baseReward = def.baseReward;
                    if (!isNum(match.cost)) match.cost = def.cost;
                    if (!isString(match.name)) match.name = def.name;
                }
            });
            state.departments = state.departments.filter(d => d && isNum(d.id)).sort((a, b) => a.id - b.id);
        }

        // stats
        if (!state.stats || typeof state.stats !== 'object') {
            state.stats = { clientsServed: 0, tellerUpgrades: 0, guardUpgrades: 0, vaultUpgrades: 0, vipServed: 0, cashSpent: 0 };
        } else {
            ['clientsServed', 'tellerUpgrades', 'guardUpgrades', 'vaultUpgrades', 'vipServed', 'cashSpent'].forEach(k => {
                if (!isNum(state.stats[k]) || state.stats[k] < 0) state.stats[k] = 0;
            });
        }

        // missions
        if (!Array.isArray(state.missions)) {
            state.missions = [];
        } else {
            state.missions.forEach((m, i) => {
                if (!m || typeof m !== 'object') {
                    state.missions[i] = null;
                } else {
                    if (!isString(m.id)) m.id = 'm_' + Math.random();
                    if (!isString(m.type)) m.type = 'clients';
                    
                    if (m.type === 'gold_shares' || m.type === 'accumulate_vault_cash') {
                        m.type = 'earn_cash';
                        m.startProgress = state.lifetimeCash || 0;
                        const eps = Math.max(10, (state.cash || 0) / 100);
                        m.target = Math.max(500, Math.round(eps * 180));
                        m.progress = 0;
                        m.completed = false;
                        m.claimed = false;
                    }

                    if (!isNum(m.target) || m.target <= 0 || isNaN(m.target)) m.target = 1;
                    if (!isNum(m.progress) || isNaN(m.progress)) m.progress = 0;
                    // Heal reward: may be a number (cash) or { type, amount } object (shares/gold)
                    if (m.reward && typeof m.reward === 'object' && m.reward.type) {
                        if (!isNum(m.reward.amount) || m.reward.amount < 1) m.reward.amount = 1;
                    } else if (!isNum(m.reward) || isNaN(m.reward)) {
                        m.reward = 100;
                    }
                    if (!isBool(m.completed)) m.completed = false;
                    if (!isBool(m.claimed)) m.claimed = false;
                    if (m.type === 'clients' && (m.startProgress !== undefined && (!isNum(m.startProgress) || m.startProgress < 0 || m.startProgress > state.stats.clientsServed))) {
                        m.startProgress = undefined;
                    }
                    const deltaTypes = ['earn_cash', 'serve_rich_vip', 'spend_cash', 'vip_collector', 'guard_trips'];
                    if (deltaTypes.includes(m.type) && m.startProgress !== undefined) {
                        if (!isNum(m.startProgress) || m.startProgress < 0) m.startProgress = undefined;
                    }
                    // B-3: department_unlock missions saved before startProgress was introduced
                    // would never complete because startProgress defaults to current dept count on first
                    // checkMissions() run, making the delta always 0. Reset to 0 so any future unlock counts.
                    if (m.type === 'department_unlock' && m.startProgress === undefined) {
                        m.startProgress = 0;
                    }
                }
            });
            state.missions = state.missions.filter(m => m !== null);
        }

        // achievements — sparse unlocked/claimed maps; bonusPercent is always recomputed from the
        // unlocked map (self-healing, never trusted as persisted) so it can never drift out of sync.
        if (!state.achievements || typeof state.achievements !== 'object') {
            state.achievements = { unlocked: {}, claimed: {}, bonusPercent: 0 };
        }
        if (!state.achievements.unlocked || typeof state.achievements.unlocked !== 'object') {
            state.achievements.unlocked = {};
        }
        if (!state.achievements.claimed || typeof state.achievements.claimed !== 'object') {
            state.achievements.claimed = {};
        }
        {
            const validIds = GAME_CONFIG.ACHIEVEMENTS.map(a => a.id);
            Object.keys(state.achievements.unlocked).forEach(id => {
                if (!validIds.includes(id)) delete state.achievements.unlocked[id];
            });
            Object.keys(state.achievements.claimed).forEach(id => {
                if (!validIds.includes(id) || !state.achievements.unlocked[id]) delete state.achievements.claimed[id];
            });
        }
        state.achievements.bonusPercent = GAME_CONFIG.ACHIEVEMENTS
            .filter(a => state.achievements.unlocked[a.id])
            .reduce((sum, a) => sum + a.bonusPercent, 0);

        // One-time retroactive backfill: existing saves already have lifetime stats (lifetimeCash,
        // missionsCompleted, etc.) that predate this feature — grant any achievement already qualified
        // for instead of forcing players to "re-earn" progress they already made. Runs last since it
        // depends on every stat field above (and managerUpgrades/visitedBranches healed earlier in this
        // function) already being validated. New games are a safe no-op (defaults don't meet any threshold).
        if (!state.migrations) state.migrations = {};
        if (!state.migrations.achievementsBackfill) {
            if (this.game.achievementController) {
                this.game.achievementController.checkAchievements();
            }
            state.migrations.achievementsBackfill = true;
        }
    }

    loadGame() {
        let saved;
        try {
            saved = window.localStorage.getItem('idle_bank_save');
        } catch (e) {
            console.warn('Could not read save from localStorage:', e);
            this.game.checkMissions();
            this.initServerTime();
            return;
        }
        if (!saved) {
            this.game.checkMissions();
            // Start async server time query anyway
            this.initServerTime();
            return;
        }

        try {
            let parsed;
            if (saved.trim().startsWith('{')) {
                parsed = JSON.parse(saved);
            } else {
                let decryptedSaved;
                try {
                    const binary = atob(saved);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    decryptedSaved = new TextDecoder('utf-8').decode(bytes);
                } catch (e) {
                    console.error("UTF-8 decoding failed, falling back to raw binary string:", e);
                    decryptedSaved = atob(saved);
                }
                parsed = JSON.parse(decryptedSaved);
            }
            
            // CRIT-2: Verify checksum if it exists
            if (parsed && typeof parsed === 'object') {
                const savedChecksum = parsed.checksum;
                if (savedChecksum) {
                    delete parsed.checksum;
                    const jsonStr = JSON.stringify(parsed);
                    const computedChecksum = this.getChecksum(jsonStr);
                    if (computedChecksum !== savedChecksum) {
                        this.game.cheatWarning = true;
                        this.game.cheatDetected = true;
                        throw new Error("Checksum mismatch: save data has been modified or corrupted.");
                    }
                    parsed.checksum = savedChecksum;
                }
            }

            // Re-bind parsed data to state
            this.game.state = this.deepMerge(this.game.state, parsed);
            
            // Heal and validate state
            this.validateAndHealState(this.game.state);

            // Capture the offline-earnings anchor NOW, synchronously — before the async
            // server-time fetch resolves and before any early saveGame() can overwrite it.
            this._offlineAnchor = this.game.state.lastSaveTime;

            // Heal maxBranchUnlocked: never lower than currentBranch (legacy saves may lack the field).
            // NOTE: the old lifetimeCash-threshold heal was removed — its thresholds predated the
            // Deutsche Bank branch insertion and, combined with the forced currentBranch bump below it,
            // teleported players to a higher branch on reload without a prestige reset.
            let maxBranch = this.game.state.maxBranchUnlocked !== undefined ? this.game.state.maxBranchUnlocked : (this.game.state.currentBranch || 0);
            maxBranch = Math.max(maxBranch, this.game.state.currentBranch || 0);
            this.game.state.maxBranchUnlocked = maxBranch;

            this.game.recalculateEps();
            this.game.ensureTellersCount();
            this.game.sanitizeQueueAndTellers();

            // Kick off async server time validation (this will run calculateOfflineEarnings inside it when done)
            this.initServerTime();

        } catch (e) {
            console.error("Failed to load saved game state, resetting.", e);
            // CRIT-3: Gracefully reset to default state on load failure to avoid broken states
            this.game.initDefaultState();
            this.initServerTime();
        }
    }

    getOfflineLimitHours() {
        let limitHours = 2; // Reduced base offline limit to 2 hours
        
        // Accountant manager adds offline time
        if (this.game.state.managers && this.game.state.managers.accountant && this.game.state.managerUpgrades.accountant) {
            const accLvl = this.game.state.managerUpgrades.accountant.level || 1;
            limitHours += (GAME_CONFIG.MANAGER_COEFFICIENTS.accountant.offlineLimitBoost * accLvl);
        }
        
        if (this.game.state.managers && this.game.state.managers.marketing && this.game.state.managerUpgrades.marketing) {
            const mktLvl = this.game.state.managerUpgrades.marketing.level || 1;
            limitHours += (GAME_CONFIG.MANAGER_COEFFICIENTS.marketing.offlineLimitBoost * mktLvl); // +1 hour per level
        }
        // Offline limit boost from service manager (merged from tech)
        const svcMgr = this.game.state.managers && this.game.state.managers.service && this.game.state.managerUpgrades && this.game.state.managerUpgrades.service;
        const svcLvl = svcMgr ? (this.game.state.managerUpgrades.service.level || 1) : 0;
        const svcOfflineBonus = svcMgr ? ((GAME_CONFIG.MANAGER_COEFFICIENTS.service.offlineLimitBoost || 0) * svcLvl) : 0;
        limitHours += svcOfflineBonus;
        
        if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.offlineEarnings) {
            limitHours += (this.game.state.goldUpgrades.offlineEarnings * 2); // +2 hours per level
        }
        
        // Hard cap total offline time at 12 hours as requested by user
        return Math.min(12, limitHours);
    }

    calculateOfflineEarnings() {
        this.game.offlineEarningsReport = 0;

        // Anti-Cheat: calculate delta using verified server time if available
        const now = this.isServerTimeVerified ? (Date.now() + this.serverTimeOffset) : Date.now();
        // Prefer the load-time snapshot (consumed once) over live state, which may have
        // been overwritten by an early save while server-time verification was pending.
        const lastSaveTime = (this._offlineAnchor !== null && this._offlineAnchor !== undefined)
            ? this._offlineAnchor
            : this.game.state.lastSaveTime;
        this._offlineAnchor = null;

        // Guard: if lastSaveTime is 0 (new game / corrupted), skip offline earnings and anchor timestamp
        if (!lastSaveTime || lastSaveTime === 0) {
            this.game.state.lastSaveTime = now;
            return;
        }

        const timePassedMs = now - lastSaveTime;
        if (timePassedMs < -60000) {
            this.game.cheatWarning = true;
            this.game.cheatDetected = true;
        }
        if (timePassedMs <= 0 || isNaN(timePassedMs)) return;
        const timePassedSec = Math.floor(timePassedMs / 1000);
        
        if (timePassedSec < 15) return;

        let offlineCashEarned = 0;
        let limitHours = this.getOfflineLimitHours();
        
        let maxAllowedSec = limitHours * 3600;

        // Anti-Cheat Time-Travel prevention: limit offline earnings to 1 hour max if clock is unverified.
        // Exception: when the device has no network at all, time can't be verified by definition —
        // trust local time so legitimate offline players keep their full earning window
        // (the negative-delta clock-rollback check above still applies).
        if (!this.isServerTimeVerified) {
            const deviceOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
            if (!deviceOffline) {
                maxAllowedSec = Math.min(maxAllowedSec, 3600);
            }
        }

        const elapsedSec = Math.min(timePassedSec, maxAllowedSec);

        if (this.game.state.managers && this.game.state.managers.operations && this.game.state.managers.finance) {
            // Full automation
            let boostTimeActiveOffline = 0;
            if (this.game.state.boost2xTimeLeft > 0) {
                boostTimeActiveOffline = Math.min(elapsedSec, this.game.state.boost2xTimeLeft);
                this.game.state.boost2xTimeLeft = Math.max(0, this.game.state.boost2xTimeLeft - elapsedSec);
            }

            const eps = this.game.getEarningsPerSecond();
            // CRIT-18: Prevent 2x boost double-counting and post-boost 2x earnings exploit
            const baseEps = boostTimeActiveOffline > 0 ? (eps / 2.0) : eps;
            const normalTime = elapsedSec - boostTimeActiveOffline;
            offlineCashEarned = (baseEps * boostTimeActiveOffline * 2.0) + (baseEps * normalTime);

            // Unlike the vault/teller offline modes below, full automation has no capacity
            // cap on offline earnings — throttle it so long offline stretches don't out-earn
            // active play at 1:1 EPS rate.
            offlineCashEarned *= GAME_CONFIG.OFFLINE_FULL_AUTO_EFFICIENCY;

            // Apply accountant income multiplier if active
            if (this.game.state.managers && this.game.state.managers.accountant && this.game.state.managerUpgrades.accountant) {
                const accLvl = this.game.state.managerUpgrades.accountant.level || 1;
                const accountantBoost = 1 + (GAME_CONFIG.MANAGER_COEFFICIENTS.accountant.offlineIncomeBoost * accLvl);
                offlineCashEarned *= accountantBoost;
            }
            
            this.game.state.cash = roundCents(this.game.state.cash + offlineCashEarned);
            this.game.state.lifetimeCash = roundCents(this.game.state.lifetimeCash + offlineCashEarned);
            this.game.offlineEarningsReport = roundCents(offlineCashEarned);
        } 
        else if (this.game.state.managers && this.game.state.managers.operations) {
            // Vault accumulates up to capacity
            const vaultCapacity = this.game.economyManager.getVaultCapacity(this.game.state.vault.level);
            const vaultSpaceLeft = Math.max(0, vaultCapacity - this.game.state.vault.cashStored);
            
            let boostTimeActiveOffline = 0;
            if (this.game.state.boost2xTimeLeft > 0) {
                boostTimeActiveOffline = Math.min(elapsedSec, this.game.state.boost2xTimeLeft);
                this.game.state.boost2xTimeLeft = Math.max(0, this.game.state.boost2xTimeLeft - elapsedSec);
            }
            
            const eps = this.game.getEarningsPerSecond();
            // CRIT-18: Correctly apply 2x boost multiplier to vault offline earnings
            const baseEps = boostTimeActiveOffline > 0 ? (eps / 2.0) : eps;
            const normalTime = elapsedSec - boostTimeActiveOffline;
            let potentialOfflineCash = (baseEps * boostTimeActiveOffline * 2.0) + (baseEps * normalTime);

            // Apply accountant income multiplier before capacity cap so state and report match
            if (this.game.state.managers && this.game.state.managers.accountant && this.game.state.managerUpgrades.accountant) {
                const accountantBoost = 1 + (GAME_CONFIG.MANAGER_COEFFICIENTS.accountant.offlineIncomeBoost * this.game.state.managerUpgrades.accountant.level);
                potentialOfflineCash *= accountantBoost;
            }

            offlineCashEarned = Math.min(vaultSpaceLeft, potentialOfflineCash);
            this.game.state.vault.cashStored = roundCents(this.game.state.vault.cashStored + offlineCashEarned);
            this.game.offlineEarningsReport = roundCents(offlineCashEarned);
        } 
        else {
            // Tellers process up to capacity
            let totalAdded = 0;
            let boostTimeActiveOffline = 0;
            if (this.game.state.boost2xTimeLeft > 0) {
                boostTimeActiveOffline = Math.min(elapsedSec, this.game.state.boost2xTimeLeft);
                this.game.state.boost2xTimeLeft = Math.max(0, this.game.state.boost2xTimeLeft - elapsedSec);
            }
            
            // Compute accountant boost factor before the loop so state and report match
            let accountantBoostFactor = 1;
            if (this.game.state.managers && this.game.state.managers.accountant && this.game.state.managerUpgrades.accountant) {
                const accLvl = this.game.state.managerUpgrades.accountant.level || 1;
                accountantBoostFactor = 1 + (GAME_CONFIG.MANAGER_COEFFICIENTS.accountant.offlineIncomeBoost * accLvl);
            }

            this.game.state.tellers.forEach(t => {
                if (t.unlocked) {
                    const capacity = this.game.economyManager.getTellerCapacity(t.level);
                    const spaceLeft = Math.max(0, capacity - t.cashStored);
                    const speed = this.game.economyManager.getTellerSpeed(t.level);

                    const totalMult = this.game.economyManager.getTotalMultiplier();
                    const isBoosted = boostTimeActiveOffline > 0;
                    const baseMult = isBoosted ? (totalMult / 2.0) : totalMult;

                    const baseReward = this.game.economyManager.getCurrentBaseReward() * baseMult;
                    const boostedReward = baseReward * 2.0;

                    const clientsProcessedBoost = Math.floor(boostTimeActiveOffline / speed);
                    const clientsProcessedNormal = Math.floor((elapsedSec - boostTimeActiveOffline) / speed);

                    const added = Math.min(spaceLeft, ((clientsProcessedBoost * boostedReward) + (clientsProcessedNormal * baseReward)) * accountantBoostFactor);
                    t.cashStored = roundCents(t.cashStored + added);
                    totalAdded += added;
                }
            });

            this.game.offlineEarningsReport = roundCents(totalAdded);
        }
        
        // Sync last save time to now to prevent double-claiming
        this.game.state.lastSaveTime = now;
    }

    checkDailyLogin() {
        // Calendar-day comparison (local time): logging in at 23:00 and again at 08:00
        // the next morning now counts as a new day — the old 24h-window math missed it.
        // Anti-Cheat: use verified server time when available (same as offline earnings)
        // so advancing the device clock forward and back can't be used to farm streak days —
        // a fresh page load re-fetches real-world time regardless of the local clock.
        const now = this.isServerTimeVerified ? (Date.now() + this.serverTimeOffset) : Date.now();
        const lastLogin = this.game.state.lastLoginDate || 0;
        const startOfDay = (t) => {
            const d = new Date(t);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        };
        const daysSince = lastLogin > 0
            ? Math.round((startOfDay(now) - startOfDay(lastLogin)) / 86400000)
            : 1;

        if (daysSince >= 1) {
            this.game.state.loginStreak = (daysSince === 1) ? ((this.game.state.loginStreak || 0) + 1) : 1;
            this.game.state.lastLoginDate = now;
            this.game.state.pendingLoginReward = this.game.getDailyLoginReward(this.game.state.loginStreak);
            // New day, new reward — allow the popup to be attempted again today.
            this.game.state.pendingLoginRewardShown = false;
            this.game.saveGame();
        }
    }
}

window.SaveManager = SaveManager;
