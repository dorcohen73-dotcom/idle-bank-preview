import { hapticTap } from '../../audio.js';
import { onboardingManager } from './onboarding.js';
window.onboardingManager = onboardingManager;
export * from './onboarding.js';
import { _getFocusableElements, trapFocus, releaseFocus, initFocusTrapObserver } from './focus-trap.js';
import { AdService, playAd, formatTime, updateAdvDisplay, updateMuteButton, initSound, showContextualAdBanner } from './ads.js';
import { applyLanguage, applyTheme } from './i18n-theme.js';
import { triggerMilestoneConfetti, handlePurchaseFeedback, handleMissionRedirect } from './purchase-feedback.js';
import {
    openPrestigeModal, openBoostModal, openAnalyticsModal, openWeeklyRewardModal, checkWeeklyReward,
    showOfflineEarningsModal, showLoginRewardModal, triggerPrestigeCeremony,
    updateFortuneWheelBtnState, openFortuneWheel, activateModal,
} from './modals.js';
import { tick, syncBottomNav, updateVaultMiniBar } from './main-loop.js';
import {
    triggerVipVisitBanner, removeVipVisitBanner, serveVipVisitor, renderDailyChallengesSection,
    startPromoRecording, spawnVaultCoins, showDiscoveryTip, initTutorialEvents, maybeStartTutorial, checkPrestigeTip,
} from './engagement.js';
import { setCurrentUpgradeMode } from '../tabs/tab-shared.js';
import { refreshAllTabs } from '../tabs/index.js';
import { NotificationService } from './notifications.js';
import { ReviewService } from './review.js';

let uiEventsInitialized = false;

