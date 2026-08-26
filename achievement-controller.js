class AchievementController {
    constructor(game) {
        this.game = game;
    }

    getStatValue(a) {
        const state = this.game.state;
        switch (a.statPath) {
            case 'lifetimeCash': return state.lifetimeCash || 0;
            case 'missionsCompleted': return state.missionsCompleted || 0;
            case 'vipServedTotal': return state.vipServedTotal || 0;
            case 'guardTripsTotal': return state.guardTripsTotal || 0;
            case 'loginStreak': return state.loginStreak || 0;
            case 'shares': return state.shares || 0;
            case 'managerFirstMax': {
                const upgrades = state.managerUpgrades || {};
                return Object.keys(upgrades).some(k => upgrades[k] && upgrades[k].level >= 5) ? 1 : 0;
            }
            case 'managerAllMax': {
                const upgrades = state.managerUpgrades || {};
                return Object.keys(upgrades).filter(k => upgrades[k] && upgrades[k].level >= 5).length;
            }
            case 'visitedBranchesAll':
                return Array.isArray(state.visitedBranches) ? state.visitedBranches.length : 0;
            default:
                return 0;
        }
    }

    getProgress(id) {
        const a = GAME_CONFIG.ACHIEVEMENTS.find(x => x.id === id);
        if (!a) return { current: 0, target: 1, percent: 0 };
        const current = Math.min(this.getStatValue(a), a.threshold);
        const percent = Math.min(100, Math.round((current / a.threshold) * 100));
        return { current, target: a.threshold, percent };
    }

    recomputeBonusPercent() {
        const state = this.game.state;
        state.achievements.bonusPercent = GAME_CONFIG.ACHIEVEMENTS
            .filter(a => state.achievements.unlocked[a.id])
            .reduce((sum, a) => sum + a.bonusPercent, 0);
    }

    // Pure state mutation — no saveGame(), no UI feedback. Callers decide whether to
    // persist/animate (live tick in ui-events.js) or stay silent (load-time backfill).
    // Unlocking applies the permanent % bonus immediately; the one-time shares reward
    // is claimed separately via claimReward(), same two-stage flow as missions.
    checkAchievements() {
        const state = this.game.state;
        if (!state.achievements) state.achievements = { unlocked: {}, claimed: {}, bonusPercent: 0 };
        if (!state.achievements.claimed) state.achievements.claimed = {};

        const newlyUnlocked = [];
        GAME_CONFIG.ACHIEVEMENTS.forEach(a => {
            if (state.achievements.unlocked[a.id]) return;
            if (this.getStatValue(a) >= a.threshold) {
                state.achievements.unlocked[a.id] = true;
                newlyUnlocked.push(a);
            }
        });

        if (newlyUnlocked.length > 0) {
            this.recomputeBonusPercent();
            if (this.game.economyManager) this.game.economyManager.cachedTotalMult = null;
            if (typeof this.game.recalculateEps === 'function') this.game.recalculateEps();
        }

        return newlyUnlocked;
    }

    // Claims the one-time shares reward for an already-unlocked, not-yet-claimed achievement.
    claimReward(id) {
        const state = this.game.state;
        const a = GAME_CONFIG.ACHIEVEMENTS.find(x => x.id === id);
        if (!a) return { type: 'none', amount: 0 };
        if (!state.achievements.unlocked[id] || state.achievements.claimed[id]) return { type: 'none', amount: 0 };

        state.achievements.claimed[id] = true;
        this.game.addShares(a.rewardShares);
        return { type: 'shares', amount: a.rewardShares };
    }
}

window.AchievementController = AchievementController;
