let _lastNotifMissions = null;
let _lastNotifUpgrades = null;

export function updateTabDot(tabId, show) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!btn) return;
    let dot = btn.querySelector('.notification-dot');
    if (show) {
        if (!dot) {
            dot = document.createElement('div');
            dot.className = 'notification-dot';
            btn.style.position = 'relative';
            btn.appendChild(dot);
        }
    } else {
        if (dot) dot.remove();
    }
    
    // Also update bottom nav if it exists
    const bottomBtn = document.querySelector(`.bottom-nav-btn[data-tab="${tabId}"]`);
    if (bottomBtn) {
        let bottomDot = bottomBtn.querySelector('.notification-dot');
        if (show) {
            if (!bottomDot) {
                bottomDot = document.createElement('div');
                bottomDot.className = 'notification-dot';
                bottomBtn.style.position = 'relative';
                bottomBtn.appendChild(bottomDot);
            }
        } else {
            if (bottomDot) bottomDot.remove();
        }
    }
}

export function updateNotifications() {
    let hasMissions = false;
    if (game.state.missions) {
        for (let i=0; i<game.state.missions.length; i++) {
            if (game.state.missions[i].status === 'completed') {
                hasMissions = true;
                break;
            }
        }
    }
    
    let hasUpgrades = false;
    if (game.state.cash > 0) {
        if (game.state.cash >= game.getVaultUpgradeCost()) hasUpgrades = true;
        else if (game.state.cash >= game.getQueueUpgradeCost()) hasUpgrades = true;
        else {
            for (let i=0; i<game.state.tellers.length; i++) {
                if (game.state.tellers[i].unlocked && game.state.cash >= game.getTellerUpgradeCost(game.state.tellers[i].id)) {
                    hasUpgrades = true; break;
                }
            }
            if (!hasUpgrades) {
                for (let i=0; i<game.state.guards.length; i++) {
                    if (game.state.guards[i].unlocked && game.state.cash >= game.getGuardUpgradeCost(game.state.guards[i].id)) {
                        hasUpgrades = true; break;
                    }
                }
            }
        }
    }

    if (hasMissions !== _lastNotifMissions) {
        _lastNotifMissions = hasMissions;
        updateTabDot('missions', hasMissions);
    }
    if (hasUpgrades !== _lastNotifUpgrades) {
        _lastNotifUpgrades = hasUpgrades;
        updateTabDot('upgrades', hasUpgrades);
    }

    let hasClaimableDaily = false;
    if (game.state.dailyChallenges && game.state.dailyChallenges.some(c => c && c.completed && !c.claimed)) {
        hasClaimableDaily = true;
    }
    if (!hasClaimableDaily && game.state.achievements && game.state.achievements.unlocked) {
        const keys = Object.keys(game.state.achievements.unlocked);
        for (let i = 0; i < keys.length; i++) {
            if (game.state.achievements.unlocked[keys[i]] && (!game.state.achievements.claimed || !game.state.achievements.claimed[keys[i]])) {
                hasClaimableDaily = true;
                break;
            }
        }
    }
    if (!hasClaimableDaily && game.state.pendingLoginReward) {
        hasClaimableDaily = true;
    }

    updateTabDot('daily', hasClaimableDaily);
    const headerBtn = document.getElementById('header-daily-btn');
    if (headerBtn) {
        if (hasClaimableDaily) {
            headerBtn.classList.add('header-glow');
        } else {
            headerBtn.classList.remove('header-glow');
        }
    }
}
