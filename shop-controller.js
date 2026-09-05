// Shop actions — extracted verbatim from IdleBankGame (REFACTOR_PLAN phase 4):
// every purchase/upgrade/unlock/hire flow (tellers, guards, vault, queue,
// managers incl. skills, departments, gold upgrades) and their bulk variants.
// All follow the same pattern: price check -> spendCash -> level/flag bump.
// Operates directly on game.state; no state-shape or behavior changes.
// game.js keeps thin facades for the UI layer.
class ShopController {
    constructor(game) {
        this.game = game;
    }

    upgradeEntity(type, id) {
        const game = this.game;
        let entity, cost, statsKey;
        if (type === 'teller') {
            entity = game.state.tellers[id];
            if (!entity || !entity.unlocked) return false;
            const maxLvl = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.getTellerTieredMaxLevel ? GAME_CONFIG.getTellerTieredMaxLevel(id) : ((Number(id) || 0) + 1) * 100);
            if (entity.level >= maxLvl) return false;
            cost = game.getTellerUpgradeCost(entity.level);
            statsKey = 'tellerUpgrades';
        } else if (type === 'guard') {
            entity = game.state.guards[id];
            if (!entity || !entity.unlocked) return false;
            cost = game.getGuardUpgradeCost(entity.level);
            statsKey = 'guardUpgrades';
        } else if (type === 'vault') {
            entity = game.state.vault;
            cost = game.getVaultUpgradeCost(entity.level);
            statsKey = 'vaultUpgrades';
        } else {
            return false;
        }

