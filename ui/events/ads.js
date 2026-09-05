import { resetBoostOfferTimer } from './main-loop.js';

let soundInitialized = false;
let contextualBannerShown = false;
let contextualOfferTimeout = null;

// Flip to true for local/manual QA on a native build so ad requests use Google's public
// test unit instead of the real one — repeatedly triggering the real unit from a dev
// device risks AdMob flagging the account for invalid traffic. Set back to false before release.
const AD_TESTING_MODE = false;
const PROD_REWARDED_AD_UNIT_ID = "ca-app-pub-1189054329275307/1609550976";
const TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";

export var AdService = {
    _isShowing: false,
    // Two independent cooldown pools so a big reward (prestige, weekly, offline-double,
    // the boost offer) doesn't get shadowed by a small one (contextual banner, VIP visit,
    // fortune wheel) sharing the same timer, or vice versa.
    lastWatchedAt: 0,
    lastWatchedAtShort: 0,
    AD_OFFER_COOLDOWN_MS: 7 * 60 * 1000,
    AD_OFFER_COOLDOWN_SHORT_MS: 2.5 * 60 * 1000,
    adMobAvailable: false,
    _activeCallback: null,
    _activeRewardGranted: false,
    _currentTier: 'big',
    _isAdPrepared: false,
    _preparingPromise: null,

    _executeReward: function() {
        if (AdService._activeRewardGranted) return;
        AdService._activeRewardGranted = true;
        console.log("[AdMob] Ad reward successfully granted!");
        if (typeof AdService._activeCallback === "function") {
            const cb = AdService._activeCallback;
            AdService._activeCallback = null;
            try {
                cb();
            } catch (err) {
                console.error("[AdMob] Error in ad reward callback:", err);
            }
        }
        AdService._markWatched();
        resetBoostOfferTimer();
    },

    isInCooldown: function(tier) {
        if (tier === 'short') {
            return AdService.lastWatchedAtShort > 0 &&
                (Date.now() - AdService.lastWatchedAtShort) < AdService.AD_OFFER_COOLDOWN_SHORT_MS;
        }
        return AdService.lastWatchedAt > 0 &&
            (Date.now() - AdService.lastWatchedAt) < AdService.AD_OFFER_COOLDOWN_MS;
    },

    _markWatched: function() {
        if (AdService._currentTier === 'short') {
            AdService.lastWatchedAtShort = Date.now();
        } else {
            AdService.lastWatchedAt = Date.now();
        }
    },
    
    initAdMob: async function() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                // 1. Request Google UMP (User Messaging Platform) Consent Info
                try {
                    if (typeof AdMob.requestConsentInfo === 'function') {
                        const consentInfo = await AdMob.requestConsentInfo();
                        if (consentInfo && consentInfo.status === 'REQUIRED') {
                            if (typeof AdMob.showConsentForm === 'function') {
                                await AdMob.showConsentForm();
                            }
                        }
                    }
                } catch (consentErr) {
                    console.warn('AdMob UMP consent request non-blocking warning:', consentErr);
                }

                // 2. Initialize AdMob SDK
                await AdMob.initialize({
                    requestTrackingAuthorization: true
                });
                AdService.adMobAvailable = true;
                
                // 3. Add listeners for both Capacitor Community AdMob v8 and legacy event names
                const onRewardEarned = (rewardItem) => {
                    console.log("[AdMob] onRewardedVideoAdReward event earned:", rewardItem);
                    AdService._executeReward();
                };

                const onAdDismissed = () => {
                    console.log("[AdMob] onRewardedVideoAdDismissed event");
                    AdService._isShowing = false;
                    AdService._isAdPrepared = false;
                    // Reset active callback after a slight delay to allow any pending reward event to settle
                    setTimeout(() => {
                        AdService._activeCallback = null;
                        AdService._activeRewardGranted = false;
                        AdService.prepareAd();
                    }, 200);
                };

                AdMob.addListener("onRewardedVideoAdReward", onRewardEarned);
                AdMob.addListener("rewardedVideoAdReward", onRewardEarned);
                AdMob.addListener("onRewardedVideoAdDismissed", onAdDismissed);
                AdMob.addListener("rewardedVideoAdDismissed", onAdDismissed);

                // 4. Prepare initial rewarded ad
                await AdService.prepareAd();
            } catch (e) {
                console.error('AdMob init failed', e);
            }
        }
    },

    showPrivacyOptions: async function() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                if (typeof AdMob.showPrivacyOptionsForm === 'function') {
                    await AdMob.showPrivacyOptionsForm();
                    return true;
                }
            } catch (e) {
                console.warn('AdMob showPrivacyOptionsForm warning:', e);
            }
        }
        return false;
    },

    prepareAd: async function() {
        if (!AdService.adMobAvailable) return false;
        if (AdService._preparingPromise) return AdService._preparingPromise;

        AdService._preparingPromise = (async () => {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                // 1. Try production ad unit first (if not in forced test mode)
                if (!AD_TESTING_MODE) {
                    try {
                        await AdMob.prepareRewardVideoAd({
                            adId: PROD_REWARDED_AD_UNIT_ID,
                            isTesting: false
                        });
                        AdService._isAdPrepared = true;
                        return true;
                    } catch (prodErr) {
                        console.warn('Production AdMob unit not filled or pending approval, falling back to test ad unit:', prodErr);
                    }
                }

                // 2. Fallback to Google official test rewarded ad unit so video player always loads
                await AdMob.prepareRewardVideoAd({
                    adId: TEST_REWARDED_AD_UNIT_ID,
                    isTesting: true
                });
                AdService._isAdPrepared = true;
                return true;
            } catch (e) {
                console.error('Failed to prepare ad (both prod and test):', e);
                AdService._isAdPrepared = false;
                return false;
            } finally {
                AdService._preparingPromise = null;
            }
        })();

        return AdService._preparingPromise;
    },

    show: async function(callback, tier) {
        if (AdService._isShowing) return;
        AdService._isShowing = true;
        AdService._activeRewardGranted = false;
        AdService._activeCallback = callback;
        AdService._currentTier = tier === 'short' ? 'short' : 'big';

        if (AdService.adMobAvailable) {
            try {
                if (!AdService._isAdPrepared) {
                    await AdService.prepareAd();
                }
                const rewardResult = await window.Capacitor.Plugins.AdMob.showRewardVideoAd();
                console.log("[AdMob] showRewardVideoAd resolved:", rewardResult);
                if (rewardResult) {
                    AdService._executeReward();
                }
                AdService._isShowing = false;
                AdService._isAdPrepared = false;
                AdService.prepareAd();
                return;
            } catch (e) {
                console.error("AdMob show failed, falling back to mock:", e);
                AdService._isShowing = false;
                AdService._isAdPrepared = false;
                AdService.prepareAd();
                // Fall through to mock ad
            }
        }

        // --- FALLBACK MOCK AD (For Web / Errors) ---
        AdService._isShowing = true;
        let interval = null;
        let timeoutId = null;
        let settled = false;

        const removeOverlay = () => {
            const el = document.querySelector('.ad-playing-overlay');
            if (el && el.parentNode) el.parentNode.removeChild(el);
        };

        const complete = (grantReward) => {
            if (settled) return;
            settled = true;
            if (interval) clearInterval(interval);
            if (timeoutId) clearTimeout(timeoutId);
            AdService._isShowing = false;
            removeOverlay();
            if (grantReward) {
                AdService._executeReward();
            } else {
                AdService._activeCallback = null;
                AdService._activeRewardGranted = false;
            }
        };

        timeoutId = setTimeout(() => complete(true), 15000);

        try {
            const overlay = document.createElement('div');
            overlay.className = 'ad-playing-overlay';

            const lang = (window.game && window.game.state && window.game.state.language) || 'en';
            const tObj = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : ((window.translations && window.translations[lang]) || (window.translations && window.translations.he) || {});
            const titleText = tObj.adTitle || 'Watching Sponsored Ad...';
            const subtitleText = tObj.adSubtitle || 'Reward unlocks in:';
            const closeText = tObj.adCloseBtn || 'Close ❌ (No Reward)';

            overlay.innerHTML = `
                <div class="ad-playing-box" style="position: relative;">
                    <button class="ad-close-btn" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.4); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; z-index: 10;">${closeText}</button>
                    <div class="ad-spinner-container">
                        <div class="ad-spinner-outer"></div>
                        <div class="ad-spinner-inner"></div>
                        <div class="ad-countdown">5</div>
                    </div>
                    <h2 style="font-size:1.3rem; margin-top:1rem;">${titleText}</h2>
                    <p style="color:var(--text-muted); font-size:0.9rem;">${subtitleText}</p>
                </div>
            `;
            document.body.appendChild(overlay);

            let timeLeft = 5;
            interval = setInterval(() => {
                timeLeft--;
                const countdownEl = overlay.querySelector('.ad-countdown');
                if (countdownEl) countdownEl.innerText = timeLeft;

                if (timeLeft <= 0) {
                    complete(true);
                }
            }, 1000);

            const closeBtn = overlay.querySelector('.ad-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => complete(false));
            }
        } catch (err) {
            console.error("AdService failed to display:", err);
            complete(true);
        }
    }
};

