// Defensive fallback for window.gameAudio to prevent crashes if audio.js is delayed/blocked
if (!window.gameAudio) {
    window.gameAudio = {
        playClick: () => {},
        playUnlock: () => {},
        playChaChing: () => {},
        toggleMute: () => false,
        isMuted: true,
        init: () => {}
    };
}


class IdleBankGame {
    constructor() {
        this.cheatDetected = false;
        this.cheatWarning = false;
        
        // Expose configuration properties for public API backward compatibility with ui-draw/ui-tabs
        this.branches = GAME_CONFIG.BRANCHES;
        this.managerUpgradeCosts = GAME_CONFIG.MANAGER_UPGRADE_COSTS;

        this.initDefaultState();
        
        // Instantiate helper managers
        this.saveManager = new SaveManager(this);
        this.economyManager = new EconomyManager(this);
        this.missionController = new MissionController(this);
        this.achievementController = new AchievementController(this);
        this.guardController = new GuardController(this);
        this.customerFlowController = new CustomerFlowController(this);
        this.prestigeController = new PrestigeController(this);
        this.shopController = new ShopController(this);

        // Load state
        this.loadGame();
    }

    // Unlock/hire cost tables, scaled by the branch multiplier only (see
    // EconomyManager.getCostScalingMultiplier). Getters (not constructor-time snapshots) so
    // they stay in sync with the player's current branch. Branch scaling keeps pace consistent
    // across branches (branch N shouldn't clear N-times faster than branch 0 just because it
    // starts with a bigger income multiplier) — prestige shares are deliberately excluded so
    // prices never drift mid-session just from earning shares via ads/missions/prestige.
    get tellerUnlockCosts() {
        const mult = this.economyManager ? this.economyManager.getCostScalingMultiplier() : 1;
        return GAME_CONFIG.TELLER_UNLOCK_COSTS.map(c => Math.round(c * mult));
    }

    get guardUnlockCosts() {
        const mult = this.economyManager ? this.economyManager.getCostScalingMultiplier() : 1;
        return GAME_CONFIG.GUARD_UNLOCK_COSTS.map(c => Math.round(c * mult));
    }

    get managerCosts() {
        const mult = this.economyManager ? this.economyManager.getCostScalingMultiplier() : 1;
        const scaled = {};
        for (const key in GAME_CONFIG.MANAGER_COSTS) {
            scaled[key] = Math.round(GAME_CONFIG.MANAGER_COSTS[key] * mult);
        }
        return scaled;
    }

    // Department unlock cost scales only with the branch multiplier (see
    // EconomyManager.getCostScalingMultiplier) — it steps up when the player advances to a
    // harder branch, but never drifts within a branch just from earning prestige shares.
    getDepartmentUnlockCost(dept) {
        const mult = this.economyManager ? this.economyManager.getCostScalingMultiplier() : 1;
        return Math.round(dept.cost * mult);
    }