        if (game.spendCash(cost)) {
            entity.level++;
            game.state.stats[statsKey]++;
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
            if (type === 'teller') {
                game.recalculateEps();
            } else if (type === 'vault' && game.economyManager) {
                game.economyManager._cachedVaultCap = new Map();
            }
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeEntityBulk(type, id, mode) {
        const game = this.game;
        let entity, statsKey;
        if (type === 'teller') {
            entity = game.state.tellers[id];
            if (!entity || !entity.unlocked) return false;
            statsKey = 'tellerUpgrades';
        } else if (type === 'guard') {
            entity = game.state.guards[id];
            if (!entity || !entity.unlocked) return false;
            statsKey = 'guardUpgrades';
        } else if (type === 'vault') {
            entity = game.state.vault;
            statsKey = 'vaultUpgrades';
        } else {
            return false;
        }

        const details = game.getBulkUpgradeDetails(type, id, mode, entity.level, game.state.cash);
        if (details.canAfford && details.levels > 0) {
            if (game.spendCash(details.cost)) {
                entity.level += details.levels;
                game.state.stats[statsKey] += details.levels;
                game.missionsDirty = true;
                if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
                if (type === 'teller') {
                    game.recalculateEps();
                } else if (type === 'vault' && game.economyManager) {
                    game.economyManager._cachedVaultCap = new Map();
                }
                game.saveGame();
                return true;
            }
        }
        return false;
    }

    upgradeTeller(id) {
        const game = this.game;
        return game.upgradeEntity('teller', id);
    }

    unlockTeller(id) {
        const game = this.game;
        const teller = game.state.tellers[id];
        if (!teller || teller.unlocked) return false;

        const cost = game.tellerUnlockCosts[id];
        if (game.spendCash(cost)) {
            teller.unlocked = true;
            game.missionsDirty = true;
            teller.level = 1;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeGuard(id) {
        const game = this.game;
        return game.upgradeEntity('guard', id);
    }

    unlockGuard(id) {
        const game = this.game;
        const guard = game.state.guards[id];
        if (!guard || guard.unlocked) return false;

        const cost = game.guardUnlockCosts[id];
        if (game.spendCash(cost)) {
            guard.unlocked = true;
            game.missionsDirty = true;
            guard.level = 1;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeVault() {
        const game = this.game;
        return game.upgradeEntity('vault');
    }

    upgradeQueue() {
        const game = this.game;
        const level = game.state.queueUpgradeLevel || 1;
        if (level >= GAME_CONFIG.QUEUE_MAX_LEVEL) return false;

        const cost = game.getQueueUpgradeCost(level);
        if (game.spendCash(cost)) {
            game.state.queueUpgradeLevel = level + 1;
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeTellerBulk(id, mode) {
        const game = this.game;
        return game.upgradeEntityBulk('teller', id, mode);
    }

    upgradeGuardBulk(id, mode) {
        const game = this.game;
        return game.upgradeEntityBulk('guard', id, mode);
    }

    upgradeVaultBulk(mode) {
        const game = this.game;
        return game.upgradeEntityBulk('vault', null, mode);
    }

    upgradeQueueBulk(mode) {
        const game = this.game;
        const queueLvl = game.state.queueUpgradeLevel || 1;
        if (queueLvl >= GAME_CONFIG.QUEUE_MAX_LEVEL) return false;

        const details = game.getBulkUpgradeDetails('queue', null, mode, queueLvl, game.state.cash);
        if (details.canAfford && details.levels > 0) {
            if (game.spendCash(details.cost)) {
                game.state.queueUpgradeLevel += details.levels;
                game.missionsDirty = true;
                if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
                game.saveGame();
                return true;
            }
        }
        return false;
    }

    hireManager(type) {
        const game = this.game;
        if (!game.isManagerUnlocked(type)) return false;
        if (game.state.managers[type]) return false;

        const cost = game.managerCosts[type];
        if (game.spendCash(cost)) {
            game.state.managers[type] = true;
            if (!game.state.managerUpgrades) {
                game.state.managerUpgrades = {
                    customer: { level: 1, skill: null },
                    finance: { level: 1, skill: null },
                    operations: { level: 1, skill: null },
                    service: { level: 1, skill: null },
                    vip: { level: 1, skill: null },
                    marketing: { level: 1, skill: null },
                    accountant: { level: 1, skill: null }
                };
            }
            if (!game.state.managerUpgrades[type]) {
                game.state.managerUpgrades[type] = { level: 1, skill: null };
            }
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    unlockDepartment(id) {
        const game = this.game;
        const dept = game.state.departments.find(d => d.id === id);
        if (!dept || dept.unlocked) return false;

        if (game.spendCash(game.getDepartmentUnlockCost(dept))) {
            dept.unlocked = true;
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    buyGoldUpgrade(type) {
        const game = this.game;
        if (!game.state.goldUpgrades || typeof game.state.goldUpgrades.managerDiscount === 'undefined') {
            game.state.goldUpgrades = Object.assign({
                startingCash: 0, guardSpeed: 0, premiumYield: 0, shareEfficiency: 0,
                offlineEarnings: 0, tellerCapacityBoost: 0, vaultCapacityBoost: 0,
                eventBonus: 0, managerDiscount: 0
            }, game.state.goldUpgrades || {});
        }
        
        const currentLvl = game.state.goldUpgrades[type] || 0;
        let maxLvl = 5;
        if (type === 'startingCash') maxLvl = 4;
        else if (type === 'shareEfficiency') maxLvl = 4;
        else if (type === 'managerDiscount') maxLvl = 4;

        if (currentLvl >= maxLvl) return false;
        
        const cost = game.getGoldUpgradeCost(type);
        if (game.state.shares >= cost) {
            game.state.shares -= cost;
            game.state.goldUpgrades[type]++;
            if (game.economyManager) {
                game.economyManager.cachedTotalMult = null;
                if (type === 'vaultCapacityBoost' || type === 'tellerCapacityBoost') {
                    game.economyManager._cachedVaultCap = new Map();
                    game.economyManager._cachedTellerCap = null;
                }
            }
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeManager(type) {
        const game = this.game;
        if (!game.state.managerUpgrades) {
            // CRIT-9: Initialize managerUpgrades fallback with the correct manager keys instead of tellers/guards/vault
            game.state.managerUpgrades = {
                customer: { level: 1, skill: null },
                finance: { level: 1, skill: null },
                operations: { level: 1, skill: null },
                service: { level: 1, skill: null },
                vip: { level: 1, skill: null },
                marketing: { level: 1, skill: null },
                accountant: { level: 1, skill: null }
            };
        }

        let mgr = game.state.managerUpgrades[type];
        if (!mgr) {
            mgr = { level: 1, skill: null };
            game.state.managerUpgrades[type] = mgr;
        }
        if (mgr.level >= 5) return false;
        
        const costs = game.managerUpgradeCosts[type] || GAME_CONFIG.MANAGER_UPGRADE_COSTS_DEFAULT;
        const cost = costs[mgr.level] || 100000;
        
        if (game.spendCash(cost)) {
            mgr.level++;
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    upgradeManagerBulk(type, mode) {
        const game = this.game;
        if (!game.state.managerUpgrades) {
            game.state.managerUpgrades = {
                customer: { level: 1, skill: null },
                finance: { level: 1, skill: null },
                operations: { level: 1, skill: null },
                service: { level: 1, skill: null },
                vip: { level: 1, skill: null },
                marketing: { level: 1, skill: null },
                accountant: { level: 1, skill: null }
            };
        }
        let mgr = game.state.managerUpgrades[type];
        if (!mgr) {
            mgr = { level: 1, skill: null };
            game.state.managerUpgrades[type] = mgr;
        }
        if (mgr.level >= 5) return false;

        const details = game.getBulkUpgradeDetails('manager', type, mode, mgr.level, game.state.cash);
        if (details.canAfford && details.levels > 0 && game.spendCash(details.cost)) {
            mgr.level += details.levels;
            game.missionsDirty = true;
            if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    selectManagerSkill(type, skill) {
        const game = this.game;
        if (!game.state.managerUpgrades) return false;
        const mgr = game.state.managerUpgrades[type];
        if (!mgr) return false;
        
        if (mgr.skill === skill) {
            return false;
        } else {
            mgr.skill = skill;
        }
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
        game.recalculateEps();
        game.saveGame();
        return true;
    }

    resetManagerSkill(type, free = false) {
        const game = this.game;
        if (!game.state.managerUpgrades) return false;
        const mgr = game.state.managerUpgrades[type];
        if (!mgr || !mgr.skill) return false;
        
        const cost = 5000;
        if (free || game.spendCash(cost)) {
            mgr.skill = null;
            if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
            game.recalculateEps();
            game.saveGame();
            return true;
        }
        return false;
    }

    addBoost2x(hours) {
        const game = this.game;
        const secondsToAdd = hours * 3600;
        const maxSeconds = 8 * 3600;
        game.state.boost2xTimeLeft = Math.min(maxSeconds, (game.state.boost2xTimeLeft || 0) + secondsToAdd);
        if (game.economyManager) game.economyManager.cachedTotalMult = null;
        if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
        game.saveGame();
        return true;
    }

    // --- ENCAPSULATION API METHODS FOR MVC COMPLIANCE ---
}
