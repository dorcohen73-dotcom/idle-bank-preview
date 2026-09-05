export function triggerMilestoneConfetti(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const container = document.getElementById('floating-container') || document.body;

    const colors = ['#dfab29', '#ffd700', '#10b981', '#3b82f6', '#ec4899', '#a855f7'];
    const MAX_CONFETTI = window.innerWidth <= 768 ? 15 : 30;

    const particles = [];
    for (let i = 0; i < MAX_CONFETTI; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';

        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 110;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - (30 + Math.random() * 40);

        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;

        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        const size = 5 + Math.random() * 6;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        if (Math.random() > 0.5) {
            particle.style.borderRadius = '0px';
        }

        container.appendChild(particle);
        particles.push(particle);
    }
    setTimeout(() => particles.forEach(p => p.remove()), 1200);
}

export function handlePurchaseFeedback(btn, e, beforeCash, beforeLevelOrUnlocked, type, extraId) {
    const afterCash = game.state.cash;
    const spent = beforeCash - afterCash;
    
    let afterLevelOrUnlocked = false;
    let isUnlock = false;
    
    if (type === 'teller') {
        afterLevelOrUnlocked = game.state.tellers[extraId].level;
    } else if (type === 'guard') {
        afterLevelOrUnlocked = game.state.guards[extraId].level;
    } else if (type === 'unlock-teller') {
        afterLevelOrUnlocked = game.state.tellers[extraId].unlocked;
        isUnlock = true;
    } else if (type === 'unlock-guard') {
        afterLevelOrUnlocked = game.state.guards[extraId].unlocked;
        isUnlock = true;
    } else if (type === 'vault') {
        afterLevelOrUnlocked = game.state.vault.level;
    } else if (type === 'queue') {
        afterLevelOrUnlocked = game.state.queueUpgradeLevel;
    } else if (type === 'hire-manager') {
        afterLevelOrUnlocked = game.state.managers[extraId];
        isUnlock = true;
    } else if (type === 'upgrade-manager') {
        afterLevelOrUnlocked = game.state.managerUpgrades[extraId].level;
    } else if (type === 'unlock-dept') {
        const deptObj = game.state.departments.find(d => d.id === extraId);
        afterLevelOrUnlocked = deptObj ? deptObj.unlocked : false;
        isUnlock = true;
    }
    
    const rect = btn.getBoundingClientRect();
    const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
    const y = (e && e.clientY) ? e.clientY : rect.top;
    
    // Trigger card gold flash animation
    const card = btn.closest('.upgrade-card') || btn.closest('.upg-new-layout') || btn.closest('.mgr-new-layout');
    if (card) {
        card.classList.remove('sparkle-flash');
        void card.offsetWidth; // trigger reflow
        card.classList.add('sparkle-flash');
    }
    
    if (spent > 0) {
        spawnFloating(`-${formatMoney(spent)}`, x, y, 'red');
        if (typeof spawnParticles === 'function') {
            spawnParticles(x, y, 8, 'sparkle');
        }
    }
    
    if (isUnlock) {
        if (afterLevelOrUnlocked && !beforeLevelOrUnlocked) {
            setTimeout(() => {
                spawnFloating(`UNLOCKED! 🔓`, x, y - 25, 'gold');
            }, 150);
        }
    } else {
        const levelDiff = afterLevelOrUnlocked - beforeLevelOrUnlocked;
        if (levelDiff > 0) {
            setTimeout(() => {
                spawnFloating(`LEVEL UP! +${levelDiff} ⚡`, x, y - 25, 'gold');
            }, 150);
            
            // Check for Milestone celebration
            if (type === 'teller') {
                const milestones = [10, 25, 50, 100];
                const reached = milestones.find(m => beforeLevelOrUnlocked < m && afterLevelOrUnlocked >= m);
                if (reached) {
                    setTimeout(() => {
                        triggerMilestoneConfetti(btn);
                        spawnFloating(`MILESTONE Lv ${reached}! 🏆🎉`, x, y - 55, '#dfab29');
                        if (typeof rebuildTellersDOM === 'function') rebuildTellersDOM();
                    }, 250);
                }
            }
        }
    }
}

export function handleMissionRedirect(missionType, targetId) {
    let tabName = 'upgrades';
    let selector = '';

    switch (missionType) {
        case 'upgrade_teller': {
            tabName = 'upgrades';
            const tId = targetId !== undefined ? targetId : 0;
            selector = `.buy-btn[data-type="teller"][data-id="${tId}"], .buy-btn[data-action="unlock-teller"][data-id="${tId}"]`;
            break;
        }
        case 'upgrade_guard': {
            tabName = 'upgrades';
            const gId = targetId !== undefined ? targetId : 0;
            selector = `.buy-btn[data-type="guard"][data-id="${gId}"], .buy-btn[data-action="unlock-guard"][data-id="${gId}"]`;
            break;
        }
        case 'upgrade_vault':
            tabName = 'upgrades';
            selector = '#upgrade-vault-btn';
            break;
        case 'clients':
            tabName = 'upgrades';
            selector = '#upgrade-queue-btn';
            break;
        case 'accumulate_cash':
        case 'earn_cash':
        case 'earn_eps':
        case 'serve_rich_vip':
        case 'vip_collector':
        case 'spend_cash':
        case 'break_the_wall':
            tabName = 'upgrades';
            selector = '.buy-btn[data-type="teller"][data-id="0"], .buy-btn[data-action="unlock-teller"][data-id="0"]';
            break;
        case 'hire_managers':
        case 'manager_hire':
        case 'all_managers':
            tabName = 'managers';
            selector = '.buy-mgr-btn';
            break;
        case 'upgrade_managers':
            tabName = 'managers';
            selector = '.upgrade-mgr-btn';
            break;
        case 'unlock_departments':
        case 'department_unlock':
            tabName = 'departments';
            selector = '.dept-action-btn:not(.active)';
            break;
        case 'teller_max':
            tabName = 'upgrades';
            selector = '.buy-btn[data-type="teller"][data-id="0"], .buy-btn[data-action="unlock-teller"][data-id="0"]';
            break;
        case 'guard_trips':
            tabName = 'upgrades';
            selector = '.buy-btn[data-type="guard"][data-id="0"]';
            break;
        case 'boost_run':
            tabName = 'upgrades';
            selector = '.buy-btn[data-type="teller"][data-id="0"]';
            break;
        case 'department_grind':
            tabName = 'managers';
            selector = `.upgrade-mgr-btn[data-mgr-type="${targetId}"], .buy-mgr-btn[data-mgr="${targetId}"]`;
            break;
        case 'missions_veteran':
            tabName = 'missions';
            break;
    }

    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.click();
    }

    setTimeout(() => {
        if (!selector) return;

        const targetBtn = document.querySelector(selector);
        if (targetBtn) {
            const card = targetBtn.closest('.new-upg-wrapper, .upgrade-card, .manager-card, .department-card, .prestige-panel, .gold-upgrade-card');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('mission-highlight');
                setTimeout(() => {
                    card.classList.remove('mission-highlight');
                }, 2500);
            }
        }
    }, 300);
}