    initDefaultState() {
        this.isResetting = false;
        this.cheatDetected = false;
        this.cheatWarning = false;
        this.missionCounter = 0; // Built-in counter to prevent mission ID collisions
        this.lastTellerOffset = 0;
        this.customerCounter = 0;
        this.missionsDirty = false;
        this.cachedEps = 0;
        
        this.state = {
            cash: 2000,                     // Starting cash
            lifetimeCash: 2000,             // For prestige calculations
            shares: 0,                     // Golden Shares
            currentBranch: 0,              // 0: Jerusalem, 1: Tel Aviv, 2: NY, 3: London
            maxBranchUnlocked: 0,
            language: 'en',
            notificationsEnabled: true,
            hapticsEnabled: true,
            onboardingCompleted: false,
            goldUpgrades: {
                startingCash: 0,
                guardSpeed: 0,
                premiumYield: 0,
                shareEfficiency: 0,
                offlineEarnings: 0,
                tellerCapacityBoost: 0,
                vaultCapacityBoost: 0,
                eventBonus: 0,
                managerDiscount: 0
            },
            boost2xTimeLeft: 0,
            tellerSpeedBoostTimer: 0,
            tellerSpeedBoostFactor: 1,

            vault: {
                level: 1,
                cashStored: 0,
                branchBaseCapacity: GAME_CONFIG.VAULT_BASE_CAPACITY
            },

            tellers: [
                { id: 0, unlocked: true, level: 1, cashStored: 50, processingTimeLeft: 0, isProcessing: false },
                { id: 1, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false },
                { id: 2, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false },
                { id: 3, unlocked: false, level: 1, cashStored: 0, processingTimeLeft: 0, isProcessing: false }
            ],

            guards: [
                { id: 0, unlocked: true,  level: 1, loadedCash: 0, position: 0, state: 'idle', timer: 0, targetTellerIndex: 0, tellerVisitQueue: [], segmentPosition: 0, carriedAmount: 0 },
                { id: 1, unlocked: false, level: 1, loadedCash: 0, position: 0, state: 'idle', timer: 0, targetTellerIndex: 0, tellerVisitQueue: [], segmentPosition: 0, carriedAmount: 0 },
                { id: 2, unlocked: false, level: 1, loadedCash: 0, position: 0, state: 'idle', timer: 0, targetTellerIndex: 0, tellerVisitQueue: [], segmentPosition: 0, carriedAmount: 0 }
            ],

            managers: {
                customer: false,
                operations: true,  // operations (guard/couriers) starts hired by default to keep automation running
                finance: false,
                service: false,
                vip: false,
                marketing: false,
                accountant: false
            },
            managerUpgrades: {
                customer: { level: 1, skill: null },
                operations: { level: 1, skill: null },
                finance: { level: 1, skill: null },
                service: { level: 1, skill: null },
                vip: { level: 1, skill: null },
                marketing: { level: 1, skill: null },
                accountant: { level: 1, skill: null }
            },

            departments: [
                { id: 0, name: 'שירותי קופה בסיסיים', unlocked: true, baseReward: 10, cost: 0 },
                { id: 1, name: 'מחלקת הלוואות ומשכנתאות', unlocked: false, baseReward: 60, cost: 10500 },
                { id: 2, name: 'VIP בנקאות פרטית', unlocked: false, baseReward: 450, cost: 240000 },
                { id: 3, name: 'מסחר במניות וקריפטו', unlocked: false, baseReward: 3500, cost: 3600000 },
                { id: 4, name: 'הלבנת הון "חוקית"', unlocked: false, baseReward: 30000, cost: 75000000 }
            ],

            missions: [],
            missionsCompleted: 0,
            achievements: { unlocked: {}, claimed: {}, bonusPercent: 0 },
            stats: {
                clientsServed: 0,
                tellerUpgrades: 0,
                guardUpgrades: 0,
                vaultUpgrades: 0,
                vipServed: 0,
                cashSpent: 0
            },
            advBudget: 0,
            advActive: false,
            queueUpgradeLevel: 1,

            lastSaveTime: Date.now(),
            lastWeeklyReward: Date.now(),

            // Fortune Wheel
            lastSpinTime: 0,
            lastAdSpinTime: 0,
            wheelAdSpinsCount: 0,
            wheelAdSpinsDate: '',

            // VIP Visitor
            nextVipVisit: 0,
            vipVisitActive: false,
            vipVisitExpiry: 0,
            vipServedTotal: 0,
            guardTripsTotal: 0,
            boost2xUsedEver: false,

            // Daily Challenges
            dailyChallenges: [],
            lastDailyReset: 0,

            // Daily Login Bonus
            lastLoginDate: 0,
            loginStreak: 0,
            pendingLoginReward: null,
            pendingLoginRewardShown: false,

            // Branch Welcome Bonus
            visitedBranches: [],

            // Migration flags — prevent re-running one-time data migrations on old saves
            migrations: {},

            // Tutorial (legacy — kept for save compatibility)
            tutorialStep: 0,
            tutorialCompleted: false,

            // Discovery tips — tracks which contextual tips were already shown
            discoveredTips: {},
            
            // Performance mode
            perfMode: 'auto',
            lastMeasuredFps: 0
        };

        this._contextualAdPending = null;
        this.tempQueueBonus = 0;

        this.customerQueue = [];
        this.maxQueueLength = 20;
        this.customerSpawnTimer = 0;
    }