// Initialize AdMob asynchronously
setTimeout(() => AdService.initAdMob(), 1000);

export function playAd(callback, tier) {
    AdService.show(callback, tier);
}

export function formatTime(sec) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function updateAdvDisplay(budget) {
    if (!DOM_CACHE.advDisplay) return;
    const lang = (window.game && game.state && game.state.language) || 'en';
    const tObj = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : ((window.translations && window.translations[lang]) || (window.translations && window.translations.he) || {});
    const slider = DOM_CACHE.advSlider;
    if (slider) {
        const val = parseInt(slider.value) || 0;
        const max = parseInt(slider.max) || 1000;
        const pct = Math.min(100, Math.max(0, (val / max) * 100));
        slider.style.setProperty('--slider-pct', `${pct}%`);
    }

    const dynamicMax = (window.game && typeof game.getAdMaxBudget === 'function') ? game.getAdMaxBudget() : 10000;
    const maxLimitLabel = document.getElementById('label-adv-limit-max');
    if (maxLimitLabel) {
        maxLimitLabel.textContent = formatMoney(dynamicMax);
    }

    const pill = document.getElementById('adv-value-pill');

    if (budget === 0) {
        DOM_CACHE.advDisplay.innerText = tObj.advValueOff || 'כבוי';
        DOM_CACHE.advDisplay.classList.remove('insufficient');
        if (pill) pill.className = 'adv-value-pill off';
    } else {
        DOM_CACHE.advDisplay.innerText = '📈 ' + formatMoney(budget) + (tObj.perMinute || ' לדקה');
        if (window.game && game.state && !game.state.advActive) {
            DOM_CACHE.advDisplay.innerText += (tObj.advSuspended || ' [מושהה]');
            DOM_CACHE.advDisplay.classList.add('insufficient');
            if (pill) pill.className = 'adv-value-pill suspended';
        } else {
            DOM_CACHE.advDisplay.classList.remove('insufficient');
            if (pill) pill.className = 'adv-value-pill active';
        }
    }
}
export function updateMuteButton() {
    if (!DOM_CACHE.muteBtn) return;
    const lang = window.gameLanguage || 'en';
    const tObj = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : ((window.translations && window.translations[lang]) || (window.translations && window.translations.he) || {});
    const isMuted = window.gameAudio ? window.gameAudio.isMuted : true;
    if (isMuted) {
        DOM_CACHE.muteBtn.innerText = '🔇';
        DOM_CACHE.muteBtn.title = tObj.unmute;
        DOM_CACHE.muteBtn.setAttribute('aria-label', tObj.unmute);
        DOM_CACHE.muteBtn.classList.add('muted');
    } else {
        DOM_CACHE.muteBtn.innerText = '🔊';
        DOM_CACHE.muteBtn.title = tObj.mute;
        DOM_CACHE.muteBtn.setAttribute('aria-label', tObj.mute);
        DOM_CACHE.muteBtn.classList.remove('muted');
    }
}

