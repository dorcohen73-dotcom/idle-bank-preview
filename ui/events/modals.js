import { initSound, playAd, AdService } from './ads.js';
import { showDiscoveryTip } from './engagement.js';
import { formatNumberCompact } from '../draw/format.js';

// Re-parenting to <body> plus a forced reflow works around a rendering bug where
// a .modal-overlay deep in the page's DOM tree gets its `active` class/opacity
// applied correctly (confirmed via getComputedStyle) but the browser never
// actually paints the new layer — verified with OS-level screen capture, ruled
// out backdrop-filter/animations/z-index/position as the cause. Moving the node
// to be a direct child of body and forcing a synchronous layout before the
// class toggle reliably fixes the paint.
export function activateModal(modal) {
    if (!modal) return;
    if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }
    void modal.offsetHeight;
    modal.classList.add('active');
}

export function openPrestigeModal(target) {
    const lang = game.state.language || 'en';
    const tObj = translations[lang];
    const sharesGained = game.calculatePrestigeShares();
    
    const elTitle = document.getElementById('prestige-modal-title');
    const elDesc = document.getElementById('prestige-modal-text');
    if (elDesc) {
        elDesc.innerText = (tObj.branches && tObj.branches.prestigeDesc) ? tObj.branches.prestigeDesc : (tObj.prestigeModalText || 'Reset progress in this branch to claim Golden Shares.');
    }
    const elGained = document.getElementById('prestige-shares-gained');
    const elDoubled = document.getElementById('prestige-shares-doubled');
    const elAdBtn = document.getElementById('prestige-ad-btn');
    const elRegularBtn = document.getElementById('prestige-regular-btn');
    const elCancelBtn = document.getElementById('prestige-cancel-btn');
    const elRewardLabel = document.getElementById('prestige-reward-label');
    
    const isMovingBranch = target !== game.state.currentBranch;
    if (elTitle) {
        if (isMovingBranch) {
            if (tObj.branches && tObj.branches.names && tObj.branches.names[target]) {
                elTitle.innerText = tObj.branches.names[target];
            } else if (game.branches && game.branches[target] && game.branches[target].name) {
                elTitle.innerText = game.branches[target].name;
            } else {
                elTitle.innerText = (tObj.branchLabel || 'Branch') + ' ' + (parseInt(target) + 1);
            }
        } else {
            elTitle.innerText = (tObj.branches && tObj.branches.prestigeTitle) ? tObj.branches.prestigeTitle : 'Prestige (Golden Shares)';
        }
    }
    if (elGained) elGained.innerText = `+${sharesGained.toLocaleString('en-US')}`;
    if (elDoubled) elDoubled.innerText = `${(sharesGained * 3).toLocaleString('en-US')}`;
    if (elAdBtn) elAdBtn.innerText = tObj.prestigeAdBtn((sharesGained * 3).toLocaleString('en-US'));
    if (elRegularBtn) elRegularBtn.innerText = tObj.prestigeRegularBtn;
    if (elCancelBtn) elCancelBtn.innerText = tObj.prestigeCancelBtn;
    if (elRewardLabel) elRewardLabel.innerText = tObj.prestigeRewardLabel;
    
    const modal = document.getElementById('prestige-modal');
    if (modal) {
        modal.setAttribute('data-target-branch', target);
        activateModal(modal);
    }
    // Discovery tip: first time player opens prestige modal
    if (typeof window.showDiscoveryTip === 'function') window.showDiscoveryTip('prestige');
}

export function openBoostModal() {
    const lang = game.state.language || 'en';
    const tObj = translations[lang] || translations.en;

    const eventModal = document.getElementById('event-modal');
    const iconEl = document.getElementById('event-icon');
    const titleEl = document.getElementById('event-title');
    const textEl = document.getElementById('event-text');
    const container = document.getElementById('event-options-container');
    
    iconEl.innerText = "⚡";
    titleEl.innerText = tObj.boostModalTitle;
    textEl.innerText = tObj.boostModalText;
    
    const cashLabelEl = document.getElementById('event-cash-label');
    if (cashLabelEl) cashLabelEl.innerText = tObj.cashBalance || 'Cash Balance:';
    const cashValEl = document.getElementById('event-cash-val');
    if (cashValEl) {
        cashValEl.innerText = formatMoney(game.state.cash);
    }

    container.innerHTML = '';
    
    const _boostEps = game.getEarningsPerSecond() || 0;
    const _projectedEarnings = Math.floor(_boostEps * 4 * 3600);
    const _earningsHint = _projectedEarnings > 0 && typeof tObj.boostEventEarningsHint === 'function'
        ? tObj.boostEventEarningsHint(formatMoney(_projectedEarnings))
        : '';
    const btnAd = document.createElement('button');
    btnAd.className = 'event-option-btn ad-option';
    btnAd.innerHTML = `
        <div class="event-option-title">${tObj.boostEventAdTitle || '🎬 Watch Ad & Activate'}</div>
        <div class="event-option-desc">${tObj.boostEventAdDesc || 'Adds 4 hours of double earnings (up to 8h)'}${_earningsHint}</div>
    `;
    btnAd.addEventListener('click', () => {
        initSound();
        eventModal.classList.remove('active');
        playAd(() => {
            game.addBoost2x(4);
            draw();
        });
    });
    
    const btnCancel = document.createElement('button');
    btnCancel.className = 'event-option-btn';
    btnCancel.innerHTML = `
        <div class="event-option-title">${tObj.cancelLabel || 'Cancel'}</div>
        <div class="event-option-desc">${tObj.backToGameLabel || 'Back to game'}</div>
    `;
    btnCancel.addEventListener('click', () => {
        initSound();
        eventModal.classList.remove('active');
    });
    
    container.appendChild(btnAd);
    container.appendChild(btnCancel);
    
    activateModal(eventModal);
}