    // --- SAVE AND LOAD DELEGATES ---
    saveGame(force = false) {
        this.saveManager.saveGame(force);
    }

    loadGame() {
        this.saveManager.loadGame();
    }

    clearSave() {
        this.saveManager.clearSave();
    }

    calculateOfflineEarnings() {
        this.saveManager.calculateOfflineEarnings();
    }

    validateAndHealState(state) {
        this.saveManager.validateAndHealState(state);
    }

    // --- ECONOMY DELEGATES ---
    getPrestigeMultiplier() {
        return this.economyManager.getPrestigeMultiplier();
    }

    getBranchMultiplier() {
        return this.economyManager.getBranchMultiplier();
    }

    getMaxTellers() {
        return this.economyManager.getMaxTellers();
    }

    getTotalMultiplier() {
        return this.economyManager.getTotalMultiplier();
    }

    getTellerSpeed(level) {
        const lvl = level !== undefined ? level : 1;
        return this.economyManager.getTellerSpeed(lvl);
    }

    getTellerCapacity(level) {
        const lvl = level !== undefined ? level : 1;
        return this.economyManager.getTellerCapacity(lvl);
    }

    getEventBonusMultiplier() {
        return (this.state.goldUpgrades && this.state.goldUpgrades.eventBonus) 
            ? 1 + (0.20 * this.state.goldUpgrades.eventBonus) 
            : 1;
    }

    getTellerUpgradeCost(level) {
        const lvl = level !== undefined ? level : 1;
        return this.economyManager.getTellerUpgradeCost(lvl);
    }

    getGuardSpeed(level) {
        return this.economyManager.getGuardSpeed(level);
    }

    getGuardCapacity(level) {
        const lvl = level !== undefined ? level : 1;
        return this.economyManager.getGuardCapacity(lvl);
    }

    getGuardUpgradeCost(level) {
        const lvl = level !== undefined ? level : 1;
        return this.economyManager.getGuardUpgradeCost(lvl);
    }

    getVaultCapacity(level) {
        const lvl = level !== undefined ? level : (this.state.vault.level || 1);
        return this.economyManager.getVaultCapacity(lvl);
    }

    getVaultUpgradeCost(level) {
        const lvl = level !== undefined ? level : (this.state.vault.level || 1);
        return this.economyManager.getVaultUpgradeCost(lvl);
    }

    getQueueCapacity(level) {
        const lvl = level !== undefined ? level : (this.state.queueUpgradeLevel || 1);
        return this.economyManager.getQueueCapacity(lvl);
    }

    getBaseQueueCapacity(level) {
        return this.economyManager.getBaseQueueCapacity(level);
    }

    getQueueUpgradeCost(level) {
        return this.economyManager.getQueueUpgradeCost(level);
    }

    getCumulativeUpgradeCost(type, startLevel, targetLevel) {
        return this.economyManager.getCumulativeUpgradeCost(type, startLevel, targetLevel);
    }

    getUpgradeCost(type, id, level) {
        return this.economyManager.getUpgradeCost(type, id, level);
    }

    getBulkUpgradeDetails(type, id, mode, currentLevel, cash) {
        return this.economyManager.getBulkUpgradeDetails(type, id, mode, currentLevel, cash);
    }

    getCurrentBaseReward() {
        return this.economyManager.getCurrentBaseReward();
    }

    getDepartmentReward(id) {
        return this.economyManager.getDepartmentReward(id);
    }

    getEarningsPerSecond() {
        return this.economyManager.getEarningsPerSecond();
    }

    recalculateEps() {
        if (this.economyManager) {
            this.economyManager.recalculateEps();
        }
    }

    // --- MISSION DELEGATES ---
    generateMission() {
        return this.missionController.generateMission();
    }

    checkMissions() {
        if (this.missionController) {
            this.missionController.checkMissions();
        }
    }

    claimMissionReward(id) {
        return this.missionController.claimMissionReward(id);
    }

