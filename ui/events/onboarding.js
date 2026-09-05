// Interactive 4-Step Onboarding Tutorial for Idle Bank Empire

class OnboardingManager {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 4;
        this.active = false;
        this.overlay = null;
        this.card = null;
        this.arrow = null;
        this.currentSpotlightEl = null;
        this._currentSelectors = [];
        this._rafId = null;
        this._onResize = this.reposition.bind(this);
    }

    isStep(stepNum) {
        return this.active && this.currentStep === stepNum;
    }

    start() {
        if (!window.game || !window.game.state) return;
        if (window.game.state.onboardingCompleted) return;

        // Ensure Teller 0 has initial cash so step 1 is ready immediately
        if (window.game.state.tellers && window.game.state.tellers[0]) {
            window.game.state.tellers[0].cashStored = Math.max(50, window.game.state.tellers[0].cashStored || 0);
        }

        this.buildUI();
        this.active = true;
        this.currentStep = 1;
        this.showStep(1);
        window.addEventListener('resize', this._onResize, { passive: true });
        window.addEventListener('scroll', this._onResize, { passive: true });
        this._startTracking();
    }

    _startTracking() {
        const loop = () => {
            if (this.active) {
                this.reposition();
                this._rafId = requestAnimationFrame(loop);
            }
        };
        this._rafId = requestAnimationFrame(loop);
    }

    buildUI() {
        this.cleanup();

        // 1. Fullscreen Dimmed Overlay (clickable to advance)
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay active';
        this.overlay.id = 'onboarding-overlay';
        this.overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.executeCurrentStep();
        });
        document.body.appendChild(this.overlay);

        // 2. Floating Pointer Arrow
        this.arrow = document.createElement('div');
        this.arrow.className = 'onboarding-pointer-arrow';
        this.arrow.id = 'onboarding-pointer-arrow';
        this.arrow.innerHTML = '👇';
        document.body.appendChild(this.arrow);

        // 3. Floating Instruction Card
        this.card = document.createElement('div');
        this.card.className = 'onboarding-card';
        this.card.id = 'onboarding-card';
        document.body.appendChild(this.card);
    }

    _findVisibleTarget(selectors) {
        if (!Array.isArray(selectors)) {
            selectors = selectors.split(',').map(s => s.trim());
        }
        for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    return el;
                }
            }
        }
        return document.querySelector(selectors.join(', '));
    }

    executeCurrentStep() {
        if (!this.active) return;
        if (window.gameAudio && typeof window.gameAudio.playClick === 'function') {
            window.gameAudio.playClick();
        }

        if (this.currentStep === 1) {
            if (window.game && window.game.state) {
                window.game.state.tellers[0].cashStored = Math.max(50, window.game.state.tellers[0].cashStored || 0);
                window.game.collectTellerCash(0);
            }
            this.advance();
        } else if (this.currentStep === 2) {
            if (window.game && window.game.state) {
                window.game.state.vault.cashStored = Math.max(50, window.game.state.vault.cashStored || 0);
                window.game.collectVault();
            }
            this.advance();
        } else if (this.currentStep === 3) {
            // Activate Advertising Campaign
            if (window.game) {
                const maxB = (typeof window.game.getAdMaxBudget === 'function') ? window.game.getAdMaxBudget() : 100;
                const budget = Math.max(10, Math.round(maxB * 0.25));
                window.game.setAdvBudget(budget);
                const slider = document.getElementById('adv-budget-slider');
                if (slider) {
                    slider.value = 250;
                }
                if (typeof window.updateAdvDisplay === 'function') {
                    window.updateAdvDisplay(budget);
                }
            }
            this.advance();
        } else if (this.currentStep === 4) {
            if (window.game && window.game.state) {
                window.game.state.cash = Math.max(60, window.game.state.cash || 0);
                window.game.upgradeTeller(0);
            }
            this.complete();
        }
    }

    showStep(stepNum) {
        if (!this.active) return;
        this.currentStep = stepNum;

        // Remove spotlight from previous element
        if (this.currentSpotlightEl) {
            this.currentSpotlightEl.classList.remove('onboarding-spotlight-target');
            this.currentSpotlightEl = null;
        }

        const lang = (window.game && window.game.state && window.game.state.language) || 'he';
        const t = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};

        let text = '';
        let btnText = '';
        let selectors = [];

        if (stepNum === 1) {
            if (window.game && window.game.state && window.game.state.tellers && window.game.state.tellers[0]) {
                window.game.state.tellers[0].cashStored = Math.max(50, window.game.state.tellers[0].cashStored || 0);
            }
            if (typeof window.updateTellersDisplay === 'function') window.updateTellersDisplay();

            text = t.onboardingStep1 || 'לחץ על הדלפק כדי לאסוף את המזומן הראשון שלך! 💵';
            btnText = t.onboardingBtn1 || (lang === 'he' ? '💰 לחץ כאן לאיסוף ($50)' : '💰 Click here to collect ($50)');
            selectors = ['#teller-node-0', '#teller-collect-0', '.teller-counter:first-child'];
        } else if (stepNum === 2) {
            if (window.game && window.game.state && window.game.state.vault) {
                window.game.state.vault.cashStored = Math.max(50, window.game.state.vault.cashStored || 0);
            }
            text = t.onboardingStep2 || "לחץ 'גבה' כדי להעביר את הכסף מהכספת ליתרה שלך! 🏦";
            btnText = t.onboardingBtn2 || (lang === 'he' ? '🏦 לחץ כאן להעברה ליתרה' : '🏦 Click here to transfer to balance');
            selectors = ['#collect-vault-btn', '#vault-mini-btn', '#vault-mini-bar', '.vault-zone', '#vault-floor-card'];
        } else if (stepNum === 3) {
            text = t.onboardingStep3 || 'הפעל קמפיין פרסום כדי להזרים לקוחות מהר יותר! 📢';
            btnText = t.onboardingBtn3 || (lang === 'he' ? '📢 לחץ כאן להפעלת שיווק' : '📢 Click here to activate marketing');
            selectors = ['#label-adv-control', '#adv-budget-slider', '.advertising-control'];
        } else if (stepNum === 4) {
            if (window.game && window.game.state) {
                const upgCost = (typeof window.game.getTellerUpgradeCost === 'function') ? window.game.getTellerUpgradeCost(1) : 60;
                window.game.state.cash = Math.max(upgCost, window.game.state.cash || 0);
            }
            text = t.onboardingStep4 || 'שדרג את הכספר כדי להרוויח מהר יותר! ⚡';
            btnText = t.onboardingBtn4 || (lang === 'he' ? '⚡ לחץ כאן לשדרוג הכספר' : '⚡ Click here to upgrade teller');
            if (window.game && window.game.ui && typeof window.game.ui.switchTab === 'function') {
                window.game.ui.switchTab('upgrades');
            } else {
                const upgTabBtn = document.querySelector('[data-tab="upgrades"]');
                if (upgTabBtn) upgTabBtn.click();
            }
            selectors = ['.upgrade-card[data-type="teller"][data-id="0"] .upg-v2-buy-btn', '#tab-upgrades .upgrade-card:first-child .upg-v2-buy-btn', '#tab-upgrades .buy-btn'];
        }

        this._currentSelectors = selectors;
        const stepBadgeLabel = t.onboardingStepLabel || (lang === 'he' ? 'שלב' : 'Step');
        const skipLabel = t.onboardingSkip || (lang === 'he' ? 'דלג' : 'Skip');

        this.card.innerHTML = '<div class="onboarding-card-header">' +
            '<span class="onboarding-step-badge">' + stepBadgeLabel + ' ' + stepNum + ' / ' + this.totalSteps + '</span>' +
            '<button class="onboarding-skip-btn" id="onboarding-skip-btn">' + skipLabel + ' ✕</button>' +
            '</div>' +
            '<div class="onboarding-text">' + text + '</div>' +
            '<button class="onboarding-action-btn" id="onboarding-action-btn">' + btnText + '</button>';

        const skipBtn = this.card.querySelector('#onboarding-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.game) window.game.skipOnboarding();
            });
        }

        const actionBtn = this.card.querySelector('#onboarding-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeCurrentStep();
            });
        }

        const targetEl = this._findVisibleTarget(selectors);
        if (targetEl) {
            this.currentSpotlightEl = targetEl;
            targetEl.classList.add('onboarding-spotlight-target');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        this.reposition();
    }

    reposition() {
        if (!this.active || !this.card || !this.arrow) return;

        let targetEl = this.currentSpotlightEl;
        if (!targetEl || (targetEl.offsetWidth === 0 && targetEl.offsetHeight === 0)) {
            if (this._currentSelectors && this._currentSelectors.length > 0) {
                const newTarget = this._findVisibleTarget(this._currentSelectors);
                if (newTarget && newTarget !== targetEl) {
                    if (targetEl) targetEl.classList.remove('onboarding-spotlight-target');
                    targetEl = newTarget;
                    this.currentSpotlightEl = targetEl;
                    targetEl.classList.add('onboarding-spotlight-target');
                }
            }
        }

        const cardRect = this.card.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (targetEl && (targetEl.offsetWidth > 0 || targetEl.offsetHeight > 0)) {
            const rect = targetEl.getBoundingClientRect();
            const targetCenterX = rect.left + rect.width / 2;

            // Center card horizontally clamped to viewport
            const cardW = cardRect.width || 320;
            const cardLeft = Math.max(12, Math.min(vw - cardW - 12, targetCenterX - cardW / 2));
            this.card.style.left = cardLeft + 'px';

            const cardH = cardRect.height || 140;
            let cardTop;

            if (rect.top > cardH + 75) {
                // Place above target
                cardTop = rect.top - cardH - 18;
                this.arrow.innerHTML = '👇';
                this.arrow.style.left = (targetCenterX - 18) + 'px';
                this.arrow.style.top = (rect.top - 42) + 'px';
                this.arrow.style.display = 'block';
            } else if (vh - rect.bottom > cardH + 75) {
                // Place below target
                cardTop = rect.bottom + 25;
                this.arrow.innerHTML = '👆';
                this.arrow.style.left = (targetCenterX - 18) + 'px';
                this.arrow.style.top = (rect.bottom + 2) + 'px';
                this.arrow.style.display = 'block';
            } else {
                if (rect.top > vh / 2) {
                    cardTop = Math.max(15, rect.top - cardH - 10);
                } else {
                    cardTop = Math.min(vh - cardH - 15, rect.bottom + 15);
                }
                this.arrow.style.display = 'none';
            }

            cardTop = Math.max(15, Math.min(vh - cardH - 15, cardTop));
            this.card.style.top = cardTop + 'px';
        } else {
            // Fallback center of screen
            this.card.style.left = ((vw - (cardRect.width || 320)) / 2) + 'px';
            this.card.style.top = ((vh - (cardRect.height || 140)) / 2) + 'px';
            this.arrow.style.display = 'none';
        }
    }

    advance() {
        if (!this.active) return;
        if (this.currentStep === 1) {
            this.showStep(2);
        } else if (this.currentStep === 2) {
            this.showStep(3);
        } else if (this.currentStep === 3) {
            this.showStep(4);
        } else if (this.currentStep === 4) {
            this.complete();
        }
    }

    complete() {
        if (!this.active) return;
        if (window.game) {
            window.game.state.onboardingCompleted = true;
            window.game.saveGame();
        }
        if (window.gameAudio && typeof window.gameAudio.playChaChing === 'function') {
            window.gameAudio.playChaChing();
        }
        this.cleanup();
    }

    cleanup() {
        this.active = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this.currentSpotlightEl) {
            this.currentSpotlightEl.classList.remove('onboarding-spotlight-target');
            this.currentSpotlightEl = null;
        }
        if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
        if (this.card && this.card.parentNode) this.card.parentNode.removeChild(this.card);
        if (this.arrow && this.arrow.parentNode) this.arrow.parentNode.removeChild(this.arrow);
        this.overlay = null;
        this.card = null;
        this.arrow = null;
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('scroll', this._onResize);
    }
}

export const onboardingManager = new OnboardingManager();
if (typeof window !== 'undefined') {
    window.onboardingManager = onboardingManager;
}