export function openAnalyticsModal() {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;
    const lang = (game.state && game.state.language) || 'en';
    const tObj = translations[lang] || translations.he || translations.en || {};

    const aTitle = document.getElementById('analytics-modal-title-text') || document.getElementById('analytics-modal-title');
    if (aTitle) aTitle.innerText = tObj.analyticsModalTitle || 'דוח ביצועים אנליטי';

    const branchNameEl = document.getElementById('analytics-branch-name-live');
    if (branchNameEl) {
        branchNameEl.innerText = tObj.analyticsLiveHeader || 'נתונים חיים בזמן אמת';
    }

    const aTellers = document.getElementById('analytics-title-tellers');
    if (aTellers) aTellers.innerText = tObj.analyticsTitleTellers || 'תפוקת עמדות כספרים';

    const aOps = document.getElementById('analytics-title-ops');
    if (aOps) aOps.innerText = tObj.analyticsOpsFlowTitle || 'איזון שרשרת תפעול';

    const aWarn = document.getElementById('analytics-title-warnings');
    if (aWarn) aWarn.innerText = tObj.analyticsTitleWarnings || 'יועץ עסקי והתראות';

    const aClose = document.getElementById('analytics-close-btn');
    if (aClose) aClose.innerText = tObj.analyticsCloseBtn || 'סגור דוח';
    
    const totalEps = game.getEarningsPerSecond();
    const vCap = game.getVaultCapacity(game.state.vault.level);
    const vaultUtil = vCap > 0 ? Math.min(100, Math.round((game.state.vault.cashStored / vCap) * 100)) : 0;

    // Zoom coordinates map
    const tellerZoomMap = {
        1: { scale: 3.4, origin: '55% 42%' },
        2: { scale: 3.4, origin: '50% 44%' },
        3: { scale: 3.6, origin: '61% 35%' },
        4: { scale: 3.5, origin: '66% 33%' },
        5: { scale: 3.4, origin: '51% 41%' },
        6: { scale: 3.6, origin: '64% 36%' },
        7: { scale: 3.5, origin: '50% 44%' },
        8: { scale: 3.4, origin: '41% 43%' }
    };

    // Calculate Tellers stats
    const currentBaseReward = game.getCurrentBaseReward();
    const totalMultiplier = game.getTotalMultiplier();
    
    const activeTellers = game.state.tellers
        .filter(t => t.unlocked)
        .map(t => {
            const speed = game.getTellerSpeed(t.level);
            const reward = currentBaseReward * totalMultiplier;
            const tellerEps = speed > 0 ? (reward / speed) : 0;
            const pctOfTotal = totalEps > 0 ? Math.min(100, Math.round((tellerEps / totalEps) * 100)) : 0;
            return { ...t, tellerEps, pctOfTotal };
        });

    // Sort by tellerEps descending so #1 most effective is at the very top, followed by #2, #3, etc.
    const sortedTellers = [...activeTellers].sort((a, b) => {
        if (b.tellerEps !== a.tellerEps) {
            return b.tellerEps - a.tellerEps;
        }
        return b.level - a.level;
    });

    const tellersListEl = document.getElementById('analytics-tellers-list');
    tellersListEl.innerHTML = '';
    const tellersFragment = document.createDocumentFragment();
    const lvlPrefix = tObj.levelLabelShort || tObj.levelLabel || 'רמה';
    
    sortedTellers.forEach((t, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.className = `analytic-teller-card-aaa rank-${rank}`;
        
        const tellerImgNum = ((t.id) % 8) + 1;
        const zoom = tellerZoomMap[tellerImgNum] || { scale: 3.2, origin: '50% 40%' };
        
        let rankBadgeClass = 'rank-badge-other';
        let ringClass = 'ring-gray';
        if (rank === 1) { rankBadgeClass = 'rank-badge-gold'; ringClass = 'ring-gold'; }
        else if (rank === 2) { rankBadgeClass = 'rank-badge-silver'; ringClass = 'ring-silver'; }
        else if (rank === 3) { rankBadgeClass = 'rank-badge-bronze'; ringClass = 'ring-bronze'; }
        else if (rank === 4) { ringClass = 'ring-amber'; }
        else if (rank === 5) { ringClass = 'ring-green'; }

        row.innerHTML = `
            <div class="teller-card-main-row">
                <div class="teller-rank-shield ${rankBadgeClass}">
                    <span>${rank}</span>
                </div>
                <div class="teller-portrait-wrapper-zoomed ${ringClass}">
                    <img src="images/teller-${tellerImgNum}.png" alt="Teller ${t.id + 1}" class="teller-close-up-img" style="transform: scale(${zoom.scale}); transform-origin: ${zoom.origin};" onerror="this.src='images/manager-1.png'">
                    <span class="teller-status-dot-active" title="פעיל"></span>
                </div>
                <div class="teller-meta-col">
                    <div class="teller-name-line">
                        <strong class="teller-real-name">${tObj.tellerLabel || 'כספר'} ${t.id + 1}</strong>
                        <span class="teller-lvl-badge">${lvlPrefix} ${t.level}</span>
                    </div>
                    <div class="teller-bar-container">
                        <div class="teller-bar-track">
                            <div class="teller-bar-fill" style="width: ${t.pctOfTotal}%"></div>
                        </div>
                        <span class="teller-share-label">${t.pctOfTotal}% ${tObj.ofTotalShare || 'מסך הרווח'}</span>
                    </div>
                </div>
                <div class="teller-yield-col">
                    <div class="teller-yield-val text-green">${formatMoney(t.tellerEps)}</div>
                    <span class="teller-yield-unit">${tObj.perSecShort || '/שנ\''}</span>
                </div>
            </div>
        `;
        tellersFragment.appendChild(row);
    });
    
    if (activeTellers.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'analytic-empty-state';
        emptyDiv.innerText = tObj.noActiveTellers || 'אין כספרים פעילים כרגע';
        tellersFragment.appendChild(emptyDiv);
    }
    
    tellersListEl.appendChild(tellersFragment);

    // Operations Flow Analyzer
    const qCap = game.getQueueCapacity(game.state.queueUpgradeLevel || 1);
    const guardsSlow = game.state.tellers.some(t => t.unlocked && t.cashStored >= game.getTellerCapacity(t.level) * 0.8);
    const opsFlowEl = document.getElementById('analytics-ops-flow');
    if (opsFlowEl) {
        const qCount = game.customerQueue.length;
        const isQueueOk = qCount < qCap * 0.7;
        const isGuardsOk = !guardsSlow;
        const isVaultOk = vaultUtil < 85;

        opsFlowEl.innerHTML = `
            <div class="ops-flow-row ${isQueueOk ? 'ok' : 'busy'}">
                <div class="ops-flow-left">
                    <span class="ops-flow-dot"></span>
                    <span class="ops-flow-icon">👥</span>
                    <span class="ops-flow-title">${tObj.opsQueueTitle || 'תור לקוחות'}:</span>
                </div>
                <div class="ops-flow-right">
                    <strong class="ops-flow-val">${qCount}/${qCap}</strong>
                    <span class="ops-flow-subtag">${isQueueOk ? (tObj.opsFlowSmooth || 'זרימה פנויה ✔') : (tObj.opsFlowCrowded || 'עומס ⚠️')}</span>
                </div>
            </div>
            <div class="ops-flow-row ${isGuardsOk ? 'ok' : 'busy'}">
                <div class="ops-flow-left">
                    <span class="ops-flow-dot"></span>
                    <span class="ops-flow-icon">🚚</span>
                    <span class="ops-flow-title">${tObj.opsGuardsTitle || 'פינוי בלדרים'}:</span>
                </div>
                <div class="ops-flow-right">
                    <strong class="ops-flow-val">100%</strong>
                    <span class="ops-flow-subtag">${isGuardsOk ? (tObj.opsGuardsFast || 'פינוי בזמן ✔') : (tObj.opsGuardsDelay || 'עיכוב ⚠️')}</span>
                </div>
            </div>
        `;
    }
    
    // Always Actionable Business Advisor
    const warningsListEl = document.getElementById('analytics-warnings-list');
    warningsListEl.innerHTML = '';
    
    let tip = null;

    // 1. Critical bottleneck: Vault full / near full (>85%)
    if (game.state.vault.cashStored >= vCap * 0.85) {
        tip = {
            icon: '🏦',
            type: 'warning',
            title: tObj.advisorTipUpgradeVaultTitle || 'שדרג את הכספת 🏦',
            desc: tObj.advisorTipUpgradeVaultDesc || 'הגדל את קיבולת הכספת לאגירת רווחים גדולה יותר.'
        };
    }
    // 2. Bottleneck: Queue full / crowded
    else if (game.customerQueue.length >= qCap * 0.75) {
        tip = {
            icon: '⚡',
            type: 'alert',
            title: tObj.advisorTipUpgradeTellerTitle || 'שדרג עמדות כספרים ⚡',
            desc: tObj.advisorTipUpgradeTellerDesc || 'שדרוג עמדות הכספרים מעלה את מהירות הטיפול והרווח לשנייה.'
        };
    }
    // 3. Bottleneck: Guards slow (desks accumulating cash)
    else if (guardsSlow) {
        tip = {
            icon: '🏃',
            type: 'warning',
            title: tObj.advisorTipUpgradeGuardsTitle || 'שדרג מהירות בלדרים 🏃',
            desc: tObj.advisorTipUpgradeGuardsDesc || 'שדרוג הבלדרים יפנה כסף מדלפקי הכספרים מהר יותר לכספת.'
        };
    }
    // 4. Growth Opportunity: Locked teller available to unlock
    else if (game.state.tellers.some(t => !t.unlocked)) {
        tip = {
            icon: '🚀',
            type: 'action',
            title: tObj.advisorTipUnlockTellerTitle || 'פתח כספר נוסף 🚀',
            desc: tObj.advisorTipUnlockTellerDesc || 'פתיחת עמדת כספר חדשה תזניק את זרימת המזומנים של הסניף.'
        };
    }
    // 5. Growth Opportunity: Expand queue for continuous customer inflow
    else if (qCap < 20) {
        tip = {
            icon: '👥',
            type: 'action',
            title: tObj.advisorTipUpgradeQueueTitle || 'הרחב תור לקוחות 👥',
            desc: tObj.advisorTipUpgradeQueueDesc || 'הגדלת קיבולת התור תאפשר קליטת לקוחות רציפה ללא עיכובים.'
        };
    }
    // 6. Growth Opportunity: General power upgrade for highest ROI
    else {
        tip = {
            icon: '⚡',
            type: 'action',
            title: tObj.advisorTipUpgradeTellerTitle || 'שדרג עמדות כספרים ⚡',
            desc: tObj.advisorTipUpgradeTellerDesc || 'שדרוג עמדות הכספרים מעלה את מהירות הטיפול והרווח לשנייה.'
        };
    }

    const item = document.createElement('div');
    item.className = `analytic-optimal-card-master ${tip.type}`;
    item.innerHTML = `
        <div class="optimal-star-circle">
            <span class="optimal-star-glyph">${tip.icon}</span>
        </div>
        <div class="optimal-text-group">
            <strong class="optimal-headline">${tip.title}</strong>
            <span class="optimal-sub">${tip.desc}</span>
        </div>
    `;
    warningsListEl.appendChild(item);
    
    activateModal(modal);

    const closeHandler = () => {
        if (typeof window.hapticTap === 'function') window.hapticTap();
        if (window.gameAudio && typeof window.gameAudio.playClick === 'function') window.gameAudio.playClick();
        modal.classList.remove('active');
    };

    const closeBtn = document.getElementById('analytics-close-btn');
    if (closeBtn) closeBtn.onclick = closeHandler;

    const closeXBtn = document.getElementById('analytics-close-x');
    if (closeXBtn) closeXBtn.onclick = closeHandler;
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };
}
export function openWeeklyRewardModal() {
    const lang = (game.state && game.state.language) || 'en';
    const tObj = translations[lang] || translations.en;
    const modal = document.getElementById('weekly-modal');
    if (!modal) return;

    const titleEl = document.getElementById('weekly-modal-title');
    const textEl = document.getElementById('weekly-modal-text');
    const statsBox = document.getElementById('weekly-stats-box');

    if (titleEl) titleEl.innerText = tObj.weeklyTitle || 'GREAT WEEK!';
    if (textEl) textEl.innerHTML = (tObj.weeklyText || 'A full week of running your empire!<br/>Your team is ready for a boost!').replace(/\n/g, '<br/>');

    const eps = game.getEarningsPerSecond ? game.getEarningsPerSecond() : 0;
    const served = (game.state.stats && game.state.stats.clientsServed) || 0;
    const shares = game.state.shares || 0;

    const valEpsEl = document.getElementById('weekly-val-eps');
    const valClientsEl = document.getElementById('weekly-val-clients');
    const valSharesEl = document.getElementById('weekly-val-shares');
    const lblEpsEl = document.getElementById('weekly-lbl-eps');
    const lblClientsEl = document.getElementById('weekly-lbl-clients');
    const lblSharesEl = document.getElementById('weekly-lbl-shares');

    if (valEpsEl) valEpsEl.innerText = formatMoney(eps);
    if (valClientsEl) valClientsEl.innerText = served.toLocaleString();
    if (valSharesEl) valSharesEl.innerText = shares.toLocaleString();
    if (lblEpsEl) lblEpsEl.innerText = tObj.weeklyEpsLabel || 'EPS';
    if (lblClientsEl) lblClientsEl.innerText = tObj.weeklyClientsLabel || 'Clients served';
    if (lblSharesEl) lblSharesEl.innerText = tObj.weeklySharesLabel || 'Gold shares';

    const btnRewardTitle = document.getElementById('weekly-btn-reward-title');
    const btnRewardSub = document.getElementById('weekly-btn-reward-sub');
    const dismissMain = document.getElementById('weekly-dismiss-main');
    const dismissSub = document.getElementById('weekly-dismiss-sub');

    if (btnRewardTitle) btnRewardTitle.innerHTML = tObj.weeklyRewardBtnTitle || '8-HOUR <span class="gold-highlight">x2</span> REWARD!';
    if (btnRewardSub) btnRewardSub.innerHTML = tObj.weeklyRewardBtnSub || 'Watch a short video and <span class="gold-bold">double</span> all cash gains';
    if (dismissMain) dismissMain.innerText = tObj.weeklyDismissMain || 'NO THANKS, CONTINUE';
    if (dismissSub) dismissSub.innerText = tObj.weeklyDismissSub || 'Return to the game';

    if (statsBox) {
        statsBox.innerHTML = typeof tObj.weeklyStats === 'function'
            ? tObj.weeklyStats(formatMoney(eps), served.toLocaleString(), shares)
            : `💰 EPS: <strong>${formatMoney(eps)}</strong><br>👥 Clients served: <strong>${served.toLocaleString()}</strong><br>⭐ Gold shares: <strong>${shares}</strong>`;
    }

    const adBtn = document.getElementById('weekly-ad-btn');
    const closeBtn = document.getElementById('weekly-close-btn');
    const closeX = document.getElementById('weekly-modal-close-x');
    if (closeX) {
        closeX.onclick = () => {
            initSound();
            modal.classList.remove('active');
            game.state.lastWeeklyReward = Date.now();
            game.saveGame();
        };
    }

    if (adBtn) {
        if (AdService.isInCooldown()) {
            adBtn.style.display = 'none';
        } else {
            adBtn.style.display = '';
            adBtn.onclick = () => {
                initSound();
                modal.classList.remove('active');
                playAd(() => {
                    game.addBoost2x(8);
                    game.state.lastWeeklyReward = Date.now();
                    draw();
                    spawnFloating(tObj.boost8hMsg || '⚡ 8h Boost!', window.innerWidth / 2, window.innerHeight / 2, 'gold');
                });
            };
        }
    }
    if (closeBtn) {
        closeBtn.onclick = () => {
            initSound();
            modal.classList.remove('active');
            game.state.lastWeeklyReward = Date.now();
        };
    }
    modal.onclick = (e) => {
        if (e.target === modal) {
            initSound();
            modal.classList.remove('active');
            game.state.lastWeeklyReward = Date.now();
        }
    };

    if (window.NotificationQueue) {
        window.NotificationQueue.request('weekly-modal', window.NotificationQueue.PRIORITY.IMPORTANT, () => {
            activateModal(modal);
        });
    } else {
        activateModal(modal);
    }
}