function initUIEvents() {
    if (uiEventsInitialized) return;
    uiEventsInitialized = true;
    initFocusTrapObserver();

    // Backdrop touch dismiss for mobile modals
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (overlay.id === 'fortune-wheel-modal' && window._wheelIsSpinning) return;
                initSound();
                overlay.classList.remove('active');
                if (overlay.id === 'weekly-modal' && window.game && window.game.state) {
                    window.game.state.lastWeeklyReward = Date.now();
                    window.game.saveGame();
                }
            }
        });
    });

    // Escape key closes the topmost open modal
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const modals = [
            { id: 'fortune-wheel-modal', closeId: 'fortune-close-btn' },
            { id: 'prestige-modal',      closeId: 'prestige-cancel-btn' },
            { id: 'lang-modal',          closeId: 'lang-modal-close' },
            { id: 'login-reward-modal',  closeId: 'login-reward-collect-btn' },
            { id: 'offline-modal',       closeId: 'offline-claim-btn' },
            { id: 'weekly-modal',        closeId: 'weekly-close-btn' },
            { id: 'analytics-modal',     closeId: 'analytics-close-btn' },
            { id: 'event-modal',         closeId: null },
        ];
        for (const { id, closeId } of modals) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('active')) {
                const closeBtn = document.getElementById(closeId);
                if (closeBtn) closeBtn.click();
                break;
            }
        }
    });
    if (DOM_CACHE.resetBtn) {
        const confirmCheck = document.getElementById('reset-confirm-checkbox');
        if (confirmCheck) {
            confirmCheck.addEventListener('change', (e) => {
                DOM_CACHE.resetBtn.disabled = !e.target.checked;
            });
        }
        DOM_CACHE.resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            initSound();
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
            
            const lang = game.state.language || 'en';
            let confirmMsg = 'האם אתה בטוח שברצונך לאפס את המשחק ולהתחיל מ-0? כל ההתקדמות שלך תימחק לחלוטין!';
            if (lang === 'en') {
                confirmMsg = 'Are you sure you want to reset the game and start from 0? All your progress will be completely deleted!';
            } else if (lang === 'es') {
                confirmMsg = '¿Estás seguro de que quieres restablecer el juego y empezar desde 0? ¡Todo tu progreso se eliminará por completo!';
            } else if (lang === 'ru') {
                confirmMsg = 'Вы уверены, что хотите сбросить игру и начать с 0? Весь ваш прогресс будет полностью удален!';
            }
            
            if (confirm(confirmMsg)) {
                game.clearSave();
                location.reload();
            }
        });
    }

    if (DOM_CACHE.langBtn) {
        DOM_CACHE.langBtn.addEventListener('click', () => {
            initSound();
            if (DOM_CACHE.langModalClose) DOM_CACHE.langModalClose.style.display = 'inline-block';
            if (DOM_CACHE.langModal) activateModal(DOM_CACHE.langModal);
        });
    }

    if (DOM_CACHE.langModalClose) {
        DOM_CACHE.langModalClose.addEventListener('click', () => {
            initSound();
            if (DOM_CACHE.langModal) DOM_CACHE.langModal.classList.remove('active');
        });
    }

    if (DOM_CACHE.boostBtn) {
        DOM_CACHE.boostBtn.addEventListener('click', () => {
            initSound();
            openBoostModal();
        });
    }

    if (DOM_CACHE.analyticsBtn) {
        DOM_CACHE.analyticsBtn.addEventListener('click', () => {
            initSound();
            openAnalyticsModal();
        });
    }

    const analyticsFromSettingsBtn = document.getElementById('analytics-from-settings-btn');
    if (analyticsFromSettingsBtn) {
        analyticsFromSettingsBtn.addEventListener('click', () => {
            if (DOM_CACHE.langModal) DOM_CACHE.langModal.classList.remove('active');
            openAnalyticsModal();
        });
    }

    const fortuneWheelBtn = document.getElementById('fortune-wheel-btn');
    if (fortuneWheelBtn) {
        fortuneWheelBtn.addEventListener('click', () => {
            initSound();
            openFortuneWheel();
        });
    }

    const headerDailyBtn = document.getElementById('header-daily-btn');
    if (headerDailyBtn) {
        headerDailyBtn.addEventListener('click', () => {
            initSound();
            hapticTap();
            const existingTabBtn = document.querySelector('.tab-btn[data-tab="daily"]');
            if (existingTabBtn) {
                existingTabBtn.click();
            }
            syncBottomNav('daily');
            
            setTimeout(() => {
                const achievementsContainer = document.getElementById('tab-achievements');
                if (achievementsContainer) {
                    achievementsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        });
    }
    updateFortuneWheelBtnState();

    if (DOM_CACHE.muteBtn) {
        DOM_CACHE.muteBtn.addEventListener('click', () => {
            initSound();
            if (window.gameAudio && typeof window.gameAudio.toggleMute === 'function') {
                window.gameAudio.toggleMute();
            }
            updateMuteButton();
            if (window.gameAudio && !window.gameAudio.isMuted && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
        });
    }

    const elLangOptions = document.querySelectorAll('.lang-option-card');
    elLangOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            try {
                initSound();
                const selectedLang = opt.getAttribute('data-lang');
                game.setLanguage(selectedLang);
                window.localStorage.setItem('idle_bank_language_chosen', 'true');
                DOM_CACHE.langModal.classList.remove('active');
                applyLanguage(selectedLang);
                if (window.onboardingManager && !window.game.state.onboardingCompleted) {
                    setTimeout(() => {
                        if (!window.game.state.onboardingCompleted) {
                            window.onboardingManager.start();
                        }
                    }, 400);
                }
            } catch (err) {
                console.error("Error inside language options selection click handler:", err);
            }
        });
    });

    document.querySelectorAll('.theme-option-btn-choice').forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                initSound();
                const theme = btn.getAttribute('data-theme');
                applyTheme(theme);
                if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                    window.gameAudio.playClick();
                }
            } catch (err) {
                console.error("Error inside theme options selection click handler:", err);
            }
        });
    });

    
    const hapticsToggle = document.getElementById('settings-haptics-checkbox');
    if (hapticsToggle) {
        hapticsToggle.addEventListener('change', (e) => {
            initSound();
            if (window.game && window.game.state) {
                window.game.state.hapticsEnabled = e.target.checked;
                window.game.saveGame();
            }
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
        });
    }

    const notifToggle = document.getElementById('settings-notif-checkbox');
    if (notifToggle) {
        notifToggle.addEventListener('change', (e) => {
            initSound();
            if (window.game && window.game.state) {
                window.game.state.notificationsEnabled = e.target.checked;
                window.game.saveGame();
                if (!e.target.checked && window.NotificationService) {
                    window.NotificationService.cancelAll();
                } else if (e.target.checked && window.NotificationService) {
                    window.NotificationService.requestPermission();
                }
            }
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
        });
    }

    if (DOM_CACHE.langModal) {
        DOM_CACHE.langModal.addEventListener('click', (e) => {
            try {
                if (e.target === DOM_CACHE.langModal && window.localStorage.getItem('idle_bank_language_chosen')) {
                    initSound();
                    DOM_CACHE.langModal.classList.remove('active');
                }
            } catch (err) {
                console.error("Error closing language modal on overlay click:", err);
            }
        });
    }

    if (DOM_CACHE.advSlider) {
        DOM_CACHE.advSlider.addEventListener('input', () => {
            const sliderVal = parseInt(DOM_CACHE.advSlider.value);
            const dynamicMax = game.getAdMaxBudget();
            let budget = 0;
            if (sliderVal > 0) {
                budget = Math.round(dynamicMax * (sliderVal / 1000));
                budget = Math.max(1, Math.round(budget));
            }
            game.setAdvBudget(budget);
            updateAdvDisplay(budget);
        });
        DOM_CACHE.advSlider.addEventListener('change', () => {
            game.saveGame();
        });
    }

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(`tab-${tabId}`);

            // Update ARIA for accessibility
            document.querySelectorAll('.tab-btn[role="tab"]').forEach(b => {
                b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false');
            });
            if (targetPane) targetPane.classList.add('active');

            if (DOM_CACHE.bulkSelector) {
                if (tabId === 'upgrades' || tabId === 'managers') {
                    DOM_CACHE.bulkSelector.style.display = 'flex';
                } else {
                    DOM_CACHE.bulkSelector.style.display = 'none';
                }
            }

            if (tabId === 'daily' && typeof window.renderDailyChallengesSection === 'function') {
                window.renderDailyChallengesSection();
            }

            if (typeof window.invalidateTabHashes === 'function') window.invalidateTabHashes();
            if (tabId === 'upgrades' && typeof window.renderUpgradesTab === 'function') window.renderUpgradesTab();
            else if (tabId === 'managers' && typeof window.renderManagersTab === 'function') window.renderManagersTab();
            else if (tabId === 'departments' && typeof window.renderDepartmentsTab === 'function') window.renderDepartmentsTab();
            else if (tabId === 'missions' && typeof window.renderMissionsTab === 'function') window.renderMissionsTab();
            else if (tabId === 'daily') {
                if (typeof window.renderDailyChallengesSection === 'function') window.renderDailyChallengesSection();
                if (typeof window.renderAchievementsTab === 'function') window.renderAchievementsTab();
            }
            else if (tabId === 'branches' && typeof window.renderBranchesTab === 'function') window.renderBranchesTab();

            // סנכרון Bottom Nav
            syncBottomNav(tabId);

            initSound();
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
        });
    });

    // Bottom Nav click handlers
    const BNAV_RENDERERS = {
        upgrades: 'renderUpgradesTab',
        managers: 'renderManagersTab',
        departments: 'renderDepartmentsTab',
        missions: 'renderMissionsTab',
        branches: 'renderBranchesTab',
    };
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hapticTap();
            const tab = btn.dataset.tab;
            // מפעיל את הלוגיקה הקיימת של הטאבים (נתיב הדסקטופ)
            const existingTabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
            if (existingTabBtn) {
                existingTabBtn.click();
            }
            // Fallback: במובייל כפתור הדסקטופ מוסתר (display:none) — אם למרות ה-click()
            // הטאב לא התחלף, מבצעים את ההחלפה ישירות כדי שלא ייראה "שום דבר לא קורה".
            const targetPane = document.getElementById(`tab-${tab}`);
            if (targetPane && !targetPane.classList.contains('active')) {
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                targetPane.classList.add('active');
                if (existingTabBtn) existingTabBtn.classList.add('active');
                const rid = BNAV_RENDERERS[tab];
                if (rid && typeof window[rid] === 'function') window[rid]();
                if (typeof window.invalidateTabHashes === 'function') window.invalidateTabHashes();
                if (window.gameAudio && typeof window.gameAudio.playClick === 'function') window.gameAudio.playClick();
            }
            syncBottomNav(tab);

            // גלילה חלקה במובייל לאזור התוכן של הטאב שנפתח
            const controlPanel = document.getElementById('control-panel-section') || targetPane;
            if (controlPanel && (window.innerWidth <= 950 || window.matchMedia('(pointer: coarse)').matches)) {
                controlPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Vault Mini Btn — מחובר לאותה לוגיקה של collect vault
    const vaultMiniBtn = document.getElementById('vault-mini-btn');
    if (vaultMiniBtn) {
        vaultMiniBtn.addEventListener('click', () => {
            hapticTap();
            const mainVaultBtn = document.getElementById('collect-vault-btn');
            if (mainVaultBtn) mainVaultBtn.click();
        });
    }

    if (DOM_CACHE.bulkSelector) {
        DOM_CACHE.bulkSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.bulk-btn-option');
            if (!btn) return;
            
            initSound();
            setCurrentUpgradeMode(btn.getAttribute('data-mode'));
            DOM_CACHE.bulkSelector.querySelectorAll('.bulk-btn-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (typeof refreshAllTabs === 'function') {
                const scrollPos = document.getElementById('tab-upgrades') ? document.getElementById('tab-upgrades').scrollTop : 0;
                refreshAllTabs();
                if (document.getElementById('tab-upgrades')) document.getElementById('tab-upgrades').scrollTop = scrollPos;
            } else if (typeof updateButtonAffordability === 'function') {
                updateButtonAffordability();
            }
        });
    }

    const tabUpgrades = document.getElementById('tab-upgrades');
    if (tabUpgrades) {
        tabUpgrades.addEventListener('click', (e) => {
            const btn = e.target.closest('.buy-btn');
            if (!btn || btn.classList.contains('disabled')) return;

            initSound();
            hapticTap();
            const type = btn.getAttribute('data-type');
            const id = parseInt(btn.getAttribute('data-id'));
            if (isNaN(id) && (type === 'teller' || type === 'guard')) return;
            const action = btn.getAttribute('data-action');

            const beforeCash = game.state.cash;
            let beforeVal = 0;
            let feedType = '';

            if (type === 'teller') {
                beforeVal = game.state.tellers[id].level;
                feedType = 'teller';
                game.upgradeTellerBulk(id, window.currentUpgradeMode);
            } else if (type === 'guard') {
                beforeVal = game.state.guards[id].level;
                feedType = 'guard';
                game.upgradeGuardBulk(id, window.currentUpgradeMode);
            } else if (action === 'unlock-teller') {
                beforeVal = game.state.tellers[id].unlocked;
                feedType = 'unlock-teller';
                game.unlockTeller(id);
            } else if (action === 'unlock-guard') {
                beforeVal = game.state.guards[id].unlocked;
                feedType = 'unlock-guard';
                game.unlockGuard(id);
                if (!beforeVal) showDiscoveryTip('guard');
            } else if (btn.id === 'upgrade-vault-btn') {
                beforeVal = game.state.vault.level;
                feedType = 'vault';
                game.upgradeVaultBulk(window.currentUpgradeMode);
            } else if (btn.id === 'upgrade-queue-btn') {
                beforeVal = game.state.queueUpgradeLevel || 1;
                feedType = 'queue';
                game.upgradeQueueBulk(window.currentUpgradeMode);
            } else {
                return;
            }

            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }

            handlePurchaseFeedback(btn, e, beforeCash, beforeVal, feedType, id);
            if (feedType === 'unlock-teller' || feedType === 'unlock-guard') {
                renderUpgradesTab();
                if (feedType === 'unlock-teller' && typeof window.rebuildTellersDOM === 'function') {
                    window.rebuildTellersDOM();
                    if (typeof window.recalcGuardAnchors === 'function') window.recalcGuardAnchors();
                }
            } else {
                const scrollPos = tabUpgrades.scrollTop;
                if (typeof refreshAllTabs === 'function') {
                    refreshAllTabs();
                } else if (typeof updateButtonAffordability === 'function') {
                    updateButtonAffordability();
                }
                tabUpgrades.scrollTop = scrollPos;
            }
        });
    }

    if (DOM_CACHE.offlineModalDoubleBtn) {
        DOM_CACHE.offlineModalDoubleBtn.addEventListener('click', () => {
            initSound();
            const extra = (game && game.offlineEarningsReport && game.offlineEarningsReport > 0) ? game.offlineEarningsReport : 0;
            if (DOM_CACHE.offlineModal) DOM_CACHE.offlineModal.classList.remove('active');
            playAd(() => {
                if (extra > 0) {
                    game.addCash(extra);
                    if (window.gameAudio && typeof window.gameAudio.playChaChing === 'function') {
                        window.gameAudio.playChaChing();
                    }
                    spawnFloating('+' + formatMoney(extra), window.innerWidth / 2, window.innerHeight / 2 - 40, 'green', null, true);
                }
                game.offlineEarningsReport = 0;
                game.saveGame();
                draw();
            });
        });
    }

    const gdprAcceptBtn = document.getElementById('gdpr-accept-btn');
    if (gdprAcceptBtn) {
        gdprAcceptBtn.addEventListener('click', () => {
            localStorage.setItem('gdpr_consent', '1');
            const banner = document.getElementById('gdpr-banner');
            if (banner) banner.style.display = 'none';
        });
    }

    const handlePrivacyLinkClick = async (e) => {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            if (typeof AdService !== 'undefined' && typeof AdService.showPrivacyOptions === 'function') {
                const handled = await AdService.showPrivacyOptions();
                if (handled) {
                    e.preventDefault();
                    return;
                }
            }
        }
    };
    const gdprPrivacyLink = document.getElementById('gdpr-privacy-link');
    if (gdprPrivacyLink) gdprPrivacyLink.addEventListener('click', handlePrivacyLinkClick);
    const gdprTermsLink = document.getElementById('gdpr-terms-link');
    if (gdprTermsLink) gdprTermsLink.addEventListener('click', handlePrivacyLinkClick);
    const settingsPrivacyLink = document.getElementById('settings-privacy-link');
    if (settingsPrivacyLink) settingsPrivacyLink.addEventListener('click', handlePrivacyLinkClick);

    if (DOM_CACHE.offlineModalClaimBtn) {
        DOM_CACHE.offlineModalClaimBtn.addEventListener('click', () => {
            initSound();
            if (DOM_CACHE.offlineModal) DOM_CACHE.offlineModal.classList.remove('active');
            game.offlineEarningsReport = 0;
            game.saveGame();
            draw();
        });
    }

    const prestigeModal = document.getElementById('prestige-modal');
    const prestigeAdBtn = document.getElementById('prestige-ad-btn');
    const prestigeRegularBtn = document.getElementById('prestige-regular-btn');
    const prestigeCancelBtn = document.getElementById('prestige-cancel-btn');

    if (prestigeAdBtn) {
        prestigeAdBtn.addEventListener('click', () => {
            initSound();
            if (prestigeModal) {
                const target = parseInt(prestigeModal.getAttribute('data-target-branch'));
                const sharesPreview = game.calculatePrestigeShares() * 3;
                const _prT = translations[(game.state && game.state.language) || 'en'] || translations.en;
                const branchName = (game.branches && game.branches[target]) ? game.branches[target].name : ((_prT.branchLabel || 'Branch') + ' ' + target);
                prestigeModal.classList.remove('active');
                playAd(() => {
                    triggerPrestigeCeremony(sharesPreview, branchName, () => {
                        game.prestige(target, true);
                        game.saveGame();
                        if (typeof applyLanguage === 'function') applyLanguage((game.state && game.state.language) || window.gameLanguage || 'he');
                        if (typeof syncBottomNav === 'function') syncBottomNav('upgrades');
                        const firstTabBtn = document.querySelector('.tab-btn');
                        if (firstTabBtn) firstTabBtn.click();
                        ReviewService.maybeRequest(game);
                        draw();
                    });
                });
            }
        });
    }

    if (prestigeRegularBtn) {
        prestigeRegularBtn.addEventListener('click', () => {
            initSound();
            if (prestigeModal) {
                const target = parseInt(prestigeModal.getAttribute('data-target-branch'));
                const sharesPreview = game.calculatePrestigeShares();
                const _prT2 = translations[(game.state && game.state.language) || 'en'] || translations.en;
                const branchName = (game.branches && game.branches[target]) ? game.branches[target].name : ((_prT2.branchLabel || 'Branch') + ' ' + target);
                prestigeModal.classList.remove('active');
                triggerPrestigeCeremony(sharesPreview, branchName, () => {
                    game.prestige(target, false);
                    game.saveGame();
                    if (typeof applyLanguage === 'function') applyLanguage((game.state && game.state.language) || window.gameLanguage || 'he');
                    if (typeof syncBottomNav === 'function') syncBottomNav('upgrades');
                    const firstTabBtn = document.querySelector('.tab-btn');
                    if (firstTabBtn) firstTabBtn.click();
                    ReviewService.maybeRequest(game);
                    draw();
                });
            }
        });
    }

    if (prestigeCancelBtn) {
        prestigeCancelBtn.addEventListener('click', () => {
            initSound();
            if (prestigeModal) {
                prestigeModal.classList.remove('active');
            }
        });
    }

    if (DOM_CACHE.vaultEmptyBtn) {
        DOM_CACHE.vaultEmptyBtn.addEventListener('click', () => {
            initSound();
            if (typeof hapticTap === 'function') hapticTap(15);
            const collected = game.collectVault();
            if (collected > 0) {
                const rectBtn = DOM_CACHE.vaultEmptyBtn.getBoundingClientRect();
                spawnFloating('+' + formatMoney(collected), rectBtn.left + rectBtn.width / 2, rectBtn.top, 'green', null, true);
                // Gold coins rain effect on vault collect
                spawnVaultCoins(collected, rectBtn);
                game.saveGame();
                draw();
                // Discovery tip: first time vault is collected (after start tip was already shown)
                var tips = game.state.discoveredTips || {};
                if (!tips.vault && tips.start) showDiscoveryTip('vault');
            }
        });
    }

    const vaultInfoBtn = document.getElementById('vault-info-btn');
    if (vaultInfoBtn) {
        vaultInfoBtn.addEventListener('click', () => {
            initSound();
            const lang = game.state.language || 'en';
            const tObj = translations[lang];
            if (tObj && typeof window.showToast === 'function') {
                window.showToast(tObj.vaultInfoMsg, 'info');
            }
        });
    }

    const vaultGraphicEl = DOM_CACHE.vaultGraphic;
    if (vaultGraphicEl) {
        vaultGraphicEl.addEventListener('click', () => {
            initSound();
            
            // Try to trigger courier
            for (let i = 0; i < game.state.guards.length; i++) {
                const g = game.state.guards[i];
                if (g.unlocked && g.state === 'idle') {
                    if (game.triggerGuard(g.id)) {
                        break;
                    }
                }
            }
            
            // Also act as vault empty button
            if (DOM_CACHE.vaultEmptyBtn) DOM_CACHE.vaultEmptyBtn.click();
        });

        // Keyboard support for non-button interactive div
        vaultGraphicEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                vaultGraphicEl.click();
            }
        });
    }

    const triggerFirstInteraction = () => {
        initSound();
        document.removeEventListener('click', triggerFirstInteraction);
        document.removeEventListener('touchstart', triggerFirstInteraction);
        document.removeEventListener('keydown', triggerFirstInteraction);
    };
    document.addEventListener('click', triggerFirstInteraction);
    document.addEventListener('touchstart', triggerFirstInteraction);
    document.addEventListener('keydown', triggerFirstInteraction);

    // Decoration interactions (Living Bank Simulator)
    const camera = document.querySelector('.security-camera');
    if (camera) {
        camera.style.cursor = 'pointer';
        camera.addEventListener('click', (e) => {
            initSound();
            camera.classList.remove('camera-wiggle');
            void camera.offsetWidth; // trigger reflow
            camera.classList.add('camera-wiggle');
            
            const bonus = 10 * (game.state.currentBranch + 1);
            game.addCash(bonus);
            
            const rect = camera.getBoundingClientRect();
            spawnFloating('+$' + bonus, rect.left + rect.width / 2, rect.top, 'green', null, true);
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
            draw();
        });
    }

    const atm = document.querySelector('.atm-machine');
    if (atm) {
        atm.style.cursor = 'pointer';
        atm.addEventListener('click', (e) => {
            initSound();
            atm.classList.remove('atm-vibrate');
            void atm.offsetWidth; // trigger reflow
            atm.classList.add('atm-vibrate');
            
            // Create falling/sliding receipt
            const receipt = document.createElement('div');
            receipt.className = 'atm-receipt';
            receipt.innerText = '$' + (15 * (game.state.currentBranch + 1));
            atm.appendChild(receipt);
            setTimeout(() => receipt.remove(), 1200);

            const bonus = 15 * (game.state.currentBranch + 1);
            game.addCash(bonus);
            
            const rect = atm.getBoundingClientRect();
            spawnFloating('+$' + bonus, rect.left + rect.width / 2, rect.top, 'green', null, true);
            if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
                window.gameAudio.playClick();
            }
            draw();
        });
    }

    const plants = document.querySelectorAll('.potted-plant');
    plants.forEach(plant => {
        plant.style.cursor = 'pointer';
        plant.addEventListener('click', (e) => {
            initSound();
            plant.classList.remove('plant-shake');
            void plant.offsetWidth; // trigger reflow
            plant.classList.add('plant-shake');
            
            // Create falling leaf
            const leaf = document.createElement('div');
            leaf.className = 'falling-leaf';
            leaf.innerText = '🍃';
            plant.appendChild(leaf);
            setTimeout(() => leaf.remove(), 1500);

            const bonus = 2 * (game.state.currentBranch + 1);
            game.addCash(bonus);
            
            const rect = plant.getBoundingClientRect();
            spawnFloating('+$' + bonus, rect.left + rect.width / 2, rect.top, 'green', null, true);
            draw();
        });
    });

    // Check weekly reward on game start
    setTimeout(() => {
        if (window.game && window.game.state) {
            checkWeeklyReward();
        }
    }, 2000);

    // Initialize tutorial system
    initTutorialEvents();
    maybeStartTutorial();
}

