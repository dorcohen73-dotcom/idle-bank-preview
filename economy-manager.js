class EconomyManager {
    constructor(game) {
        this.game = game;
        this.cachedTotalMult = null;
        this._cachedVaultCap = new Map();
        this._cachedTellerCap = null;
        this._cachedGuardCap = null;
    }

    getPrestigeMultiplier() {
        const goldUpgrades = this.game.state.goldUpgrades || {};
        const shareEfficiency = goldUpgrades.shareEfficiency || 0;
        const shares = this.game.state.shares || 0;
        const shareVal = 0.05 + shareEfficiency * 0.01;
        return 1 + (shares * shareVal);
    }

    getBranchMultiplier() {
        const branchIndex = this.game.state.currentBranch || 0;
        const branch = GAME_CONFIG.BRANCHES[branchIndex] || GAME_CONFIG.BRANCHES[0];
        return branch.baseMultiplier;
    }

    getMaxTellers() {
        const branchIndex = this.game.state.currentBranch || 0;
        return Math.min(this.game.tellerUnlockCosts.length, 4 + branchIndex);
    }

    // Unlock/upgrade cost scaling uses ONLY the branch multiplier, so prices stay fixed while
    // playing a branch and only step up when the player advances to a harder branch (a
    // deliberate, visible milestone — not a silent drift). Prestige shares deliberately do NOT
    // factor in here (unlike getTotalMultiplier, where they boost income): shares are earned
    // continuously via ads/missions/prestige, and letting them also inflate costs made prices
    // creep up mid-session with no player-facing trigger, which read as a bug rather than
    // progression.
    getCostScalingMultiplier() {
        return 1;
    }

    getTotalMultiplier() {
        if (this.cachedTotalMult !== null && this.cachedTotalMult !== undefined) {
            return this.cachedTotalMult;
        }
        let mult = this.getBranchMultiplier() * this.getPrestigeMultiplier();
        
        // Add premiumYield gold upgrade boost (+10% per level)
        if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.premiumYield) {
            mult *= (1 + this.game.state.goldUpgrades.premiumYield * 0.10);
        }
        
        // Add 2x Income Boost!
        if (this.game.state.boost2xTimeLeft && this.game.state.boost2xTimeLeft > 0) {
            mult *= 2.0;
        }

        // Manager Yield Boosts
        if (this.game.state.managers && this.game.state.managerUpgrades) {
            if (this.game.state.managers.customer && this.game.state.managerUpgrades.customer) {
                const lvl = this.game.state.managerUpgrades.customer.level || 1;
                mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.customer.incomeBoost * lvl);
            }
            if (this.game.state.managers.finance && this.game.state.managerUpgrades.finance) {
                const lvl = this.game.state.managerUpgrades.finance.level || 1;
                mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.finance.incomeBoost * lvl);
                const hasHigherDept = this.game.state.departments && this.game.state.departments.some(d => d.id > 0 && d.unlocked);
                if (hasHigherDept) {
                    mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.finance.deptIncomeBoost * lvl);
                }
            }
            if (this.game.state.managers.service && this.game.state.managerUpgrades.service) {
                const lvl = this.game.state.managerUpgrades.service.level || 1;
                mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.service.incomeBoost * lvl);
            }
            if (this.game.state.managers.vip && this.game.state.managerUpgrades.vip) {
                const lvl = this.game.state.managerUpgrades.vip.level || 1;
                mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.vip.incomeBoost * lvl);
            }
        }
        // Marketing fix: adBoost when advertising is active
        if (this.game.state.managers && this.game.state.managers.marketing && this.game.state.managerUpgrades && this.game.state.managerUpgrades.marketing) {
            if (this.game.state.advBudget > 0 && this.game.state.advActive) {
                const mktLvl = this.game.state.managerUpgrades.marketing.level || 1;
                mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.marketing.adBoost * mktLvl);
            }
        }
        // Service manager EPS boost (merged from tech)
        if (this.game.state.managers && this.game.state.managers.service && this.game.state.managerUpgrades && this.game.state.managerUpgrades.service) {
            const svcLvl = this.game.state.managerUpgrades.service.level || 1;
            mult *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.service.epsBoost * svcLvl);
        }

        // Achievements: small permanent global bonus, sum of all unlocked achievements' bonusPercent
        if (this.game.state.achievements && this.game.state.achievements.bonusPercent) {
            mult *= (1 + this.game.state.achievements.bonusPercent);
        }

        this.cachedTotalMult = mult;
        return mult;
    }

    // Tellers Formulas
    getTellerSpeed(level) {
        const baseSpeed = Math.max(GAME_CONFIG.TELLER_MIN_SPEED, GAME_CONFIG.TELLER_BASE_SPEED - (level - 1) * GAME_CONFIG.TELLER_SPEED_LEVEL_STEP);
        let speedFactor = 1.0;
        
        if (this.game.state.managers && this.game.state.managers.operations && this.game.state.managerUpgrades && this.game.state.managerUpgrades.operations) {
            const opsLvl = this.game.state.managerUpgrades.operations.level || 1;
            speedFactor *= Math.max(0.10, 1 - (opsLvl - 1) * GAME_CONFIG.TELLER_SKILL_SPEED_DECAY); // -3% processing duration per level starting from lvl 1
        }
        
        let finalSpeed = baseSpeed * speedFactor;

        if (this.game.state.tellerSpeedBoostTimer && this.game.state.tellerSpeedBoostTimer > 0) {
            const boostFactor = this.game.state.tellerSpeedBoostFactor || 1;
            finalSpeed = finalSpeed / boostFactor;
        }
        
        return Math.max(GAME_CONFIG.TELLER_ABSOLUTE_MIN_SPEED, finalSpeed);
    }

    getTellerCapacity(level) {
        if (!this._cachedTellerCap) this._cachedTellerCap = new Map();
        if (this._cachedTellerCap.has(level)) return this._cachedTellerCap.get(level);

        const speed = this.getTellerSpeed(level);
        const baseRewardForTick = this.getCurrentBaseReward() || 10;
        const finalRewardForTick = baseRewardForTick * (this.getTotalMultiplier() || 1);
        
        const maxLvl = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TELLER_MAX_LEVEL) || 99;
        const bonusRate = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TELLER_POST_MAX_BONUS_PER_LEVEL) || 0.005;
        const bonus = 1 + Math.max(0, level - maxLvl) * bonusRate;

        // 5 minutes of profit for this specific teller with post-99 level bonus
        let cap = (finalRewardForTick / speed) * 300 * bonus;

        if (this.game.state.managers && this.game.state.managers.service && this.game.state.managerUpgrades && this.game.state.managerUpgrades.service) {
            const svcLvl = this.game.state.managerUpgrades.service.level || 1;
            cap = Math.round(cap * (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.service.capacityBoost * svcLvl)); // +5% desk capacity per level
        }

        if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.tellerCapacityBoost) {
            cap = Math.round(cap * (1 + 0.10 * this.game.state.goldUpgrades.tellerCapacityBoost)); // +10% per level
        }

        cap = Math.round(cap);

        // Ensure it doesn't drop below the old base calculation in very early game
        let oldBase = Math.round(GAME_CONFIG.TELLER_BASE_CAPACITY * Math.pow(GAME_CONFIG.TELLER_CAPACITY_GROWTH, level - 1));
        cap = Math.max(cap, oldBase);

        this._cachedTellerCap.set(level, cap);
        return cap;
    }

    getTellerUpgradeCost(level) {
        const baseCost = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TELLER_BASE_UPGRADE_COST) || 60;
        
        let base;
        if (level <= 10) {
            base = baseCost * Math.pow(1.12, level - 1);
        } else if (level <= 25) {
            const costAt10 = baseCost * Math.pow(1.12, 9);
            base = costAt10 * Math.pow(1.18, level - 10);
        } else if (level <= 50) {
            const costAt10 = baseCost * Math.pow(1.12, 9);
            const costAt25 = costAt10 * Math.pow(1.18, 15);
            base = costAt25 * Math.pow(1.28, level - 25);
        } else if (level <= 99) {
            const costAt10 = baseCost * Math.pow(1.12, 9);
            const costAt25 = costAt10 * Math.pow(1.18, 15);
            const costAt50 = costAt25 * Math.pow(1.28, 25);
            base = costAt50 * Math.pow(1.35, level - 50);
        } else {
            const costAt10 = baseCost * Math.pow(1.12, 9);
            const costAt25 = costAt10 * Math.pow(1.18, 15);
            const costAt50 = costAt25 * Math.pow(1.28, 25);
            const costAt99 = costAt50 * Math.pow(1.35, 49);
            base = costAt99 * Math.pow(1.08, level - 99);
        }
        return Math.round(base * this.getCostScalingMultiplier());
    }

    // Guards Formulas
    getGuardSpeed(level) {
        const baseSpeed = Math.max(GAME_CONFIG.GUARD_MIN_SPEED, GAME_CONFIG.GUARD_BASE_SPEED - (level - 1) * GAME_CONFIG.GUARD_SPEED_LEVEL_STEP);
        let speedFactor = 1.0;
        
        if (this.game.state.managers && this.game.state.managers.operations && this.game.state.managerUpgrades && this.game.state.managerUpgrades.operations) {
            const opsLvl = this.game.state.managerUpgrades.operations.level || 1;
            speedFactor *= Math.max(0.10, 1 - (opsLvl - 1) * GAME_CONFIG.GUARD_SKILL_SPEED_DECAY); // -4% transit time per level starting from lvl 1
        }
        
        // Guard speed gold upgrade: -10% per level
        if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.guardSpeed) {
            speedFactor *= Math.max(0.10, 1 - this.game.state.goldUpgrades.guardSpeed * GAME_CONFIG.GUARD_SPEED_GOLD_UPGRADE_FACTOR);
        }
        
        return Math.max(GAME_CONFIG.GUARD_ABSOLUTE_MIN_SPEED, baseSpeed * speedFactor);
    }

    getGuardCapacity(level) {
        if (!this._cachedGuardCap) this._cachedGuardCap = new Map();
        if (this._cachedGuardCap.has(level)) return this._cachedGuardCap.get(level);

        // Level-based, growing at the same rate as teller capacity (GUARD_CAPACITY_GROWTH ===
        // TELLER_CAPACITY_GROWTH) so the guard keeps pace with cash piling up at tellers across
        // the whole progression — see config.js for the reasoning.
        let cap = Math.round(GAME_CONFIG.GUARD_BASE_CAPACITY * Math.pow(GAME_CONFIG.GUARD_CAPACITY_GROWTH, level - 1));
        cap = Math.round(cap * this.getTotalMultiplier());

        if (this.game.state.managers && this.game.state.managers.operations) {
            cap = Math.round(cap * GAME_CONFIG.GUARD_AUTO_CAPACITY_FACTOR);
            if (this.game.state.managerUpgrades && this.game.state.managerUpgrades.operations) {
                const opsCapLvl = this.game.state.managerUpgrades.operations.level || 1;
                cap = Math.round(cap * (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.operations.guardCapBoost * opsCapLvl));
            }
        }
        
        cap = Math.round(cap);
        
        this._cachedGuardCap.set(level, cap);
        return cap;
    }

    getGuardUpgradeCost(level) {
        const base = GAME_CONFIG.GUARD_BASE_UPGRADE_COST * Math.pow(GAME_CONFIG.GUARD_UPGRADE_COST_GROWTH, level - 1);
        return Math.round(base * this.getCostScalingMultiplier());
    }

    // Vault Formulas
    getVaultCapacity(level) {
        if (this._cachedVaultCap.has(level)) return this._cachedVaultCap.get(level);

        const baseCapacity = (this.game.state.vault && this.game.state.vault.branchBaseCapacity >= GAME_CONFIG.VAULT_BASE_CAPACITY)
            ? this.game.state.vault.branchBaseCapacity
            : GAME_CONFIG.VAULT_BASE_CAPACITY;
        let cap = baseCapacity * Math.pow(GAME_CONFIG.VAULT_CAPACITY_GROWTH, level - 1);
        cap = cap * this.getTotalMultiplier();

        if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.vaultCapacityBoost) {
            cap = cap * (1 + 0.10 * this.game.state.goldUpgrades.vaultCapacityBoost); // +10% per level
        }

        cap = Math.round(cap);

        this._cachedVaultCap.set(level, cap);
        return cap;
    }

    getVaultUpgradeCost(level) {
        const base = GAME_CONFIG.VAULT_BASE_UPGRADE_COST * Math.pow(GAME_CONFIG.VAULT_UPGRADE_COST_GROWTH, level - 1);
        return Math.round(base * this.getCostScalingMultiplier());
    }

    // Queue Lobby Formulas
    getBaseQueueCapacity(level) {
        const branchBonus = (this.game.state.currentBranch || 0) * GAME_CONFIG.QUEUE_BRANCH_BONUS_FACTOR;
        return GAME_CONFIG.QUEUE_BASE_CAPACITY + (level - 1) * GAME_CONFIG.QUEUE_CAPACITY_STEP + branchBonus;
    }

    getQueueCapacity(level) {
        const base = this.getBaseQueueCapacity(level);
        // Capacity depends only on the queue/lobby upgrade level (plus tempQueueBonus,
        // a separate one-off reward mechanic) - deliberately NOT on ad spend. Ad
        // campaigns affect arrival rate (see game.js update()), not how many people
        // can physically wait in the lobby.
        return base + (this.game.tempQueueBonus || 0);
    }

    getQueueUpgradeCost(level) {
        const base = GAME_CONFIG.QUEUE_BASE_UPGRADE_COST * Math.pow(GAME_CONFIG.QUEUE_UPGRADE_COST_GROWTH, level - 1);
        return Math.round(base * this.getCostScalingMultiplier());
    }

    getCumulativeUpgradeCost(type, startLevel, targetLevel) {
        let total = 0;
        for (let lvl = startLevel; lvl < targetLevel; lvl++) {
            if (type === 'teller') {
                total += this.getTellerUpgradeCost(lvl);
            } else if (type === 'guard') {
                total += this.getGuardUpgradeCost(lvl);
            } else if (type === 'vault') {
                total += this.getVaultUpgradeCost(lvl);
            } else if (type === 'queue') {
                total += this.getQueueUpgradeCost(lvl);
            }
        }
        return total;
    }

    getUpgradeCost(type, id, level) {
        if (type === 'teller') return this.getTellerUpgradeCost(level);
        if (type === 'guard') return this.getGuardUpgradeCost(level);
        if (type === 'vault') return this.getVaultUpgradeCost(level);
        if (type === 'queue') return this.getQueueUpgradeCost(level);
        if (type === 'manager') {
            const costs = GAME_CONFIG.MANAGER_UPGRADE_COSTS[id] || GAME_CONFIG.MANAGER_UPGRADE_COSTS_DEFAULT;
            let cost = (costs[level] || 0) * this.getCostScalingMultiplier();
            if (this.game.state.goldUpgrades && this.game.state.goldUpgrades.managerDiscount) {
                cost = cost * (1 - 0.05 * this.game.state.goldUpgrades.managerDiscount); // -5% per level
            }
            return Math.round(cost);
        }
        return 0;
    }

    getBulkUpgradeDetails(type, id, mode, currentLevel, cash) {
        const startLevel = currentLevel;
        let maxLvl = 999;
        if (type === 'teller') maxLvl = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.getTellerTieredMaxLevel ? GAME_CONFIG.getTellerTieredMaxLevel(id) : ((Number(id) || 0) + 1) * 100);
        if (type === 'queue') maxLvl = GAME_CONFIG.QUEUE_MAX_LEVEL;
        if (type === 'manager') maxLvl = 5;

        let levels = 0;
        let totalCost = 0;
        let nextLvl = startLevel;

        if (mode === 'x1') {
            if (nextLvl < maxLvl) {
                levels = 1;
                totalCost = this.getUpgradeCost(type, id, startLevel);
            }
        } else if (mode === 'x10') {
            const target = Math.min(startLevel + 10, maxLvl);
            levels = Math.max(0, target - startLevel);
            for (let lvl = startLevel; lvl < target; lvl++) {
                totalCost += this.getUpgradeCost(type, id, lvl);
            }
        } else if (mode === 'max') {
            while (nextLvl < maxLvl) {
                const cost = this.getUpgradeCost(type, id, nextLvl);
                if (totalCost + cost <= cash) {
                    totalCost += cost;
                    levels++;
                    nextLvl++;
                } else {
                    break;
                }
            }
            if (levels === 0) {
                if (startLevel < maxLvl) {
                    return {
                        levels: 1,
                        cost: this.getUpgradeCost(type, id, startLevel),
                        canAfford: false
                    };
                }
            }
        }

        const canAfford = (totalCost > 0) && (cash >= totalCost);
        return {
            levels,
            cost: totalCost,
            canAfford
        };
    }

    getCurrentBaseReward() {
        let maxVal = 0;
        this.game.state.departments.forEach(d => {
            if (d.unlocked && d.baseReward > maxVal) {
                maxVal = d.baseReward;
            }
        });
        return maxVal;
    }

    getDepartmentReward(id) {
        const d = this.game.state.departments.find(dept => dept.id === id);
        if (!d) return 0;
        return d.baseReward * this.getTotalMultiplier();
    }

    getEarningsPerSecond() {
        return this.game.cachedEps;
    }

    recalculateEps() {
        let totalVal = 0;
        this.cachedTotalMult = null;
        this._cachedVaultCap = new Map();
        this._cachedTellerCap = null;
        this._cachedGuardCap = null;
        const freshMult = this.getTotalMultiplier();
        const baseRewardWithMultiplier = this.getCurrentBaseReward() * freshMult;
        const maxLvl = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TELLER_MAX_LEVEL) || 99;
        const bonusRate = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TELLER_POST_MAX_BONUS_PER_LEVEL) || 0.005;
        this.game.state.tellers.forEach(t => {
            if (t.unlocked) {
                const speed = this.getTellerSpeed(t.level);
                const bonus = 1 + Math.max(0, t.level - maxLvl) * bonusRate;
                totalVal += (baseRewardWithMultiplier / speed) * bonus;
            }
        });
        this.game.cachedEps = Math.round(totalVal);
    }
}

window.EconomyManager = EconomyManager;