export function checkWeeklyReward() {
    if (!window.game || !window.game.state) return;
    const now = Date.now();
    const lastWeekly = window.game.state.lastWeeklyReward || 0;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (now - lastWeekly >= ONE_WEEK_MS) {
        setTimeout(openWeeklyRewardModal, 2000);
    }
}

export function showOfflineEarningsModal() {
    if (!window.game || !window.game.offlineEarningsReport || isNaN(window.game.offlineEarningsReport) || window.game.offlineEarningsReport <= 0) return;

    const displayFn = () => {
        const lang = (window.game && window.game.state && window.game.state.language) || 'en';
        const tObj = (typeof translations !== 'undefined' && translations[lang]) 
                       ? translations[lang] : translations.he;
        if (DOM_CACHE.offlineModalTitle)     DOM_CACHE.offlineModalTitle.innerText     = tObj.offlineModalTitle;
        if (DOM_CACHE.offlineModalText)      DOM_CACHE.offlineModalText.innerText      = tObj.offlineModalText;
        if (DOM_CACHE.offlineModalDoubleBtn) DOM_CACHE.offlineModalDoubleBtn.innerText = tObj.offlineDoubleBtn;
        if (DOM_CACHE.offlineModalClaimBtn)  DOM_CACHE.offlineModalClaimBtn.innerText  = tObj.offlineClaimBtn;

        if (DOM_CACHE.offlineModalAmount) DOM_CACHE.offlineModalAmount.innerText = formatMoney(window.game.offlineEarningsReport);
        if (DOM_CACHE.offlineModalDoubleBtn) DOM_CACHE.offlineModalDoubleBtn.style.display = (typeof AdService !== 'undefined' && AdService.isInCooldown()) ? 'none' : '';
        if (DOM_CACHE.offlineModal) activateModal(DOM_CACHE.offlineModal);
    };

    if (window.NotificationQueue) {
        window.NotificationQueue.request('offline-modal', window.NotificationQueue.PRIORITY.IMPORTANT, displayFn);
    } else {
        displayFn();
    }
}

