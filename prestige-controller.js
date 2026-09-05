// Prestige & branch progression — extracted verbatim from IdleBankGame
// (REFACTOR_PLAN phase 3): gold-share calculation, daily-login reward table,
// the full prestige reset flow, and branch travel.
// Operates directly on game.state; no state-shape or save-format changes.
// game.js keeps thin facades for the UI layer and SaveManager.
class PrestigeController {
    constructor(game) {
        this.game = game;
    }

    calculatePrestigeShares() {
        const game = this.game;
        const currentBranch = (game.state && typeof game.state.currentBranch === 'number') ? game.state.currentBranch : 0;
        const caps = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.BRANCH_PRESTIGE_CAPS) ? GAME_CONFIG.BRANCH_PRESTIGE_CAPS : [800, 1800, 2600, 6000, 10000];
        const baseGain = caps[currentBranch] !== undefined ? caps[currentBranch] : (caps[0] || 800);
        return baseGain;
    }

    getDailyLoginReward(streak) {
        const game = this.game;
        const eps = game.getEarningsPerSecond();
        // Share/gold tiers used to be flat numbers that stayed relevant early on but became
        // trivial once a player's prestige gain grows into the thousands. Scale them against
        // calculatePrestigeShares() (the same "shares you'd gain by prestiging right now" metric
        // used elsewhere) so late-game players still get a meaningful daily reward, while the
        // Math.max floor keeps new players' rewards identical to the old fixed values.
        const prestigeShares = typeof game.calculatePrestigeShares === 'function' ? game.calculatePrestigeShares() : 0;
        if (streak >= 30) return { type: 'shares', value: Math.max(20, Math.ceil(prestigeShares * 0.10)) };
        if (streak >= 14) return { type: 'shares', value: Math.max(6, Math.ceil(prestigeShares * 0.04)) };
        if (streak >= 7)  return { type: 'shares', value: Math.max(2, Math.ceil(prestigeShares * 0.02)) };
        if (streak >= 5)  return { type: 'boost', value: 3600 };
        if (streak >= 3)  return { type: 'gold', value: Math.max(2, Math.ceil(prestigeShares * 0.01)) };
        if (streak >= 2)  return { type: 'cash', value: Math.max(1000, eps * 3600) };
        return { type: 'cash', value: Math.max(360, eps * 600) };
    }

    prestige(targetBranchIndex, doubleShares = false, bypassCashCheck = false) {
        const game = this.game;
        game.isResetting = true;
        const currentBranch = (game.state && typeof game.state.currentBranch === 'number') ? game.state.currentBranch : 0;

        let baseSharesGained = game.calculatePrestigeShares();
        let sharesGained = doubleShares ? (baseSharesGained * 3) : baseSharesGained;

        const thresholdRatio = (typeof GAME_CONFIG !== 'undefined' && typeof GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO === 'number') ? GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO : 0.90;
        const minReq = game.branches[currentBranch].minCashToPrestige * thresholdRatio;
        if (!bypassCashCheck && game.state.cash < minReq) {
            game.isResetting = false;
            return false;
        }

        // Apply Prestige — total wallet shares capped at 100,000
        game.state.shares = Math.min(100000, (game.state.shares || 0) + sharesGained);
        
        if (!game.state.stats) game.state.stats = {};
        // Save base shares before x3 ad multiplier to preserve clean 90% threshold tracking
        game.state.stats.lastPrestigeBaseShares = baseSharesGained;
        game.state.stats.claimedPrestigeShares = (game.state.stats.claimedPrestigeShares || 0) + baseSharesGained;
        game.state.stats.prestigeCount = (game.state.stats.prestigeCount || 0) + 1;

        game.state.currentBranch = targetBranchIndex;
        game.state.maxBranchUnlocked = Math.max(game.state.maxBranchUnlocked || 0, targetBranchIndex);
        
        // Reset cash based on starting cash options in GAME_CONFIG
        const startingCashLevel = (game.state.goldUpgrades && game.state.goldUpgrades.startingCash) ? game.state.goldUpgrades.startingCash : 0;
        const startingCashOptions = GAME_CONFIG.STARTING_CASH_OPTIONS;

        // Branch Welcome Bonus: isNewBranch checked before reset, amount computed after recalculateEps
        const isNewBranch = !game.state.visitedBranches || !game.state.visitedBranches.includes(targetBranchIndex);

        const savedShares = game.state.shares;
        const savedMaxBranch = game.state.maxBranchUnlocked;
        const savedGoldUpgrades = game.state.goldUpgrades;
        const savedLanguage = game.state.language;
        const savedStats = game.state.stats;
        // Achievements are documented as permanent ("never resets on prestige" — see
        // ACHIEVEMENTS in config.js) but were missing from this save/restore list, so
        // initDefaultState() below was silently wiping unlocked achievements (and the
        // permanent income bonus they grant) on every single prestige.
        const savedAchievements = game.state.achievements;
        const savedMissionsCompleted = game.state.missionsCompleted;
        const savedLastWeeklyReward = game.state.lastWeeklyReward;
        const savedLastSpinTime = game.state.lastSpinTime;
        const savedLastAdSpinTime = game.state.lastAdSpinTime || 0;
        const savedVisitedBranches = Array.isArray(game.state.visitedBranches) ? [...game.state.visitedBranches] : [];
        const savedLoginDate = game.state.lastLoginDate || 0;
        const savedLoginStreak = game.state.loginStreak || 0;
        const savedPendingLoginReward = game.state.pendingLoginReward || null;
        const savedBoost2xUsedEver = game.state.boost2xUsedEver || false;
        const savedBoost2xTimeLeft = game.state.boost2xTimeLeft || 0;
        const savedDailyChallenges = game.state.dailyChallenges;
        const savedLastDailyReset = game.state.lastDailyReset;
        const savedMigrations = game.state.migrations ? Object.assign({}, game.state.migrations) : {};
        const savedTutorialCompleted = game.state.tutorialCompleted || false;
        const savedTutorialStep = game.state.tutorialStep || 0;
        const savedDiscoveredTips = game.state.discoveredTips ? Object.assign({}, game.state.discoveredTips) : {};

        if (game._tempQueueBonusTimeout) { clearTimeout(game._tempQueueBonusTimeout); game._tempQueueBonusTimeout = null; }
        game.initDefaultState();

        game.state.shares = savedShares;
        game.state.currentBranch = targetBranchIndex;
        game.state.maxBranchUnlocked = savedMaxBranch;
        game.state.goldUpgrades = savedGoldUpgrades;
        game.state.language = savedLanguage;
        game.state.stats = savedStats;
        game.state.achievements = savedAchievements;
        game.state.missionsCompleted = savedMissionsCompleted;
        game.state.lastWeeklyReward = savedLastWeeklyReward;
        game.state.lastSpinTime = savedLastSpinTime;
        game.state.lastAdSpinTime = savedLastAdSpinTime;
        game.state.lastLoginDate = savedLoginDate;
        game.state.loginStreak = savedLoginStreak;
        game.state.pendingLoginReward = savedPendingLoginReward;
        game.state.boost2xUsedEver = savedBoost2xUsedEver;
        game.state.boost2xTimeLeft = savedBoost2xTimeLeft;
        game.state.dailyChallenges = savedDailyChallenges;
        game.state.lastDailyReset = savedLastDailyReset;
        game.state.migrations = savedMigrations;
        game.state.tutorialCompleted = savedTutorialCompleted;
        game.state.tutorialStep = savedTutorialStep;
        game.state.discoveredTips = savedDiscoveredTips;

        // Restore visitedBranches and add targetBranch if new
        if (!savedVisitedBranches.includes(targetBranchIndex)) {
            savedVisitedBranches.push(targetBranchIndex);
        }
        game.state.visitedBranches = savedVisitedBranches;

        // Auto-discover all basic tutorial tips to prevent them from showing after prestige
        game.state.discoveredTips.start = true;
        game.state.discoveredTips.vault = true;
        game.state.discoveredTips.guard = true;
        game.state.discoveredTips.dept = true;
        game.state.discoveredTips.manager = true;
        game.state.discoveredTips.prestige = true;

        // Reset cash based on starting cash options in GAME_CONFIG
        game.state.cash = Math.round(((startingCashOptions[startingCashLevel] || 180) + Number.EPSILON) * 100) / 100;
        game.state.lifetimeCash = game.state.cash;

        // Generate initial missions
        game.state.missions = [];
        for (let i = 0; i < 5; i++) {
            game.state.missions.push(game.generateMission());
        }
        
        game.sanitizeQueueAndTellers();
        game.customerSpawnTimer = 0;
        
        // Spawn 3 initial customers immediately
        for (let i = 0; i < 3; i++) {
            game.customerCounter++;
            game.customerQueue.push({ id: 'c_' + game.customerCounter, type: 'normal', seed: Math.floor(Math.random() * 1000) });
        }
        
        window.gameAudio.playUnlock();
        game.recalculateEps();

        // Vault floor: size this branch's level-1 vault capacity so it can absorb at least
        // 1.5x a single guard delivery right after the reset. Branch multiplier can jump
        // 5x-200x between branches, but getVaultCapacity()'s formula deliberately has zero
        // live coupling to it (see economy-manager.js) — without this, a fresh level-1 vault
        // can be smaller than one guard's carry capacity, freezing the guard the moment it
        // tries to deposit (guard-controller.js: vaultSpaceLeft <= 0 -> guard goes idle).
        // Computed once, here, from the just-reset state (new branch, restored shares,
        // default managers) — NOT recomputed afterward, so vault leveling for the rest of
        // this branch stays pure per-level investment like before.
        game.state.vault.branchBaseCapacity = Math.max(
            GAME_CONFIG.VAULT_BASE_CAPACITY,
            Math.round(game.economyManager.getGuardCapacity(1) * 1.5)
        );
        game.economyManager._cachedVaultCap = new Map();

        // Branch Welcome Bonus: computed here so EPS reflects the new branch
        const welcomeBonusCash = isNewBranch ? (game.getEarningsPerSecond() * 60) : 0;
        if (isNewBranch && welcomeBonusCash > 0) {
            game.state.cash = Math.round((game.state.cash + welcomeBonusCash + Number.EPSILON) * 100) / 100;
            game.state.lifetimeCash = Math.round((game.state.lifetimeCash + welcomeBonusCash + Number.EPSILON) * 100) / 100;
            if (typeof window.showToast === 'function') {
                const lang = game.state.language || 'en';
                const tObj = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : null;
                const branchName = (tObj && tObj.branches && tObj.branches.names && tObj.branches.names[targetBranchIndex])
                    ? tObj.branches.names[targetBranchIndex]
                    : (game.branches && game.branches[targetBranchIndex] ? game.branches[targetBranchIndex].name : ('Branch ' + targetBranchIndex));
                const amt = Math.round(welcomeBonusCash).toLocaleString();
                const msg = (tObj && typeof tObj.welcomeBonusMsg === 'function')
                    ? tObj.welcomeBonusMsg(branchName, amt)
                    : ('Welcome to ' + branchName + '! You received $' + amt + ' as an opening gift.');
                window.showToast(msg, 'success');
            }
        }

        // Rebase daily_earn_cash so progress earned before prestige survives.
        // Accumulated progress is banked in baseProgress (always >= 0) instead of encoding it
        // as a negative startProgress, which validateAndHealState() would clamp back to 0.
        game.state.dailyChallenges.forEach(c => {
            if (c.completed || c.claimed || c.type !== 'daily_earn_cash') return;
            c.baseProgress = (c.baseProgress || 0) + (c.progress || 0);
            c.startProgress = game.state.lifetimeCash;
        });

        game.isResetting = false;
        game.saveGame(true); // Force save immediately during prestige

        // Update branch name in DOM immediately
        const _pLang = game.state.language || (typeof window !== 'undefined' && window.gameLanguage) || 'he';
        const _pTObj = (typeof translations !== 'undefined' && translations[_pLang]) ? translations[_pLang] : null;
        const _pBranchName = (_pTObj && _pTObj.branches && _pTObj.branches.names && _pTObj.branches.names[targetBranchIndex])
            || (game.branches && game.branches[targetBranchIndex] ? game.branches[targetBranchIndex].name : ('Branch ' + targetBranchIndex));
        const _pBranchEl = (typeof DOM_CACHE !== 'undefined' && DOM_CACHE.branchName) || (typeof document !== 'undefined' && document.getElementById('branch-name'));
        if (_pBranchEl) {
            _pBranchEl.innerText = ((_pTObj && _pTObj.bankPrefix) || '') + _pBranchName;
        }
        if (typeof window !== 'undefined' && typeof window.applyLanguage === 'function') {
            window.applyLanguage(_pLang);
        }

        return true;
    }

    travelToBranch(branchIndex) {
        const game = this.game;
        if (branchIndex < game.state.currentBranch) {
            console.warn("Traveling back to older branches is disabled.");
            return;
        }
                game.state.currentBranch = branchIndex;
        const _tLang = game.state.language || (typeof window !== 'undefined' && window.gameLanguage) || 'he';
        const _tTObj = (typeof translations !== 'undefined' && translations[_tLang]) ? translations[_tLang] : null;
        const _tBranchName = (_tTObj && _tTObj.branches && _tTObj.branches.names && _tTObj.branches.names[branchIndex])
            || (game.branches && game.branches[branchIndex] ? game.branches[branchIndex].name : ('Branch ' + branchIndex));
        const _tBranchEl = (typeof DOM_CACHE !== 'undefined' && DOM_CACHE.branchName) || (typeof document !== 'undefined' && document.getElementById('branch-name'));
        if (_tBranchEl) {
            _tBranchEl.innerText = ((_tTObj && _tTObj.bankPrefix) || '') + _tBranchName;
        }
        game.state.missions = [];
        game.ensureTellersCount();
        game.checkMissions();
        game.sanitizeQueueAndTellers();
        game.recalculateEps();
        game.saveGame(true); // Force save on travel
    }
}