export function initSound() {
    if (!soundInitialized) {
        if (window.gameAudio && typeof window.gameAudio.init === 'function') {
            window.gameAudio.init();
            if (!window.gameAudio.isMuted && typeof window.gameAudio.startMusic === 'function') {
                window.gameAudio.startMusic();
            }
        }
        soundInitialized = true;
    }
}

export function showContextualAdBanner() {
    if (AdService.isInCooldown('short')) return;
    if (game.state.boost2xTimeLeft > 0) return;
    if (document.querySelector('.modal-overlay.active')) return;
    if (contextualBannerShown) return;

    const lang = (game.state && game.state.language) || 'en';
    const existing = document.getElementById('contextual-offer-banner');
    if (existing) existing.remove();

    const tObj = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : ((window.translations && window.translations[lang]) || (window.translations && window.translations.he) || {});
    const msg = tObj.boostMilestoneMsg || '🎉 Cash milestone! Activate x2 boost?';

    const banner = document.createElement('div');
    banner.id = 'contextual-offer-banner';
    banner.innerHTML = `
        <span style="font-size:0.82rem; color:var(--text-main); flex:1;">${msg}</span>
        <button id="ctx-offer-yes" style="background:var(--primary-gold,#dfab29); color:#000; border:none; padding:0.28rem 0.7rem; border-radius:8px; font-size:0.78rem; cursor:pointer; font-weight:700; white-space:nowrap;">${tObj.ctxWatchBtn || '🎬 Watch'}</button>
        <button id="ctx-offer-no" style="background:transparent; border:1px solid var(--border-color,rgba(255,255,255,0.1)); color:var(--text-muted,#9ca3af); padding:0.28rem 0.5rem; border-radius:8px; font-size:0.78rem; cursor:pointer;">✕</button>
    `;
    Object.assign(banner.style, {
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        position: 'fixed', bottom: '70px', left: '0', right: '0', margin: '0 auto',
        background: 'var(--surface-color,rgba(20,24,36,0.95))',
        border: '1px solid var(--primary-gold,#dfab29)',
        borderRadius: '12px', padding: '0.65rem 0.85rem',
        zIndex: '2000', maxWidth: '340px', width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', animation: 'slideUpIn 0.3s ease'
    });

    document.body.appendChild(banner);
    contextualBannerShown = true;

    const removeBanner = () => {
        if (banner.parentNode) banner.remove();
        contextualBannerShown = false;
        if (contextualOfferTimeout) clearTimeout(contextualOfferTimeout);
    };

    document.getElementById('ctx-offer-yes').addEventListener('click', () => {
        initSound();
        removeBanner();
        playAd(() => {
            game.addBoost2x(2);
            draw();
            spawnFloating(tObj.boostActivatedMsg || '⚡ Boost x2 activated!', window.innerWidth / 2, window.innerHeight / 2, 'gold');
        }, 'short');
    });

    document.getElementById('ctx-offer-no').addEventListener('click', () => {
        initSound();
        removeBanner();
    });

    contextualOfferTimeout = setTimeout(removeBanner, 9000);
}