export function showLoginRewardModal() {
    if (!window.game || !window.game.state || !window.game.state.pendingLoginReward) return;
    const modal = document.getElementById('login-reward-modal');
    if (!modal) return;

    const reward = window.game.state.pendingLoginReward;
    const streak = window.game.state.loginStreak || 1;
    const lang = (window.game.state.language) || 'en';
    const tObj = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : translations.he;

    const streakTextEl = document.getElementById('login-reward-streak-text');
    const amountEl = document.getElementById('login-reward-amount');
    const descEl = document.getElementById('login-reward-desc');
    const titleTextEl = document.getElementById('login-reward-title-text');
    const titleEl = document.getElementById('login-reward-title');

    const lm = (typeof translations !== 'undefined' && translations[lang] && translations[lang].loginModal)
        ? translations[lang].loginModal
        : translations.he.loginModal;

    if (titleTextEl) {
        titleTextEl.innerText = lm.title;
    } else if (titleEl) {
        titleEl.innerText = lm.title;
    }

    if (streakTextEl) {
        const labelStr = typeof lm.streakLabel === 'function' ? lm.streakLabel(streak) : ('Streak: ' + streak + ' days');
        streakTextEl.innerHTML = `<span class="streak-clock-icon">🕒</span> ${labelStr}`;
    }

    let displayText = '';
    let descText = '';

    if (reward.type === 'cash') {
        displayText = '+' + formatMoney(reward.value);
        descText = lm.cashDesc;
    } else if (reward.type === 'boost') {
        const mins = Math.round(reward.value / 60);
        displayText = typeof lm.boostLabel === 'function' ? lm.boostLabel(mins) : ('+' + mins + ' min Boost x2');
        descText = lm.boostDesc;
    } else if (reward.type === 'gold' || reward.type === 'shares') {
        displayText = '+' + reward.value + (tObj.goldSharesUnit || ' Gold Shares');
        descText = lm.sharesDesc;
    }

    if (amountEl) amountEl.innerText = displayText;
    if (descEl) descEl.innerText = descText;

    _renderLoginStreakStrip(streak, lm);

    const collectBtn = document.getElementById('login-reward-collect-btn');
    const collectTextEl = document.getElementById('login-reward-collect-text');
    if (collectTextEl) {
        collectTextEl.innerText = lm.collectBtn;
    } else if (collectBtn) {
        collectBtn.innerText = lm.collectBtn;
    }

    if (collectBtn) {
        collectBtn.onclick = () => {
            initSound();
            modal.classList.remove('active');
            _applyLoginReward(reward);
        };
    }

    const closeXBtn = document.getElementById('login-reward-close-x');
    if (closeXBtn) {
        closeXBtn.onclick = () => {
            initSound();
            modal.classList.remove('active');
            _applyLoginReward(reward);
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) {
            initSound();
            modal.classList.remove('active');
            _applyLoginReward(reward);
        }
    };

    if (window.NotificationQueue) {
        window.NotificationQueue.request('login-reward-modal', window.NotificationQueue.PRIORITY.IMPORTANT, () => {
            activateModal(modal);
        });
    } else {
        activateModal(modal);
    }
}

