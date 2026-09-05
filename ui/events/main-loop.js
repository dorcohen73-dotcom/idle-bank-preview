import { formatMoney } from '../draw/format.js';
import { showContextualAdBanner, AdService } from './ads.js';
import { updateFortuneWheelBtnState } from './modals.js';

let autoSaveTimer = 0;
let tabRefreshTimer = 0;
let fortuneWheelBtnTimer = 0;
let drawTimer = 0;
let boostOfferEndTime = 0;
let boostOfferNextTime = 0;

// Safe UI DOM Caching & Throttling
let _domStickyBar = null;
let _domHeroCard = null;
let _domMBadgeTop = null;
let _domMBadgeBottom = null;
let _domDBadgeTop = null;
let _domTabBtnDaily = null;
let _domTabBtnMissions = null;
let _domBnavMissions = null;
let _domHeaderDailyBtn = null;
let _lastMissionsReady = -1;
let _lastDailyReady = -1;
let _lastStickyState = null;
let _uiCheckTimer = 0;

export function resetBoostOfferTimer() {
    boostOfferEndTime = 0;
    window._boostOfferEndTime = 0;
}

export function tick(timestamp) {
    try {
        const dt = (timestamp - lastTime) / 1000.0;
        lastTime = timestamp;

        const cappedDt = Math.min(1.0, dt);

        game.update(cappedDt);

        // Contextual ad offer
        if (game._contextualAdPending) {
            game._contextualAdPending = null;
            showContextualAdBanner();
        }

        // Boost offer window management
        {
            const now = Date.now();
            if (game.state.boost2xTimeLeft > 0) {
                // Boost active — reset offer cycle to start fresh after boost ends
                boostOfferEndTime = 0;
                boostOfferNextTime = 0;
            } else {
                if (boostOfferEndTime > 0 && now > boostOfferEndTime) {
                    // Offer expired — schedule next window in 15-30 min
                    boostOfferEndTime = 0;
                    boostOfferNextTime = now + (900 + Math.random() * 900) * 1000;
                } else if (boostOfferEndTime === 0 && (boostOfferNextTime === 0 || now > boostOfferNextTime)) {
                    if (!AdService.isInCooldown()) {
                        // Start new offer window: 10-20 min duration
                        boostOfferEndTime = now + (600 + Math.random() * 600) * 1000;
                        boostOfferNextTime = 0;
                    }
                }
            }
            window._boostOfferEndTime = boostOfferEndTime;
        }

        tabRefreshTimer += cappedDt;
        if (tabRefreshTimer >= GAME_CONFIG.TAB_REFRESH_INTERVAL_SEC) {
            tabRefreshTimer = 0;
            const _activeTabEl = document.querySelector('.tab-btn.active');
            if (_activeTabEl && _activeTabEl.getAttribute('data-tab') === 'missions') {
                game.checkMissions();
                if (typeof window.updateMissionsTabProgress === 'function') window.updateMissionsTabProgress();
            }

            // Achievements: checked unconditionally (the income bonus must apply globally and
            // promptly regardless of which tab is open), rendered only when its tab is active.
            const _newlyUnlockedAchievements = game.checkAchievements();
            if (_newlyUnlockedAchievements && _newlyUnlockedAchievements.length > 0) {
                _newlyUnlockedAchievements.forEach(a => {
                    if (typeof window.playAchievementUnlockFeedback === 'function') window.playAchievementUnlockFeedback(a);
                });
                game.saveGame();
            }
            if (_activeTabEl && _activeTabEl.getAttribute('data-tab') === 'daily') {
                if (_newlyUnlockedAchievements && _newlyUnlockedAchievements.length > 0 && typeof window.renderAchievementsTab === 'function') {
                    window.renderAchievementsTab();
                } else if (typeof window.updateAchievementsTabProgress === 'function') {
                    window.updateAchievementsTabProgress();
                }
            }

            updateButtonAffordability();

            // Near-miss prestige glow: light up prestige buttons when >= 70% of threshold
            const _nmBranch = game.branches && game.branches[game.state.currentBranch];
            if (_nmBranch) {
                const _nmRatio = (typeof GAME_CONFIG !== 'undefined' && typeof GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO === 'number') ? GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO : 0.90;
                const _nmThreshold = _nmBranch.minCashToPrestige * _nmRatio * 0.7;
                const _nmActive = game.state.lifetimeCash >= _nmThreshold && game.state.cash < (_nmBranch.minCashToPrestige * _nmRatio);
                document.querySelectorAll('[data-prestige-branch], #main-prestige-btn').forEach(el => {
                    el.classList.toggle('prestige-near-miss-glow', _nmActive);
                });
            }


        }

        fortuneWheelBtnTimer += cappedDt;
        if (fortuneWheelBtnTimer >= 2) {
            fortuneWheelBtnTimer = 0;
            updateFortuneWheelBtnState();
        }

        
        // Throttled UI & Sticky Bar Checks (~100ms interval to eliminate Reflows without visual lag)
        _uiCheckTimer += cappedDt;
        if (_uiCheckTimer >= 0.1) {
            _uiCheckTimer = 0;

            if (!_domStickyBar) _domStickyBar = document.getElementById('sticky-balance-bar');
            if (!_domHeroCard) _domHeroCard = document.getElementById('stat-cash') || document.querySelector('.cash-hero-card');

            if (_domStickyBar) {
                const isModalOpen = Boolean(
                    document.querySelector('.modal-overlay.active, .modal.active, #offline-modal.active, #event-modal-overlay.active, .dialog-overlay.active') ||
                    document.body.classList.contains('modal-open') ||
                    (document.getElementById('splash-screen') && !document.getElementById('splash-screen').classList.contains('hidden') && !document.getElementById('splash-screen').classList.contains('fade-out'))
                );

                let shouldShow = false;
                if (!isModalOpen) {
                    if (_domHeroCard) {
                        const rect = _domHeroCard.getBoundingClientRect();
                        shouldShow = rect.bottom <= 50;
                    } else {
                        const sc = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                        shouldShow = sc > 80;
                    }
                }
                if (shouldShow !== _lastStickyState) {
                    _lastStickyState = shouldShow;
                    _domStickyBar.classList.toggle('visible', shouldShow);
                }
            }

            // Notification Badges (Synced efficiently when numbers change)
            const _missionsReady = (game.state.missions || []).filter(m => m && m.completed && !m.claimed).length;
            const _dailyReady = (game.state.dailyChallenges || []).filter(c => c && c.completed && !c.claimed).length;
            let _achieveReady = 0;
            if (game.state.achievements && game.state.achievements.unlocked) {
                const _achKeys = Object.keys(game.state.achievements.unlocked);
                for (let i = 0; i < _achKeys.length; i++) {
                    if (game.state.achievements.unlocked[_achKeys[i]] && (!game.state.achievements.claimed || !game.state.achievements.claimed[_achKeys[i]])) {
                        _achieveReady++;
                    }
                }
            }
            const _pendingLogin = (game.state.pendingLoginReward) ? 1 : 0;
            const _trophyReadyTotal = _dailyReady + _achieveReady + _pendingLogin;

            if (_missionsReady !== _lastMissionsReady) {
                _lastMissionsReady = _missionsReady;
                if (!_domMBadgeTop) _domMBadgeTop = document.getElementById('missions-tab-badge');
                if (!_domMBadgeBottom) _domMBadgeBottom = document.getElementById('bnav-missions-badge');
                if (!_domTabBtnMissions) _domTabBtnMissions = document.getElementById('tab-btn-missions');
                if (!_domBnavMissions) _domBnavMissions = document.getElementById('bnav-missions');

                if (_domMBadgeTop) {
                    _domMBadgeTop.style.display = _missionsReady > 0 ? 'flex' : 'none';
                    _domMBadgeTop.innerText = String(_missionsReady);
                }
                if (_domMBadgeBottom) {
                    _domMBadgeBottom.style.display = _missionsReady > 0 ? 'flex' : 'none';
                    _domMBadgeBottom.innerText = String(_missionsReady);
                }
                if (_domTabBtnMissions) _domTabBtnMissions.classList.toggle('reward-ready-glow', _missionsReady > 0);
                if (_domBnavMissions) _domBnavMissions.classList.toggle('reward-ready-glow', _missionsReady > 0);
            }

            if (_dailyReady !== _lastDailyReady) {
                _lastDailyReady = _dailyReady;
                if (!_domDBadgeTop) _domDBadgeTop = document.getElementById('daily-tab-badge');
                if (!_domTabBtnDaily) _domTabBtnDaily = document.getElementById('tab-btn-daily');

                if (_domDBadgeTop) {
                    _domDBadgeTop.style.display = _dailyReady > 0 ? 'flex' : 'none';
                    _domDBadgeTop.innerText = String(_dailyReady);
                }
                if (_domTabBtnDaily) _domTabBtnDaily.classList.toggle('reward-ready-glow', _dailyReady > 0);
            }

            if (!_domHeaderDailyBtn) _domHeaderDailyBtn = document.getElementById('header-daily-btn');
            if (_domHeaderDailyBtn) {
                _domHeaderDailyBtn.classList.toggle('reward-ready-glow', _trophyReadyTotal > 0);
                _domHeaderDailyBtn.classList.toggle('header-daily-ready', _trophyReadyTotal > 0);
                const _trophyBadge = document.getElementById('header-daily-badge');
                if (_trophyBadge) {
                    if (_trophyReadyTotal > 0) {
                        _trophyBadge.textContent = '!';
                        _trophyBadge.style.display = 'flex';
                    } else {
                        _trophyBadge.style.display = 'none';
                    }
                }
            }
        }


        // Performance Throttling
        drawTimer += cappedDt;
        const targetFpsInterval = 0; // Run at native 60fps on all platforms to prevent stuttering/freezes

        if (drawTimer >= targetFpsInterval) {
            updateActiveCoins(drawTimer);
            if (typeof updateFloatingText === 'function') updateFloatingText(drawTimer);
            drawTimer = 0;
            draw();
        }

        autoSaveTimer += cappedDt;
        if (autoSaveTimer >= GAME_CONFIG.AUTO_SAVE_INTERVAL_SEC) {
            autoSaveTimer = 0;
            game.saveGame();
        }

        rafId = requestAnimationFrame(tick);
    } catch(e) {
        console.error("Critical error in game loop!", e);
        try {
            game.saveGame();
        } catch(saveErr) {
            console.error("Failed to auto-save during crash recovery", saveErr);
        }
        
        if (typeof window.showToast === 'function') {
            const _toastLang = (game.state && game.state.language) || 'en';
            const _toastT = (typeof translations !== 'undefined' && translations[_toastLang]) ? translations[_toastLang] : translations.en;
            const crashMsg = _toastT.errorDesc || 'A critical error occurred! Game progress was saved.';
            window.showToast(crashMsg, 'danger');
        }
        
        let overlay = document.getElementById('crash-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'crash-overlay';
            
            const _crashLang = window.gameLanguage || 'en';
            const _crashT = (typeof translations !== 'undefined' && translations[_crashLang]) ? translations[_crashLang] : translations.en;
            const title = document.createElement('h1');
            title.innerText = _crashT.errorTitle || 'Oops! Something went wrong';

            const desc = document.createElement('p');
            desc.innerText = (_crashT.errorDesc || 'An unexpected error occurred in the game loop. Your progress has been saved.') + ' ERROR: ' + (e.message || e) + '\n' + (e.stack || '');

            const reloadBtn = document.createElement('button');
            reloadBtn.innerText = _crashT.reloadBtn || 'Reload Game 🔄';
            reloadBtn.addEventListener('click', () => window.location.reload());
            
            overlay.appendChild(title);
            overlay.appendChild(desc);
            overlay.appendChild(reloadBtn);
            document.body.appendChild(overlay);
        }
    }
}