window.showTutorialStep   = function() {};
window.completeTutorial   = function() {};

export {
    _getFocusableElements, trapFocus, releaseFocus, initFocusTrapObserver,
    AdService, playAd, formatTime, updateAdvDisplay, updateMuteButton, initSound, showContextualAdBanner,
    applyLanguage, applyTheme,
    triggerMilestoneConfetti, handlePurchaseFeedback, handleMissionRedirect,
    openPrestigeModal, openBoostModal, openAnalyticsModal, openWeeklyRewardModal, checkWeeklyReward,
    showOfflineEarningsModal, showLoginRewardModal, triggerPrestigeCeremony,
    updateFortuneWheelBtnState, openFortuneWheel,
    tick, syncBottomNav, updateVaultMiniBar,
    triggerVipVisitBanner, removeVipVisitBanner, serveVipVisitor, renderDailyChallengesSection,
    startPromoRecording, spawnVaultCoins, showDiscoveryTip, initTutorialEvents, maybeStartTutorial, checkPrestigeTip,
    initUIEvents, NotificationService, ReviewService
};

// Dual-exposed on window for classic <script> consumers (game.js, save-manager.js,
// mission-controller.js) and other ui/* modules that still call these as bare/window globals.
window.applyLanguage = applyLanguage;
window.applyTheme = applyTheme;
window.playAd = playAd;
window.formatTime = formatTime;
window.activateModal = activateModal;
window.openPrestigeModal = openPrestigeModal;
window.openBoostModal = openBoostModal;
window.openAnalyticsModal = openAnalyticsModal;
window.updateAdvDisplay = updateAdvDisplay;
window.updateMuteButton = updateMuteButton;
window.initSound = initSound;
window.handlePurchaseFeedback = handlePurchaseFeedback;
window.handleMissionRedirect = handleMissionRedirect;
window.tick = tick;
window.initUIEvents = initUIEvents;
window.syncBottomNav = syncBottomNav;
window.updateVaultMiniBar = updateVaultMiniBar;
window.openFortuneWheel = openFortuneWheel;
window.triggerVipVisitBanner = triggerVipVisitBanner;
window.removeVipVisitBanner = removeVipVisitBanner;
window.AdService = AdService;
window.serveVipVisitor = serveVipVisitor;
window.renderDailyChallengesSection = renderDailyChallengesSection;
window.showLoginRewardModal = showLoginRewardModal;
window.triggerPrestigeCeremony = triggerPrestigeCeremony;
window.showOfflineEarningsModal = showOfflineEarningsModal;
window.showDiscoveryTip = showDiscoveryTip;
window.checkPrestigeTip = checkPrestigeTip;
window.maybeStartTutorial = maybeStartTutorial;
window.spawnVaultCoins = spawnVaultCoins;
window.startPromoRecording = startPromoRecording;
window.NotificationService = NotificationService;
window.ReviewService = ReviewService;