export function _rewardIcon(type) {
    if (type === 'cash') return '💵';
    if (type === 'boost') return '⚡';
    return '⭐'; // gold / shares
}

export function _rewardShortText(reward) {
    if (reward.type === 'cash') return '+$' + formatNumberCompact(reward.value);
    if (reward.type === 'boost') return '+' + Math.round(reward.value / 60) + 'm';
    return '+' + reward.value;
}

// Rolling 7-day preview: today's already-granted reward plus the next 6 days, so the
// player sees exactly what tomorrow (highlighted) is worth without changing the underlying
// milestone-based reward table (getDailyLoginReward keeps its day 1/2/3/5/7/14/30 thresholds).
function _renderLoginStreakStrip(streak, lm) {
    const strip = document.getElementById('login-streak-strip');
    if (!strip || !window.game || typeof window.game.getDailyLoginReward !== 'function') return;
    strip.innerHTML = '';

    for (let offset = 0; offset <= 6; offset++) {
        const dayStreak = streak + offset;
        const reward = window.game.getDailyLoginReward(dayStreak);

        let label;
        if (offset === 0) label = lm.todayLabel || 'Today';
        else if (offset === 1) label = lm.tomorrowLabel || 'Tomorrow';
        else label = typeof lm.dayLabel === 'function' ? lm.dayLabel(dayStreak) : ('Day ' + dayStreak);

        const card = document.createElement('div');
        card.className = 'login-streak-day' + (offset === 0 ? ' is-today' : '') + (offset === 1 ? ' is-tomorrow' : '');
        card.innerHTML = `
            <span class="login-streak-day-label">${label}</span>
            <span class="login-streak-day-icon">${_rewardIcon(reward.type)}</span>
            <span class="login-streak-day-value">${_rewardShortText(reward)}</span>
        `;
        strip.appendChild(card);
    }
}

export function _applyLoginReward(reward) {
    if (!reward) return;
    const lang = (window.game && window.game.state && window.game.state.language) || 'en';
    const tObj = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : translations.he;

    if (reward.type === 'cash') {
        window.game.addCash(Math.round(reward.value));
        spawnFloating('+' + formatMoney(reward.value), window.innerWidth / 2, window.innerHeight / 2, 'green');
    } else if (reward.type === 'boost') {
        window.game.addBoost2x(reward.value / 3600);
        const mins = Math.round(reward.value / 60);
        const lm = tObj.loginModal || (translations.en && translations.en.loginModal);
        const boostTxt = (lm && typeof lm.boostLabel === 'function') ? lm.boostLabel(mins) : ('+' + mins + ' min Boost x2');
        spawnFloating(boostTxt, window.innerWidth / 2, window.innerHeight / 2, 'gold');
    } else if (reward.type === 'gold' || reward.type === 'shares') {
        window.game.addShares(reward.value);
        const sharesUnit = tObj.goldSharesUnit || (' ' + (tObj.sharesLabel || 'Shares'));
        const sharesTxt = '+' + reward.value + (sharesUnit.startsWith(' ') ? sharesUnit : ' ' + sharesUnit);
        spawnFloating(sharesTxt, window.innerWidth / 2, window.innerHeight / 2, 'gold');
    }
    window.game.state.pendingLoginReward = null;
    window.game.saveGame();
    draw();
}