export function syncBottomNav(activeTab) {
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
    const headerDailyBtn = document.getElementById('header-daily-btn');
    if (headerDailyBtn) {
        headerDailyBtn.classList.toggle('active', activeTab === 'daily');
    }
}

export function updateVaultMiniBar(pct, isReady, cashStored, capacity, yieldPerHour, vaultLevel) {
    const miniPct = document.getElementById('vault-mini-pct');
    const miniFill = document.getElementById('vault-mini-fill');
    const miniBtn = document.getElementById('vault-mini-btn');
    const miniBar = document.getElementById('vault-mini-bar');
    if (!miniPct) return;
    miniPct.textContent = Math.round(pct) + '%';
    if (miniFill) {
        miniFill.style.width = pct + '%';
        miniFill.setAttribute('aria-valuenow', Math.round(pct));
    }
    if (miniBtn) {
        miniBtn.disabled = !isReady;
    }
    const fmt = (v) => ((typeof formatMoney === "function") ? formatMoney(v) : ((typeof window.formatMoney === "function") ? window.formatMoney(v) : ("$" + Math.round(v))));
    const miniStored = document.getElementById('vault-mini-stored');
    const miniCap = document.getElementById('vault-mini-cap');
    const miniYield = document.getElementById('vault-mini-yield');
    const miniLevel = document.getElementById('vault-mini-level');
    if (miniStored && cashStored !== undefined) miniStored.textContent = fmt(cashStored);
    if (miniCap && capacity !== undefined) miniCap.textContent = fmt(capacity);
    if (miniYield && yieldPerHour !== undefined) miniYield.textContent = '+' + fmt(yieldPerHour) + '/h';
    if (miniLevel && vaultLevel !== undefined) miniLevel.textContent = 'Lv.' + vaultLevel;
    // CSS classes לפס מילוי (ללא inline style — ה-CSS מטפל בצבע)
    if (miniFill) {
        miniFill.style.background = '';
        miniFill.classList.toggle('is-full', pct >= 95);
        miniFill.classList.toggle('is-warm', pct >= 60 && pct < 95);
    }
    // classes על הבר לאנימציות גלו
    if (miniBar) {
        miniBar.classList.toggle('is-full', pct >= 95);
        miniBar.classList.toggle('is-ready', isReady && pct < 95);
    }
}