    // --- ACHIEVEMENT DELEGATES ---
    checkAchievements() {
        return this.achievementController ? this.achievementController.checkAchievements() : [];
    }

    getAchievementProgress(id) {
        return this.achievementController ? this.achievementController.getProgress(id) : { current: 0, target: 1, percent: 0 };
    }

    claimAchievementReward(id) {
        return this.achievementController ? this.achievementController.claimReward(id) : { type: 'none', amount: 0 };
    }

    // --- STATE MANAGEMENT ---
    ensureTellersCount() {
        if (!this.state || !this.state.tellers) return;
        const maxTellers = this.getMaxTellers();
        // Trim excess tellers from old/corrupted saves
        if (this.state.tellers.length > maxTellers) {
            this.state.tellers = this.state.tellers.slice(0, maxTellers);
        }
        while (this.state.tellers.length < maxTellers) {
            const nextId = this.state.tellers.length;
            this.state.tellers.push({
                id: nextId,
                unlocked: false,
                level: 1,
                cashStored: 0,
                processingTimeLeft: 0,
                isProcessing: false
            });
        }
    }

    isManagerUnlocked(type) {
        // 'customer' is unlocked from the start.
        // 'operations' (Alon) is also unlocked by default (and starts hired to automate guards).
        // Other managers unlock only when their corresponding department is unlocked.
        if (type === 'customer' || type === 'operations' || type === 'accountant') return true;
        if (type === 'finance') return !!(this.state.departments && this.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_LOANS)?.unlocked);
        if (type === 'vip') return !!(this.state.departments && this.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_VIP)?.unlocked);
        if (type === 'service') return !!(this.state.departments && this.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_STOCK)?.unlocked);
        if (type === 'marketing') return !!(this.state.departments && this.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_LAUNDERING)?.unlocked);
        return false;
    }


    getGoldUpgradeCost(type) {
        const baseCost = GAME_CONFIG.GOLD_UPGRADE_COSTS[type] || 999;
        const currentLvl = (this.state.goldUpgrades && this.state.goldUpgrades[type]) ? this.state.goldUpgrades[type] : 0;
        // Costs double per level (1x, 2x, 4x, 8x, 16x...)
        const multiplier = Math.pow(2, currentLvl);
        return Math.round(baseCost * multiplier);
    }

    getAdMaxBudget() {
        const branch = this.state.currentBranch || 0;
        const branchMaxBudget = 1000 * Math.pow(10, branch);
        
        // Base budget organically scales with EPS, which is driven entirely by Teller levels/speeds
        let epsBasis = this.getEarningsPerSecond() * 60 * 0.4;
        
        if (this.state.managers && this.state.managers.marketing && this.state.managerUpgrades && this.state.managerUpgrades.marketing) {
            const mktLvl = this.state.managerUpgrades.marketing.level || 1;
            epsBasis = epsBasis * (1 - (0.10 * mktLvl));
        }
        
        // Use a static $100 floor rather than one tied to branch, so right after a prestige
        // (when teller levels reset and EPS is tiny) the campaign remains affordable.
        return Math.min(branchMaxBudget, Math.max(100, epsBasis));
    }

    spendCash(amount) {
        this.state.cash = Math.round((this.state.cash + Number.EPSILON) * 100) / 100;
        if (this.state.cash >= amount) {
            this.state.cash = Math.round((this.state.cash - amount + Number.EPSILON) * 100) / 100;
            if (!this.state.stats.cashSpent) {
                this.state.stats.cashSpent = 0;
            }
            this.state.stats.cashSpent = Math.round((this.state.stats.cashSpent + amount + Number.EPSILON) * 100) / 100;
            return true;
        }
        return false;
    }

    // --- GAME ACTIONS ---
    upgradeEntity(type, id) {
        return this.shopController.upgradeEntity(type, id);
    }

    upgradeEntityBulk(type, id, mode) {
        return this.shopController.upgradeEntityBulk(type, id, mode);
    }

    upgradeTeller(id) {
        return this.shopController.upgradeTeller(id);
    }

    unlockTeller(id) {
        return this.shopController.unlockTeller(id);
    }

    upgradeGuard(id) {
        return this.shopController.upgradeGuard(id);
    }

    unlockGuard(id) {
        return this.shopController.unlockGuard(id);
    }

    upgradeVault() {
        return this.shopController.upgradeVault();
    }

    upgradeQueue() {
        return this.shopController.upgradeQueue();
    }

    upgradeTellerBulk(id, mode) {
        return this.shopController.upgradeTellerBulk(id, mode);
    }

    upgradeGuardBulk(id, mode) {
        return this.shopController.upgradeGuardBulk(id, mode);
    }

    upgradeVaultBulk(mode) {
        return this.shopController.upgradeVaultBulk(mode);
    }

    upgradeQueueBulk(mode) {
        return this.shopController.upgradeQueueBulk(mode);
    }

    hireManager(type) {
        return this.shopController.hireManager(type);
    }

    unlockDepartment(id) {
        return this.shopController.unlockDepartment(id);
    }

    clickTeller(id) {
        return this.customerFlowController.clickTeller(id);
    }

    collectTellerCash(id) {
        const teller = this.state.tellers[id];
        if (!teller || !teller.unlocked || teller.cashStored <= 0) return 0;

        const vaultCapacity = this.getVaultCapacity(this.state.vault.level);
        const vaultAvailableSpace = vaultCapacity - this.state.vault.cashStored;

        if (vaultAvailableSpace <= 0) {
            return 0; // Vault full
        }

        const transAmount = Math.min(teller.cashStored, vaultAvailableSpace);
        teller.cashStored = Math.max(0, Math.round((teller.cashStored - transAmount + Number.EPSILON) * 100) / 100);
        this.state.vault.cashStored = Math.round((this.state.vault.cashStored + transAmount + Number.EPSILON) * 100) / 100;
        return transAmount;
    }


    skipOnboarding() {
        this.state.onboardingCompleted = true;
        this.saveGame();
        if (typeof window !== 'undefined' && window.onboardingManager) {
            window.onboardingManager.cleanup();
        }
    }

    completeOnboarding() {
        this.state.onboardingCompleted = true;
        this.saveGame();
        if (typeof window !== 'undefined' && window.onboardingManager) {
            window.onboardingManager.cleanup();
        }
    }

    collectVault() {
        if (this.state.vault.cashStored <= 0) return 0;
        
        const amount = this.state.vault.cashStored;
        this.state.cash = Math.round((this.state.cash + amount + Number.EPSILON) * 100) / 100;
        this.state.lifetimeCash = Math.round((this.state.lifetimeCash + amount + Number.EPSILON) * 100) / 100;
        this.state.vault.cashStored = 0;
        
        window.gameAudio.playChaChing();
        this.saveGame();
        return amount;
    }

    calculatePrestigeShares() {
        return this.prestigeController.calculatePrestigeShares();
    }

    getDailyLoginReward(streak) {
        return this.prestigeController.getDailyLoginReward(streak);
    }

    prestige(targetBranchIndex, doubleShares = false, bypassCashCheck = false) {
        return this.prestigeController.prestige(targetBranchIndex, doubleShares, bypassCashCheck);
    }

    triggerGuard(id) {
        return this.guardController.trigger(id);
    }

    tickTimer(stateField, dt, onExpire) {
        if (this.state[stateField] && this.state[stateField] > 0) {
            this.state[stateField] -= dt;
            if (this.state[stateField] <= 0.01) {
                this.state[stateField] = 0;
                if (typeof onExpire === 'function') {
                    onExpire();
                }
            }
        }
    }

    addBoost2x(hours = 2) {
        if (this.shopController && typeof this.shopController.addBoost2x === 'function') {
            return this.shopController.addBoost2x(hours);
        }
        const secondsToAdd = hours * 3600;
        const maxSeconds = 24 * 3600;
        this.state.boost2xTimeLeft = Math.min(maxSeconds, (this.state.boost2xTimeLeft || 0) + secondsToAdd);
        if (this.economyManager) this.economyManager.cachedTotalMult = null;
        if (window.gameAudio && typeof window.gameAudio.playUnlock === 'function') {
            window.gameAudio.playUnlock();
        }
        this.saveGame();
        return true;
    }

    // --- GAME LOOP UPDATE ---
    update(dt) {
        this.tickTimer('boost2xTimeLeft', dt, () => { if (this.economyManager) this.economyManager.cachedTotalMult = null; });
        this.tickTimer('tellerSpeedBoostTimer', dt, () => this.recalculateEps());

        const advBudget = this.state.advBudget || 0;
        const wasAdvActive = this.state.advActive;
        if (advBudget > 0) {
            const costThisFrame = advBudget * dt / 60;
            if (this.state.cash >= costThisFrame) {
                this.state.cash = Math.round((this.state.cash - costThisFrame + Number.EPSILON) * 100) / 100;
                this.state.advActive = true;
            } else {
                // Insufficient cash for this frame only: suspend the campaign but keep
                // the configured budget, so it auto-resumes once cash recovers instead
                // of forcing the player to re-drag the slider every time (matches the
                // "Suspended - No cash" UI text, which implies a temporary pause).
                this.state.advActive = false;
            }
        } else {
            this.state.advActive = false;
        }
        if (wasAdvActive !== this.state.advActive && this.economyManager) {
            this.economyManager.cachedTotalMult = null;
        }

        // Customer spawn/queue/teller-processing logic lives in CustomerFlowController
        this.customerFlowController.update(dt);

        // Guard patrol logic lives in GuardController (see guard-controller.js)
        this.guardController.update(dt);

        // Automating Vault emptying (Finance Manager)
        if (this.state.managers.finance && this.state.vault.cashStored > 0) {
            const amt = this.state.vault.cashStored;
            this.state.cash = Math.round((this.state.cash + amt + Number.EPSILON) * 100) / 100;
            this.state.lifetimeCash = Math.round((this.state.lifetimeCash + amt + Number.EPSILON) * 100) / 100;
            this.state.vault.cashStored = 0;
        }

        if (this.missionsDirty) {
            this.checkMissions();
            this.missionsDirty = false;
        }

        // VIP Visitor logic
        const nowMs = Date.now();
        if (!this.state.vipVisitActive) {
            if (!this.state.nextVipVisit || this.state.nextVipVisit === 0) {
                this.state.nextVipVisit = nowMs + (600 + Math.random() * 60) * 1000;
            } else if (nowMs >= this.state.nextVipVisit) {
                if (this.state.boost2xTimeLeft <= 0) {
                    this.state.vipVisitActive = true;
                    this.state.vipVisitExpiry = nowMs + 25000;
                    if (typeof window.triggerVipVisitBanner === 'function') {
                        window.triggerVipVisitBanner();
                    }
                } else {
                    // Boost פעיל — דחה ב-2 דקות
                    this.state.nextVipVisit = nowMs + 120000;
                }
            }
        } else if (this.state.vipVisitExpiry && nowMs > this.state.vipVisitExpiry) {
            this.state.vipVisitActive = false;
            this.state.nextVipVisit = nowMs + (300 + Math.random() * 30) * 1000;
            this.state.vipVisitExpiry = 0;
            if (typeof window.removeVipVisitBanner === 'function') {
                window.removeVipVisitBanner();
            }
        }
    }

    buyGoldUpgrade(type) {
        return this.shopController.buyGoldUpgrade(type);
    }

    upgradeManager(type) {
        return this.shopController.upgradeManager(type);
    }

    upgradeManagerBulk(type, mode) {
        return this.shopController.upgradeManagerBulk(type, mode);
    }

    selectManagerSkill(type, skill) {
        return this.shopController.selectManagerSkill(type, skill);
    }

    resetManagerSkill(type, free = false) {
        return this.shopController.resetManagerSkill(type, free);
    }

    addCash(amount) {
        const prev = this.state.lifetimeCash;
        this.state.cash = Math.round((this.state.cash + amount + Number.EPSILON) * 100) / 100;
        this.state.lifetimeCash = Math.round((this.state.lifetimeCash + amount + Number.EPSILON) * 100) / 100;
        // Trigger contextual ad on cash milestones
        const MILESTONES = [5000, 50000, 500000, 5000000, 50000000, 500000000];
        for (const m of MILESTONES) {
            if (prev < m && this.state.lifetimeCash >= m) {
                this._contextualAdPending = 'milestone';
                break;
            }
        }
        this.saveGame();
    }

    deductVaultCash(amount) {
        if (this.state.vault) {
            this.state.vault.cashStored = Math.max(0, this.state.vault.cashStored - amount);
            this.saveGame();
        }
    }

    triggerSpeedBoost(duration, factor) {
        if (!this.state.tellerSpeedBoostTimer || this.state.tellerSpeedBoostTimer <= 0 || factor >= this.state.tellerSpeedBoostFactor) {
            this.state.tellerSpeedBoostTimer = duration;
            this.state.tellerSpeedBoostFactor = factor;
            this.recalculateEps();
            this.saveGame();
        }
    }

    addShares(amount) {
        // Same 100K wallet cap enforced by prestige()
        this.state.shares = Math.min(100000, (this.state.shares || 0) + amount);
        if (this.economyManager) this.economyManager.cachedTotalMult = null;
        this.saveGame();
    }

    setLanguage(lang) {
        this.state.language = lang;
        this.saveGame();
    }

    setAdvBudget(budget) {
        this.state.advBudget = budget;
        this.saveGame();
    }

    travelToBranch(branchIndex) {
        return this.prestigeController.travelToBranch(branchIndex);
    }

    upgradeManagerLevelDirectly(type, level) {
        if (this.state.managerUpgrades && this.state.managerUpgrades[type]) {
            this.state.managerUpgrades[type].level = level;
            this.recalculateEps();
            this.saveGame();
        }
    }

    triggerTempQueueBonus(amount, durationMs) {
        // NOTE: tempQueueBonus is intentionally a volatile property on the game instance.
        // It does not persist across page reloads. If a reload occurs while active,
        // the bonus resets. The Math.max(0, ...) guard below prevents negative values
        // if a timeout clears after a reload/reset.
        this.tempQueueBonus = (this.tempQueueBonus || 0) + amount;
        if (this._tempQueueBonusTimeout) {
            clearTimeout(this._tempQueueBonusTimeout);
            this._tempQueueBonusTimeout = null;
        }
        this._tempQueueBonusTimeout = setTimeout(() => {
            this.tempQueueBonus = Math.max(0, (this.tempQueueBonus || 0) - amount);
            this._tempQueueBonusTimeout = null;
        }, durationMs);
    }

    shiftQueue(count = 1) {
        return this.customerFlowController.shiftQueue(count);
    }

    clearQueue() {
        return this.customerFlowController.clearQueue();
    }

    sanitizeQueueAndTellers() {
        return this.customerFlowController.sanitizeQueueAndTellers();
    }

    // --- MVC RENDER DATA GETTERS ---
    getTellerRenderData(id) {
        const t = this.state.tellers[id];
        if (!t) return null;
        const speed = this.getTellerSpeed(t.level);
        const capacity = this.getTellerCapacity(t.level);
        const reward = this.getCurrentBaseReward() * this.getTotalMultiplier();
        const ratio = t.cashStored / capacity;
        const fillPercent = Math.min(100, Math.floor(ratio * 100));
        const elapsed = speed - t.processingTimeLeft;
        const progressPercent = t.isProcessing ? Math.min(100, Math.floor((elapsed / speed) * 100)) : 0;
        return {
            id: t.id,
            unlocked: t.unlocked,
            level: t.level,
            cashStored: t.cashStored,
            capacity,
            speed,
            reward,
            fillPercent,
            progressPercent,
            isProcessing: t.isProcessing,
            customerType: t.customerType,
            customerSeed: t.customerSeed
        };
    }

    getGuardRenderData(id) {
        const g = this.state.guards[id];
        if (!g) return null;
        const speed = this.getGuardSpeed(g.level);
        const capacity = this.getGuardCapacity(g.level);
        return {
            id: g.id,
            unlocked: g.unlocked,
            level: g.level,
            loadedCash: g.loadedCash,
            capacity,
            speed,
            position: g.segmentPosition !== undefined ? g.segmentPosition : g.position,
            state: g.state,
            timer: g.timer,
            targetTellerIndex: g.targetTellerIndex || 0,
            carriedAmount: g.carriedAmount || 0,
            tellerVisitQueue: g.tellerVisitQueue || []
        };
    }

    getVaultRenderData() {
        const vault = this.state.vault;
        const capacity = this.getVaultCapacity(vault.level);
        const fillRatio = vault.cashStored / capacity;
        const fillPercent = Math.min(100, Math.floor(fillRatio * 100));
        const yieldPerHour = this.getEarningsPerSecond() * 3600;
        return {
            level: vault.level,
            cashStored: vault.cashStored,
            capacity,
            fillPercent,
            yieldPerHour
        };
    }

    getQueueRenderData() {
        const level = this.state.queueUpgradeLevel || 1;
        const capacity = this.getQueueCapacity(level);
        const currentLen = this.customerQueue.length;
        const fillRatio = currentLen / capacity;
        const fillPercent = Math.min(100, Math.floor(fillRatio * 100));
        return {
            level,
            capacity,
            currentLen,
            fillPercent
        };
    }

    getManagerRenderData(type) {
        const isUnlocked = this.isManagerUnlocked(type);
        const isHired = this.state.managers[type];
        const cost = this.managerCosts[type];
        const mgrDetails = this.state.managerUpgrades[type] || { level: 1, skill: null };
        const level = mgrDetails.level || 1;

        // Calculate contribution and extraHourly
        const eps = this.getEarningsPerSecond();
        let contribution = 0;
        const coefs = GAME_CONFIG.MANAGER_COEFFICIENTS[type];
        if (isHired && coefs && coefs.incomeBoost) {
            contribution = coefs.incomeBoost * level;
        }
        const extraHourly = eps * 3600 * contribution;

        // Stats calculation
        let stat1Val = '';
        let stat2Val = '';
        if (!coefs) {
            return { type, isUnlocked, isHired, cost, level, extraHourly, stat1Val, stat2Val };
        }
        if (type === 'customer') {
            stat1Val = `+${Math.round(coefs.spawnIntervalBoost * 100 * level)}%`;
            stat2Val = `+${Math.round(coefs.incomeBoost * 100 * level)}%`;
        } else if (type === 'finance') {
            const lang = this.state.language || 'en';
            const tAuto = (typeof translations !== 'undefined' && translations[lang] && translations[lang].autoText) ? translations[lang].autoText : 'Auto';
            stat1Val = tAuto;
            stat2Val = `+${Math.round(coefs.deptIncomeBoost * 100 * level)}%`;
        } else if (type === 'operations') {
            stat1Val = `+${Math.round(coefs.guardSpeedBoost * 100 * level)}%`;
            stat2Val = `+${Math.round(coefs.guardCapBoost * 100 * level)}%`;
        } else if (type === 'service') {
            stat1Val = `+${Math.round(coefs.capacityBoost * 100 * level)}%`;
            stat2Val = `+${Math.round(coefs.epsBoost * 100 * level)}%`;
        } else if (type === 'vip') {
            stat1Val = `+${Math.round(coefs.incomeBoost * 100 * level)}%`;
            stat2Val = `+${Math.round(coefs.prestigeSharesBoost * 100 * level)}%`;
        } else if (type === 'marketing') {
            stat1Val = `+${Math.round(coefs.adBoost * 100 * level)}%`;
            stat2Val = `+${coefs.offlineLimitBoost * level}`;
        } else if (type === 'accountant') {
            stat1Val = `+${coefs.offlineLimitBoost * level}h`;
            stat2Val = `+${Math.round(coefs.offlineIncomeBoost * 100 * level)}%`;
        }

        return {
            type,
            isUnlocked,
            isHired,
            cost,
            level,
            extraHourly,
            stat1Val,
            stat2Val
        };
    }
}

window.IdleBankGame = IdleBankGame;