export function triggerPrestigeCeremony(sharesGained, branchName, callback) {
    const _pLang = (game.state && game.state.language) || 'en';
    const _pT = translations[_pLang] || translations.en;
    const overlay = document.createElement('div');
    overlay.className = 'prestige-ceremony-overlay';
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('role', 'status');

    const line1 = document.createElement('div');
    line1.className = 'ceremony-line1';
    line1.style.cssText = 'font-size:1.5rem; margin-bottom:0.5rem; opacity:0; transition:opacity 0.4s ease;';
    line1.innerText = branchName + ' ' + (_pT.prestigeResetLabel || 'resetting...');

    const line2 = document.createElement('div');
    line2.className = 'ceremony-line2';
    line2.style.cssText = 'font-size:2.5rem; margin:0.5rem 0; opacity:0; transition:opacity 0.4s ease;';
    line2.innerText = '0';

    const line3 = document.createElement('div');
    line3.className = 'ceremony-line3';
    line3.style.cssText = 'font-size:1rem; color:#dfab29; opacity:0; transition:opacity 0.4s ease;';
    line3.innerText = _pT.goldSharesLabel || 'Gold Shares';

    overlay.appendChild(line1);
    overlay.appendChild(line2);
    overlay.appendChild(line3);
    document.body.appendChild(overlay);

    // Phase 1: show "branch resetting..."
    setTimeout(() => { line1.style.opacity = '1'; }, 50);

    // Phase 2: counter animation + fireworks
    setTimeout(() => {
        line2.style.opacity = '1';
        line3.style.opacity = '1';
        // Fireworks particle effect during prestige ceremony
        if (typeof window.hapticTap === 'function') window.hapticTap(20);
        ['🎆','✨','🌟','💫','🎇'].forEach(function(emoji, i) {
            setTimeout(function() {
                spawnFloating(emoji, Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1, window.innerHeight * 0.3, 'gold');
            }, i * 200);
        });
        const duration = 1000;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const current = Math.floor(progress * sharesGained);
            line2.innerText = '+' + current;
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                line2.innerText = '+' + sharesGained;
            }
        };
        requestAnimationFrame(animate);
    }, 500);

    // Phase 3: fade out and invoke callback
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (typeof callback === 'function') callback();
        }, 500);
    }, 2000);
}

    export function _wheelWeightedRandom(prizes) {
        const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const prize of prizes) {
            rand -= prize.weight;
            if (rand <= 0) return prize;
        }
        return prizes[prizes.length - 1];
    }

    export function updateFortuneWheelBtnState() {
        const btn = document.getElementById('fortune-wheel-btn');
        if (!btn) return;
        if (!window.game || !window.game.state) return;
        
        const now = Date.now();
        const lastSpin = (game.state && game.state.lastSpinTime) || 0;
        const canFreeSpin = (now - lastSpin) >= 86400000;
        
        const MAX_AD_SPINS_PER_DAY = 3;
        const lastAdSpin = game.state.lastAdSpinTime || 0;
        const currentDayAdSpins = (now - lastAdSpin < 86400000) ? (game.state.wheelAdSpinsCount || 0) : 0;
        const adSpinsLeft = Math.max(0, MAX_AD_SPINS_PER_DAY - currentDayAdSpins);
        const canAdSpin = adSpinsLeft > 0;
        
        const canAnySpin = canFreeSpin || canAdSpin;
        btn.classList.toggle('fortune-wheel-ready', canAnySpin);
        btn.classList.toggle('fortune-wheel-free', canFreeSpin);
        btn.classList.toggle('fortune-wheel-ad-ready', !canFreeSpin && canAdSpin);
        
        const badge = document.getElementById('fortune-wheel-badge');
        if (badge) {
            if (canFreeSpin) {
                badge.textContent = '!';
                badge.style.display = 'flex';
            } else if (canAdSpin) {
                badge.textContent = '🎬';
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    export function openFortuneWheel() {
        initSound();
        const lang = (game.state && game.state.language) || 'en';
        const tObj = translations[lang] || translations.he || translations.en;

        const modal = document.getElementById('fortune-wheel-modal');
        if (!modal) return;

        const titleEl = document.getElementById('fortune-wheel-title-text') || document.getElementById('fortune-wheel-title');
        if (titleEl) titleEl.textContent = tObj.fortuneWheelTitle || 'גלגל המזל היומי';
        const subtitleEl = document.getElementById('fortune-wheel-subtitle');
        if (subtitleEl) subtitleEl.textContent = tObj.fortuneWheelSubtitle || 'סובב פעם ביום וזכה בפרסים ענקיים!';
        const closeBtnEl = document.getElementById('fortune-close-btn');
        if (closeBtnEl) closeBtnEl.textContent = tObj.fortuneWheelClose || '✕ סגור וחזור למשחק';
        const hubTextEl = document.getElementById('fortune-hub-text');
        if (hubTextEl) hubTextEl.textContent = tObj.fortuneWheelSpinHub || 'סובב';

        const now = Date.now();
        const lastSpin = game.state.lastSpinTime || 0;
        const cooldownMs = 86400000; // 24 hours
        const timeLeft = cooldownMs - (now - lastSpin);
        const canSpin = timeLeft <= 0;
        let adSpinGranted = false;

        const spinBtn = document.getElementById('fortune-spin-btn');
        const adSpinBtn = document.getElementById('fortune-ad-spin-btn');
        const hubSpinBtn = document.getElementById('fortune-hub-spin-btn');
        const cooldownEl = document.getElementById('fortune-cooldown');
        const resultEl = document.getElementById('fortune-result');

        if (resultEl) resultEl.style.display = 'none';

        function formatShortAmount(num) {
            if (num < 1000) return '$' + Math.ceil(num);
            const i = Math.floor(Math.log10(num) / 3);
            const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd'];
            const suffix = suffixes[i] || '';
            const rawVal = num / Math.pow(10, i * 3);
            return '$' + (rawVal < 10 ? rawVal.toFixed(1) : Math.ceil(rawVal)) + suffix;
        }

        const segmentsContainer = document.getElementById('wheel-segments-container');
        const wheelGraphic = document.querySelector('.fortune-wheel-graphic');
        if (segmentsContainer && wheelGraphic) {
            segmentsContainer.innerHTML = '';
            
            // 6 Rich Velvet Slices (matching Reference 1-to-1)
            const wedgeColors = [
                '#b45309 0deg 60deg',    // 1: Gold / Bronze (Cash Small)
                '#1d4ed8 60deg 120deg',  // 2: Royal Sapphire (Shares 15)
                '#15803d 120deg 180deg', // 3: Rich Emerald (Cash Medium)
                '#7e22ce 180deg 240deg', // 4: Velvet Purple (Cash Big)
                '#0f766e 240deg 300deg', // 5: Ocean Teal (Shares 5)
                '#c2410c 300deg 360deg'  // 6: Solar Orange (Boost 2x)
            ];
            wheelGraphic.style.background = `conic-gradient(${wedgeColors.join(', ')})`;

            GAME_CONFIG.WHEEL_PRIZES.forEach((p, index) => {
                if (index >= 6) return;

                const middleAngle = index * 60 + 30; // Center of each 60deg wedge

                const seg = document.createElement('div');
                seg.className = `wheel-seg seg-${index + 1}`;
                seg.style.transform = `rotate(${middleAngle}deg) translateY(-68px)`;

                let icon = '🎁';
                let text = '';

                if (p.type === 'cash') {
                    icon = p.label === 'cash_small' ? '🪙' : (p.label === 'cash_medium' ? '💵' : '💸');
                    const eps = game.getEarningsPerSecond();
                    const timeAmount = 3600 * eps * p.value;
                    const pct = p.label === 'cash_big' ? 0.30 : (p.label === 'cash_medium' ? 0.20 : 0.10);
                    const pctAmount = Math.round(game.state.cash * pct);
                    text = formatShortAmount(Math.max(timeAmount, pctAmount));
                } else if (p.type === 'boost') {
                    icon = '⚡';
                    text = `+${p.value}H`;
                } else if (p.type === 'shares') {
                    icon = '✉️';
                    const isSmall = (p.label === 'shares_1');
                    let sharesAmount = Math.max(p.value, Math.floor((game.state.shares || 0) * (isSmall ? 0.25 : 0.50)));
                    sharesAmount = Math.min(10000, sharesAmount);
                    text = `+${sharesAmount >= 1000 ? (sharesAmount/1000)+'K' : sharesAmount}`;
                }

                const isBottomHalf = (middleAngle > 100 && middleAngle < 280);
                const uprightTransform = isBottomHalf ? 'transform: rotate(180deg);' : '';

                seg.innerHTML = `
                    <div class="wheel-seg-inner" style="${uprightTransform}">
                        <span class="seg-icon">${icon}</span>
                        <span class="seg-val" dir="ltr">${text}</span>
                    </div>
                `;
                segmentsContainer.appendChild(seg);
            });
        }

        function updateButtonStates() {
            const curNow = Date.now();
            const curLastSpin = game.state.lastSpinTime || 0;
            const curTimeLeft = 86400000 - (curNow - curLastSpin);
            const curCanSpin = curTimeLeft <= 0;

            const today = new Date().toDateString();
            if (game.state.wheelAdSpinsDate !== today) {
                game.state.wheelAdSpinsDate = today;
                game.state.wheelAdSpinsCount = 0;
            }
            const currentAdSpinsUsed = game.state.wheelAdSpinsCount || 0;
            const currentAdSpinsLeft = Math.max(0, 3 - currentAdSpinsUsed);

            if (curCanSpin || adSpinGranted) {
                if (spinBtn) {
                    spinBtn.disabled = false;
                    spinBtn.style.display = 'block';
                    spinBtn.textContent = tObj.fortuneWheelSpinBtn || '🎯 סובב עכשיו בחינם!';
                }
                if (hubSpinBtn) hubSpinBtn.disabled = false;
                if (adSpinBtn) {
                    adSpinBtn.style.display = 'none';
                    adSpinBtn.classList.remove('disabled-limit');
                }
                if (cooldownEl) cooldownEl.style.display = 'none';
            } else if (currentAdSpinsLeft > 0) {
                if (spinBtn) spinBtn.style.display = 'none';
                if (adSpinBtn) {
                    adSpinBtn.style.display = 'flex';
                    adSpinBtn.disabled = false;
                    adSpinBtn.classList.remove('disabled-limit');
                    const adTextEl = document.getElementById('fortune-ad-spin-text');
                    const adBtnStr = typeof tObj.fortuneWheelAdSpinBtn === 'function'
                        ? tObj.fortuneWheelAdSpinBtn(currentAdSpinsLeft)
                        : `📺 סיבוב נוסף (${currentAdSpinsLeft}/3) — צפה בפרסומת`;
                    if (adTextEl) adTextEl.textContent = adBtnStr;
                }
                if (hubSpinBtn) hubSpinBtn.disabled = false;
                if (cooldownEl) {
                    const hoursLeft = Math.floor(curTimeLeft / 3600000);
                    const minsLeft = Math.floor((curTimeLeft % 3600000) / 60000);
                    const hStr = hoursLeft.toString().padStart(2, '0');
                    const mStr = minsLeft.toString().padStart(2, '0');
                    cooldownEl.textContent = `${tObj.fortuneWheelCooldownLabel || '⏱️ סיבוב חינם הבא בעוד:'} ${hStr}:${mStr}`;
                    cooldownEl.style.display = 'inline-block';
                    if (curTimeLeft > 0 && curTimeLeft <= 3600000) {
                        cooldownEl.style.color = '#ef4444';
                        cooldownEl.style.fontWeight = 'bold';
                    } else {
                        cooldownEl.style.color = '';
                        cooldownEl.style.fontWeight = '';
                    }
                }
            } else {
                // All 3 daily ad spins reached!
                if (spinBtn) spinBtn.style.display = 'none';
                if (adSpinBtn) {
                    adSpinBtn.style.display = 'flex';
                    adSpinBtn.disabled = true;
                    adSpinBtn.classList.add('disabled-limit');
                    const adTextEl = document.getElementById('fortune-ad-spin-text');
                    if (adTextEl) adTextEl.textContent = tObj.fortuneWheelAdLimitReached || '🚫 נוצלו כל 3 סיבובי הפרסומת להיום (0/3)';
                }
                if (hubSpinBtn) hubSpinBtn.disabled = true;
                if (cooldownEl) {
                    const hoursLeft = Math.floor(curTimeLeft / 3600000);
                    const minsLeft = Math.floor((curTimeLeft % 3600000) / 60000);
                    const hStr = hoursLeft.toString().padStart(2, '0');
                    const mStr = minsLeft.toString().padStart(2, '0');
                    cooldownEl.textContent = `${tObj.fortuneWheelCooldownLabel || '⏱️ סיבוב חינם הבא בעוד:'} ${hStr}:${mStr}`;
                    cooldownEl.style.display = 'inline-block';
                    if (curTimeLeft > 0 && curTimeLeft <= 3600000) {
                        cooldownEl.style.color = '#ef4444';
                        cooldownEl.style.fontWeight = 'bold';
                    } else {
                        cooldownEl.style.color = '';
                        cooldownEl.style.fontWeight = '';
                    }
                }
            }
        }

        updateButtonStates();

        let isSpinning = false;

        const triggerSpinAction = () => {
            initSound();
            if (typeof window.hapticTap === 'function') window.hapticTap();

            const curNow = Date.now();
            const curLastSpin = game.state.lastSpinTime || 0;
            const isFreeReady = (curNow - curLastSpin) >= 86400000;

            if (!isFreeReady && !adSpinGranted) {
                // If clicked while in cooldown, trigger ad flow
                if (adSpinBtn) adSpinBtn.click();
                return;
            }

            isSpinning = true;

            if (spinBtn) {
                spinBtn.disabled = true;
                spinBtn.textContent = tObj.fortuneWheelSpinning || 'מסתובב בהתרגשות... 🎡';
            }
            if (adSpinBtn) adSpinBtn.disabled = true;
            if (hubSpinBtn) hubSpinBtn.disabled = true;

            const prizePool = GAME_CONFIG.WHEEL_PRIZES;
            const prize = _wheelWeightedRandom(prizePool);
            const prizeIndex = prizePool.indexOf(prize);

            const centerSliceAngle = prizeIndex * 60 + 30;
            const jitter = (Math.random() * 16 - 8);
            const landedAngle = centerSliceAngle + jitter;
            const targetAngle = 360 - landedAngle;

            const wheelEl = document.getElementById('fortune-wheel-graphic');
            if (wheelEl) {
                const prevAngle = wheelEl._currentRotation || 0;
                const startBase = prevAngle % 360;
                wheelEl.style.transition = 'none';
                wheelEl.style.transform = `rotate(${startBase}deg)`;
                void wheelEl.offsetWidth; // Force reflow
                
                // Ultra-smooth 4.2s authentic casino deceleration
                wheelEl.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.86, 0.15, 1)';
                const totalRotation = startBase + 2160 + targetAngle;
                wheelEl.style.transform = `rotate(${totalRotation}deg)`;
                wheelEl._currentRotation = totalRotation;
            }

            setTimeout(() => {
                isSpinning = false;
                let prizeText = '';
                const lang2 = (game.state && game.state.language) || 'en';
                const tObj2 = translations[lang2] || translations.he || translations.en;

                if (prize.type === 'cash') {
                    const eps = game.getEarningsPerSecond();
                    const timeAmount = 3600 * eps * prize.value;
                    const pctAmount = Math.round(game.state.cash * (prize.label === 'cash_small' ? 0.10 : (prize.label === 'cash_medium' ? 0.20 : 0.30)));
                    const amount = Math.max(timeAmount, pctAmount);
                    game.addCash(amount);
                    prizeText = `+${formatMoney(amount)}`;
                    spawnFloating(`+${formatMoney(amount)}`, window.innerWidth / 2, window.innerHeight / 2 - 60, 'green');
                } else if (prize.type === 'boost') {
                    game.addBoost2x(prize.value);
                    const boostHrs = prize.value;
                    prizeText = (typeof tObj2.boostLabel === 'function')
                        ? tObj2.boostLabel(boostHrs * 60)
                        : `+${boostHrs}h Boost x2`;
                    spawnFloating(`⚡ +${boostHrs}h`, window.innerWidth / 2, window.innerHeight / 2 - 60, 'gold');
                } else if (prize.type === 'gold' || prize.type === 'shares') {
                    const isSmall = (prize.label === 'gold_1' || prize.label === 'shares_1');
                    let sharesAmount = Math.max(prize.value, Math.floor((game.state.shares || 0) * (isSmall ? 0.25 : 0.50)));
                    sharesAmount = Math.min(10000, sharesAmount);
                    game.addShares(sharesAmount);
                    const sharesLabel = `+${sharesAmount}`;
                    prizeText = `${sharesLabel} ${tObj2.goldSharesLabel || 'מניות זהב'}`;
                    spawnFloating(`📈 ${sharesLabel}`, window.innerWidth / 2, window.innerHeight / 2 - 60, 'gold');
                }

                if (adSpinGranted) {
                    game.state.lastAdSpinTime = Date.now();
                    game.state.wheelAdSpinsCount = (game.state.wheelAdSpinsCount || 0) + 1;
                    adSpinGranted = false;
                } else {
                    game.state.lastSpinTime = Date.now();
                }
                game.saveGame();
                updateFortuneWheelBtnState();
                draw();
                showDiscoveryTip('fortune');

                if (resultEl) {
                    resultEl.innerHTML = `
                        <div class="wheel-win-top-row">
                            <span class="wheel-win-crown">👑</span>
                            <span class="wheel-win-headline">${tObj2.fortuneWheelPrizeTitle || 'ברכות! זכית בפרס מפואר'}</span>
                        </div>
                        <div class="wheel-win-box">
                            <span class="laurel laurel-left">🌿</span>
                            <strong class="wheel-win-amount">${prizeText}</strong>
                            <span class="laurel laurel-right">🌿</span>
                        </div>
                    `;
                    resultEl.style.display = 'flex';
                }

                updateButtonStates();
            }, 4100);
        };

        if (spinBtn) spinBtn.onclick = triggerSpinAction;
        if (hubSpinBtn) hubSpinBtn.onclick = triggerSpinAction;

        if (adSpinBtn) {
            adSpinBtn.onclick = () => {
                if (adSpinBtn.disabled || isSpinning) return;
                initSound();
                if (typeof window.hapticTap === 'function') window.hapticTap();
                adSpinBtn.disabled = true;

                playAd(() => {
                    adSpinGranted = true;
                    if (resultEl) resultEl.style.display = 'none';
                    updateButtonStates();
                    triggerSpinAction();
                }, 'short');
            };
        }

        const closeHandler = () => {
            if (isSpinning) return;
            if (typeof window.hapticTap === 'function') window.hapticTap();
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') window.gameAudio.playClick();
            modal.classList.remove('active');
        };

        const closeBtn = document.getElementById('fortune-close-btn');
        if (closeBtn) closeBtn.onclick = closeHandler;

        const closeXBtn = document.getElementById('fortune-close-x-top');
        if (closeXBtn) closeXBtn.onclick = closeHandler;

        modal.onclick = (e) => {
            if (e.target === modal) closeHandler();
        };

        activateModal(modal);
    }

if (typeof window !== "undefined") { window.openWeeklyRewardModal = openWeeklyRewardModal; }
