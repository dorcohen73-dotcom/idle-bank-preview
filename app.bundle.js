(() => {
  // ui/events/onboarding.js
  var OnboardingManager = class {
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
      if (window.game.state.tellers && window.game.state.tellers[0]) {
        window.game.state.tellers[0].cashStored = Math.max(50, window.game.state.tellers[0].cashStored || 0);
      }
      this.buildUI();
      this.active = true;
      this.currentStep = 1;
      this.showStep(1);
      window.addEventListener("resize", this._onResize, { passive: true });
      window.addEventListener("scroll", this._onResize, { passive: true });
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
      this.overlay = document.createElement("div");
      this.overlay.className = "onboarding-overlay active";
      this.overlay.id = "onboarding-overlay";
      this.overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        this.executeCurrentStep();
      });
      document.body.appendChild(this.overlay);
      this.arrow = document.createElement("div");
      this.arrow.className = "onboarding-pointer-arrow";
      this.arrow.id = "onboarding-pointer-arrow";
      this.arrow.innerHTML = "\u{1F447}";
      document.body.appendChild(this.arrow);
      this.card = document.createElement("div");
      this.card.className = "onboarding-card";
      this.card.id = "onboarding-card";
      document.body.appendChild(this.card);
    }
    _findVisibleTarget(selectors) {
      if (!Array.isArray(selectors)) {
        selectors = selectors.split(",").map((s) => s.trim());
      }
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
            return el;
          }
        }
      }
      return document.querySelector(selectors.join(", "));
    }
    executeCurrentStep() {
      if (!this.active) return;
      if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
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
        if (window.game) {
          const maxB = typeof window.game.getAdMaxBudget === "function" ? window.game.getAdMaxBudget() : 100;
          const budget = Math.max(10, Math.round(maxB * 0.25));
          window.game.setAdvBudget(budget);
          const slider = document.getElementById("adv-budget-slider");
          if (slider) {
            slider.value = 250;
          }
          if (typeof window.updateAdvDisplay === "function") {
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
      if (this.currentSpotlightEl) {
        this.currentSpotlightEl.classList.remove("onboarding-spotlight-target");
        this.currentSpotlightEl = null;
      }
      const lang = window.game && window.game.state && window.game.state.language || "he";
      const t = typeof translations !== "undefined" && translations[lang] ? translations[lang] : {};
      let text = "";
      let btnText = "";
      let selectors = [];
      if (stepNum === 1) {
        if (window.game && window.game.state && window.game.state.tellers && window.game.state.tellers[0]) {
          window.game.state.tellers[0].cashStored = Math.max(50, window.game.state.tellers[0].cashStored || 0);
        }
        if (typeof window.updateTellersDisplay === "function") window.updateTellersDisplay();
        text = t.onboardingStep1 || "\u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05D3\u05DC\u05E4\u05E7 \u05DB\u05D3\u05D9 \u05DC\u05D0\u05E1\u05D5\u05E3 \u05D0\u05EA \u05D4\u05DE\u05D6\u05D5\u05DE\u05DF \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF \u05E9\u05DC\u05DA! \u{1F4B5}";
        btnText = t.onboardingBtn1 || (lang === "he" ? "\u{1F4B0} \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05D0\u05D9\u05E1\u05D5\u05E3 ($50)" : "\u{1F4B0} Click here to collect ($50)");
        selectors = ["#teller-node-0", "#teller-collect-0", ".teller-counter:first-child"];
      } else if (stepNum === 2) {
        if (window.game && window.game.state && window.game.state.vault) {
          window.game.state.vault.cashStored = Math.max(50, window.game.state.vault.cashStored || 0);
        }
        text = t.onboardingStep2 || "\u05DC\u05D7\u05E5 '\u05D2\u05D1\u05D4' \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E2\u05D1\u05D9\u05E8 \u05D0\u05EA \u05D4\u05DB\u05E1\u05E3 \u05DE\u05D4\u05DB\u05E1\u05E4\u05EA \u05DC\u05D9\u05EA\u05E8\u05D4 \u05E9\u05DC\u05DA! \u{1F3E6}";
        btnText = t.onboardingBtn2 || (lang === "he" ? "\u{1F3E6} \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05D4\u05E2\u05D1\u05E8\u05D4 \u05DC\u05D9\u05EA\u05E8\u05D4" : "\u{1F3E6} Click here to transfer to balance");
        selectors = ["#collect-vault-btn", "#vault-mini-btn", "#vault-mini-bar", ".vault-zone", "#vault-floor-card"];
      } else if (stepNum === 3) {
        text = t.onboardingStep3 || "\u05D4\u05E4\u05E2\u05DC \u05E7\u05DE\u05E4\u05D9\u05D9\u05DF \u05E4\u05E8\u05E1\u05D5\u05DD \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D6\u05E8\u05D9\u05DD \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8! \u{1F4E2}";
        btnText = t.onboardingBtn3 || (lang === "he" ? "\u{1F4E2} \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05D4\u05E4\u05E2\u05DC\u05EA \u05E9\u05D9\u05D5\u05D5\u05E7" : "\u{1F4E2} Click here to activate marketing");
        selectors = ["#label-adv-control", "#adv-budget-slider", ".advertising-control"];
      } else if (stepNum === 4) {
        if (window.game && window.game.state) {
          const upgCost = typeof window.game.getTellerUpgradeCost === "function" ? window.game.getTellerUpgradeCost(1) : 60;
          window.game.state.cash = Math.max(upgCost, window.game.state.cash || 0);
        }
        text = t.onboardingStep4 || "\u05E9\u05D3\u05E8\u05D2 \u05D0\u05EA \u05D4\u05DB\u05E1\u05E4\u05E8 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E8\u05D5\u05D5\u05D9\u05D7 \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8! \u26A1";
        btnText = t.onboardingBtn4 || (lang === "he" ? "\u26A1 \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05E9\u05D3\u05E8\u05D5\u05D2 \u05D4\u05DB\u05E1\u05E4\u05E8" : "\u26A1 Click here to upgrade teller");
        if (window.game && window.game.ui && typeof window.game.ui.switchTab === "function") {
          window.game.ui.switchTab("upgrades");
        } else {
          const upgTabBtn = document.querySelector('[data-tab="upgrades"]');
          if (upgTabBtn) upgTabBtn.click();
        }
        selectors = ['.upgrade-card[data-type="teller"][data-id="0"] .upg-v2-buy-btn', "#tab-upgrades .upgrade-card:first-child .upg-v2-buy-btn", "#tab-upgrades .buy-btn"];
      }
      this._currentSelectors = selectors;
      const stepBadgeLabel = t.onboardingStepLabel || (lang === "he" ? "\u05E9\u05DC\u05D1" : "Step");
      const skipLabel = t.onboardingSkip || (lang === "he" ? "\u05D3\u05DC\u05D2" : "Skip");
      this.card.innerHTML = '<div class="onboarding-card-header"><span class="onboarding-step-badge">' + stepBadgeLabel + " " + stepNum + " / " + this.totalSteps + '</span><button class="onboarding-skip-btn" id="onboarding-skip-btn">' + skipLabel + ' \u2715</button></div><div class="onboarding-text">' + text + '</div><button class="onboarding-action-btn" id="onboarding-action-btn">' + btnText + "</button>";
      const skipBtn = this.card.querySelector("#onboarding-skip-btn");
      if (skipBtn) {
        skipBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.game) window.game.skipOnboarding();
        });
      }
      const actionBtn = this.card.querySelector("#onboarding-action-btn");
      if (actionBtn) {
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.executeCurrentStep();
        });
      }
      const targetEl = this._findVisibleTarget(selectors);
      if (targetEl) {
        this.currentSpotlightEl = targetEl;
        targetEl.classList.add("onboarding-spotlight-target");
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      this.reposition();
    }
    reposition() {
      if (!this.active || !this.card || !this.arrow) return;
      let targetEl = this.currentSpotlightEl;
      if (!targetEl || targetEl.offsetWidth === 0 && targetEl.offsetHeight === 0) {
        if (this._currentSelectors && this._currentSelectors.length > 0) {
          const newTarget = this._findVisibleTarget(this._currentSelectors);
          if (newTarget && newTarget !== targetEl) {
            if (targetEl) targetEl.classList.remove("onboarding-spotlight-target");
            targetEl = newTarget;
            this.currentSpotlightEl = targetEl;
            targetEl.classList.add("onboarding-spotlight-target");
          }
        }
      }
      const cardRect = this.card.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (targetEl && (targetEl.offsetWidth > 0 || targetEl.offsetHeight > 0)) {
        const rect = targetEl.getBoundingClientRect();
        const targetCenterX = rect.left + rect.width / 2;
        const cardW = cardRect.width || 320;
        const cardLeft = Math.max(12, Math.min(vw - cardW - 12, targetCenterX - cardW / 2));
        this.card.style.left = cardLeft + "px";
        const cardH = cardRect.height || 140;
        let cardTop;
        if (rect.top > cardH + 75) {
          cardTop = rect.top - cardH - 18;
          this.arrow.innerHTML = "\u{1F447}";
          this.arrow.style.left = targetCenterX - 18 + "px";
          this.arrow.style.top = rect.top - 42 + "px";
          this.arrow.style.display = "block";
        } else if (vh - rect.bottom > cardH + 75) {
          cardTop = rect.bottom + 25;
          this.arrow.innerHTML = "\u{1F446}";
          this.arrow.style.left = targetCenterX - 18 + "px";
          this.arrow.style.top = rect.bottom + 2 + "px";
          this.arrow.style.display = "block";
        } else {
          if (rect.top > vh / 2) {
            cardTop = Math.max(15, rect.top - cardH - 10);
          } else {
            cardTop = Math.min(vh - cardH - 15, rect.bottom + 15);
          }
          this.arrow.style.display = "none";
        }
        cardTop = Math.max(15, Math.min(vh - cardH - 15, cardTop));
        this.card.style.top = cardTop + "px";
      } else {
        this.card.style.left = (vw - (cardRect.width || 320)) / 2 + "px";
        this.card.style.top = (vh - (cardRect.height || 140)) / 2 + "px";
        this.arrow.style.display = "none";
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
      if (window.gameAudio && typeof window.gameAudio.playChaChing === "function") {
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
        this.currentSpotlightEl.classList.remove("onboarding-spotlight-target");
        this.currentSpotlightEl = null;
      }
      if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
      if (this.card && this.card.parentNode) this.card.parentNode.removeChild(this.card);
      if (this.arrow && this.arrow.parentNode) this.arrow.parentNode.removeChild(this.arrow);
      this.overlay = null;
      this.card = null;
      this.arrow = null;
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("scroll", this._onResize);
    }
  };
  var onboardingManager = new OnboardingManager();
  if (typeof window !== "undefined") {
    window.onboardingManager = onboardingManager;
  }

  // ui/draw/format.js
  var svgCache = /* @__PURE__ */ new Map();
  var cachedSuffixes = ["", " \u05D0\u05DC\u05E3", " \u05DE\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05DE\u05D9\u05DC\u05D9\u05D0\u05E8\u05D3", " \u05D8\u05E8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E7\u05D5\u05D5\u05D3\u05E8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E7\u05D5\u05D5\u05D9\u05E0\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E1\u05E7\u05E1\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E1\u05E4\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05D0\u05D5\u05E7\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E0\u05D5\u05E0\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05D3\u05E6\u05D9\u05DC\u05D9\u05D5\u05DF"];
  var cachedFallback = " \u05E2\u05E6\u05D5\u05DD";
  var cachedLang = "he";
  function updateCachedSuffixes(lang) {
    cachedLang = lang || "en";
    if (cachedLang === "en") {
      cachedSuffixes = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
      cachedFallback = " monstrous";
    } else if (cachedLang === "es") {
      cachedSuffixes = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
      cachedFallback = " monstruoso";
    } else if (cachedLang === "ru") {
      cachedSuffixes = ["", " \u0442\u044B\u0441.", " \u043C\u043B\u043D", " \u043C\u043B\u0440\u0434", " \u0442\u0440\u043B\u043D", " \u043A\u0432\u0434\u0440\u043B\u043D", " \u043A\u0432\u0438\u043D\u0442.", " \u0441\u0435\u043A\u0441\u0442.", " \u0441\u0435\u043F\u0442.", " \u043E\u043A\u0442.", " \u043D\u043E\u043D.", " \u0434\u0435\u0446."];
      cachedFallback = " \u043E\u0433\u0440\u043E\u043C\u043D\u043E\u0435";
    } else {
      cachedSuffixes = ["", " \u05D0\u05DC\u05E3", " \u05DE\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05DE\u05D9\u05DC\u05D9\u05D0\u05E8\u05D3", " \u05D8\u05E8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E7\u05D5\u05D5\u05D3\u05E8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E7\u05D5\u05D5\u05D9\u05E0\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E1\u05E7\u05E1\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E1\u05E4\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05D0\u05D5\u05E7\u05D8\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05E0\u05D5\u05E0\u05D9\u05DC\u05D9\u05D5\u05DF", " \u05D3\u05E6\u05D9\u05DC\u05D9\u05D5\u05DF"];
      cachedFallback = " \u05E2\u05E6\u05D5\u05DD";
    }
  }
  if (typeof window !== "undefined") {
    window.updateCachedSuffixes = updateCachedSuffixes;
  }
  function fastFormat(num, lang) {
    const separator = lang === "ru" ? " " : ",";
    const parts = num.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join(".");
  }
  function formatMoney2(num, noDecimals = false) {
    if (num === null || num === void 0 || isNaN(num)) return "$0";
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const prefix = isNegative ? "-$" : "$";
    if (absNum < 1e3) {
      return prefix + fastFormat(Math.floor(absNum), cachedLang);
    }
    const i = Math.floor(Math.log10(absNum) / 3);
    const suffix = cachedSuffixes[i] !== void 0 ? cachedSuffixes[i] : cachedFallback;
    const rawVal = absNum / Math.pow(10, i * 3);
    const val = noDecimals ? Math.ceil(rawVal) : parseFloat(rawVal.toFixed(2));
    return prefix + fastFormat(val, cachedLang) + suffix;
  }
  function formatNumberCompact(num, noDecimals = false) {
    if (num === null || num === void 0 || isNaN(num)) return "0";
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const prefix = isNegative ? "-" : "";
    if (absNum < 1e3) {
      return prefix + fastFormat(Math.floor(absNum), "en");
    }
    const englishSuffixes = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const i = Math.floor(Math.log10(absNum) / 3);
    const suffix = englishSuffixes[i] !== void 0 ? englishSuffixes[i] : " monstrous";
    const rawVal = absNum / Math.pow(10, i * 3);
    const val = noDecimals ? Math.ceil(rawVal) : parseFloat(rawVal.toFixed(2));
    return prefix + fastFormat(val, "en") + suffix;
  }
  function getClientSVG(type, seed) {
    if (seed === void 0 || seed === null || isNaN(seed)) {
      seed = 0;
    }
    if (!type) {
      type = "normal";
    }
    const cleanType = type.replace(/[^a-zA-Z0-9]/g, "");
    const cacheKey = `${cleanType}_${seed}`;
    if (svgCache.has(cacheKey)) {
      const cached = svgCache.get(cacheKey);
      svgCache.delete(cacheKey);
      svgCache.set(cacheKey, cached);
      return cached;
    }
    let imgNum = 1;
    if (type === "rich") {
      imgNum = 9;
    } else if (type === "vip") {
      imgNum = 10;
    } else {
      imgNum = seed % 8 + 1;
    }
    let borderColor = "rgba(255, 255, 255, 0.15)";
    let borderWidth = "1.5px";
    let glow = "";
    if (type === "rich") {
      borderColor = "rgba(251, 191, 36, 0.85)";
      borderWidth = "2px";
      glow = "box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);";
    } else if (type === "vip") {
      borderColor = "rgba(192, 132, 252, 0.85)";
      borderWidth = "2px";
      glow = "box-shadow: 0 0 8px rgba(192, 132, 252, 0.4);";
    }
    const resultHtml = `
        <div style="position: absolute; inset: 0; border-radius: 50%; overflow: hidden; border: ${borderWidth} solid ${borderColor}; ${glow} background: #0c0f1d;">
            <img src="images/client-${imgNum}.png" alt="Client" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
    `;
    if (svgCache.size >= GAME_CONFIG.SVG_CACHE_MAX_SIZE) {
      svgCache.delete(svgCache.keys().next().value);
    }
    svgCache.set(cacheKey, resultHtml);
    return resultHtml;
  }

  // ui/draw/toast.js
  function showToast2(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `custom-toast toast-${type}`;
    toast.innerText = message;
    if (type === "danger") {
      toast.setAttribute("role", "alert");
      toast.setAttribute("aria-live", "assertive");
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3e3);
  }

  // ui/draw/animations.js
  var activeCoins = [];
  var isVaultRectDirty = true;
  if (typeof window !== "undefined") {
    window.addEventListener("scroll", () => {
      isVaultRectDirty = true;
    }, { passive: true });
    window.addEventListener("resize", () => {
      isVaultRectDirty = true;
    }, { passive: true });
    window.addEventListener("orientationchange", () => {
      isVaultRectDirty = true;
    }, { passive: true });
  }
  var floatingTextPool = [];
  var FLOATING_POOL_SIZE = 40;
  var activeFloatingText = [];
  function initFloatingPool() {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById("floating-container");
    if (!floatContainer) return;
    for (let i = 0; i < FLOATING_POOL_SIZE; i++) {
      const div = document.createElement("div");
      div.className = "floating-cash";
      div.style.cssText = "display:none;opacity:0;position:absolute;left:0;top:0;";
      floatContainer.appendChild(div);
      floatingTextPool.push({
        element: div,
        active: false
      });
    }
  }
  function getFloatingFromPool() {
    if (floatingTextPool.length === 0) initFloatingPool();
    for (let i = 0; i < floatingTextPool.length; i++) {
      if (!floatingTextPool[i].active) return floatingTextPool[i];
    }
    if (activeFloatingText.length > 0) {
      const oldest = activeFloatingText[0];
      activeFloatingText.shift();
      oldest.poolObj.active = false;
      oldest.element.style.display = "none";
      return oldest.poolObj;
    }
    return floatingTextPool[0];
  }
  var spawnCounter = 0;
  function spawnFloating2(text, x, y, type = "gold", fontSize = null, important = false) {
    if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y) || x <= 10 && y <= 60 || y < 50) {
      return;
    }
    if (window.PerformanceManager && window.PerformanceManager.isEco() && !important) {
      spawnCounter++;
      if (spawnCounter % 3 !== 0) return;
    }
    const floatObj = getFloatingFromPool();
    if (!floatObj) return;
    floatObj.active = true;
    const div = floatObj.element;
    let colorStr = type;
    if (type === "gold") colorStr = "var(--primary-gold)";
    else if (type === "red" || type === "danger") colorStr = "var(--danger-red)";
    else if (type === "green" || type === "money") colorStr = "var(--green-light)";
    div.style.cssText = `position:absolute;left:0;top:0;display:block;color:${colorStr};font-size:${fontSize || "1.2rem"};will-change:transform,opacity;`;
    div.innerText = text;
    activeFloatingText.push({
      poolObj: floatObj,
      element: div,
      startX: x,
      startY: y,
      colorStr,
      fontSize: fontSize || "1.2rem",
      progress: 0,
      duration: 1.2
    });
  }
  function updateFloatingText2(dt) {
    for (let i = activeFloatingText.length - 1; i >= 0; i--) {
      const f = activeFloatingText[i];
      f.progress += dt;
      const t = Math.min(1, f.progress / f.duration);
      const easeT = 1 - Math.pow(1 - t, 3);
      const currentY = f.startY - easeT * 50;
      let opacity = 1;
      if (t < 0.15) opacity = t / 0.15;
      else if (t > 0.7) opacity = 1 - (t - 0.7) / 0.3;
      f.element.style.transform = `translate3d(${f.startX}px,${currentY}px,0) scale(${1 + (1 - easeT) * 0.2})`;
      f.element.style.opacity = opacity;
      if (t >= 1) {
        f.element.style.display = "none";
        f.poolObj.active = false;
        activeFloatingText.splice(i, 1);
      }
    }
  }
  var coinPool = [];
  var COIN_POOL_SIZE = 120;
  function initCoinPool2() {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById("floating-container");
    if (!floatContainer) return;
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
      const coin = document.createElement("div");
      coin.className = "flying-coin";
      coin.style.cssText = "display:none;opacity:0;";
      floatContainer.appendChild(coin);
      coinPool.push({
        element: coin,
        active: false
      });
    }
  }
  function getCoinFromPool() {
    if (coinPool.length === 0) {
      initCoinPool2();
    }
    for (let i = 0; i < coinPool.length; i++) {
      if (!coinPool[i].active) {
        return coinPool[i];
      }
    }
    if (activeCoins.length > 0) {
      const oldestCoin = activeCoins[0];
      activeCoins.shift();
      oldestCoin.poolObj.active = false;
      oldestCoin.element.style.display = "none";
      return oldestCoin.poolObj;
    }
    return coinPool[0];
  }
  function clearActiveCoins() {
    activeCoins.forEach((c) => {
      c.element.style.display = "none";
      c.element.style.opacity = "0";
      if (c.poolObj) {
        c.poolObj.active = false;
      }
    });
    activeCoins.length = 0;
  }
  function updateActiveCoins2(dt) {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById("floating-container");
    if (!floatContainer) return;
    for (let i = activeCoins.length - 1; i >= 0; i--) {
      const c = activeCoins[i];
      if (c.delay > 0) {
        c.delay -= dt;
        if (c.delay <= 0) {
          c.element.style.cssText = `transform:translate3d(${c.startX}px,${c.startY}px,0);opacity:1;display:block;position:absolute;left:0;top:0;`;
        }
        continue;
      }
      c.progress += dt;
      const t = Math.min(1, c.progress / c.duration);
      const easeT = t * (2 - t);
      const currentX = c.startX + (c.endX - c.startX) * easeT;
      const arcY = -c.arcHeight * Math.sin(t * Math.PI);
      const currentY = c.startY + (c.endY - c.startY) * easeT + arcY;
      let transformStr = "";
      let opacity = 1 - t * 0.65;
      if (c.type === "particle") {
        const spin = c.randomPhase * 40 + t * 360;
        const scale = 1 - t * 0.8;
        transformStr = `scale(${scale}) rotate(${spin}deg)`;
        opacity = 1 - Math.pow(t, 2);
      } else if (c.type === "cash") {
        const wiggle = Math.sin(t * Math.PI * 4.5 + c.randomPhase) * 22;
        transformStr = `scale(${1.2 - t * 0.25}) rotate(${wiggle}deg)`;
      } else {
        const spin = c.randomPhase * 40 + t * 480;
        transformStr = `scale(${1.1 - t * 0.25}) rotate(${spin}deg)`;
      }
      c.element.style.cssText = `transform:translate3d(${currentX}px,${currentY}px,0) ${transformStr};opacity:${opacity};display:block;position:absolute;left:0;top:0;will-change:transform,opacity;`;
      if (t >= 1) {
        c.element.style.cssText = "display:none;opacity:0;";
        c.poolObj.active = false;
        if (c.isLast && !c.playedSound) {
          c.playedSound = true;
          if (c.type === "cash") {
            window.gameAudio.playChaChing();
          }
        }
        activeCoins.splice(i, 1);
      }
    }
  }
  function spawnParticles2(x, y, count = 10, type = "gold") {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById("floating-container");
    if (!floatContainer) return;
    if (coinPool.length === 0) initCoinPool2();
    for (let i = 0; i < count; i++) {
      const coinObj = getCoinFromPool();
      if (!coinObj) continue;
      coinObj.active = true;
      const coin = coinObj.element;
      coin.innerText = type === "star" ? "\u2728" : type === "sparkle" ? "\u{1F31F}" : "\u{1F4B0}";
      coin.style.display = "none";
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 80;
      activeCoins.push({
        poolObj: coinObj,
        element: coin,
        startX: x,
        startY: y,
        endX: x + Math.cos(angle) * distance,
        endY: y + Math.sin(angle) * distance,
        duration: 0.6 + Math.random() * 0.4,
        progress: 0,
        delay: 0,
        type: "particle",
        isLast: false,
        playedSound: true,
        arcHeight: -20 + Math.random() * 40,
        randomPhase: Math.random() * Math.PI * 2
      });
    }
  }
  function animateCoins() {
  }

  // ui/draw/bank-floor.js
  var TELLER_DOM_CACHE = {};
  var prevTellerCashHtml = {};
  var prevTellerClientStates2 = {};
  function rebuildTellersDOM2() {
    const lang = game.state.language || "en";
    DOM_CACHE.tellersZone.innerHTML = "";
    DOM_CACHE.tellersZone.className = `tellers-zone count-${game.state.tellers.length}`;
    for (const id in TELLER_DOM_CACHE) {
      delete TELLER_DOM_CACHE[id];
    }
    game.state.tellers.forEach((t) => {
      const div = document.createElement("div");
      div.id = `teller-node-${t.id}`;
      div.className = `teller-counter ${t.unlocked ? "active" : "locked"}`;
      div.setAttribute("data-id", t.id);
      if (t.unlocked) {
        div.innerHTML = `
                <div class="glass-showcase">
                    <img class="teller-bg-img" src="images/teller-${t.id % 8 + 1}.png?v=20260626" alt="" />
                    <div class="client-slot-3d" id="teller-client-${t.id}" title="${translations[lang].servingClientLabel}"></div>
                </div>
                <div class="gold-plaque">
                    <div class="plaque-header">
                        <span class="plaque-title">${translations[lang].tellerLabel} ${t.id + 1}</span>
                        <span class="plaque-level${t.level >= 10 ? " milestone-active" : ""}" id="teller-lvl-lbl-${t.id}">${translations[lang].levelLabel} ${t.level}</span>
                    </div>
                    <div class="plaque-body">
                        <div class="plaque-cash" id="teller-cash-${t.id}">$0</div>
                        <button class="plaque-collect-btn" id="teller-collect-${t.id}">${translations[lang].collectShortLabel}</button>
                    </div>
                    <div class="plaque-progress-container">
                        <div class="plaque-progress-fill" id="teller-progress-${t.id}"></div>
                    </div>
                </div>
            `;
        TELLER_DOM_CACHE[t.id] = {
          node: div,
          progress: div.querySelector(`#teller-progress-${t.id}`),
          cash: div.querySelector(`#teller-cash-${t.id}`),
          lvl: div.querySelector(`#teller-lvl-lbl-${t.id}`),
          collect: div.querySelector(`#teller-collect-${t.id}`),
          client: div.querySelector(`#teller-client-${t.id}`),
          lastPercent: -1,
          lastLevel: -1,
          lastCollectDisabled: null,
          lastVaultFullAlert: null
        };
        div.addEventListener("click", (e) => {
          initSound();
          if (typeof window !== "undefined" && window.onboardingManager && window.onboardingManager.isStep(1)) {
            if (t.id === 0) {
              game.state.tellers[0].cashStored = Math.max(50, game.state.tellers[0].cashStored || 0);
              game.collectTellerCash(0);
              window.onboardingManager.advance();
              return;
            }
          }
          if (!e.target.closest(".plaque-collect-btn")) {
            game.clickTeller(t.id);
          }
        });
        const collectBtn = div.querySelector(`#teller-collect-${t.id}`);
        collectBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          initSound();
          if (typeof window !== "undefined" && window.onboardingManager && window.onboardingManager.isStep(1)) {
            if (t.id === 0) {
              game.state.tellers[0].cashStored = Math.max(50, game.state.tellers[0].cashStored || 0);
              game.collectTellerCash(0);
              window.onboardingManager.advance();
              return;
            }
          }
          const collected = game.collectTellerCash(t.id);
          if (collected > 0) {
            const rectBtn = collectBtn.getBoundingClientRect();
            spawnFloating2("+" + formatMoney2(collected), rectBtn.left + rectBtn.width / 2, rectBtn.top, "green");
          }
        });
      } else {
        const cost = game.tellerUnlockCosts[t.id];
        div.innerHTML = `
                <div class="lock-info">
                    <div class="lock-icon">\u{1F512}</div>
                    <div style="font-size:0.8rem; margin-bottom: 0.15rem;">${translations[lang].unlockLabel}</div>
                    <div class="lock-cost">${formatMoney2(cost)}</div>
                </div>
            `;
        div.addEventListener("click", () => {
          initSound();
          if (game.unlockTeller(t.id)) {
            rebuildTellersDOM2();
            renderUpgradesTab();
          }
        });
      }
      DOM_CACHE.tellersZone.appendChild(div);
    });
  }
  function updateTellersDisplay(tObj, vaultData) {
    game.state.tellers.forEach((t) => {
      if (!t.unlocked) return;
      const tCache = TELLER_DOM_CACHE[t.id];
      if (!tCache) return;
      const tNode = tCache.node;
      const progressFill = tCache.progress;
      const cashLabel = tCache.cash;
      const lvlLabel = tCache.lvl;
      const collectBtn = tCache.collect;
      if (tNode) {
        const tData = game.getTellerRenderData(t.id);
        if (lvlLabel && tData.level !== tCache.lastLevel) {
          if (tData.level >= 10) {
            lvlLabel.classList.add("milestone-active");
          } else {
            lvlLabel.classList.remove("milestone-active");
          }
          tCache.lastLevel = tData.level;
        }
        if (tData.isProcessing) {
          tNode.classList.add("processing");
          if (tData.progressPercent !== tCache.lastPercent) {
            tCache.lastPercent = tData.progressPercent;
            if (progressFill) progressFill.style.transform = `scaleX(${tData.progressPercent / 100})`;
          }
        } else {
          tNode.classList.remove("processing");
          if (tCache.lastPercent !== 0) {
            tCache.lastPercent = 0;
            if (progressFill) progressFill.style.transform = "scaleX(0)";
          }
        }
        if (cashLabel) {
          let cashIcons = "";
          const safeCash = Math.max(0, tData.cashStored || 0);
          let cashText = formatMoney2(safeCash);
          if (safeCash > 0) {
            if (tData.fillPercent >= 100) {
              cashIcons = "";
              cashText = `<span class="teller-full-alert">${tObj.upgrades.tellerFull || "Full Teller"}</span><br/><span style="font-size:0.9rem;">${formatMoney2(safeCash)}</span>`;
            } else if (tData.fillPercent >= 80) {
              cashIcons = "\u{1F4B5}\u{1F4B5}\u{1F4B5} ";
            } else if (tData.fillPercent >= 40) {
              cashIcons = "\u{1F4B5}\u{1F4B5} ";
            } else {
              cashIcons = "\u{1F4B5} ";
            }
          }
          const newCashHtml = `<span style="font-size:0.85rem; margin-left:0.15rem;">${cashIcons}</span>${cashText}`;
          if (prevTellerCashHtml[tData.id] !== newCashHtml) {
            cashLabel.innerHTML = newCashHtml;
            prevTellerCashHtml[tData.id] = newCashHtml;
          }
        }
        const clientSlot = tCache.client;
        if (clientSlot) {
          const cacheKey = `${tData.id}:${tData.isProcessing}:${tData.customerType}:${tData.customerSeed}`;
          if (prevTellerClientStates2[tData.id] !== cacheKey) {
            if (tData.isProcessing) {
              clientSlot.classList.add("active");
              const _t = tData.customerType || "normal";
              const _s = tData.customerSeed === void 0 || tData.customerSeed === null || isNaN(tData.customerSeed) ? 0 : tData.customerSeed;
              const _n = _t === "rich" ? 9 : _t === "vip" ? 10 : _s % 8 + 1;
              clientSlot.style.setProperty("background-image", `url('images/client-${_n}.png')`, "important");
              clientSlot.style.setProperty("background-size", "cover", "important");
              clientSlot.style.setProperty("background-position", "center top", "important");
              clientSlot.innerHTML = "";
              tNode.classList.remove("vip-serving-glow", "rich-serving-glow");
              if (tData.customerType === "vip") {
                tNode.classList.add("vip-serving-glow");
                const rect = tNode.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top > 80 && rect.bottom < window.innerHeight && rect.left > 10) {
                  spawnFloating2("\u2605 VIP \u2605", rect.left + rect.width / 2, rect.top + 20, "rgba(192, 132, 252, 1)");
                }
              } else if (tData.customerType === "rich") {
                tNode.classList.add("rich-serving-glow");
                const rect = tNode.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top > 80 && rect.bottom < window.innerHeight && rect.left > 10) {
                  spawnFloating2("$ RICH $", rect.left + rect.width / 2, rect.top + 20, "rgba(251, 191, 36, 1)");
                }
              }
            } else {
              clientSlot.classList.remove("active");
              clientSlot.innerHTML = '<div class="idle-zzz">Zzz</div>';
              clientSlot.style.removeProperty("background-image");
              clientSlot.style.removeProperty("background-size");
              clientSlot.style.removeProperty("background-position");
              tNode.classList.remove("vip-serving-glow", "rich-serving-glow");
            }
            prevTellerClientStates2[tData.id] = cacheKey;
          }
        }
        const isFull = tData.fillPercent >= 100;
        if (isFull !== tCache.lastVaultFullAlert) {
          if (isFull) {
            tNode.classList.add("vault-full-alert");
          } else {
            tNode.classList.remove("vault-full-alert");
          }
          tCache.lastVaultFullAlert = isFull;
        }
        if (collectBtn) {
          const vaultSpace = vaultData.capacity - vaultData.cashStored;
          const isDisabled = tData.cashStored <= 0 || vaultSpace <= 0;
          if (isDisabled !== tCache.lastCollectDisabled) {
            if (isDisabled) {
              collectBtn.classList.add("disabled");
            } else {
              collectBtn.classList.remove("disabled");
            }
            tCache.lastCollectDisabled = isDisabled;
          }
        }
      }
    });
  }

  // ui/draw/security.js
  var hubClickBound = false;
  function bindHubClickListener() {
    if (hubClickBound) return;
    const hub = document.getElementById("guard-stations-hub");
    if (!hub) return;
    hub.addEventListener("click", (e) => {
      const bay = e.target.closest(".guard-station-bay");
      if (!bay) return;
      const gid = bay.getAttribute("data-guard-id");
      if (gid !== null && gid !== void 0) {
        if (window.gameAudio && window.gameAudio.playClick) {
          try {
            window.gameAudio.playClick();
          } catch (_) {
          }
        }
        const upgBtn = document.getElementById("tab-btn-upgrades") || document.querySelector('[data-tab="upgrades"]');
        if (upgBtn) upgBtn.click();
        setTimeout(() => {
          const card = document.querySelector(`.upgrade-card[data-type="guard"][data-id="${gid}"], [data-action="unlock-guard"][data-id="${gid}"]`) || document.querySelector(`.upgrades-grid:nth-of-type(2) .upgrade-card:nth-child(${parseInt(gid, 10) + 1})`);
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("highlight-glow");
            setTimeout(() => card.classList.remove("highlight-glow"), 1800);
          }
        }, 120);
      }
    });
    hubClickBound = true;
  }
  function renderGuardStationsHub(lang) {
    const hub = document.getElementById("guard-stations-hub");
    if (!hub || !window.game || !window.game.state || !Array.isArray(window.game.state.guards)) return;
    bindHubClickListener();
    const currentLang = lang || window.game && window.game.state && window.game.state.language || "he";
    const t = typeof translations !== "undefined" && translations[currentLang] ? translations[currentLang] : window.translations && window.translations[currentLang] || window.translations && window.translations.he || {};
    const unlockCosts = window.GAME_CONFIG && window.GAME_CONFIG.GUARD_UNLOCK_COSTS || [0, 2500, 7e4];
    const guardsHtml = window.game.state.guards.map((g, idx) => {
      const cost = unlockCosts[idx] || 0;
      if (g.unlocked) {
        const isOnDuty = g.state && g.state !== "idle";
        const statusText = isOnDuty ? t.guardOnDuty || "\u05D1\u05E1\u05D9\u05D5\u05E8" : t.guardReady || "\u05DE\u05D5\u05DB\u05DF";
        return `
                <div class="guard-station-bay active" id="guard-bay-${g.id}" data-guard-id="${g.id}" title="${t.guardLabel || "\u05D1\u05DC\u05D3\u05E8"} ${g.id + 1}">
                    <div class="guard-bay-slot" id="guard-slot-${g.id}">
                        <span class="guard-bay-slot-base"></span>
                    </div>
                    <div class="guard-bay-content">
                        <div class="guard-bay-name">${t.guardLabel || "\u05D1\u05DC\u05D3\u05E8"} ${g.id + 1}</div>
                        <div class="guard-bay-lvl-pill">${t.levelAbbr || t.levelLabel || "Lvl"} ${g.level || 1}</div>
                    </div>
                </div>
            `;
      } else {
        return `
                <div class="guard-station-bay locked" id="guard-bay-${g.id}" data-guard-id="${g.id}" title="${t.unlockLabel || "\u05E4\u05EA\u05D9\u05D7\u05D4"} ${t.guardLabel || "\u05D1\u05DC\u05D3\u05E8"} ${g.id + 1}">
                    <div class="guard-bay-slot">
                        <span class="guard-bay-lock-icon">\u{1F512}</span>
                    </div>
                    <div class="guard-bay-content">
                        <div class="guard-bay-name-row">
                            <span class="guard-bay-name">${t.guardLabel || "\u05D1\u05DC\u05D3\u05E8"} ${g.id + 1}</span>
                        </div>
                        <div class="guard-bay-status locked">${t.guardLockedLabel || t.lockedLabel || "Locked"}</div>
                    </div>
                </div>
            `;
      }
    }).join("");
    if (hub.innerHTML !== guardsHtml) {
      hub.innerHTML = guardsHtml;
    }
  }
  function getTellerAnchorPos(floorMap, tellerIndex) {
    const mapRect = floorMap.getBoundingClientRect();
    const tellerNode = document.getElementById(`teller-node-${tellerIndex}`) || document.querySelectorAll(".teller-counter")[tellerIndex];
    if (tellerNode) {
      const rect = tellerNode.getBoundingClientRect();
      return {
        x: rect.left - mapRect.left + rect.width / 2,
        y: rect.top - mapRect.top + rect.height * 0.65
        // Natural collection point right at counter desk
      };
    }
    const tellersZone = document.getElementById("tellers-zone");
    if (tellersZone) {
      const zRect = tellersZone.getBoundingClientRect();
      return {
        x: zRect.left - mapRect.left + zRect.width / 2,
        y: zRect.top - mapRect.top + 60
      };
    }
    return { x: 150, y: 300 };
  }
  function getStationSlotPos(floorMap, guardId) {
    const mapRect = floorMap.getBoundingClientRect();
    const slotEl = document.getElementById(`guard-slot-${guardId}`) || document.getElementById(`guard-bay-${guardId}`);
    if (slotEl) {
      const rect = slotEl.getBoundingClientRect();
      return {
        x: rect.left - mapRect.left + rect.width / 2,
        y: rect.top - mapRect.top + rect.height / 2
      };
    }
    return { x: 50 + guardId * 100, y: 150 };
  }
  function getCourierPos(gData) {
    const floorMap = document.getElementById("floor-map");
    if (!floorMap) return { x: 0, y: 0 };
    const stationPos = getStationSlotPos(floorMap, gData.id);
    if (!gData.state || gData.state === "idle" || gData.state === "depositing") {
      return stationPos;
    }
    if (gData.state.startsWith("moving_to_teller_")) {
      const targetTi = parseInt(gData.state.slice("moving_to_teller_".length), 10);
      const targetPos = getTellerAnchorPos(floorMap, targetTi);
      const lastTi = gData.lastCollectedTellerIndex;
      const isFirstStop = typeof lastTi !== "number" || lastTi < 0 || lastTi === targetTi;
      const startPos = isFirstStop ? stationPos : getTellerAnchorPos(floorMap, lastTi);
      const targetAnchor = window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS ? window.GAME_CONFIG.GUARD_TELLER_ANCHORS[targetTi] || 0.1 * (targetTi + 1) : 0.1 * (targetTi + 1);
      const startAnchor = typeof lastTi === "number" && lastTi >= 0 ? window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS ? window.GAME_CONFIG.GUARD_TELLER_ANCHORS[lastTi] : 0.1 * (lastTi + 1) : 0;
      const totalDist = Math.abs(targetAnchor - startAnchor);
      let t = 0;
      if (totalDist > 0) {
        t = Math.abs(gData.position - startAnchor) / totalDist;
      } else {
        t = 1;
      }
      t = Math.max(0, Math.min(1, t));
      return {
        x: startPos.x + t * (targetPos.x - startPos.x),
        y: startPos.y + t * (targetPos.y - startPos.y)
      };
    }
    if (gData.state.startsWith("collecting_from_teller_")) {
      const ti = parseInt(gData.state.slice("collecting_from_teller_".length), 10);
      return getTellerAnchorPos(floorMap, ti);
    }
    if (gData.state === "moving_to_vault") {
      const lastTi = typeof gData.lastCollectedTellerIndex === "number" && gData.lastCollectedTellerIndex >= 0 ? gData.lastCollectedTellerIndex : 0;
      const startPos = getTellerAnchorPos(floorMap, lastTi);
      const startAnchor = window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS ? window.GAME_CONFIG.GUARD_TELLER_ANCHORS[lastTi] || 0.1 * (lastTi + 1) : 0.1;
      const targetAnchor = 0;
      const totalDist = Math.abs(startAnchor - targetAnchor);
      let t = 0;
      if (totalDist > 0) {
        t = Math.abs(startAnchor - gData.position) / totalDist;
      } else {
        t = 1;
      }
      t = Math.max(0, Math.min(1, t));
      return {
        x: startPos.x + t * (stationPos.x - startPos.x),
        y: startPos.y + t * (stationPos.y - startPos.y)
      };
    }
    return stationPos;
  }
  function updateGuardsDisplay(lang) {
    renderGuardStationsHub(lang);
    const unlockedGuards = game.state.guards.filter((g) => g.unlocked);
    const floorMap = document.getElementById("floor-map");
    if (!floorMap) return;
    if (unlockedGuards.length > 0) {
      const currentGuardIds = unlockedGuards.map((g) => g.id.toString());
      const existingRunners = Array.from(floorMap.querySelectorAll(".guard-runner"));
      existingRunners.forEach((node) => {
        const gid = node.getAttribute("data-guard-id");
        if (!currentGuardIds.includes(gid)) {
          floorMap.removeChild(node);
        }
      });
      unlockedGuards.forEach((g) => {
        const gData = game.getGuardRenderData(g.id);
        if (!gData) return;
        let runner = floorMap.querySelector(`.guard-runner[data-guard-id="${gData.id}"]`);
        if (!runner) {
          runner = document.createElement("div");
          runner.className = "guard-runner";
          runner.setAttribute("data-guard-id", gData.id.toString());
          runner.style.zIndex = "310";
          runner.style.willChange = "transform, left, top";
          runner.style.position = "absolute";
          const avatarEl = document.createElement("div");
          avatarEl.className = "guard-runner-avatar";
          runner.appendChild(avatarEl);
          const loadEl2 = document.createElement("div");
          loadEl2.className = "guard-runner-load";
          runner.appendChild(loadEl2);
          floorMap.appendChild(runner);
        }
        const isMovingToTeller = gData.state && gData.state.startsWith("moving_to_teller_");
        const isCollecting = gData.state && gData.state.startsWith("collecting_from_teller_");
        const isMovingToVault = gData.state === "moving_to_vault";
        const isIdle = !gData.state || gData.state === "idle" || gData.state === "depositing";
        const pos = getCourierPos(gData);
        runner.style.left = `${pos.x}px`;
        runner.style.top = `${pos.y}px`;
        runner.style.transform = `translate(-50%, -50%)`;
        runner.className = "guard-runner";
        runner.classList.add(`state-${gData.state || "idle"}`);
        if (isMovingToTeller) runner.classList.add("state-moving_to_tellers");
        if (isCollecting) runner.classList.add("state-collecting");
        if (isIdle) runner.classList.add("state-idle-at-station");
        if (isMovingToTeller) {
          runner.classList.add("moving-left");
        } else if (gData.state === "moving_to_vault") {
          runner.classList.add("moving-right");
        }
        const loadEl = runner.querySelector(".guard-runner-load");
        const loadText = gData.loadedCash > 0 ? formatMoney2(gData.loadedCash) : "";
        if (loadEl.innerText !== loadText) {
          loadEl.innerText = loadText;
          loadEl.style.display = gData.loadedCash > 0 ? "block" : "none";
        }
      });
    } else {
      const existingRunners = Array.from(floorMap.querySelectorAll(".guard-runner"));
      existingRunners.forEach((node) => floorMap.removeChild(node));
    }
  }

  // ui/draw/vault.js
  var lastVaultPercent = -1;
  var prevVaultStatsHtml = "";
  var vaultFullToastShown = false;
  var _prestigePreviewTexts = {
    he: (val) => `\u05D0\u05DD \u05EA\u05E2\u05E9\u05D4 Prestige \u05E2\u05DB\u05E9\u05D9\u05D5: +${val} \u05DE\u05E0\u05D9\u05D5\u05EA \u{1F3C5}`,
    en: (val) => `Prestige now: +${val} shares \u{1F3C5}`,
    es: (val) => `Prestigio ahora: +${val} acciones \u{1F3C5}`,
    ru: (val) => `\u041F\u0440\u0435\u0441\u0442\u0438\u0436 \u0441\u0435\u0439\u0447\u0430\u0441: +${val} \u0430\u043A\u0446\u0438\u0439 \u{1F3C5}`
  };
  function updateVaultDisplay(tObj, vaultData) {
    const vPercent = vaultData.fillPercent;
    const vCap = vaultData.capacity;
    if (vPercent !== lastVaultPercent) {
      lastVaultPercent = vPercent;
      if (DOM_CACHE.vaultFill) {
        DOM_CACHE.vaultFill.style.width = `${vPercent}%`;
        DOM_CACHE.vaultFill.setAttribute("aria-valuenow", Math.round(vPercent));
      }
    }
    if (typeof window.updateVaultMiniBar === "function") {
      const vLvl = window.game && window.game.state && window.game.state.vaultLevel || vaultData && vaultData.level || 1;
      window.updateVaultMiniBar(vPercent, vaultData.cashStored > 0, vaultData.cashStored, vaultData.capacity, vaultData.yieldPerHour, vLvl);
    }
    if (vPercent >= 95) {
      if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.add("vault-full");
      if (!vaultFullToastShown) {
        showToast2(tObj.vaultFullMsg || "Vault is full \u2014 empty it", "danger");
        vaultFullToastShown = true;
      }
    } else {
      if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.remove("vault-full");
      vaultFullToastShown = false;
    }
    if (vaultData.cashStored >= vCap) {
      if (DOM_CACHE.vaultFill) DOM_CACHE.vaultFill.classList.add("full");
      if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.add("full");
    } else {
      if (DOM_CACHE.vaultFill) DOM_CACHE.vaultFill.classList.remove("full");
      if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.remove("full");
    }
    const newVaultStatsHtml = `
        <div>
            <span class="vault-current-value">${formatMoney2(vaultData.cashStored)}</span> / <span class="vault-limit-label">${formatMoney2(vCap)}</span>
        </div>
    `;
    if (prevVaultStatsHtml !== newVaultStatsHtml) {
      if (DOM_CACHE.vaultStats) DOM_CACHE.vaultStats.innerHTML = newVaultStatsHtml;
      prevVaultStatsHtml = newVaultStatsHtml;
    }
    const elVaultCapValue = DOM_CACHE.vaultCapValue;
    if (elVaultCapValue) {
      const newCapText = formatMoney2(vCap);
      if (elVaultCapValue.innerText !== newCapText) {
        elVaultCapValue.innerText = newCapText;
      }
    }
    const elVaultYieldValue = DOM_CACHE.vaultYieldValue;
    if (elVaultYieldValue) {
      const newYieldText = `+${formatMoney2(vaultData.yieldPerHour)}`;
      if (elVaultYieldValue.innerText !== newYieldText) {
        elVaultYieldValue.innerText = newYieldText;
      }
    }
    const elVaultProgressLabel = DOM_CACHE.vaultProgressLabel || document.getElementById("vault-progress-label");
    if (elVaultProgressLabel) {
      const progressLabelFn = tObj.vaultProgressLabel;
      const newProgressText = typeof progressLabelFn === "function" ? progressLabelFn(vPercent) : `${vPercent}%`;
      if (elVaultProgressLabel.innerText !== newProgressText) {
        elVaultProgressLabel.innerText = newProgressText;
      }
    }
    if (DOM_CACHE.vaultEmptyBtn) {
      if (vaultData.cashStored <= 0) {
        DOM_CACHE.vaultEmptyBtn.classList.add("disabled");
      } else {
        DOM_CACHE.vaultEmptyBtn.classList.remove("disabled");
      }
    }
    const branchTab = DOM_CACHE.tabBranches;
    if (branchTab && branchTab.classList.contains("active")) {
      const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
      const prestigeBtns = branchTab.querySelectorAll(".main-prestige-btn, .branch-action-btn[data-prestige-branch]");
      const prestigeReq = game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
      prestigeBtns.forEach((btn) => {
        if (currentCanPrestige) {
          btn.classList.remove("disabled");
          btn.removeAttribute("disabled");
          btn.innerText = tObj.branches.sellAndBuild;
        } else {
          btn.classList.add("disabled");
          btn.setAttribute("disabled", "true");
          btn.innerText = tObj.branches.minCash(formatMoney2(prestigeReq));
        }
      });
    }
    const pendingShares = game.calculatePrestigeShares();
    const previewEl = DOM_CACHE.prestigePreviewLabel;
    if (previewEl) {
      const textFn = _prestigePreviewTexts[cachedLang] || _prestigePreviewTexts.he;
      previewEl.innerText = textFn(pendingShares);
    }
    const vaultImg = DOM_CACHE.vaultDoorImg;
    if (vaultImg) {
      if (vaultData.level >= 50) {
        vaultImg.style.filter = "drop-shadow(0 0 20px gold) hue-rotate(45deg) brightness(1.2)";
        vaultImg.style.transform = "scale(1.05)";
      } else if (vaultData.level >= 25) {
        vaultImg.style.filter = "drop-shadow(0 0 10px silver) brightness(1.1)";
        vaultImg.style.transform = "scale(1.02)";
      } else {
        vaultImg.style.filter = "none";
        vaultImg.style.transform = "scale(1)";
      }
    }
  }

  // ui/draw/header-stats.js
  var lastCash = -1;
  var lastEps = -1;
  var lastShares = -1;
  var lastMultiplier = -1;
  var lastBranch = -1;
  var lastLang = "";
  function updateHeaderStats(lang, tObj) {
    if (game.state.cash !== lastCash || lang !== lastLang) {
      lastCash = game.state.cash;
      DOM_CACHE.cash.innerText = formatMoney2(game.state.cash);
      if (typeof window.checkPrestigeTip === "function") window.checkPrestigeTip();
    }
    const currentEps = game.getEarningsPerSecond();
    if (currentEps !== lastEps || lang !== lastLang) {
      lastEps = currentEps;
      DOM_CACHE.eps.innerText = formatMoney2(currentEps);
    }
    if (game.state.shares !== lastShares || lang !== lastLang) {
      lastShares = game.state.shares;
      DOM_CACHE.shares.innerText = formatNumberCompact(game.state.shares, true);
    }
    const mult = game.getTotalMultiplier();
    if (mult !== lastMultiplier || lang !== lastLang) {
      lastMultiplier = mult;
      DOM_CACHE.multiplier.innerText = formatNumberCompact(mult) + "x";
    }
    const sCash = document.getElementById("sticky-cash-val");
    if (sCash) sCash.innerText = formatMoney2(game.state.cash);
    const sEps = document.getElementById("sticky-eps-val");
    if (sEps) sEps.innerText = formatMoney2(currentEps);
    const sShares = document.getElementById("sticky-shares-val");
    if (sShares) sShares.innerText = formatNumberCompact(game.state.shares, true);
    if (game.state.currentBranch !== lastBranch || lang !== lastLang) {
      lastBranch = game.state.currentBranch;
      const branchName = tObj.branches && tObj.branches.names && tObj.branches.names[game.state.currentBranch] || game.branches && game.branches[game.state.currentBranch] && game.branches[game.state.currentBranch].name || (tObj.branchLabel || "Branch") + " " + (game.state.currentBranch + 1);
      const bEl = DOM_CACHE.branchName || document.getElementById("branch-name");
      if (bEl) bEl.innerText = (tObj.bankPrefix || "") + branchName;
    }
    lastLang = lang;
  }
  function updateAdCampaignDisplay() {
    if (DOM_CACHE.advSlider) {
      const maxBudget = game.getAdMaxBudget();
      const budget = game.state.advBudget || 0;
      if (budget === 0) {
        DOM_CACHE.advSlider.value = 0;
      } else {
        DOM_CACHE.advSlider.value = Math.round(1e3 * (budget / maxBudget));
      }
      const maxLabelEl = DOM_CACHE.advLimitMax;
      if (maxLabelEl) {
        maxLabelEl.innerText = formatMoney2(maxBudget);
      }
    }
    updateAdvDisplay(game.state.advBudget || 0);
  }
  function formatCompactTime(sec) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor(sec % 3600 / 60);
    const secs = Math.floor(sec % 60);
    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, "0")}m`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  function updateBoostButtonDisplay(tObj) {
    if (DOM_CACHE.boostBtn) {
      let timerBadge = DOM_CACHE.boostBtn.querySelector(".boost-timer-badge");
      if (!timerBadge) {
        DOM_CACHE.boostBtn.innerHTML = '<span aria-hidden="true">\u26A1</span><span class="boost-timer-badge" id="boost-timer-badge">2x</span>';
        timerBadge = DOM_CACHE.boostBtn.querySelector(".boost-timer-badge");
      }
      const secs = game.state.boost2xTimeLeft || 0;
      const liveTimerPill = DOM_CACHE.boostLiveTimerPill || document.getElementById("boost-live-timer-pill");
      const liveTimerVal = DOM_CACHE.boostLiveTimerVal || document.getElementById("boost-live-timer-val");
      if (liveTimerPill) {
        liveTimerPill.style.display = "inline-flex";
      }
      if (secs > 0) {
        const timeStr = formatCompactTime(secs);
        const fullTimeStr = formatTime(secs);
        const activeText = tObj && typeof tObj.boostActive === "function" ? tObj.boostActive(fullTimeStr) : `\u26A1 Boost: ${fullTimeStr}`;
        DOM_CACHE.boostBtn.title = activeText;
        DOM_CACHE.boostBtn.setAttribute("data-time", timeStr);
        DOM_CACHE.boostBtn.classList.add("active");
        DOM_CACHE.boostBtn.classList.remove("offer");
        if (liveTimerVal) {
          liveTimerVal.textContent = timeStr;
        }
        if (liveTimerPill) {
          liveTimerPill.classList.remove("idle-blink");
          if (secs <= 60) {
            liveTimerPill.classList.add("urgent");
            DOM_CACHE.boostBtn.classList.add("urgent-boost");
          } else {
            liveTimerPill.classList.remove("urgent");
            DOM_CACHE.boostBtn.classList.remove("urgent-boost");
          }
        }
        if (timerBadge) {
          timerBadge.textContent = "2x";
          timerBadge.classList.remove("urgent");
        }
      } else {
        DOM_CACHE.boostBtn.removeAttribute("data-time");
        DOM_CACHE.boostBtn.classList.remove("urgent-boost", "active");
        if (liveTimerVal) {
          liveTimerVal.textContent = "00:00";
        }
        if (liveTimerPill) {
          liveTimerPill.classList.remove("urgent");
          liveTimerPill.classList.add("idle-blink");
        }
        const nowMs = Date.now();
        const offerEnd = window._boostOfferEndTime || 0;
        if (offerEnd > nowMs) {
          const offerSec = Math.ceil((offerEnd - nowMs) / 1e3);
          const timeStr = formatTime(offerSec);
          const boostOfferFn = tObj ? tObj.boostOfferText : null;
          const offerText = typeof boostOfferFn === "function" ? boostOfferFn(timeStr) : `\u26A1 OFFER! ${timeStr}`;
          DOM_CACHE.boostBtn.title = offerText;
          DOM_CACHE.boostBtn.classList.add("offer");
        } else {
          DOM_CACHE.boostBtn.title = tObj && tObj.boostBtn || "\u26A1 BOOST x2";
          DOM_CACHE.boostBtn.classList.remove("offer");
        }
        if (timerBadge) {
          timerBadge.textContent = "2x";
          timerBadge.classList.remove("urgent");
        }
      }
    }
  }
  function updateQueueDisplay(tObj) {
    const capLabel = DOM_CACHE.queueCapLabel;
    const fillBar = DOM_CACHE.queueFillBar;
    const statText = DOM_CACHE.queueStatText;
    const statIcon = DOM_CACHE.queueStatIcon;
    const statPill = document.getElementById("queue-status-pill");
    if (capLabel && window.game) {
      const queueData = game.getQueueRenderData();
      const maxCap = queueData.capacity;
      const currentLen = queueData.currentLen;
      capLabel.textContent = `${currentLen}/${maxCap}`;
      if (fillBar) {
        const pct = Math.min(100, Math.max(0, currentLen / maxCap * 100));
        fillBar.style.width = `${pct}%`;
        fillBar.setAttribute("aria-valuenow", Math.round(pct));
      }
      const isTooLow = currentLen <= 1;
      const isTooHigh = currentLen >= maxCap - 1 || maxCap > 0 && currentLen / maxCap >= 0.8;
      if (isTooLow) {
        if (statText) statText.textContent = tObj.queueStatusEmpty || "\u05D4\u05EA\u05D5\u05E8 \u05E4\u05E0\u05D5\u05D9";
        if (statIcon) statIcon.textContent = "!";
        if (statPill) statPill.className = "queue-status-pill alert-pill";
      } else if (isTooHigh) {
        const spotsLeft = maxCap - currentLen;
        if (statText) {
          if (spotsLeft <= 0) {
            statText.textContent = tObj.queueStatusFull || "\u05EA\u05D5\u05E8 \u05DE\u05DC\u05D0!";
          } else if (spotsLeft === 1) {
            statText.textContent = tObj.queueOneSpotLeft || "\u05E0\u05D5\u05EA\u05E8 \u05DE\u05E7\u05D5\u05DD 1";
          } else {
            statText.textContent = tObj.queueSpotsLeft ? tObj.queueSpotsLeft(spotsLeft) : `\u05E0\u05D5\u05EA\u05E8\u05D5 ${spotsLeft} \u05DE\u05E7\u05D5\u05DE\u05D5\u05EA`;
          }
        }
        if (statIcon) statIcon.textContent = "\u26A0\uFE0F";
        if (statPill) statPill.className = "queue-status-pill warning-pill";
      } else {
        if (statText) statText.textContent = tObj.queueStatusOk || "\u05EA\u05D5\u05E8 \u05E4\u05E2\u05D9\u05DC";
        if (statIcon) statIcon.textContent = "\u2714";
        if (statPill) statPill.className = "queue-status-pill ok-pill";
      }
    }
  }

  // ui/draw/notifications.js
  var _lastNotifMissions = null;
  var _lastNotifUpgrades = null;
  function updateTabDot(tabId, show) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!btn) return;
    let dot = btn.querySelector(".notification-dot");
    if (show) {
      if (!dot) {
        dot = document.createElement("div");
        dot.className = "notification-dot";
        btn.style.position = "relative";
        btn.appendChild(dot);
      }
    } else {
      if (dot) dot.remove();
    }
    const bottomBtn = document.querySelector(`.bottom-nav-btn[data-tab="${tabId}"]`);
    if (bottomBtn) {
      let bottomDot = bottomBtn.querySelector(".notification-dot");
      if (show) {
        if (!bottomDot) {
          bottomDot = document.createElement("div");
          bottomDot.className = "notification-dot";
          bottomBtn.style.position = "relative";
          bottomBtn.appendChild(bottomDot);
        }
      } else {
        if (bottomDot) bottomDot.remove();
      }
    }
  }
  function updateNotifications() {
    let hasMissions = false;
    if (game.state.missions) {
      for (let i = 0; i < game.state.missions.length; i++) {
        if (game.state.missions[i].status === "completed") {
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
        for (let i = 0; i < game.state.tellers.length; i++) {
          if (game.state.tellers[i].unlocked && game.state.cash >= game.getTellerUpgradeCost(game.state.tellers[i].id)) {
            hasUpgrades = true;
            break;
          }
        }
        if (!hasUpgrades) {
          for (let i = 0; i < game.state.guards.length; i++) {
            if (game.state.guards[i].unlocked && game.state.cash >= game.getGuardUpgradeCost(game.state.guards[i].id)) {
              hasUpgrades = true;
              break;
            }
          }
        }
      }
    }
    if (hasMissions !== _lastNotifMissions) {
      _lastNotifMissions = hasMissions;
      updateTabDot("missions", hasMissions);
    }
    if (hasUpgrades !== _lastNotifUpgrades) {
      _lastNotifUpgrades = hasUpgrades;
      updateTabDot("upgrades", hasUpgrades);
    }
    let hasClaimableDaily = false;
    if (game.state.dailyChallenges && game.state.dailyChallenges.some((c) => c && c.completed && !c.claimed)) {
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
    updateTabDot("daily", hasClaimableDaily);
    const headerBtn = document.getElementById("header-daily-btn");
    if (headerBtn) {
      if (hasClaimableDaily) {
        headerBtn.classList.add("header-glow");
      } else {
        headerBtn.classList.remove("header-glow");
      }
    }
  }

  // ui/draw/index.js
  var drawFrameCounter = 0;
  function draw2() {
    const lang = window.gameLanguage || window.game && window.game.state && window.game.state.language || "he";
    const tObj = translations[lang];
    const vaultData = game.getVaultRenderData();
    if (game.cheatWarning) {
      game.cheatWarning = false;
      showToast2(tObj.cheatDetectedMsg || "\u26A0\uFE0F Save editing detected!", "danger");
    }
    drawFrameCounter++;
    const isEco = window.PerformanceManager && window.PerformanceManager.isEco();
    const skipTextUpdates = isEco && drawFrameCounter % 2 !== 0;
    if (!skipTextUpdates) {
      updateHeaderStats(lang, tObj);
      updateAdCampaignDisplay();
      updateBoostButtonDisplay(tObj);
      updateQueueDisplay(tObj);
      updateVaultDisplay(tObj, vaultData);
      updateNotifications();
    }
    updateTellersDisplay(tObj, vaultData);
    updateGuardsDisplay(lang);
  }
  window.updateCachedSuffixes = updateCachedSuffixes;
  window.showToast = showToast2;
  window.fastFormat = fastFormat;
  window.formatMoney = formatMoney2;
  window.getClientSVG = getClientSVG;
  window.spawnFloating = spawnFloating2;
  window.updateFloatingText = updateFloatingText2;
  window.updateActiveCoins = updateActiveCoins2;
  window.animateCoins = animateCoins;
  window.spawnParticles = spawnParticles2;
  window.initCoinPool = initCoinPool2;
  window.rebuildTellersDOM = rebuildTellersDOM2;
  window.draw = draw2;
  window.clearActiveCoins = clearActiveCoins;
  window.activeCoins = activeCoins;

  // audio.js
  var lastHapticTimestamp = 0;
  function hapticTap(duration = 9) {
    try {
      if (typeof window !== "undefined" && window.game && window.game.state && window.game.state.hapticsEnabled === false) {
        return;
      }
      const now = Date.now();
      if (now - lastHapticTimestamp < 200) {
        return;
      }
      lastHapticTimestamp = now;
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(duration || 9);
      }
    } catch (_e) {
    }
  }
  if (typeof window !== "undefined") {
    window.hapticTap = hapticTap;
  }
  var AudioEngine = class {
    constructor() {
      this.ctx = null;
      try {
        this.isMuted = window.localStorage.getItem("idle_bank_muted") === "true";
      } catch {
        this.isMuted = false;
      }
      this.volume = 0.15;
    }
    init() {
      if (this.ctx) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.warn("Web Audio API is not supported in this browser.", e);
      }
    }
    toggleMute() {
      this.isMuted = !this.isMuted;
      try {
        window.localStorage.setItem("idle_bank_muted", this.isMuted);
      } catch (e) {
        console.warn("Could not save mute state:", e);
      }
      if (this.isMuted) {
        this.stopMusic();
      } else {
        this.startMusic();
      }
      return this.isMuted;
    }
    ensureRunning(callback) {
      if (!this.ctx) this.init();
      if (this.isMuted || !this.ctx) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume().then(() => {
          if (this.ctx.state === "running") {
            callback();
          }
        }).catch((e) => console.warn("AudioContext resume failed:", e));
      } else {
        callback();
      }
    }
    suspend() {
      if (this.ctx && this.ctx.state === "running") {
        this.ctx.suspend().catch(() => {
        });
      }
    }
    resume() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {
        });
      }
    }
    createGainNode(duration, startVal = this.volume) {
      if (!this.ctx) this.init();
      if (this.isMuted || !this.ctx) return null;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(startVal, this.ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1e-4, this.ctx.currentTime + duration);
      gainNode.connect(this.ctx.destination);
      return gainNode;
    }
    triggerHaptic(style = "light") {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
          if (style === "impact") {
            window.Capacitor.Plugins.Haptics.impact({ style: "LIGHT" });
          } else {
            window.Capacitor.Plugins.Haptics.selectionChanged();
          }
        } else if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(15);
        }
      } catch (_e) {
      }
    }
    playClick() {
      this.triggerHaptic("light");
      this.ensureRunning(() => {
        const gain = this.createGainNode(0.1, this.volume * 0.5);
        if (!gain) return;
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });
    }
    playCoin() {
      this.triggerHaptic("impact");
      this.ensureRunning(() => {
        const gain = this.createGainNode(0.3, this.volume);
        if (!gain) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime);
        osc1.connect(gain);
        osc2.connect(gain);
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.3);
        osc2.stop(this.ctx.currentTime + 0.3);
        let endedCount = 0;
        const cleanup = () => {
          endedCount++;
          if (endedCount === 2) {
            osc1.disconnect();
            osc2.disconnect();
            gain.disconnect();
          }
        };
        osc1.onended = cleanup;
        osc2.onended = cleanup;
      });
    }
    playChaChing() {
      this.ensureRunning(() => {
        const gain = this.createGainNode(0.6, this.volume * 1.5);
        if (!gain) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1e3;
        noiseNode.connect(filter);
        filter.connect(gain);
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1500, now);
        osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.4);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1900, now);
        osc2.frequency.exponentialRampToValueAtTime(2e3, now + 0.4);
        osc1.connect(gain);
        osc2.connect(gain);
        noiseNode.start(now);
        noiseNode.stop(now + 0.15);
        osc1.start(now + 0.05);
        osc1.stop(now + 0.5);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.6);
        let endedCount = 0;
        const cleanup = () => {
          endedCount++;
          if (endedCount === 3) {
            noiseNode.disconnect();
            filter.disconnect();
            osc1.disconnect();
            osc2.disconnect();
            gain.disconnect();
          }
        };
        noiseNode.onended = cleanup;
        osc1.onended = cleanup;
        osc2.onended = cleanup;
      });
    }
    playUnlock() {
      this.ensureRunning(() => {
        const gain = this.createGainNode(0.8, this.volume * 1.2);
        if (!gain) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5];
        let oscsEnded = 0;
        const totalOscs = notes.length;
        notes.forEach((freq, index) => {
          const osc = this.ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + index * 0.08);
          const noteGain = this.ctx.createGain();
          noteGain.gain.setValueAtTime(this.volume * 0.8, now + index * 0.08);
          noteGain.gain.exponentialRampToValueAtTime(1e-3, now + index * 0.08 + 0.4);
          osc.connect(noteGain);
          noteGain.connect(this.ctx.destination);
          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.45);
          osc.onended = () => {
            osc.disconnect();
            noteGain.disconnect();
            oscsEnded++;
            if (oscsEnded === totalOscs) {
              gain.disconnect();
            }
          };
        });
      });
    }
    startMusic() {
      if (this.musicInterval) return;
      this.ensureRunning(() => {
        let beat = 0;
        const chords = [
          [130.81, 164.81, 196, 246.94],
          // Cmaj7
          [110, 130.81, 164.81, 196],
          // Am7
          [146.83, 174.61, 220, 261.63],
          // Dm7
          [98, 123.47, 146.83, 174.61]
          // G7
        ];
        this.musicInterval = setInterval(() => {
          if (!this.ctx || this.isMuted || typeof document !== "undefined" && document.hidden || this.ctx.state === "suspended") return;
          const chordIdx = Math.floor(beat / 4) % 4;
          const chord = chords[chordIdx];
          if (beat % 2 === 0) {
            this._playTone(chord[0] / 2, "triangle", 0.4, 0.1, 0.5, this.volume * 1.5);
          }
          if (beat % 2 === 1) {
            chord.slice(1).forEach((freq) => {
              this._playTone(freq, "sine", 0.2, 0.05, 0.2, this.volume * 0.4);
            });
          }
          if (Math.random() > 0.4) {
            const melodyScale = [261.63, 293.66, 329.63, 392, 440, 523.25];
            const note = melodyScale[Math.floor(Math.random() * melodyScale.length)];
            this._playTone(note * 2, "sine", 0.3, 0.1, 0.4, this.volume * 0.3);
          }
          beat++;
        }, 600);
      });
    }
    stopMusic() {
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }
    _playTone(freq, type, duration, attack, release, maxVol) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(maxVol, this.ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(1e-3, this.ctx.currentTime + duration + release);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration + release);
    }
  };
  var gameAudio = new AudioEngine();
  window.gameAudio = gameAudio;

  // ui/events/focus-trap.js
  var _focusTrapHandlers = /* @__PURE__ */ new Map();
  var _previouslyFocused = /* @__PURE__ */ new Map();
  function _getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.closest("[hidden]") && el.offsetParent !== null);
  }
  function trapFocus(modal) {
    if (_focusTrapHandlers.has(modal)) return;
    if (document.activeElement && document.activeElement !== document.body) {
      _previouslyFocused.set(modal, document.activeElement);
    }
    const handler = function(e) {
      if (e.key !== "Tab") return;
      const focusable2 = _getFocusableElements(modal);
      if (focusable2.length === 0) return;
      const first = focusable2[0];
      const last = focusable2[focusable2.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    _focusTrapHandlers.set(modal, handler);
    modal.addEventListener("keydown", handler);
    const focusable = _getFocusableElements(modal);
    if (focusable.length > 0) focusable[0].focus();
  }
  function releaseFocus(modal) {
    const handler = _focusTrapHandlers.get(modal);
    if (!handler) return;
    modal.removeEventListener("keydown", handler);
    _focusTrapHandlers.delete(modal);
    const toRestore = _previouslyFocused.get(modal);
    _previouslyFocused.delete(modal);
    if (toRestore && document.body.contains(toRestore) && typeof toRestore.focus === "function") {
      toRestore.focus();
    }
  }
  function initFocusTrapObserver() {
    const modals = document.querySelectorAll(".modal-overlay");
    modals.forEach((modal) => {
      const obs = new MutationObserver(() => {
        if (modal.classList.contains("active")) {
          trapFocus(modal);
        } else {
          releaseFocus(modal);
          if (window.NotificationQueue) window.NotificationQueue.notifyClosed(modal.id);
        }
      });
      obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // ui/events/engagement.js
  var vipBannerCountdownInterval = null;
  function triggerVipVisitBanner() {
    if (document.getElementById("vip-visit-banner")) return;
    const lang = game.state && game.state.language || "en";
    const tObj = translations[lang] || translations.en;
    const banner = document.createElement("div");
    banner.id = "vip-visit-banner";
    banner.className = "vip-visit-banner";
    let prestigeAmount = typeof game.calculatePrestigeShares === "function" ? game.calculatePrestigeShares() : 10;
    let ownedShares = game.state && game.state.shares ? game.state.shares : 0;
    let totalEffectiveShares = ownedShares + prestigeAmount;
    let shareReward = Math.max(3, Math.ceil(prestigeAmount * 0.3), Math.ceil(totalEffectiveShares * 0.05));
    let hourlyProfit = typeof game.getEarningsPerSecond === "function" ? game.getEarningsPerSecond() * 3600 : 0;
    let cashReward = Math.ceil(hourlyProfit * 0.3);
    const serveText = tObj.vipCloseBtn || "\u05D4\u05DE\u05E9\u05DA \u05DB\u05E8\u05D2\u05D9\u05DC";
    const rewardType = Math.random() < 0.5 ? "shares" : "cash";
    let premiumText = "";
    if (rewardType === "shares") {
      premiumText = typeof tObj.vipPremiumBtn === "function" ? tObj.vipPremiumBtn(shareReward) : tObj.vipPremiumBtn || "VIP Premium";
    } else {
      premiumText = tObj.vipPremiumCashBtn ? tObj.vipPremiumCashBtn(formatMoney(cashReward)) : `VIP Premium (\u05E4\u05E8\u05E1\u05D5\u05DE\u05EA + ${formatMoney(cashReward)})`;
    }
    const vipName = tObj.vipBannerTitle || "\u05DC\u05E7\u05D5\u05D7 \u05E2\u05E1\u05E7\u05D9";
    banner.innerHTML = `
            <div class="vip-premium-content">
                <div class="vip-red-carpet"></div>
                <div class="vip-shimmer"></div>
                <div class="vip-profile">
                    <div class="vip-avatar">\u{1F48E}</div>
                    <div class="vip-ring"></div>
                </div>
                <div class="vip-info">
                    <div class="vip-title-wrap"><span class="vip-badge">VIP</span> <span class="vip-name">${vipName}</span></div>
                </div>
                <div class="vip-progress-wrap">
                    <div class="vip-progress-bar" id="vip-progress-bar"></div>
                </div>
                <div class="vip-actions">
                    ${!AdService.isInCooldown("short") ? `
                    <button class="vip-btn vip-serve-premium" id="vip-serve-ad"><span class="btn-icon">\u{1F3AC}</span> ${premiumText}</button>
                    ` : ""}
                    <button class="vip-btn vip-serve-cash" id="vip-serve-cash">${serveText}</button>
                </div>
            </div>
        `;
    document.body.appendChild(banner);
    let secsLeft = 25;
    const totalSecs = 25;
    const progressBar = document.getElementById("vip-progress-bar");
    if (vipBannerCountdownInterval) clearInterval(vipBannerCountdownInterval);
    vipBannerCountdownInterval = setInterval(() => {
      secsLeft--;
      if (progressBar) {
        const pct = secsLeft / totalSecs * 100;
        progressBar.style.width = pct + "%";
      }
      if (secsLeft <= 0) {
        clearInterval(vipBannerCountdownInterval);
        removeVipVisitBanner();
      }
    }, 1e3);
    document.getElementById("vip-serve-cash").addEventListener("click", () => {
      initSound2();
      serveVipVisitor("none");
    });
    const premiumAdBtn = document.getElementById("vip-serve-ad");
    if (premiumAdBtn) {
      premiumAdBtn.addEventListener("click", () => {
        initSound2();
        serveVipVisitor(rewardType);
      });
    }
  }
  function removeVipVisitBanner() {
    if (vipBannerCountdownInterval) {
      clearInterval(vipBannerCountdownInterval);
      vipBannerCountdownInterval = null;
    }
    if (window._vipBannerRetryTimeout) {
      clearTimeout(window._vipBannerRetryTimeout);
      window._vipBannerRetryTimeout = null;
    }
    const banner = document.getElementById("vip-visit-banner");
    if (banner) banner.remove();
  }
  function serveVipVisitor(rewardType) {
    removeVipVisitBanner();
    game.state.vipVisitActive = false;
    game.state.nextVipVisit = Date.now() + (600 + Math.random() * 60) * 1e3;
    game.state.vipVisitExpiry = 0;
    game.state.vipServedTotal = (game.state.vipServedTotal || 0) + 1;
    game.missionsDirty = true;
    if (rewardType === "shares") {
      playAd(() => {
        let prestigeAmount = typeof game.calculatePrestigeShares === "function" ? game.calculatePrestigeShares() : 10;
        let ownedShares = game.state && game.state.shares ? game.state.shares : 0;
        let totalEffectiveShares = ownedShares + prestigeAmount;
        let shareReward = Math.max(3, Math.ceil(prestigeAmount * 0.3), Math.ceil(totalEffectiveShares * 0.05));
        game.addShares(shareReward);
        const msg = `\u2B50 ${shareReward} VIP Shares \u2B50`;
        spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, "gold");
        for (let i = 0; i < 20; i++) {
          setTimeout(() => spawnFloating("\u{1F48E}", window.innerWidth / 2 + (Math.random() * 160 - 80), window.innerHeight / 2 + (Math.random() * 160 - 80), "gold"), Math.random() * 800);
        }
        draw();
      }, "short");
    } else if (rewardType === "cash") {
      playAd(() => {
        let hourlyProfit = typeof game.getEarningsPerSecond === "function" ? game.getEarningsPerSecond() * 3600 : 0;
        let cashReward = Math.ceil(hourlyProfit * 0.3);
        game.addCash(cashReward);
        const msg = `\u{1F4B5} +${formatMoney(cashReward)} \u{1F4B5}`;
        spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, "green");
        for (let i = 0; i < 20; i++) {
          setTimeout(() => spawnFloating("\u{1F4B5}", window.innerWidth / 2 + (Math.random() * 160 - 80), window.innerHeight / 2 + (Math.random() * 160 - 80), "green"), Math.random() * 800);
        }
        draw();
      }, "short");
    } else {
      game.saveGame();
      draw();
    }
  }
  function renderDailyChallengesSection() {
    if (!window.game || !window.game.state) return;
    if (!window.dailyChallengeController) return;
    window.dailyChallengeController.checkAndReset();
    const lang = game.state && game.state.language || "en";
    const tObj = translations[lang] || translations.en;
    const container = document.getElementById("daily-challenges-content");
    if (!container) return;
    container.innerHTML = "";
    const now = /* @__PURE__ */ new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const msToMidnight = tomorrow - now;
    const hToMidnight = Math.floor(msToMidnight / 36e5).toString().padStart(2, "0");
    const mToMidnight = Math.floor(msToMidnight % 36e5 / 6e4).toString().padStart(2, "0");
    const resetText = tObj.dailyResetLabel ? tObj.dailyResetLabel(hToMidnight, mToMidnight) : `${hToMidnight}:${mToMidnight}`;
    const headerEl = document.createElement("div");
    headerEl.className = "daily-header-ai";
    headerEl.innerHTML = `
            <div class="daily-header-title">
                <i class="fas fa-calendar-alt" style="color:var(--text-light); margin-left:8px;"></i> ${tObj.dailyChallengesTitle || "\u05D0\u05EA\u05D2\u05E8\u05D9 \u05D4\u05D9\u05D5\u05DD"}
            </div>
            <div class="daily-header-box">
                <span class="daily-subtitle">${tObj.dailyChallengesSubtitle || "3 \u05D0\u05EA\u05D2\u05E8\u05D9\u05DD \u05E7\u05E9\u05D9\u05DD \u05E9\u05DE\u05EA\u05D0\u05E4\u05E1\u05D9\u05DD \u05D1\u05D7\u05E6\u05D5\u05EA"}</span>
                <span class="daily-reset-timer">${resetText}</span>
            </div>
        `;
    container.appendChild(headerEl);
    const challenges = game.state.dailyChallenges || [];
    if (challenges.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.style.color = "var(--text-muted)";
      emptyEl.style.textAlign = "center";
      emptyEl.style.padding = "1rem";
      emptyEl.textContent = tObj.loadingChallengesMsg || "Loading...";
      container.appendChild(emptyEl);
      return;
    }
    challenges.forEach((c, idx) => {
      const typeLabel = tObj.dailyChallengeTypes && tObj.dailyChallengeTypes[c.type] || c.type;
      const pct = c.target > 0 ? Math.min(100, Math.floor(c.progress / c.target * 100)) : 0;
      const rewardText = c.reward && c.reward.type === "gold" ? tObj.dailyRewardGold ? tObj.dailyRewardGold(c.reward.amount) : `+${c.reward.amount} gold` : tObj.dailyRewardShares ? tObj.dailyRewardShares(c.reward.amount) : `+${c.reward.amount}`;
      const card = document.createElement("div");
      card.className = "daily-challenge-card" + (c.completed ? " completed" : "") + (c.claimed ? " claimed" : "");
      card.innerHTML = `
                <div class="daily-card-top">
                    <span class="daily-reward-pill">${rewardText}</span>
                    <span class="daily-card-title">${typeLabel} <i class="fas fa-star" style="color:#fde047; margin-right:5px;"></i></span>
                </div>
                <div class="daily-card-progress">
                    <div class="daily-progress-wrap">
                        <div class="daily-progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="daily-card-bottom">
                    ${c.completed && !c.claimed ? `<button class="daily-claim-btn" data-idx="${idx}">${tObj.dailyClaimBtn || "\u05E7\u05D1\u05DC \u05E4\u05E8\u05E1"}</button>
                           <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>` : c.claimed ? `<span class="daily-claimed-label">${tObj.dailyClaimedLabel || "\u05E0\u05D0\u05E1\u05E3"}</span>
                               <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>` : `<span class="daily-pct-text">${pct}%</span>
                               <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>`}
                </div>
            `;
      container.appendChild(card);
    });
    container.querySelectorAll(".daily-claim-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window._isClaimingDaily) return;
        window._isClaimingDaily = true;
        setTimeout(() => {
          window._isClaimingDaily = false;
        }, 500);
        initSound2();
        const idx = parseInt(btn.getAttribute("data-idx"));
        const claimed = window.dailyChallengeController.claimReward(idx);
        if (claimed) {
          btn.disabled = true;
          const lang2 = game.state && game.state.language || "en";
          const tObj2 = translations[lang2] || translations.en;
          const c = game.state.dailyChallenges[idx];
          let msg = "+1";
          if (c && c.reward) {
            msg = c.reward.type === "gold" ? tObj2.dailyRewardGold ? tObj2.dailyRewardGold(c.reward.amount) : `+${c.reward.amount}` : tObj2.dailyRewardShares ? tObj2.dailyRewardShares(c.reward.amount) : `+${c.reward.amount}`;
          }
          spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, "gold");
          if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") window.gameAudio.playUnlock();
          renderDailyChallengesSection();
          draw();
        }
      });
    });
  }
  function startPromoRecording(durationMs = 15e3) {
    const startBtn = document.createElement("button");
    startBtn.innerHTML = "\u{1F534} \u05D4\u05EA\u05D7\u05DC \u05D4\u05E7\u05DC\u05D8\u05D4 \u05E2\u05DB\u05E9\u05D9\u05D5!";
    startBtn.style.cssText = "position:fixed; top:40%; left:50%; transform:translate(-50%, -50%); z-index:999999; padding:20px 40px; font-size:24px; font-weight:bold; background:#e74c3c; color:white; border:4px solid white; border-radius:15px; cursor:pointer; box-shadow:0 10px 40px rgba(0,0,0,0.8);";
    startBtn.onclick = async () => {
      startBtn.remove();
      if (game) {
        game.state.language = "en";
        draw();
      }
      const s = document.createElement("style");
      s.innerHTML = "* { backdrop-filter: none !important; }";
      document.head.appendChild(s);
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60 } },
          audio: false
        });
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9", videoBitsPerSecond: 8e6 });
        } catch {
          mediaRecorder = new MediaRecorder(stream);
        }
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const btn = document.createElement("button");
          btn.innerHTML = "\u{1F3A5} \u05D4\u05E1\u05E8\u05D8\u05D5\u05DF \u05DE\u05D5\u05DB\u05DF! \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05D4\u05D5\u05E8\u05D3\u05D4";
          btn.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:999999; padding:20px 40px; font-size:24px; font-weight:bold; background:#4CAF50; color:white; border:4px solid white; border-radius:15px; cursor:pointer; box-shadow:0 10px 40px rgba(0,0,0,0.8);";
          btn.onclick = () => {
            const a = document.createElement("a");
            a.href = url;
            a.download = "idle_bank_promo_en.webm";
            document.body.appendChild(a);
            a.click();
            btn.innerHTML = "\u2705 \u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05E7\u05D5\u05D1\u05E5 \u05D9\u05D5\u05E8\u05D3";
            setTimeout(() => btn.remove(), 3e3);
          };
          document.body.appendChild(btn);
          stream.getTracks().forEach((track) => track.stop());
          console.log("\u{1F3AC} Promo Recording ready! Waiting for user to click download button.");
          s.remove();
        };
        mediaRecorder.start();
        console.log(`\u{1F3A5} Recording started! Will automatically stop and download after ${durationMs / 1e3} seconds.`);
        setTimeout(() => mediaRecorder.stop(), durationMs);
      } catch (err) {
        console.error("Screen recording was cancelled or failed:", err);
        s.remove();
      }
    };
    document.body.appendChild(startBtn);
    console.log("Waiting for user to click the start button...");
  }
  function spawnVaultCoins(amount, btnRect) {
  }
  var DISCOVERY_TIPS = {
    vault: {
      he: { icon: "\u{1F510}", title: "\u05D4\u05DB\u05E1\u05E4\u05EA \u05DE\u05D7\u05DB\u05D4 \u05DC\u05DA!", body: '\u05D4\u05D3\u05DC\u05E4\u05E7\u05D9\u05DD \u05E9\u05DC\u05D7\u05D5 \u05DB\u05E1\u05E3 \u05DC\u05DB\u05E1\u05E4\u05EA. \u05DC\u05D7\u05E5 "\u05E8\u05D5\u05E7\u05DF \u05DB\u05E1\u05E4\u05EA" \u05DC\u05D4\u05D5\u05E1\u05D9\u05E3 \u05D0\u05D5\u05EA\u05D5 \u05DC\u05D9\u05EA\u05E8\u05D4. \u05E9\u05D3\u05E8\u05D2 \u05D0\u05EA \u05D4\u05DB\u05E1\u05E4\u05EA \u05DB\u05D3\u05D9 \u05E9\u05EA\u05D7\u05D6\u05D9\u05E7 \u05D9\u05D5\u05EA\u05E8 \u05DB\u05E1\u05E3.' },
      en: { icon: "\u{1F510}", title: "The vault is waiting!", body: 'Tellers have sent cash to the vault. Tap "Empty Vault" to add it to your balance. Upgrade the vault to hold more.' },
      es: { icon: "\u{1F510}", title: "\xA1La b\xF3veda te espera!", body: 'Las cajas han enviado dinero a la b\xF3veda. Toca "Vaciar B\xF3veda" para a\xF1adirlo a tu saldo. Mejora la b\xF3veda para que guarde m\xE1s.' },
      ru: { icon: "\u{1F510}", title: "\u0425\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u0436\u0434\u0451\u0442!", body: "\u041A\u0430\u0441\u0441\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043B\u0438 \u0434\u0435\u043D\u044C\u0433\u0438 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435. \u041D\u0430\u0436\u043C\u0438 \xAB\u041E\u043F\u0443\u0441\u0442\u043E\u0448\u0438\u0442\u044C\xBB, \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0445 \u043D\u0430 \u0441\u0447\u0451\u0442. \u0423\u043B\u0443\u0447\u0448\u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u043D\u043E \u0432\u043C\u0435\u0449\u0430\u043B\u043E \u0431\u043E\u043B\u044C\u0448\u0435." }
    },
    guard: {
      he: { icon: "\u{1F690}", title: "\u05D2\u05D9\u05DC\u05D9\u05EA: \u05D1\u05DC\u05D3\u05E8\u05D9\u05DD!", body: "\u05D4\u05D1\u05DC\u05D3\u05E8 \u05DE\u05E2\u05D1\u05D9\u05E8 \u05DB\u05E1\u05E3 \u05DE\u05D4\u05D3\u05DC\u05E4\u05E7\u05D9\u05DD \u05DC\u05DB\u05E1\u05E4\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u2014 \u05D1\u05DC\u05D9 \u05E9\u05EA\u05E6\u05D8\u05E8\u05DA \u05DC\u05DC\u05D7\u05D5\u05E5. \u05E9\u05D3\u05E8\u05D2 \u05D0\u05D5\u05EA\u05D5 \u05DB\u05D3\u05D9 \u05E9\u05D9\u05E2\u05D1\u05D9\u05E8 \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8 \u05D5\u05D9\u05DB\u05D9\u05DC \u05D9\u05D5\u05EA\u05E8." },
      en: { icon: "\u{1F690}", title: "Discovered: Couriers!", body: "The courier automatically transfers cash from tellers to the vault \u2014 no tapping needed. Upgrade it for faster and larger transfers." },
      es: { icon: "\u{1F690}", title: "\xA1Descubriste: Mensajeros!", body: "El mensajero transfiere dinero de las cajas a la b\xF3veda autom\xE1ticamente. \xA1Mej\xF3ralo para transferencias m\xE1s r\xE1pidas y mayores!" },
      ru: { icon: "\u{1F690}", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0435: \u041A\u0443\u0440\u044C\u0435\u0440\u044B!", body: "\u041A\u0443\u0440\u044C\u0435\u0440 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442 \u0434\u0435\u043D\u044C\u0433\u0438 \u0438\u0437 \u043A\u0430\u0441\u0441 \u0432 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0435 \u2014 \u0431\u0435\u0437 \u043D\u0430\u0436\u0430\u0442\u0438\u0439. \u0423\u043B\u0443\u0447\u0448\u0438 \u0435\u0433\u043E \u0434\u043B\u044F \u0431\u043E\u043B\u044C\u0448\u0435\u0439 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u0438 \u0438 \u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u0438." }
    },
    dept: {
      he: { icon: "\u{1F3E2}", title: "\u05D2\u05D9\u05DC\u05D9\u05EA: \u05DE\u05D7\u05DC\u05E7\u05D5\u05EA!", body: "\u05DB\u05DC \u05DE\u05D7\u05DC\u05E7\u05D4 \u05E9\u05E4\u05D5\u05EA\u05D7\u05D9\u05DD \u05DE\u05DB\u05E4\u05D9\u05DC\u05D4 \u05D0\u05EA \u05D4\u05D4\u05DB\u05E0\u05E1\u05D4 \u05D4\u05DB\u05D5\u05DC\u05DC\u05EA \u05E9\u05DC \u05D4\u05D1\u05E0\u05E7. \u05E4\u05EA\u05D7 \u05DB\u05DE\u05D4 \u05E9\u05D9\u05D5\u05EA\u05E8 \u05DE\u05D7\u05DC\u05E7\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05D2\u05D3\u05D5\u05DC \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8." },
      en: { icon: "\u{1F3E2}", title: "Discovered: Departments!", body: "Each department you unlock multiplies your total income. Open as many as possible to grow faster." },
      es: { icon: "\u{1F3E2}", title: "\xA1Descubriste: Departamentos!", body: "Cada departamento que abres multiplica los ingresos totales. Abre tantos como puedas para crecer m\xE1s r\xE1pido." },
      ru: { icon: "\u{1F3E2}", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0435: \u041E\u0442\u0434\u0435\u043B\u044B!", body: "\u041A\u0430\u0436\u0434\u044B\u0439 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u043E\u0442\u0434\u0435\u043B \u0443\u043C\u043D\u043E\u0436\u0430\u0435\u0442 \u043E\u0431\u0449\u0438\u0439 \u0434\u043E\u0445\u043E\u0434 \u0431\u0430\u043D\u043A\u0430. \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0439 \u043A\u0430\u043A \u043C\u043E\u0436\u043D\u043E \u0431\u043E\u043B\u044C\u0448\u0435, \u0447\u0442\u043E\u0431\u044B \u0440\u0430\u0441\u0442\u0438 \u0431\u044B\u0441\u0442\u0440\u0435\u0435." }
    },
    manager: {
      he: { icon: "\u{1F454}", title: "\u05D2\u05D9\u05DC\u05D9\u05EA: \u05DE\u05E0\u05D4\u05DC\u05D9\u05DD!", body: "\u05D4\u05DE\u05E0\u05D4\u05DC \u05DE\u05DE\u05E9\u05D9\u05DA \u05DC\u05E2\u05D1\u05D5\u05D3 \u05D2\u05DD \u05DB\u05E9\u05E1\u05D5\u05D2\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05DE\u05E9\u05D7\u05E7! \u05E9\u05DB\u05D5\u05E8 \u05DE\u05E0\u05D4\u05DC\u05D9\u05DD \u05DC\u05D3\u05DC\u05E4\u05E7\u05D9\u05DD \u05D5\u05DC\u05D1\u05DC\u05D3\u05E8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05E9\u05D4\u05D1\u05E0\u05E7 \u05D9\u05E8\u05D5\u05E5 \u05DC\u05D2\u05DE\u05E8\u05D9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9." },
      en: { icon: "\u{1F454}", title: "Discovered: Managers!", body: "The manager keeps working even when you close the game! Hire managers for tellers and couriers so the bank runs fully automatically." },
      es: { icon: "\u{1F454}", title: "\xA1Descubriste: Gerentes!", body: "\xA1El gerente sigue trabajando aunque cierres el juego! Contrata gerentes para cajas y mensajeros para automatizar el banco." },
      ru: { icon: "\u{1F454}", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0435: \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u044B!", body: "\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0434\u0430\u0436\u0435 \u043A\u043E\u0433\u0434\u0430 \u0442\u044B \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0448\u044C \u0438\u0433\u0440\u0443! \u041D\u0430\u043D\u0438\u043C\u0430\u0439 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u043E\u0432 \u0434\u043B\u044F \u043A\u0430\u0441\u0441 \u0438 \u043A\u0443\u0440\u044C\u0435\u0440\u043E\u0432, \u0447\u0442\u043E\u0431\u044B \u0431\u0430\u043D\u043A \u0440\u0430\u0431\u043E\u0442\u0430\u043B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438." }
    },
    prestige: {
      he: { icon: "\u2B50", title: "\u05D4\u05D2\u05D9\u05E2 \u05D4\u05D6\u05DE\u05DF \u05DC-Prestige!", body: '\u05D4\u05D1\u05E0\u05E7 \u05E6\u05DE\u05D7 \u05DE\u05E1\u05E4\u05D9\u05E7. \u05DC\u05D7\u05E5 \u05E2\u05DC "\u05E1\u05E0\u05D9\u05E4\u05D9\u05DD" \u05D5\u05D1\u05D7\u05E8 Prestige \u2014 \u05D4\u05D1\u05E0\u05E7 \u05D9\u05EA\u05D0\u05E4\u05E1, \u05D0\u05D1\u05DC \u05EA\u05E7\u05D1\u05DC \u05DE\u05E0\u05D9\u05D5\u05EA \u05D6\u05D4\u05D1 \u05E9\u05DE\u05D2\u05D3\u05D9\u05DC\u05D5\u05EA \u05D0\u05EA \u05DB\u05DC \u05D4\u05D4\u05DB\u05E0\u05E1\u05D4 \u05DC\u05E6\u05DE\u05D9\u05EA\u05D5\u05EA!' },
      en: { icon: "\u2B50", title: "Time to Prestige!", body: 'Your bank is big enough. Go to "Branches" and choose Prestige \u2014 the bank resets, but you earn Gold Shares that permanently multiply all income!' },
      es: { icon: "\u2B50", title: "\xA1Hora del Prestige!", body: 'Tu banco ya es suficientemente grande. Ve a "Sucursales" y elige Prestige \u2014 el banco se reinicia, pero obtienes Acciones de Oro que multiplican permanentemente todos los ingresos.' },
      ru: { icon: "\u2B50", title: "\u0412\u0440\u0435\u043C\u044F \u0434\u043B\u044F Prestige!", body: "\u0411\u0430\u043D\u043A \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0432\u044B\u0440\u043E\u0441. \u041F\u0435\u0440\u0435\u0439\u0434\u0438 \u0432 \xAB\u0424\u0438\u043B\u0438\u0430\u043B\u044B\xBB \u0438 \u0432\u044B\u0431\u0435\u0440\u0438 Prestige \u2014 \u0431\u0430\u043D\u043A \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u0441\u044F, \u043D\u043E \u0442\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0448\u044C \u0417\u043E\u043B\u043E\u0442\u044B\u0435 \u0410\u043A\u0446\u0438\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0443\u043C\u043D\u043E\u0436\u0430\u0442 \u0434\u043E\u0445\u043E\u0434!" }
    },
    fortune: {
      he: { icon: "\u{1F3A1}", title: "\u05D2\u05D9\u05DC\u05D9\u05EA: \u05D2\u05DC\u05D2\u05DC \u05D4\u05DE\u05D6\u05DC!", body: "\u05D4\u05D2\u05DC\u05D2\u05DC \u05DE\u05EA\u05D0\u05E4\u05E1 \u05DB\u05DC 24 \u05E9\u05E2\u05D5\u05EA. \u05D7\u05D6\u05D5\u05E8 \u05DB\u05DC \u05D9\u05D5\u05DD \u05DC\u05E1\u05D5\u05D1\u05D1 \u05D5\u05DC\u05D6\u05DB\u05D5\u05EA \u05D1\u05DB\u05E1\u05E3, \u05DE\u05E0\u05D9\u05D5\u05EA, \u05D0\u05D5 \u05D1\u05D5\u05E0\u05D5\u05E1\u05D9\u05DD." },
      en: { icon: "\u{1F3A1}", title: "Discovered: Fortune Wheel!", body: "The wheel resets every 24 hours. Come back daily to spin and win cash, shares, or bonuses." },
      es: { icon: "\u{1F3A1}", title: "\xA1Descubriste: la Ruleta!", body: "La ruleta se reinicia cada 24 horas. Vuelve cada d\xEDa para girarla y ganar dinero, acciones o bonificaciones." },
      ru: { icon: "\u{1F3A1}", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0435: \u041A\u043E\u043B\u0435\u0441\u043E \u0424\u043E\u0440\u0442\u0443\u043D\u044B!", body: "\u041A\u043E\u043B\u0435\u0441\u043E \u043F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0436\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0435 24 \u0447\u0430\u0441\u0430. \u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0439\u0441\u044F \u043A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C, \u0447\u0442\u043E\u0431\u044B \u043A\u0440\u0443\u0442\u0438\u0442\u044C \u0438 \u0432\u044B\u0438\u0433\u0440\u044B\u0432\u0430\u0442\u044C \u0434\u0435\u043D\u044C\u0433\u0438, \u0430\u043A\u0446\u0438\u0438 \u0438\u043B\u0438 \u0431\u043E\u043D\u0443\u0441\u044B." }
    }
  };
  var _discoveryQueue = [];
  var _discoveryActive = false;
  function showDiscoveryTip(key) {
    if (!window.game || !window.game.state) return;
    if (!DISCOVERY_TIPS[key]) return;
    if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
    if (window.game.state.discoveredTips[key]) return;
    window.game.state.discoveredTips[key] = true;
    window.game.saveGame();
    _discoveryQueue.push(key);
    if (!_discoveryActive) _nextDiscoveryTip();
  }
  function _nextDiscoveryTip() {
    if (_discoveryQueue.length === 0) {
      _discoveryActive = false;
      return;
    }
    _discoveryActive = true;
    var key = _discoveryQueue.shift();
    var tipSet = DISCOVERY_TIPS[key];
    if (!tipSet) {
      _nextDiscoveryTip();
      return;
    }
    var lang = window.game && window.game.state && window.game.state.language || "en";
    var tip = tipSet[lang] || tipSet.he;
    var panel = document.getElementById("discovery-tip-panel");
    var iconEl = document.getElementById("discovery-tip-icon");
    var titleEl = document.getElementById("discovery-tip-title");
    var bodyEl = document.getElementById("discovery-tip-body");
    if (!panel || !iconEl || !titleEl || !bodyEl) {
      _discoveryActive = false;
      return;
    }
    iconEl.textContent = tip.icon;
    titleEl.textContent = tip.title;
    bodyEl.textContent = tip.body;
    var btnLabels = { he: "\u05D4\u05D1\u05E0\u05EA\u05D9!", en: "Got it!", es: "\xA1Entendido!", ru: "\u041F\u043E\u043D\u044F\u043B!" };
    var tipBtn = document.getElementById("discovery-tip-btn");
    if (tipBtn) tipBtn.textContent = btnLabels[lang] || "Got it!";
    panel.style.display = "flex";
    panel.classList.add("visible");
  }
  function _dismissDiscoveryTip() {
    var panel = document.getElementById("discovery-tip-panel");
    if (panel) {
      panel.classList.remove("visible");
      panel.style.display = "none";
    }
    _discoveryActive = false;
    if (_discoveryQueue.length > 0) setTimeout(_nextDiscoveryTip, 500);
  }
  function initTutorialEvents() {
    var btn = document.getElementById("discovery-tip-btn");
    if (btn) btn.addEventListener("click", function() {
      initSound2();
      _dismissDiscoveryTip();
    });
  }
  function maybeStartTutorial() {
    if (!window.game || !window.game.state) return;
    if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
    var tips = window.game.state.discoveredTips;
    var isNew = !tips.start && !window.game.state.shares && !(window.game.state.missionsCompleted > 0);
    if (isNew) setTimeout(function() {
      var tryShow = function() {
        if (document.querySelector(".modal-overlay.active")) {
          setTimeout(tryShow, 1e3);
          return;
        }
        showDiscoveryTip("start");
      };
      tryShow();
    }, 2500);
  }
  function checkPrestigeTip() {
    if (!window.game || !window.game.state) return;
    if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
    if (window.game.state.discoveredTips.prestige) return;
    var branches = window.game && window.game.branches || typeof GAME_CONFIG !== "undefined" && GAME_CONFIG.BRANCHES;
    var branch = branches && branches[window.game.state.currentBranch];
    if (branch && window.game.state.cash >= branch.minCashToPrestige * (typeof GAME_CONFIG !== "undefined" && GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9)) {
      showDiscoveryTip("prestige");
    }
  }

  // ui/events/modals.js
  function activateModal(modal) {
    if (!modal) return;
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    void modal.offsetHeight;
    modal.classList.add("active");
  }
  function openPrestigeModal2(target) {
    const lang = game.state.language || "en";
    const tObj = translations[lang];
    const sharesGained = game.calculatePrestigeShares();
    const elTitle = document.getElementById("prestige-modal-title");
    const elDesc = document.getElementById("prestige-modal-text");
    if (elDesc) {
      elDesc.innerText = tObj.branches && tObj.branches.prestigeDesc ? tObj.branches.prestigeDesc : tObj.prestigeModalText || "Reset progress in this branch to claim Golden Shares.";
    }
    const elGained = document.getElementById("prestige-shares-gained");
    const elDoubled = document.getElementById("prestige-shares-doubled");
    const elAdBtn = document.getElementById("prestige-ad-btn");
    const elRegularBtn = document.getElementById("prestige-regular-btn");
    const elCancelBtn = document.getElementById("prestige-cancel-btn");
    const elRewardLabel = document.getElementById("prestige-reward-label");
    const isMovingBranch = target !== game.state.currentBranch;
    if (elTitle) {
      if (isMovingBranch) {
        if (tObj.branches && tObj.branches.names && tObj.branches.names[target]) {
          elTitle.innerText = tObj.branches.names[target];
        } else if (game.branches && game.branches[target] && game.branches[target].name) {
          elTitle.innerText = game.branches[target].name;
        } else {
          elTitle.innerText = (tObj.branchLabel || "Branch") + " " + (parseInt(target) + 1);
        }
      } else {
        elTitle.innerText = tObj.branches && tObj.branches.prestigeTitle ? tObj.branches.prestigeTitle : "Prestige (Golden Shares)";
      }
    }
    if (elGained) elGained.innerText = `+${sharesGained.toLocaleString("en-US")}`;
    if (elDoubled) elDoubled.innerText = `${(sharesGained * 3).toLocaleString("en-US")}`;
    if (elAdBtn) elAdBtn.innerText = tObj.prestigeAdBtn((sharesGained * 3).toLocaleString("en-US"));
    if (elRegularBtn) elRegularBtn.innerText = tObj.prestigeRegularBtn;
    if (elCancelBtn) elCancelBtn.innerText = tObj.prestigeCancelBtn;
    if (elRewardLabel) elRewardLabel.innerText = tObj.prestigeRewardLabel;
    const modal = document.getElementById("prestige-modal");
    if (modal) {
      modal.setAttribute("data-target-branch", target);
      activateModal(modal);
    }
    if (typeof window.showDiscoveryTip === "function") window.showDiscoveryTip("prestige");
  }
  function openBoostModal() {
    const lang = game.state.language || "en";
    const tObj = translations[lang] || translations.en;
    const eventModal = document.getElementById("event-modal");
    const iconEl = document.getElementById("event-icon");
    const titleEl = document.getElementById("event-title");
    const textEl = document.getElementById("event-text");
    const container = document.getElementById("event-options-container");
    iconEl.innerText = "\u26A1";
    titleEl.innerText = tObj.boostModalTitle;
    textEl.innerText = tObj.boostModalText;
    const cashLabelEl = document.getElementById("event-cash-label");
    if (cashLabelEl) cashLabelEl.innerText = tObj.cashBalance || "Cash Balance:";
    const cashValEl = document.getElementById("event-cash-val");
    if (cashValEl) {
      cashValEl.innerText = formatMoney(game.state.cash);
    }
    container.innerHTML = "";
    const _boostEps = game.getEarningsPerSecond() || 0;
    const _projectedEarnings = Math.floor(_boostEps * 4 * 3600);
    const _earningsHint = _projectedEarnings > 0 && typeof tObj.boostEventEarningsHint === "function" ? tObj.boostEventEarningsHint(formatMoney(_projectedEarnings)) : "";
    const btnAd = document.createElement("button");
    btnAd.className = "event-option-btn ad-option";
    btnAd.innerHTML = `
        <div class="event-option-title">${tObj.boostEventAdTitle || "\u{1F3AC} Watch Ad & Activate"}</div>
        <div class="event-option-desc">${tObj.boostEventAdDesc || "Adds 4 hours of double earnings (up to 8h)"}${_earningsHint}</div>
    `;
    btnAd.addEventListener("click", () => {
      initSound2();
      eventModal.classList.remove("active");
      playAd(() => {
        game.addBoost2x(4);
        draw();
      });
    });
    const btnCancel = document.createElement("button");
    btnCancel.className = "event-option-btn";
    btnCancel.innerHTML = `
        <div class="event-option-title">${tObj.cancelLabel || "Cancel"}</div>
        <div class="event-option-desc">${tObj.backToGameLabel || "Back to game"}</div>
    `;
    btnCancel.addEventListener("click", () => {
      initSound2();
      eventModal.classList.remove("active");
    });
    container.appendChild(btnAd);
    container.appendChild(btnCancel);
    activateModal(eventModal);
  }
  function openAnalyticsModal() {
    const modal = document.getElementById("analytics-modal");
    if (!modal) return;
    const lang = game.state && game.state.language || "en";
    const tObj = translations[lang] || translations.he || translations.en || {};
    const aTitle = document.getElementById("analytics-modal-title-text") || document.getElementById("analytics-modal-title");
    if (aTitle) aTitle.innerText = tObj.analyticsModalTitle || "\u05D3\u05D5\u05D7 \u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD \u05D0\u05E0\u05DC\u05D9\u05D8\u05D9";
    const branchNameEl = document.getElementById("analytics-branch-name-live");
    if (branchNameEl) {
      branchNameEl.innerText = tObj.analyticsLiveHeader || "\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D7\u05D9\u05D9\u05DD \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA";
    }
    const aTellers = document.getElementById("analytics-title-tellers");
    if (aTellers) aTellers.innerText = tObj.analyticsTitleTellers || "\u05EA\u05E4\u05D5\u05E7\u05EA \u05E2\u05DE\u05D3\u05D5\u05EA \u05DB\u05E1\u05E4\u05E8\u05D9\u05DD";
    const aOps = document.getElementById("analytics-title-ops");
    if (aOps) aOps.innerText = tObj.analyticsOpsFlowTitle || "\u05D0\u05D9\u05D6\u05D5\u05DF \u05E9\u05E8\u05E9\u05E8\u05EA \u05EA\u05E4\u05E2\u05D5\u05DC";
    const aWarn = document.getElementById("analytics-title-warnings");
    if (aWarn) aWarn.innerText = tObj.analyticsTitleWarnings || "\u05D9\u05D5\u05E2\u05E5 \u05E2\u05E1\u05E7\u05D9 \u05D5\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA";
    const aClose = document.getElementById("analytics-close-btn");
    if (aClose) aClose.innerText = tObj.analyticsCloseBtn || "\u05E1\u05D2\u05D5\u05E8 \u05D3\u05D5\u05D7";
    const totalEps = game.getEarningsPerSecond();
    const vCap = game.getVaultCapacity(game.state.vault.level);
    const vaultUtil = vCap > 0 ? Math.min(100, Math.round(game.state.vault.cashStored / vCap * 100)) : 0;
    const tellerZoomMap = {
      1: { scale: 3.4, origin: "55% 42%" },
      2: { scale: 3.4, origin: "50% 44%" },
      3: { scale: 3.6, origin: "61% 35%" },
      4: { scale: 3.5, origin: "66% 33%" },
      5: { scale: 3.4, origin: "51% 41%" },
      6: { scale: 3.6, origin: "64% 36%" },
      7: { scale: 3.5, origin: "50% 44%" },
      8: { scale: 3.4, origin: "41% 43%" }
    };
    const currentBaseReward = game.getCurrentBaseReward();
    const totalMultiplier = game.getTotalMultiplier();
    const activeTellers = game.state.tellers.filter((t) => t.unlocked).map((t) => {
      const speed = game.getTellerSpeed(t.level);
      const reward = currentBaseReward * totalMultiplier;
      const tellerEps = speed > 0 ? reward / speed : 0;
      const pctOfTotal = totalEps > 0 ? Math.min(100, Math.round(tellerEps / totalEps * 100)) : 0;
      return { ...t, tellerEps, pctOfTotal };
    });
    const sortedTellers = [...activeTellers].sort((a, b) => {
      if (b.tellerEps !== a.tellerEps) {
        return b.tellerEps - a.tellerEps;
      }
      return b.level - a.level;
    });
    const tellersListEl = document.getElementById("analytics-tellers-list");
    tellersListEl.innerHTML = "";
    const tellersFragment = document.createDocumentFragment();
    const lvlPrefix = tObj.levelLabelShort || tObj.levelLabel || "\u05E8\u05DE\u05D4";
    sortedTellers.forEach((t, index) => {
      const rank = index + 1;
      const row = document.createElement("div");
      row.className = `analytic-teller-card-aaa rank-${rank}`;
      const tellerImgNum = t.id % 8 + 1;
      const zoom = tellerZoomMap[tellerImgNum] || { scale: 3.2, origin: "50% 40%" };
      let rankBadgeClass = "rank-badge-other";
      let ringClass = "ring-gray";
      if (rank === 1) {
        rankBadgeClass = "rank-badge-gold";
        ringClass = "ring-gold";
      } else if (rank === 2) {
        rankBadgeClass = "rank-badge-silver";
        ringClass = "ring-silver";
      } else if (rank === 3) {
        rankBadgeClass = "rank-badge-bronze";
        ringClass = "ring-bronze";
      } else if (rank === 4) {
        ringClass = "ring-amber";
      } else if (rank === 5) {
        ringClass = "ring-green";
      }
      row.innerHTML = `
            <div class="teller-card-main-row">
                <div class="teller-rank-shield ${rankBadgeClass}">
                    <span>${rank}</span>
                </div>
                <div class="teller-portrait-wrapper-zoomed ${ringClass}">
                    <img src="images/teller-${tellerImgNum}.png" alt="Teller ${t.id + 1}" class="teller-close-up-img" style="transform: scale(${zoom.scale}); transform-origin: ${zoom.origin};" onerror="this.src='images/manager-1.png'">
                    <span class="teller-status-dot-active" title="\u05E4\u05E2\u05D9\u05DC"></span>
                </div>
                <div class="teller-meta-col">
                    <div class="teller-name-line">
                        <strong class="teller-real-name">${tObj.tellerLabel || "\u05DB\u05E1\u05E4\u05E8"} ${t.id + 1}</strong>
                        <span class="teller-lvl-badge">${lvlPrefix} ${t.level}</span>
                    </div>
                    <div class="teller-bar-container">
                        <div class="teller-bar-track">
                            <div class="teller-bar-fill" style="width: ${t.pctOfTotal}%"></div>
                        </div>
                        <span class="teller-share-label">${t.pctOfTotal}% ${tObj.ofTotalShare || "\u05DE\u05E1\u05DA \u05D4\u05E8\u05D5\u05D5\u05D7"}</span>
                    </div>
                </div>
                <div class="teller-yield-col">
                    <div class="teller-yield-val text-green">${formatMoney(t.tellerEps)}</div>
                    <span class="teller-yield-unit">${tObj.perSecShort || "/\u05E9\u05E0'"}</span>
                </div>
            </div>
        `;
      tellersFragment.appendChild(row);
    });
    if (activeTellers.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "analytic-empty-state";
      emptyDiv.innerText = tObj.noActiveTellers || "\u05D0\u05D9\u05DF \u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05DB\u05E8\u05D2\u05E2";
      tellersFragment.appendChild(emptyDiv);
    }
    tellersListEl.appendChild(tellersFragment);
    const qCap = game.getQueueCapacity(game.state.queueUpgradeLevel || 1);
    const guardsSlow = game.state.tellers.some((t) => t.unlocked && t.cashStored >= game.getTellerCapacity(t.level) * 0.8);
    const opsFlowEl = document.getElementById("analytics-ops-flow");
    if (opsFlowEl) {
      const qCount = game.customerQueue.length;
      const isQueueOk = qCount < qCap * 0.7;
      const isGuardsOk = !guardsSlow;
      const isVaultOk = vaultUtil < 85;
      opsFlowEl.innerHTML = `
            <div class="ops-flow-row ${isQueueOk ? "ok" : "busy"}">
                <div class="ops-flow-left">
                    <span class="ops-flow-dot"></span>
                    <span class="ops-flow-icon">\u{1F465}</span>
                    <span class="ops-flow-title">${tObj.opsQueueTitle || "\u05EA\u05D5\u05E8 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA"}:</span>
                </div>
                <div class="ops-flow-right">
                    <strong class="ops-flow-val">${qCount}/${qCap}</strong>
                    <span class="ops-flow-subtag">${isQueueOk ? tObj.opsFlowSmooth || "\u05D6\u05E8\u05D9\u05DE\u05D4 \u05E4\u05E0\u05D5\u05D9\u05D4 \u2714" : tObj.opsFlowCrowded || "\u05E2\u05D5\u05DE\u05E1 \u26A0\uFE0F"}</span>
                </div>
            </div>
            <div class="ops-flow-row ${isGuardsOk ? "ok" : "busy"}">
                <div class="ops-flow-left">
                    <span class="ops-flow-dot"></span>
                    <span class="ops-flow-icon">\u{1F69A}</span>
                    <span class="ops-flow-title">${tObj.opsGuardsTitle || "\u05E4\u05D9\u05E0\u05D5\u05D9 \u05D1\u05DC\u05D3\u05E8\u05D9\u05DD"}:</span>
                </div>
                <div class="ops-flow-right">
                    <strong class="ops-flow-val">100%</strong>
                    <span class="ops-flow-subtag">${isGuardsOk ? tObj.opsGuardsFast || "\u05E4\u05D9\u05E0\u05D5\u05D9 \u05D1\u05D6\u05DE\u05DF \u2714" : tObj.opsGuardsDelay || "\u05E2\u05D9\u05DB\u05D5\u05D1 \u26A0\uFE0F"}</span>
                </div>
            </div>
        `;
    }
    const warningsListEl = document.getElementById("analytics-warnings-list");
    warningsListEl.innerHTML = "";
    let tip = null;
    if (game.state.vault.cashStored >= vCap * 0.85) {
      tip = {
        icon: "\u{1F3E6}",
        type: "warning",
        title: tObj.advisorTipUpgradeVaultTitle || "\u05E9\u05D3\u05E8\u05D2 \u05D0\u05EA \u05D4\u05DB\u05E1\u05E4\u05EA \u{1F3E6}",
        desc: tObj.advisorTipUpgradeVaultDesc || "\u05D4\u05D2\u05D3\u05DC \u05D0\u05EA \u05E7\u05D9\u05D1\u05D5\u05DC\u05EA \u05D4\u05DB\u05E1\u05E4\u05EA \u05DC\u05D0\u05D2\u05D9\u05E8\u05EA \u05E8\u05D5\u05D5\u05D7\u05D9\u05DD \u05D2\u05D3\u05D5\u05DC\u05D4 \u05D9\u05D5\u05EA\u05E8."
      };
    } else if (game.customerQueue.length >= qCap * 0.75) {
      tip = {
        icon: "\u26A1",
        type: "alert",
        title: tObj.advisorTipUpgradeTellerTitle || "\u05E9\u05D3\u05E8\u05D2 \u05E2\u05DE\u05D3\u05D5\u05EA \u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u26A1",
        desc: tObj.advisorTipUpgradeTellerDesc || "\u05E9\u05D3\u05E8\u05D5\u05D2 \u05E2\u05DE\u05D3\u05D5\u05EA \u05D4\u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05E2\u05DC\u05D4 \u05D0\u05EA \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D4\u05D8\u05D9\u05E4\u05D5\u05DC \u05D5\u05D4\u05E8\u05D5\u05D5\u05D7 \u05DC\u05E9\u05E0\u05D9\u05D9\u05D4."
      };
    } else if (guardsSlow) {
      tip = {
        icon: "\u{1F3C3}",
        type: "warning",
        title: tObj.advisorTipUpgradeGuardsTitle || "\u05E9\u05D3\u05E8\u05D2 \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D1\u05DC\u05D3\u05E8\u05D9\u05DD \u{1F3C3}",
        desc: tObj.advisorTipUpgradeGuardsDesc || "\u05E9\u05D3\u05E8\u05D5\u05D2 \u05D4\u05D1\u05DC\u05D3\u05E8\u05D9\u05DD \u05D9\u05E4\u05E0\u05D4 \u05DB\u05E1\u05E3 \u05DE\u05D3\u05DC\u05E4\u05E7\u05D9 \u05D4\u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8 \u05DC\u05DB\u05E1\u05E4\u05EA."
      };
    } else if (game.state.tellers.some((t) => !t.unlocked)) {
      tip = {
        icon: "\u{1F680}",
        type: "action",
        title: tObj.advisorTipUnlockTellerTitle || "\u05E4\u05EA\u05D7 \u05DB\u05E1\u05E4\u05E8 \u05E0\u05D5\u05E1\u05E3 \u{1F680}",
        desc: tObj.advisorTipUnlockTellerDesc || "\u05E4\u05EA\u05D9\u05D7\u05EA \u05E2\u05DE\u05D3\u05EA \u05DB\u05E1\u05E4\u05E8 \u05D7\u05D3\u05E9\u05D4 \u05EA\u05D6\u05E0\u05D9\u05E7 \u05D0\u05EA \u05D6\u05E8\u05D9\u05DE\u05EA \u05D4\u05DE\u05D6\u05D5\u05DE\u05E0\u05D9\u05DD \u05E9\u05DC \u05D4\u05E1\u05E0\u05D9\u05E3."
      };
    } else if (qCap < 20) {
      tip = {
        icon: "\u{1F465}",
        type: "action",
        title: tObj.advisorTipUpgradeQueueTitle || "\u05D4\u05E8\u05D7\u05D1 \u05EA\u05D5\u05E8 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u{1F465}",
        desc: tObj.advisorTipUpgradeQueueDesc || "\u05D4\u05D2\u05D3\u05DC\u05EA \u05E7\u05D9\u05D1\u05D5\u05DC\u05EA \u05D4\u05EA\u05D5\u05E8 \u05EA\u05D0\u05E4\u05E9\u05E8 \u05E7\u05DC\u05D9\u05D8\u05EA \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E8\u05E6\u05D9\u05E4\u05D4 \u05DC\u05DC\u05D0 \u05E2\u05D9\u05DB\u05D5\u05D1\u05D9\u05DD."
      };
    } else {
      tip = {
        icon: "\u26A1",
        type: "action",
        title: tObj.advisorTipUpgradeTellerTitle || "\u05E9\u05D3\u05E8\u05D2 \u05E2\u05DE\u05D3\u05D5\u05EA \u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u26A1",
        desc: tObj.advisorTipUpgradeTellerDesc || "\u05E9\u05D3\u05E8\u05D5\u05D2 \u05E2\u05DE\u05D3\u05D5\u05EA \u05D4\u05DB\u05E1\u05E4\u05E8\u05D9\u05DD \u05DE\u05E2\u05DC\u05D4 \u05D0\u05EA \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D4\u05D8\u05D9\u05E4\u05D5\u05DC \u05D5\u05D4\u05E8\u05D5\u05D5\u05D7 \u05DC\u05E9\u05E0\u05D9\u05D9\u05D4."
      };
    }
    const item = document.createElement("div");
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
      if (typeof window.hapticTap === "function") window.hapticTap();
      if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
      modal.classList.remove("active");
    };
    const closeBtn = document.getElementById("analytics-close-btn");
    if (closeBtn) closeBtn.onclick = closeHandler;
    const closeXBtn = document.getElementById("analytics-close-x");
    if (closeXBtn) closeXBtn.onclick = closeHandler;
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeHandler();
      }
    };
  }
  function openWeeklyRewardModal() {
    const lang = game.state && game.state.language || "en";
    const tObj = translations[lang] || translations.en;
    const modal = document.getElementById("weekly-modal");
    if (!modal) return;
    const titleEl = document.getElementById("weekly-modal-title");
    const textEl = document.getElementById("weekly-modal-text");
    const statsBox = document.getElementById("weekly-stats-box");
    if (titleEl) titleEl.innerText = tObj.weeklyTitle || "GREAT WEEK!";
    if (textEl) textEl.innerHTML = (tObj.weeklyText || "A full week of running your empire!<br/>Your team is ready for a boost!").replace(/\n/g, "<br/>");
    const eps = game.getEarningsPerSecond ? game.getEarningsPerSecond() : 0;
    const served = game.state.stats && game.state.stats.clientsServed || 0;
    const shares = game.state.shares || 0;
    const valEpsEl = document.getElementById("weekly-val-eps");
    const valClientsEl = document.getElementById("weekly-val-clients");
    const valSharesEl = document.getElementById("weekly-val-shares");
    const lblEpsEl = document.getElementById("weekly-lbl-eps");
    const lblClientsEl = document.getElementById("weekly-lbl-clients");
    const lblSharesEl = document.getElementById("weekly-lbl-shares");
    if (valEpsEl) valEpsEl.innerText = formatMoney(eps);
    if (valClientsEl) valClientsEl.innerText = served.toLocaleString();
    if (valSharesEl) valSharesEl.innerText = shares.toLocaleString();
    if (lblEpsEl) lblEpsEl.innerText = tObj.weeklyEpsLabel || "EPS";
    if (lblClientsEl) lblClientsEl.innerText = tObj.weeklyClientsLabel || "Clients served";
    if (lblSharesEl) lblSharesEl.innerText = tObj.weeklySharesLabel || "Gold shares";
    const btnRewardTitle = document.getElementById("weekly-btn-reward-title");
    const btnRewardSub = document.getElementById("weekly-btn-reward-sub");
    const dismissMain = document.getElementById("weekly-dismiss-main");
    const dismissSub = document.getElementById("weekly-dismiss-sub");
    if (btnRewardTitle) btnRewardTitle.innerHTML = tObj.weeklyRewardBtnTitle || '8-HOUR <span class="gold-highlight">x2</span> REWARD!';
    if (btnRewardSub) btnRewardSub.innerHTML = tObj.weeklyRewardBtnSub || 'Watch a short video and <span class="gold-bold">double</span> all cash gains';
    if (dismissMain) dismissMain.innerText = tObj.weeklyDismissMain || "NO THANKS, CONTINUE";
    if (dismissSub) dismissSub.innerText = tObj.weeklyDismissSub || "Return to the game";
    if (statsBox) {
      statsBox.innerHTML = typeof tObj.weeklyStats === "function" ? tObj.weeklyStats(formatMoney(eps), served.toLocaleString(), shares) : `\u{1F4B0} EPS: <strong>${formatMoney(eps)}</strong><br>\u{1F465} Clients served: <strong>${served.toLocaleString()}</strong><br>\u2B50 Gold shares: <strong>${shares}</strong>`;
    }
    const adBtn = document.getElementById("weekly-ad-btn");
    const closeBtn = document.getElementById("weekly-close-btn");
    const closeX = document.getElementById("weekly-modal-close-x");
    if (closeX) {
      closeX.onclick = () => {
        initSound2();
        modal.classList.remove("active");
        game.state.lastWeeklyReward = Date.now();
        game.saveGame();
      };
    }
    if (adBtn) {
      if (AdService.isInCooldown()) {
        adBtn.style.display = "none";
      } else {
        adBtn.style.display = "";
        adBtn.onclick = () => {
          initSound2();
          modal.classList.remove("active");
          playAd(() => {
            game.addBoost2x(8);
            game.state.lastWeeklyReward = Date.now();
            draw();
            spawnFloating(tObj.boost8hMsg || "\u26A1 8h Boost!", window.innerWidth / 2, window.innerHeight / 2, "gold");
          });
        };
      }
    }
    if (closeBtn) {
      closeBtn.onclick = () => {
        initSound2();
        modal.classList.remove("active");
        game.state.lastWeeklyReward = Date.now();
      };
    }
    modal.onclick = (e) => {
      if (e.target === modal) {
        initSound2();
        modal.classList.remove("active");
        game.state.lastWeeklyReward = Date.now();
      }
    };
    if (window.NotificationQueue) {
      window.NotificationQueue.request("weekly-modal", window.NotificationQueue.PRIORITY.IMPORTANT, () => {
        activateModal(modal);
      });
    } else {
      activateModal(modal);
    }
  }
  function checkWeeklyReward() {
    if (!window.game || !window.game.state) return;
    const now = Date.now();
    const lastWeekly = window.game.state.lastWeeklyReward || 0;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
    if (now - lastWeekly >= ONE_WEEK_MS) {
      setTimeout(openWeeklyRewardModal, 2e3);
    }
  }
  function showOfflineEarningsModal() {
    if (!window.game || !window.game.offlineEarningsReport || isNaN(window.game.offlineEarningsReport) || window.game.offlineEarningsReport <= 0) return;
    const displayFn = () => {
      const lang = window.game && window.game.state && window.game.state.language || "en";
      const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : translations.he;
      if (DOM_CACHE.offlineModalTitle) DOM_CACHE.offlineModalTitle.innerText = tObj.offlineModalTitle;
      if (DOM_CACHE.offlineModalText) DOM_CACHE.offlineModalText.innerText = tObj.offlineModalText;
      if (DOM_CACHE.offlineModalDoubleBtn) DOM_CACHE.offlineModalDoubleBtn.innerText = tObj.offlineDoubleBtn;
      if (DOM_CACHE.offlineModalClaimBtn) DOM_CACHE.offlineModalClaimBtn.innerText = tObj.offlineClaimBtn;
      if (DOM_CACHE.offlineModalAmount) DOM_CACHE.offlineModalAmount.innerText = formatMoney(window.game.offlineEarningsReport);
      if (DOM_CACHE.offlineModalDoubleBtn) DOM_CACHE.offlineModalDoubleBtn.style.display = typeof AdService !== "undefined" && AdService.isInCooldown() ? "none" : "";
      if (DOM_CACHE.offlineModal) activateModal(DOM_CACHE.offlineModal);
    };
    if (window.NotificationQueue) {
      window.NotificationQueue.request("offline-modal", window.NotificationQueue.PRIORITY.IMPORTANT, displayFn);
    } else {
      displayFn();
    }
  }
  function showLoginRewardModal() {
    if (!window.game || !window.game.state || !window.game.state.pendingLoginReward) return;
    const modal = document.getElementById("login-reward-modal");
    if (!modal) return;
    const reward = window.game.state.pendingLoginReward;
    const streak = window.game.state.loginStreak || 1;
    const lang = window.game.state.language || "en";
    const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : translations.he;
    const streakTextEl = document.getElementById("login-reward-streak-text");
    const amountEl = document.getElementById("login-reward-amount");
    const descEl = document.getElementById("login-reward-desc");
    const titleTextEl = document.getElementById("login-reward-title-text");
    const titleEl = document.getElementById("login-reward-title");
    const lm = typeof translations !== "undefined" && translations[lang] && translations[lang].loginModal ? translations[lang].loginModal : translations.he.loginModal;
    if (titleTextEl) {
      titleTextEl.innerText = lm.title;
    } else if (titleEl) {
      titleEl.innerText = lm.title;
    }
    if (streakTextEl) {
      const labelStr = typeof lm.streakLabel === "function" ? lm.streakLabel(streak) : "Streak: " + streak + " days";
      streakTextEl.innerHTML = `<span class="streak-clock-icon">\u{1F552}</span> ${labelStr}`;
    }
    let displayText = "";
    let descText = "";
    if (reward.type === "cash") {
      displayText = "+" + formatMoney(reward.value);
      descText = lm.cashDesc;
    } else if (reward.type === "boost") {
      const mins = Math.round(reward.value / 60);
      displayText = typeof lm.boostLabel === "function" ? lm.boostLabel(mins) : "+" + mins + " min Boost x2";
      descText = lm.boostDesc;
    } else if (reward.type === "gold" || reward.type === "shares") {
      displayText = "+" + reward.value + (tObj.goldSharesUnit || " Gold Shares");
      descText = lm.sharesDesc;
    }
    if (amountEl) amountEl.innerText = displayText;
    if (descEl) descEl.innerText = descText;
    _renderLoginStreakStrip(streak, lm);
    const collectBtn = document.getElementById("login-reward-collect-btn");
    const collectTextEl = document.getElementById("login-reward-collect-text");
    if (collectTextEl) {
      collectTextEl.innerText = lm.collectBtn;
    } else if (collectBtn) {
      collectBtn.innerText = lm.collectBtn;
    }
    if (collectBtn) {
      collectBtn.onclick = () => {
        initSound2();
        modal.classList.remove("active");
        _applyLoginReward(reward);
      };
    }
    const closeXBtn = document.getElementById("login-reward-close-x");
    if (closeXBtn) {
      closeXBtn.onclick = () => {
        initSound2();
        modal.classList.remove("active");
        _applyLoginReward(reward);
      };
    }
    modal.onclick = (e) => {
      if (e.target === modal) {
        initSound2();
        modal.classList.remove("active");
        _applyLoginReward(reward);
      }
    };
    if (window.NotificationQueue) {
      window.NotificationQueue.request("login-reward-modal", window.NotificationQueue.PRIORITY.IMPORTANT, () => {
        activateModal(modal);
      });
    } else {
      activateModal(modal);
    }
  }
  function _rewardIcon(type) {
    if (type === "cash") return "\u{1F4B5}";
    if (type === "boost") return "\u26A1";
    return "\u2B50";
  }
  function _rewardShortText(reward) {
    if (reward.type === "cash") return "+$" + formatNumberCompact(reward.value);
    if (reward.type === "boost") return "+" + Math.round(reward.value / 60) + "m";
    return "+" + reward.value;
  }
  function _renderLoginStreakStrip(streak, lm) {
    const strip = document.getElementById("login-streak-strip");
    if (!strip || !window.game || typeof window.game.getDailyLoginReward !== "function") return;
    strip.innerHTML = "";
    for (let offset = 0; offset <= 6; offset++) {
      const dayStreak = streak + offset;
      const reward = window.game.getDailyLoginReward(dayStreak);
      let label;
      if (offset === 0) label = lm.todayLabel || "Today";
      else if (offset === 1) label = lm.tomorrowLabel || "Tomorrow";
      else label = typeof lm.dayLabel === "function" ? lm.dayLabel(dayStreak) : "Day " + dayStreak;
      const card = document.createElement("div");
      card.className = "login-streak-day" + (offset === 0 ? " is-today" : "") + (offset === 1 ? " is-tomorrow" : "");
      card.innerHTML = `
            <span class="login-streak-day-label">${label}</span>
            <span class="login-streak-day-icon">${_rewardIcon(reward.type)}</span>
            <span class="login-streak-day-value">${_rewardShortText(reward)}</span>
        `;
      strip.appendChild(card);
    }
  }
  function _applyLoginReward(reward) {
    if (!reward) return;
    const lang = window.game && window.game.state && window.game.state.language || "en";
    const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : translations.he;
    if (reward.type === "cash") {
      window.game.addCash(Math.round(reward.value));
      spawnFloating("+" + formatMoney(reward.value), window.innerWidth / 2, window.innerHeight / 2, "green");
    } else if (reward.type === "boost") {
      window.game.addBoost2x(reward.value / 3600);
      const mins = Math.round(reward.value / 60);
      const lm = tObj.loginModal || translations.en && translations.en.loginModal;
      const boostTxt = lm && typeof lm.boostLabel === "function" ? lm.boostLabel(mins) : "+" + mins + " min Boost x2";
      spawnFloating(boostTxt, window.innerWidth / 2, window.innerHeight / 2, "gold");
    } else if (reward.type === "gold" || reward.type === "shares") {
      window.game.addShares(reward.value);
      const sharesUnit = tObj.goldSharesUnit || " " + (tObj.sharesLabel || "Shares");
      const sharesTxt = "+" + reward.value + (sharesUnit.startsWith(" ") ? sharesUnit : " " + sharesUnit);
      spawnFloating(sharesTxt, window.innerWidth / 2, window.innerHeight / 2, "gold");
    }
    window.game.state.pendingLoginReward = null;
    window.game.saveGame();
    draw();
  }
  function triggerPrestigeCeremony(sharesGained, branchName, callback) {
    const _pLang = game.state && game.state.language || "en";
    const _pT = translations[_pLang] || translations.en;
    const overlay = document.createElement("div");
    overlay.className = "prestige-ceremony-overlay";
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("role", "status");
    const line1 = document.createElement("div");
    line1.className = "ceremony-line1";
    line1.style.cssText = "font-size:1.5rem; margin-bottom:0.5rem; opacity:0; transition:opacity 0.4s ease;";
    line1.innerText = branchName + " " + (_pT.prestigeResetLabel || "resetting...");
    const line2 = document.createElement("div");
    line2.className = "ceremony-line2";
    line2.style.cssText = "font-size:2.5rem; margin:0.5rem 0; opacity:0; transition:opacity 0.4s ease;";
    line2.innerText = "0";
    const line3 = document.createElement("div");
    line3.className = "ceremony-line3";
    line3.style.cssText = "font-size:1rem; color:#dfab29; opacity:0; transition:opacity 0.4s ease;";
    line3.innerText = _pT.goldSharesLabel || "Gold Shares";
    overlay.appendChild(line1);
    overlay.appendChild(line2);
    overlay.appendChild(line3);
    document.body.appendChild(overlay);
    setTimeout(() => {
      line1.style.opacity = "1";
    }, 50);
    setTimeout(() => {
      line2.style.opacity = "1";
      line3.style.opacity = "1";
      if (typeof window.hapticTap === "function") window.hapticTap(20);
      ["\u{1F386}", "\u2728", "\u{1F31F}", "\u{1F4AB}", "\u{1F387}"].forEach(function(emoji, i) {
        setTimeout(function() {
          spawnFloating(emoji, Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1, window.innerHeight * 0.3, "gold");
        }, i * 200);
      });
      const duration = 1e3;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const current = Math.floor(progress * sharesGained);
        line2.innerText = "+" + current;
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          line2.innerText = "+" + sharesGained;
        }
      };
      requestAnimationFrame(animate);
    }, 500);
    setTimeout(() => {
      overlay.style.transition = "opacity 0.5s ease";
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof callback === "function") callback();
      }, 500);
    }, 2e3);
  }
  function _wheelWeightedRandom(prizes) {
    const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const prize of prizes) {
      rand -= prize.weight;
      if (rand <= 0) return prize;
    }
    return prizes[prizes.length - 1];
  }
  function updateFortuneWheelBtnState() {
    const btn = document.getElementById("fortune-wheel-btn");
    if (!btn) return;
    if (!window.game || !window.game.state) return;
    const now = Date.now();
    const lastSpin = game.state && game.state.lastSpinTime || 0;
    const canFreeSpin = now - lastSpin >= 864e5;
    const MAX_AD_SPINS_PER_DAY = 3;
    const lastAdSpin = game.state.lastAdSpinTime || 0;
    const currentDayAdSpins = now - lastAdSpin < 864e5 ? game.state.wheelAdSpinsCount || 0 : 0;
    const adSpinsLeft = Math.max(0, MAX_AD_SPINS_PER_DAY - currentDayAdSpins);
    const canAdSpin = adSpinsLeft > 0;
    const canAnySpin = canFreeSpin || canAdSpin;
    btn.classList.toggle("fortune-wheel-ready", canAnySpin);
    btn.classList.toggle("fortune-wheel-free", canFreeSpin);
    btn.classList.toggle("fortune-wheel-ad-ready", !canFreeSpin && canAdSpin);
    const badge = document.getElementById("fortune-wheel-badge");
    if (badge) {
      if (canFreeSpin) {
        badge.textContent = "!";
        badge.style.display = "flex";
      } else if (canAdSpin) {
        badge.textContent = "\u{1F3AC}";
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  }
  function openFortuneWheel() {
    initSound2();
    const lang = game.state && game.state.language || "en";
    const tObj = translations[lang] || translations.he || translations.en;
    const modal = document.getElementById("fortune-wheel-modal");
    if (!modal) return;
    const titleEl = document.getElementById("fortune-wheel-title-text") || document.getElementById("fortune-wheel-title");
    if (titleEl) titleEl.textContent = tObj.fortuneWheelTitle || "\u05D2\u05DC\u05D2\u05DC \u05D4\u05DE\u05D6\u05DC \u05D4\u05D9\u05D5\u05DE\u05D9";
    const subtitleEl = document.getElementById("fortune-wheel-subtitle");
    if (subtitleEl) subtitleEl.textContent = tObj.fortuneWheelSubtitle || "\u05E1\u05D5\u05D1\u05D1 \u05E4\u05E2\u05DD \u05D1\u05D9\u05D5\u05DD \u05D5\u05D6\u05DB\u05D4 \u05D1\u05E4\u05E8\u05E1\u05D9\u05DD \u05E2\u05E0\u05E7\u05D9\u05D9\u05DD!";
    const closeBtnEl = document.getElementById("fortune-close-btn");
    if (closeBtnEl) closeBtnEl.textContent = tObj.fortuneWheelClose || "\u2715 \u05E1\u05D2\u05D5\u05E8 \u05D5\u05D7\u05D6\u05D5\u05E8 \u05DC\u05DE\u05E9\u05D7\u05E7";
    const hubTextEl = document.getElementById("fortune-hub-text");
    if (hubTextEl) hubTextEl.textContent = tObj.fortuneWheelSpinHub || "\u05E1\u05D5\u05D1\u05D1";
    const now = Date.now();
    const lastSpin = game.state.lastSpinTime || 0;
    const cooldownMs = 864e5;
    const timeLeft = cooldownMs - (now - lastSpin);
    const canSpin = timeLeft <= 0;
    let adSpinGranted = false;
    const spinBtn = document.getElementById("fortune-spin-btn");
    const adSpinBtn = document.getElementById("fortune-ad-spin-btn");
    const hubSpinBtn = document.getElementById("fortune-hub-spin-btn");
    const cooldownEl = document.getElementById("fortune-cooldown");
    const resultEl = document.getElementById("fortune-result");
    if (resultEl) resultEl.style.display = "none";
    function formatShortAmount(num) {
      if (num < 1e3) return "$" + Math.ceil(num);
      const i = Math.floor(Math.log10(num) / 3);
      const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd"];
      const suffix = suffixes[i] || "";
      const rawVal = num / Math.pow(10, i * 3);
      return "$" + (rawVal < 10 ? rawVal.toFixed(1) : Math.ceil(rawVal)) + suffix;
    }
    const segmentsContainer = document.getElementById("wheel-segments-container");
    const wheelGraphic = document.querySelector(".fortune-wheel-graphic");
    if (segmentsContainer && wheelGraphic) {
      segmentsContainer.innerHTML = "";
      const wedgeColors = [
        "#b45309 0deg 60deg",
        // 1: Gold / Bronze (Cash Small)
        "#1d4ed8 60deg 120deg",
        // 2: Royal Sapphire (Shares 15)
        "#15803d 120deg 180deg",
        // 3: Rich Emerald (Cash Medium)
        "#7e22ce 180deg 240deg",
        // 4: Velvet Purple (Cash Big)
        "#0f766e 240deg 300deg",
        // 5: Ocean Teal (Shares 5)
        "#c2410c 300deg 360deg"
        // 6: Solar Orange (Boost 2x)
      ];
      wheelGraphic.style.background = `conic-gradient(${wedgeColors.join(", ")})`;
      GAME_CONFIG.WHEEL_PRIZES.forEach((p, index) => {
        if (index >= 6) return;
        const middleAngle = index * 60 + 30;
        const seg = document.createElement("div");
        seg.className = `wheel-seg seg-${index + 1}`;
        seg.style.transform = `rotate(${middleAngle}deg) translateY(-68px)`;
        let icon = "\u{1F381}";
        let text = "";
        if (p.type === "cash") {
          icon = p.label === "cash_small" ? "\u{1FA99}" : p.label === "cash_medium" ? "\u{1F4B5}" : "\u{1F4B8}";
          const eps = game.getEarningsPerSecond();
          const timeAmount = 3600 * eps * p.value;
          const pct = p.label === "cash_big" ? 0.3 : p.label === "cash_medium" ? 0.2 : 0.1;
          const pctAmount = Math.round(game.state.cash * pct);
          text = formatShortAmount(Math.max(timeAmount, pctAmount));
        } else if (p.type === "boost") {
          icon = "\u26A1";
          text = `+${p.value}H`;
        } else if (p.type === "shares") {
          icon = "\u2709\uFE0F";
          const isSmall = p.label === "shares_1";
          let sharesAmount = Math.max(p.value, Math.floor((game.state.shares || 0) * (isSmall ? 0.25 : 0.5)));
          sharesAmount = Math.min(1e4, sharesAmount);
          text = `+${sharesAmount >= 1e3 ? sharesAmount / 1e3 + "K" : sharesAmount}`;
        }
        const isBottomHalf = middleAngle > 100 && middleAngle < 280;
        const uprightTransform = isBottomHalf ? "transform: rotate(180deg);" : "";
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
      const curTimeLeft = 864e5 - (curNow - curLastSpin);
      const curCanSpin = curTimeLeft <= 0;
      const today = (/* @__PURE__ */ new Date()).toDateString();
      if (game.state.wheelAdSpinsDate !== today) {
        game.state.wheelAdSpinsDate = today;
        game.state.wheelAdSpinsCount = 0;
      }
      const currentAdSpinsUsed = game.state.wheelAdSpinsCount || 0;
      const currentAdSpinsLeft = Math.max(0, 3 - currentAdSpinsUsed);
      if (curCanSpin || adSpinGranted) {
        if (spinBtn) {
          spinBtn.disabled = false;
          spinBtn.style.display = "block";
          spinBtn.textContent = tObj.fortuneWheelSpinBtn || "\u{1F3AF} \u05E1\u05D5\u05D1\u05D1 \u05E2\u05DB\u05E9\u05D9\u05D5 \u05D1\u05D7\u05D9\u05E0\u05DD!";
        }
        if (hubSpinBtn) hubSpinBtn.disabled = false;
        if (adSpinBtn) {
          adSpinBtn.style.display = "none";
          adSpinBtn.classList.remove("disabled-limit");
        }
        if (cooldownEl) cooldownEl.style.display = "none";
      } else if (currentAdSpinsLeft > 0) {
        if (spinBtn) spinBtn.style.display = "none";
        if (adSpinBtn) {
          adSpinBtn.style.display = "flex";
          adSpinBtn.disabled = false;
          adSpinBtn.classList.remove("disabled-limit");
          const adTextEl = document.getElementById("fortune-ad-spin-text");
          const adBtnStr = typeof tObj.fortuneWheelAdSpinBtn === "function" ? tObj.fortuneWheelAdSpinBtn(currentAdSpinsLeft) : `\u{1F4FA} \u05E1\u05D9\u05D1\u05D5\u05D1 \u05E0\u05D5\u05E1\u05E3 (${currentAdSpinsLeft}/3) \u2014 \u05E6\u05E4\u05D4 \u05D1\u05E4\u05E8\u05E1\u05D5\u05DE\u05EA`;
          if (adTextEl) adTextEl.textContent = adBtnStr;
        }
        if (hubSpinBtn) hubSpinBtn.disabled = false;
        if (cooldownEl) {
          const hoursLeft = Math.floor(curTimeLeft / 36e5);
          const minsLeft = Math.floor(curTimeLeft % 36e5 / 6e4);
          const hStr = hoursLeft.toString().padStart(2, "0");
          const mStr = minsLeft.toString().padStart(2, "0");
          cooldownEl.textContent = `${tObj.fortuneWheelCooldownLabel || "\u23F1\uFE0F \u05E1\u05D9\u05D1\u05D5\u05D1 \u05D7\u05D9\u05E0\u05DD \u05D4\u05D1\u05D0 \u05D1\u05E2\u05D5\u05D3:"} ${hStr}:${mStr}`;
          cooldownEl.style.display = "inline-block";
          if (curTimeLeft > 0 && curTimeLeft <= 36e5) {
            cooldownEl.style.color = "#ef4444";
            cooldownEl.style.fontWeight = "bold";
          } else {
            cooldownEl.style.color = "";
            cooldownEl.style.fontWeight = "";
          }
        }
      } else {
        if (spinBtn) spinBtn.style.display = "none";
        if (adSpinBtn) {
          adSpinBtn.style.display = "flex";
          adSpinBtn.disabled = true;
          adSpinBtn.classList.add("disabled-limit");
          const adTextEl = document.getElementById("fortune-ad-spin-text");
          if (adTextEl) adTextEl.textContent = tObj.fortuneWheelAdLimitReached || "\u{1F6AB} \u05E0\u05D5\u05E6\u05DC\u05D5 \u05DB\u05DC 3 \u05E1\u05D9\u05D1\u05D5\u05D1\u05D9 \u05D4\u05E4\u05E8\u05E1\u05D5\u05DE\u05EA \u05DC\u05D4\u05D9\u05D5\u05DD (0/3)";
        }
        if (hubSpinBtn) hubSpinBtn.disabled = true;
        if (cooldownEl) {
          const hoursLeft = Math.floor(curTimeLeft / 36e5);
          const minsLeft = Math.floor(curTimeLeft % 36e5 / 6e4);
          const hStr = hoursLeft.toString().padStart(2, "0");
          const mStr = minsLeft.toString().padStart(2, "0");
          cooldownEl.textContent = `${tObj.fortuneWheelCooldownLabel || "\u23F1\uFE0F \u05E1\u05D9\u05D1\u05D5\u05D1 \u05D7\u05D9\u05E0\u05DD \u05D4\u05D1\u05D0 \u05D1\u05E2\u05D5\u05D3:"} ${hStr}:${mStr}`;
          cooldownEl.style.display = "inline-block";
          if (curTimeLeft > 0 && curTimeLeft <= 36e5) {
            cooldownEl.style.color = "#ef4444";
            cooldownEl.style.fontWeight = "bold";
          } else {
            cooldownEl.style.color = "";
            cooldownEl.style.fontWeight = "";
          }
        }
      }
    }
    updateButtonStates();
    let isSpinning = false;
    const triggerSpinAction = () => {
      initSound2();
      if (typeof window.hapticTap === "function") window.hapticTap();
      const curNow = Date.now();
      const curLastSpin = game.state.lastSpinTime || 0;
      const isFreeReady = curNow - curLastSpin >= 864e5;
      if (!isFreeReady && !adSpinGranted) {
        if (adSpinBtn) adSpinBtn.click();
        return;
      }
      isSpinning = true;
      if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.textContent = tObj.fortuneWheelSpinning || "\u05DE\u05E1\u05EA\u05D5\u05D1\u05D1 \u05D1\u05D4\u05EA\u05E8\u05D2\u05E9\u05D5\u05EA... \u{1F3A1}";
      }
      if (adSpinBtn) adSpinBtn.disabled = true;
      if (hubSpinBtn) hubSpinBtn.disabled = true;
      const prizePool = GAME_CONFIG.WHEEL_PRIZES;
      const prize = _wheelWeightedRandom(prizePool);
      const prizeIndex = prizePool.indexOf(prize);
      const centerSliceAngle = prizeIndex * 60 + 30;
      const jitter = Math.random() * 16 - 8;
      const landedAngle = centerSliceAngle + jitter;
      const targetAngle = 360 - landedAngle;
      const wheelEl = document.getElementById("fortune-wheel-graphic");
      if (wheelEl) {
        const prevAngle = wheelEl._currentRotation || 0;
        const startBase = prevAngle % 360;
        wheelEl.style.transition = "none";
        wheelEl.style.transform = `rotate(${startBase}deg)`;
        void wheelEl.offsetWidth;
        wheelEl.style.transition = "transform 4.2s cubic-bezier(0.12, 0.86, 0.15, 1)";
        const totalRotation = startBase + 2160 + targetAngle;
        wheelEl.style.transform = `rotate(${totalRotation}deg)`;
        wheelEl._currentRotation = totalRotation;
      }
      setTimeout(() => {
        isSpinning = false;
        let prizeText = "";
        const lang2 = game.state && game.state.language || "en";
        const tObj2 = translations[lang2] || translations.he || translations.en;
        if (prize.type === "cash") {
          const eps = game.getEarningsPerSecond();
          const timeAmount = 3600 * eps * prize.value;
          const pctAmount = Math.round(game.state.cash * (prize.label === "cash_small" ? 0.1 : prize.label === "cash_medium" ? 0.2 : 0.3));
          const amount = Math.max(timeAmount, pctAmount);
          game.addCash(amount);
          prizeText = `+${formatMoney(amount)}`;
          spawnFloating(`+${formatMoney(amount)}`, window.innerWidth / 2, window.innerHeight / 2 - 60, "green");
        } else if (prize.type === "boost") {
          game.addBoost2x(prize.value);
          const boostHrs = prize.value;
          prizeText = typeof tObj2.boostLabel === "function" ? tObj2.boostLabel(boostHrs * 60) : `+${boostHrs}h Boost x2`;
          spawnFloating(`\u26A1 +${boostHrs}h`, window.innerWidth / 2, window.innerHeight / 2 - 60, "gold");
        } else if (prize.type === "gold" || prize.type === "shares") {
          const isSmall = prize.label === "gold_1" || prize.label === "shares_1";
          let sharesAmount = Math.max(prize.value, Math.floor((game.state.shares || 0) * (isSmall ? 0.25 : 0.5)));
          sharesAmount = Math.min(1e4, sharesAmount);
          game.addShares(sharesAmount);
          const sharesLabel = `+${sharesAmount}`;
          prizeText = `${sharesLabel} ${tObj2.goldSharesLabel || "\u05DE\u05E0\u05D9\u05D5\u05EA \u05D6\u05D4\u05D1"}`;
          spawnFloating(`\u{1F4C8} ${sharesLabel}`, window.innerWidth / 2, window.innerHeight / 2 - 60, "gold");
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
        showDiscoveryTip("fortune");
        if (resultEl) {
          resultEl.innerHTML = `
                        <div class="wheel-win-top-row">
                            <span class="wheel-win-crown">\u{1F451}</span>
                            <span class="wheel-win-headline">${tObj2.fortuneWheelPrizeTitle || "\u05D1\u05E8\u05DB\u05D5\u05EA! \u05D6\u05DB\u05D9\u05EA \u05D1\u05E4\u05E8\u05E1 \u05DE\u05E4\u05D5\u05D0\u05E8"}</span>
                        </div>
                        <div class="wheel-win-box">
                            <span class="laurel laurel-left">\u{1F33F}</span>
                            <strong class="wheel-win-amount">${prizeText}</strong>
                            <span class="laurel laurel-right">\u{1F33F}</span>
                        </div>
                    `;
          resultEl.style.display = "flex";
        }
        updateButtonStates();
      }, 4100);
    };
    if (spinBtn) spinBtn.onclick = triggerSpinAction;
    if (hubSpinBtn) hubSpinBtn.onclick = triggerSpinAction;
    if (adSpinBtn) {
      adSpinBtn.onclick = () => {
        if (adSpinBtn.disabled || isSpinning) return;
        initSound2();
        if (typeof window.hapticTap === "function") window.hapticTap();
        adSpinBtn.disabled = true;
        playAd(() => {
          adSpinGranted = true;
          if (resultEl) resultEl.style.display = "none";
          updateButtonStates();
          triggerSpinAction();
        }, "short");
      };
    }
    const closeHandler = () => {
      if (isSpinning) return;
      if (typeof window.hapticTap === "function") window.hapticTap();
      if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
      modal.classList.remove("active");
    };
    const closeBtn = document.getElementById("fortune-close-btn");
    if (closeBtn) closeBtn.onclick = closeHandler;
    const closeXBtn = document.getElementById("fortune-close-x-top");
    if (closeXBtn) closeXBtn.onclick = closeHandler;
    modal.onclick = (e) => {
      if (e.target === modal) closeHandler();
    };
    activateModal(modal);
  }
  if (typeof window !== "undefined") {
    window.openWeeklyRewardModal = openWeeklyRewardModal;
  }

  // ui/events/main-loop.js
  var autoSaveTimer = 0;
  var tabRefreshTimer = 0;
  var fortuneWheelBtnTimer = 0;
  var drawTimer = 0;
  var boostOfferEndTime = 0;
  var boostOfferNextTime = 0;
  var _domStickyBar = null;
  var _domHeroCard = null;
  var _domMBadgeTop = null;
  var _domMBadgeBottom = null;
  var _domDBadgeTop = null;
  var _domTabBtnDaily = null;
  var _domTabBtnMissions = null;
  var _domBnavMissions = null;
  var _domHeaderDailyBtn = null;
  var _lastMissionsReady = -1;
  var _lastDailyReady = -1;
  var _lastStickyState = null;
  var _uiCheckTimer = 0;
  function resetBoostOfferTimer() {
    boostOfferEndTime = 0;
    window._boostOfferEndTime = 0;
  }
  function tick(timestamp) {
    try {
      const dt = (timestamp - lastTime) / 1e3;
      lastTime = timestamp;
      const cappedDt = Math.min(1, dt);
      game.update(cappedDt);
      if (game._contextualAdPending) {
        game._contextualAdPending = null;
        showContextualAdBanner();
      }
      {
        const now = Date.now();
        if (game.state.boost2xTimeLeft > 0) {
          boostOfferEndTime = 0;
          boostOfferNextTime = 0;
        } else {
          if (boostOfferEndTime > 0 && now > boostOfferEndTime) {
            boostOfferEndTime = 0;
            boostOfferNextTime = now + (900 + Math.random() * 900) * 1e3;
          } else if (boostOfferEndTime === 0 && (boostOfferNextTime === 0 || now > boostOfferNextTime)) {
            if (!AdService.isInCooldown()) {
              boostOfferEndTime = now + (600 + Math.random() * 600) * 1e3;
              boostOfferNextTime = 0;
            }
          }
        }
        window._boostOfferEndTime = boostOfferEndTime;
      }
      tabRefreshTimer += cappedDt;
      if (tabRefreshTimer >= GAME_CONFIG.TAB_REFRESH_INTERVAL_SEC) {
        tabRefreshTimer = 0;
        const _activeTabEl = document.querySelector(".tab-btn.active");
        if (_activeTabEl && _activeTabEl.getAttribute("data-tab") === "missions") {
          game.checkMissions();
          if (typeof window.updateMissionsTabProgress === "function") window.updateMissionsTabProgress();
        }
        const _newlyUnlockedAchievements = game.checkAchievements();
        if (_newlyUnlockedAchievements && _newlyUnlockedAchievements.length > 0) {
          _newlyUnlockedAchievements.forEach((a) => {
            if (typeof window.playAchievementUnlockFeedback === "function") window.playAchievementUnlockFeedback(a);
          });
          game.saveGame();
        }
        if (_activeTabEl && _activeTabEl.getAttribute("data-tab") === "daily") {
          if (_newlyUnlockedAchievements && _newlyUnlockedAchievements.length > 0 && typeof window.renderAchievementsTab === "function") {
            window.renderAchievementsTab();
          } else if (typeof window.updateAchievementsTabProgress === "function") {
            window.updateAchievementsTabProgress();
          }
        }
        updateButtonAffordability();
        const _nmBranch = game.branches && game.branches[game.state.currentBranch];
        if (_nmBranch) {
          const _nmRatio = typeof GAME_CONFIG !== "undefined" && typeof GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO === "number" ? GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO : 0.9;
          const _nmThreshold = _nmBranch.minCashToPrestige * _nmRatio * 0.7;
          const _nmActive = game.state.lifetimeCash >= _nmThreshold && game.state.cash < _nmBranch.minCashToPrestige * _nmRatio;
          document.querySelectorAll("[data-prestige-branch], #main-prestige-btn").forEach((el) => {
            el.classList.toggle("prestige-near-miss-glow", _nmActive);
          });
        }
      }
      fortuneWheelBtnTimer += cappedDt;
      if (fortuneWheelBtnTimer >= 2) {
        fortuneWheelBtnTimer = 0;
        updateFortuneWheelBtnState();
      }
      _uiCheckTimer += cappedDt;
      if (_uiCheckTimer >= 0.1) {
        _uiCheckTimer = 0;
        if (!_domStickyBar) _domStickyBar = document.getElementById("sticky-balance-bar");
        if (!_domHeroCard) _domHeroCard = document.getElementById("stat-cash") || document.querySelector(".cash-hero-card");
        if (_domStickyBar) {
          const isModalOpen = Boolean(
            document.querySelector(".modal-overlay.active, .modal.active, #offline-modal.active, #event-modal-overlay.active, .dialog-overlay.active") || document.body.classList.contains("modal-open") || document.getElementById("splash-screen") && !document.getElementById("splash-screen").classList.contains("hidden") && !document.getElementById("splash-screen").classList.contains("fade-out")
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
            _domStickyBar.classList.toggle("visible", shouldShow);
          }
        }
        const _missionsReady = (game.state.missions || []).filter((m) => m && m.completed && !m.claimed).length;
        const _dailyReady = (game.state.dailyChallenges || []).filter((c) => c && c.completed && !c.claimed).length;
        let _achieveReady = 0;
        if (game.state.achievements && game.state.achievements.unlocked) {
          const _achKeys = Object.keys(game.state.achievements.unlocked);
          for (let i = 0; i < _achKeys.length; i++) {
            if (game.state.achievements.unlocked[_achKeys[i]] && (!game.state.achievements.claimed || !game.state.achievements.claimed[_achKeys[i]])) {
              _achieveReady++;
            }
          }
        }
        const _pendingLogin = game.state.pendingLoginReward ? 1 : 0;
        const _trophyReadyTotal = _dailyReady + _achieveReady + _pendingLogin;
        if (_missionsReady !== _lastMissionsReady) {
          _lastMissionsReady = _missionsReady;
          if (!_domMBadgeTop) _domMBadgeTop = document.getElementById("missions-tab-badge");
          if (!_domMBadgeBottom) _domMBadgeBottom = document.getElementById("bnav-missions-badge");
          if (!_domTabBtnMissions) _domTabBtnMissions = document.getElementById("tab-btn-missions");
          if (!_domBnavMissions) _domBnavMissions = document.getElementById("bnav-missions");
          if (_domMBadgeTop) {
            _domMBadgeTop.style.display = _missionsReady > 0 ? "flex" : "none";
            _domMBadgeTop.innerText = String(_missionsReady);
          }
          if (_domMBadgeBottom) {
            _domMBadgeBottom.style.display = _missionsReady > 0 ? "flex" : "none";
            _domMBadgeBottom.innerText = String(_missionsReady);
          }
          if (_domTabBtnMissions) _domTabBtnMissions.classList.toggle("reward-ready-glow", _missionsReady > 0);
          if (_domBnavMissions) _domBnavMissions.classList.toggle("reward-ready-glow", _missionsReady > 0);
        }
        if (_dailyReady !== _lastDailyReady) {
          _lastDailyReady = _dailyReady;
          if (!_domDBadgeTop) _domDBadgeTop = document.getElementById("daily-tab-badge");
          if (!_domTabBtnDaily) _domTabBtnDaily = document.getElementById("tab-btn-daily");
          if (_domDBadgeTop) {
            _domDBadgeTop.style.display = _dailyReady > 0 ? "flex" : "none";
            _domDBadgeTop.innerText = String(_dailyReady);
          }
          if (_domTabBtnDaily) _domTabBtnDaily.classList.toggle("reward-ready-glow", _dailyReady > 0);
        }
        if (!_domHeaderDailyBtn) _domHeaderDailyBtn = document.getElementById("header-daily-btn");
        if (_domHeaderDailyBtn) {
          _domHeaderDailyBtn.classList.toggle("reward-ready-glow", _trophyReadyTotal > 0);
          _domHeaderDailyBtn.classList.toggle("header-daily-ready", _trophyReadyTotal > 0);
          const _trophyBadge = document.getElementById("header-daily-badge");
          if (_trophyBadge) {
            if (_trophyReadyTotal > 0) {
              _trophyBadge.textContent = "!";
              _trophyBadge.style.display = "flex";
            } else {
              _trophyBadge.style.display = "none";
            }
          }
        }
      }
      drawTimer += cappedDt;
      const targetFpsInterval = 0;
      if (drawTimer >= targetFpsInterval) {
        updateActiveCoins(drawTimer);
        if (typeof updateFloatingText === "function") updateFloatingText(drawTimer);
        drawTimer = 0;
        draw();
      }
      autoSaveTimer += cappedDt;
      if (autoSaveTimer >= GAME_CONFIG.AUTO_SAVE_INTERVAL_SEC) {
        autoSaveTimer = 0;
        game.saveGame();
      }
      rafId = requestAnimationFrame(tick);
    } catch (e) {
      console.error("Critical error in game loop!", e);
      try {
        game.saveGame();
      } catch (saveErr) {
        console.error("Failed to auto-save during crash recovery", saveErr);
      }
      if (typeof window.showToast === "function") {
        const _toastLang = game.state && game.state.language || "en";
        const _toastT = typeof translations !== "undefined" && translations[_toastLang] ? translations[_toastLang] : translations.en;
        const crashMsg = _toastT.errorDesc || "A critical error occurred! Game progress was saved.";
        window.showToast(crashMsg, "danger");
      }
      let overlay = document.getElementById("crash-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "crash-overlay";
        const _crashLang = window.gameLanguage || "en";
        const _crashT = typeof translations !== "undefined" && translations[_crashLang] ? translations[_crashLang] : translations.en;
        const title = document.createElement("h1");
        title.innerText = _crashT.errorTitle || "Oops! Something went wrong";
        const desc = document.createElement("p");
        desc.innerText = (_crashT.errorDesc || "An unexpected error occurred in the game loop. Your progress has been saved.") + " ERROR: " + (e.message || e) + "\n" + (e.stack || "");
        const reloadBtn = document.createElement("button");
        reloadBtn.innerText = _crashT.reloadBtn || "Reload Game \u{1F504}";
        reloadBtn.addEventListener("click", () => window.location.reload());
        overlay.appendChild(title);
        overlay.appendChild(desc);
        overlay.appendChild(reloadBtn);
        document.body.appendChild(overlay);
      }
    }
  }
  function syncBottomNav(activeTab) {
    document.querySelectorAll(".bottom-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === activeTab);
    });
    const headerDailyBtn = document.getElementById("header-daily-btn");
    if (headerDailyBtn) {
      headerDailyBtn.classList.toggle("active", activeTab === "daily");
    }
  }
  function updateVaultMiniBar(pct, isReady, cashStored, capacity, yieldPerHour, vaultLevel) {
    const miniPct = document.getElementById("vault-mini-pct");
    const miniFill = document.getElementById("vault-mini-fill");
    const miniBtn = document.getElementById("vault-mini-btn");
    const miniBar = document.getElementById("vault-mini-bar");
    if (!miniPct) return;
    miniPct.textContent = Math.round(pct) + "%";
    if (miniFill) {
      miniFill.style.width = pct + "%";
      miniFill.setAttribute("aria-valuenow", Math.round(pct));
    }
    if (miniBtn) {
      miniBtn.disabled = !isReady;
    }
    const fmt = (v) => typeof formatMoney2 === "function" ? formatMoney2(v) : typeof window.formatMoney === "function" ? window.formatMoney(v) : "$" + Math.round(v);
    const miniStored = document.getElementById("vault-mini-stored");
    const miniCap = document.getElementById("vault-mini-cap");
    const miniYield = document.getElementById("vault-mini-yield");
    const miniLevel = document.getElementById("vault-mini-level");
    if (miniStored && cashStored !== void 0) miniStored.textContent = fmt(cashStored);
    if (miniCap && capacity !== void 0) miniCap.textContent = fmt(capacity);
    if (miniYield && yieldPerHour !== void 0) miniYield.textContent = "+" + fmt(yieldPerHour) + "/h";
    if (miniLevel && vaultLevel !== void 0) miniLevel.textContent = "Lv." + vaultLevel;
    if (miniFill) {
      miniFill.style.background = "";
      miniFill.classList.toggle("is-full", pct >= 95);
      miniFill.classList.toggle("is-warm", pct >= 60 && pct < 95);
    }
    if (miniBar) {
      miniBar.classList.toggle("is-full", pct >= 95);
      miniBar.classList.toggle("is-ready", isReady && pct < 95);
    }
  }

  // ui/events/ads.js
  var soundInitialized = false;
  var contextualBannerShown = false;
  var contextualOfferTimeout = null;
  var AD_TESTING_MODE = false;
  var PROD_REWARDED_AD_UNIT_ID = "ca-app-pub-1189054329275307/1609550976";
  var TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";
  var AdService = {
    _isShowing: false,
    // Two independent cooldown pools so a big reward (prestige, weekly, offline-double,
    // the boost offer) doesn't get shadowed by a small one (contextual banner, VIP visit,
    // fortune wheel) sharing the same timer, or vice versa.
    lastWatchedAt: 0,
    lastWatchedAtShort: 0,
    AD_OFFER_COOLDOWN_MS: 7 * 60 * 1e3,
    AD_OFFER_COOLDOWN_SHORT_MS: 2.5 * 60 * 1e3,
    adMobAvailable: false,
    _activeCallback: null,
    _activeRewardGranted: false,
    _currentTier: "big",
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
      if (tier === "short") {
        return AdService.lastWatchedAtShort > 0 && Date.now() - AdService.lastWatchedAtShort < AdService.AD_OFFER_COOLDOWN_SHORT_MS;
      }
      return AdService.lastWatchedAt > 0 && Date.now() - AdService.lastWatchedAt < AdService.AD_OFFER_COOLDOWN_MS;
    },
    _markWatched: function() {
      if (AdService._currentTier === "short") {
        AdService.lastWatchedAtShort = Date.now();
      } else {
        AdService.lastWatchedAt = Date.now();
      }
    },
    initAdMob: async function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        const AdMob = window.Capacitor.Plugins.AdMob;
        try {
          try {
            if (typeof AdMob.requestConsentInfo === "function") {
              const consentInfo = await AdMob.requestConsentInfo();
              if (consentInfo && consentInfo.status === "REQUIRED") {
                if (typeof AdMob.showConsentForm === "function") {
                  await AdMob.showConsentForm();
                }
              }
            }
          } catch (consentErr) {
            console.warn("AdMob UMP consent request non-blocking warning:", consentErr);
          }
          await AdMob.initialize({
            requestTrackingAuthorization: true
          });
          AdService.adMobAvailable = true;
          const onRewardEarned = (rewardItem) => {
            console.log("[AdMob] onRewardedVideoAdReward event earned:", rewardItem);
            AdService._executeReward();
          };
          const onAdDismissed = () => {
            console.log("[AdMob] onRewardedVideoAdDismissed event");
            AdService._isShowing = false;
            AdService._isAdPrepared = false;
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
          await AdService.prepareAd();
        } catch (e) {
          console.error("AdMob init failed", e);
        }
      }
    },
    showPrivacyOptions: async function() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        const AdMob = window.Capacitor.Plugins.AdMob;
        try {
          if (typeof AdMob.showPrivacyOptionsForm === "function") {
            await AdMob.showPrivacyOptionsForm();
            return true;
          }
        } catch (e) {
          console.warn("AdMob showPrivacyOptionsForm warning:", e);
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
          if (!AD_TESTING_MODE) {
            try {
              await AdMob.prepareRewardVideoAd({
                adId: PROD_REWARDED_AD_UNIT_ID,
                isTesting: false
              });
              AdService._isAdPrepared = true;
              return true;
            } catch (prodErr) {
              console.warn("Production AdMob unit not filled or pending approval, falling back to test ad unit:", prodErr);
            }
          }
          await AdMob.prepareRewardVideoAd({
            adId: TEST_REWARDED_AD_UNIT_ID,
            isTesting: true
          });
          AdService._isAdPrepared = true;
          return true;
        } catch (e) {
          console.error("Failed to prepare ad (both prod and test):", e);
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
      AdService._currentTier = tier === "short" ? "short" : "big";
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
        }
      }
      AdService._isShowing = true;
      let interval = null;
      let timeoutId = null;
      let settled = false;
      const removeOverlay = () => {
        const el = document.querySelector(".ad-playing-overlay");
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
      timeoutId = setTimeout(() => complete(true), 15e3);
      try {
        const overlay = document.createElement("div");
        overlay.className = "ad-playing-overlay";
        const lang = window.game && window.game.state && window.game.state.language || "en";
        const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : window.translations && window.translations[lang] || window.translations && window.translations.he || {};
        const titleText = tObj.adTitle || "Watching Sponsored Ad...";
        const subtitleText = tObj.adSubtitle || "Reward unlocks in:";
        const closeText = tObj.adCloseBtn || "Close \u274C (No Reward)";
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
          const countdownEl = overlay.querySelector(".ad-countdown");
          if (countdownEl) countdownEl.innerText = timeLeft;
          if (timeLeft <= 0) {
            complete(true);
          }
        }, 1e3);
        const closeBtn = overlay.querySelector(".ad-close-btn");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => complete(false));
        }
      } catch (err) {
        console.error("AdService failed to display:", err);
        complete(true);
      }
    }
  };
  setTimeout(() => AdService.initAdMob(), 1e3);
  function playAd(callback, tier) {
    AdService.show(callback, tier);
  }
  function formatTime2(sec) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor(sec % 3600 / 60);
    const secs = Math.floor(sec % 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  function updateAdvDisplay2(budget) {
    if (!DOM_CACHE.advDisplay) return;
    const lang = window.game && game.state && game.state.language || "en";
    const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : window.translations && window.translations[lang] || window.translations && window.translations.he || {};
    const slider = DOM_CACHE.advSlider;
    if (slider) {
      const val = parseInt(slider.value) || 0;
      const max = parseInt(slider.max) || 1e3;
      const pct = Math.min(100, Math.max(0, val / max * 100));
      slider.style.setProperty("--slider-pct", `${pct}%`);
    }
    const dynamicMax = window.game && typeof game.getAdMaxBudget === "function" ? game.getAdMaxBudget() : 1e4;
    const maxLimitLabel = document.getElementById("label-adv-limit-max");
    if (maxLimitLabel) {
      maxLimitLabel.textContent = formatMoney(dynamicMax);
    }
    const pill = document.getElementById("adv-value-pill");
    if (budget === 0) {
      DOM_CACHE.advDisplay.innerText = tObj.advValueOff || "\u05DB\u05D1\u05D5\u05D9";
      DOM_CACHE.advDisplay.classList.remove("insufficient");
      if (pill) pill.className = "adv-value-pill off";
    } else {
      DOM_CACHE.advDisplay.innerText = "\u{1F4C8} " + formatMoney(budget) + (tObj.perMinute || " \u05DC\u05D3\u05E7\u05D4");
      if (window.game && game.state && !game.state.advActive) {
        DOM_CACHE.advDisplay.innerText += tObj.advSuspended || " [\u05DE\u05D5\u05E9\u05D4\u05D4]";
        DOM_CACHE.advDisplay.classList.add("insufficient");
        if (pill) pill.className = "adv-value-pill suspended";
      } else {
        DOM_CACHE.advDisplay.classList.remove("insufficient");
        if (pill) pill.className = "adv-value-pill active";
      }
    }
  }
  function updateMuteButton() {
    if (!DOM_CACHE.muteBtn) return;
    const lang = window.gameLanguage || "en";
    const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : window.translations && window.translations[lang] || window.translations && window.translations.he || {};
    const isMuted = window.gameAudio ? window.gameAudio.isMuted : true;
    if (isMuted) {
      DOM_CACHE.muteBtn.innerText = "\u{1F507}";
      DOM_CACHE.muteBtn.title = tObj.unmute;
      DOM_CACHE.muteBtn.setAttribute("aria-label", tObj.unmute);
      DOM_CACHE.muteBtn.classList.add("muted");
    } else {
      DOM_CACHE.muteBtn.innerText = "\u{1F50A}";
      DOM_CACHE.muteBtn.title = tObj.mute;
      DOM_CACHE.muteBtn.setAttribute("aria-label", tObj.mute);
      DOM_CACHE.muteBtn.classList.remove("muted");
    }
  }
  function initSound2() {
    if (!soundInitialized) {
      if (window.gameAudio && typeof window.gameAudio.init === "function") {
        window.gameAudio.init();
        if (!window.gameAudio.isMuted && typeof window.gameAudio.startMusic === "function") {
          window.gameAudio.startMusic();
        }
      }
      soundInitialized = true;
    }
  }
  function showContextualAdBanner() {
    if (AdService.isInCooldown("short")) return;
    if (game.state.boost2xTimeLeft > 0) return;
    if (document.querySelector(".modal-overlay.active")) return;
    if (contextualBannerShown) return;
    const lang = game.state && game.state.language || "en";
    const existing = document.getElementById("contextual-offer-banner");
    if (existing) existing.remove();
    const tObj = typeof translations !== "undefined" && translations[lang] ? translations[lang] : window.translations && window.translations[lang] || window.translations && window.translations.he || {};
    const msg = tObj.boostMilestoneMsg || "\u{1F389} Cash milestone! Activate x2 boost?";
    const banner = document.createElement("div");
    banner.id = "contextual-offer-banner";
    banner.innerHTML = `
        <span style="font-size:0.82rem; color:var(--text-main); flex:1;">${msg}</span>
        <button id="ctx-offer-yes" style="background:var(--primary-gold,#dfab29); color:#000; border:none; padding:0.28rem 0.7rem; border-radius:8px; font-size:0.78rem; cursor:pointer; font-weight:700; white-space:nowrap;">${tObj.ctxWatchBtn || "\u{1F3AC} Watch"}</button>
        <button id="ctx-offer-no" style="background:transparent; border:1px solid var(--border-color,rgba(255,255,255,0.1)); color:var(--text-muted,#9ca3af); padding:0.28rem 0.5rem; border-radius:8px; font-size:0.78rem; cursor:pointer;">\u2715</button>
    `;
    Object.assign(banner.style, {
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      position: "fixed",
      bottom: "70px",
      left: "0",
      right: "0",
      margin: "0 auto",
      background: "var(--surface-color,rgba(20,24,36,0.95))",
      border: "1px solid var(--primary-gold,#dfab29)",
      borderRadius: "12px",
      padding: "0.65rem 0.85rem",
      zIndex: "2000",
      maxWidth: "340px",
      width: "90%",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      animation: "slideUpIn 0.3s ease"
    });
    document.body.appendChild(banner);
    contextualBannerShown = true;
    const removeBanner = () => {
      if (banner.parentNode) banner.remove();
      contextualBannerShown = false;
      if (contextualOfferTimeout) clearTimeout(contextualOfferTimeout);
    };
    document.getElementById("ctx-offer-yes").addEventListener("click", () => {
      initSound2();
      removeBanner();
      playAd(() => {
        game.addBoost2x(2);
        draw();
        spawnFloating(tObj.boostActivatedMsg || "\u26A1 Boost x2 activated!", window.innerWidth / 2, window.innerHeight / 2, "gold");
      }, "short");
    });
    document.getElementById("ctx-offer-no").addEventListener("click", () => {
      initSound2();
      removeBanner();
    });
    contextualOfferTimeout = setTimeout(removeBanner, 9e3);
  }

  // ui/events/i18n-theme.js
  function applyLanguage(lang) {
    window.gameLanguage = lang;
    updateCachedSuffixes(lang);
    if (typeof window.updateCachedSuffixes === "function") {
      window.updateCachedSuffixes(lang);
    }
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    const pageTitles = {
      he: "\u05D0\u05D9\u05DE\u05E4\u05E8\u05D9\u05D9\u05EA \u05D4\u05D1\u05E0\u05E7\u05D9\u05DD - \u05DE\u05E9\u05D7\u05E7 Idle Bank \u05D9\u05D5\u05E7\u05E8\u05EA\u05D9",
      en: "Bank Empire - Premium Idle Game",
      es: "Imperio Bancario - Juego Idle Premium",
      ru: "\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0430\u044F \u0418\u043C\u043F\u0435\u0440\u0438\u044F - \u041F\u0440\u0435\u043C\u0438\u0443\u043C Idle \u0418\u0433\u0440\u0430"
    };
    document.title = pageTitles[lang] || pageTitles.he;
    const metaDescriptions = {
      he: "\u05D4\u05E4\u05D5\u05DA \u05DE\u05D8\u05D9\u05D9\u05E7\u05D5\u05DF \u05DE\u05EA\u05D7\u05D9\u05DC \u05DC\u05DE\u05E0\u05D4\u05DC \u05D0\u05D9\u05DE\u05E4\u05E8\u05D9\u05D9\u05EA \u05D1\u05E0\u05E7\u05D9\u05DD \u05E2\u05D5\u05DC\u05DE\u05D9\u05EA. \u05DE\u05E9\u05D7\u05E7 \u05E7\u05DC\u05D9\u05DC \u05D5\u05DE\u05DE\u05DB\u05E8 \u05E2\u05DD \u05D2\u05E8\u05E4\u05D9\u05E7\u05D4 \u05D9\u05D5\u05E7\u05E8\u05EA\u05D9\u05EA, \u05E9\u05D3\u05E8\u05D5\u05D2\u05D9\u05DD, \u05DE\u05E0\u05D4\u05DC\u05D9\u05DD \u05D5\u05E1\u05E0\u05D9\u05E4\u05D9\u05DD \u05D1\u05E8\u05D7\u05D1\u05D9 \u05D4\u05E2\u05D5\u05DC\u05DD!",
      en: "Go from a starting tycoon to the manager of a global bank empire. An easy and addictive game with premium graphics, upgrades, managers, and branches worldwide!",
      es: "Pasa de ser un magnate principiante a dirigir un imperio bancario global. \xA1Un juego f\xE1cil y adictivo con gr\xE1ficos premium, mejoras, gerentes y sucursales en todo el mundo!",
      ru: "\u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u043F\u0443\u0442\u044C \u043E\u0442 \u043D\u0430\u0447\u0438\u043D\u0430\u044E\u0449\u0435\u0433\u043E \u043C\u0430\u0433\u043D\u0430\u0442\u0430 \u0434\u043E \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0435\u0433\u043E \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u043E\u0439 \u0431\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u043E\u0439 \u0438\u043C\u043F\u0435\u0440\u0438\u0435\u0439. \u041B\u0435\u0433\u043A\u0430\u044F \u0438 \u0437\u0430\u0445\u0432\u0430\u0442\u044B\u0432\u0430\u044E\u0449\u0430\u044F \u0438\u0433\u0440\u0430 \u0441 \u043F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u043E\u0439 \u0433\u0440\u0430\u0444\u0438\u043A\u043E\u0439, \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044F\u043C\u0438, \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430\u043C\u0438 \u0438 \u0444\u0438\u043B\u0438\u0430\u043B\u0430\u043C\u0438 \u043F\u043E \u0432\u0441\u0435\u043C\u0443 \u043C\u0438\u0440\u0443!"
    };
    const metaDescEl = document.querySelector('meta[name="description"]');
    if (metaDescEl) {
      metaDescEl.setAttribute("content", metaDescriptions[lang] || metaDescriptions.he);
    }
    const tObj = translations[lang];
    if (!tObj) return;
    if (DOM_CACHE.appTitle) DOM_CACHE.appTitle.innerText = tObj.appName;
    const themeLabelBlue = document.getElementById("theme-label-blue");
    if (themeLabelBlue) themeLabelBlue.innerText = tObj.themeBlue || "Blue";
    const themeLabelWhite = document.getElementById("theme-label-white");
    if (themeLabelWhite) themeLabelWhite.innerText = tObj.themeWhite || "Light";
    const themeLabelDark = document.getElementById("theme-label-dark");
    if (themeLabelDark) themeLabelDark.innerText = tObj.themeDark || "Dark";
    const branchIdx = window.game && window.game.state ? window.game.state.currentBranch || 0 : 0;
    const branchName = tObj.branches && tObj.branches.names && tObj.branches.names[branchIdx] || window.game && window.game.branches && window.game.branches[branchIdx] && window.game.branches[branchIdx].name || (tObj.branchLabel || "Branch") + " " + (branchIdx + 1);
    const branchEl = DOM_CACHE.branchName || document.getElementById("branch-name");
    if (branchEl) {
      branchEl.innerText = (tObj.bankPrefix || "") + branchName;
    }
    const vaultData = window.game && typeof window.game.getVaultRenderData === "function" ? window.game.getVaultRenderData() : { fillPercent: 0 };
    const vaultProgressEl = DOM_CACHE.vaultProgressLabel || document.getElementById("vault-progress-label");
    if (vaultProgressEl) {
      vaultProgressEl.innerText = typeof tObj.vaultProgressLabel === "function" ? tObj.vaultProgressLabel(vaultData.fillPercent) : `${vaultData.fillPercent}%`;
    }
    const headerDailyEl = DOM_CACHE.headerDailyBtn || document.getElementById("header-daily-btn");
    if (headerDailyEl) {
      const dTitle = tObj.headerDailyBtnTitle || tObj.tab_achievements || "Achievements";
      headerDailyEl.title = dTitle;
      headerDailyEl.setAttribute("aria-label", dTitle);
    }
    const boostTimerPillEl = DOM_CACHE.boostLiveTimerPill || document.getElementById("boost-live-timer-pill");
    if (boostTimerPillEl) {
      boostTimerPillEl.title = tObj.boostLiveTimerTitle || "Booster time remaining";
    }
    if (DOM_CACHE.labelCash) DOM_CACHE.labelCash.innerText = tObj.cashLabel;
    const eventCashLabel = document.getElementById("event-cash-label");
    if (eventCashLabel) eventCashLabel.innerText = tObj.cashBalance || "Cash Balance:";
    if (DOM_CACHE.labelPerSecond) DOM_CACHE.labelPerSecond.innerText = tObj.perSecond;
    if (DOM_CACHE.labelShares) DOM_CACHE.labelShares.innerText = tObj.sharesLabel;
    const hudCashLabel = document.querySelector("#sticky-balance-bar .label-cash");
    if (hudCashLabel) hudCashLabel.innerText = tObj.hudCash || tObj.cashLabel || "CASH";
    const hudEpsLabel = document.querySelector("#sticky-balance-bar .label-eps");
    if (hudEpsLabel) hudEpsLabel.innerText = tObj.hudIncome || tObj.perSecond || "INCOME / SEC";
    const hudSharesLabel = document.querySelector("#sticky-balance-bar .label-shares");
    if (hudSharesLabel) hudSharesLabel.innerText = tObj.hudShares || tObj.sharesLabel || "SHARES";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (tObj && tObj[key] !== void 0) {
        el.innerText = tObj[key];
      }
    });
    if (DOM_CACHE.labelMultiplier) DOM_CACHE.labelMultiplier.innerText = tObj.multiplier;
    if (DOM_CACHE.labelSimulatorTitle) DOM_CACHE.labelSimulatorTitle.innerText = tObj.simulatorTitle;
    if (DOM_CACHE.labelPanelBadge) DOM_CACHE.labelPanelBadge.innerText = tObj.activeFlow;
    if (DOM_CACHE.labelAdvTitle) DOM_CACHE.labelAdvTitle.innerText = tObj.advTitle;
    if (DOM_CACHE.labelAdvLimitOff) DOM_CACHE.labelAdvLimitOff.innerText = tObj.advValueOff;
    if (DOM_CACHE.labelVaultTitle) DOM_CACHE.labelVaultTitle.innerText = tObj.vaultTitle;
    if (DOM_CACHE.labelVaultLoading) DOM_CACHE.labelVaultLoading.innerText = tObj.vaultLoading;
    if (DOM_CACHE.vaultEmptyBtn) DOM_CACHE.vaultEmptyBtn.innerText = tObj.collectVault;
    if (DOM_CACHE.labelVaultSubtitle) DOM_CACHE.labelVaultSubtitle.innerText = tObj.vaultSubtitle;
    if (DOM_CACHE.labelVaultYieldTitle) DOM_CACHE.labelVaultYieldTitle.innerText = tObj.vaultYieldTitle;
    if (DOM_CACHE.labelVaultYieldSub) DOM_CACHE.labelVaultYieldSub.innerText = tObj.vaultYieldSub;
    if (DOM_CACHE.labelVaultCapTitle) DOM_CACHE.labelVaultCapTitle.innerText = tObj.vaultCapLabel || tObj.vaultCap;
    if (DOM_CACHE.labelVaultVolumeTitle) DOM_CACHE.labelVaultVolumeTitle.innerText = tObj.vaultVolume;
    if (DOM_CACHE.labelCollectVaultBtn) DOM_CACHE.labelCollectVaultBtn.innerText = tObj.collectVault;
    const updateTabLabel = (btn, text) => {
      if (!btn) return;
      const lbl = btn.querySelector(".tab-label");
      const cleanText = text.replace(/🏆|📅|📆/g, "").trim();
      if (lbl) lbl.innerText = cleanText;
      else btn.innerText = cleanText;
    };
    updateTabLabel(DOM_CACHE.tabBtnUpgrades, tObj.tabUpgrades);
    updateTabLabel(DOM_CACHE.tabBtnManagers, tObj.tabManagers);
    updateTabLabel(DOM_CACHE.tabBtnDepartments, tObj.tabDepartments);
    updateTabLabel(DOM_CACHE.tabBtnMissions, tObj.tabMissions);
    updateTabLabel(DOM_CACHE.tabBtnBranches, tObj.tabBranches);
    const bnavMap = {
      "upgrades": tObj.tabUpgrades,
      "managers": tObj.tabManagers,
      "departments": tObj.tabDepartments,
      "missions": tObj.tabMissions,
      "daily": tObj.dailyTabBtn,
      "branches": tObj.tabBranches
    };
    document.querySelectorAll(".bottom-nav-btn").forEach((btn) => {
      const lbl = btn.querySelector(".bnav-label");
      if (lbl && bnavMap[btn.dataset.tab]) {
        const cleanLbl = bnavMap[btn.dataset.tab].replace(/🏆|📅|📆/g, "").trim();
        lbl.textContent = cleanLbl;
        btn.setAttribute("aria-label", cleanLbl);
      }
    });
    if (DOM_CACHE.bottomNav) DOM_CACHE.bottomNav.setAttribute("aria-label", tObj.bottomNavLabel || "Bottom navigation");
    const tabBtnDaily = document.getElementById("tab-btn-daily");
    if (tObj.dailyTabBtn) updateTabLabel(tabBtnDaily, tObj.dailyTabBtn);
    if (DOM_CACHE.labelFooter) {
      const flavorEl = document.getElementById("footer-flavor");
      if (flavorEl) {
        const flavors = tObj.footer_flavors;
        if (flavors && flavors.length) {
          if (window._footerFlavorInterval) clearInterval(window._footerFlavorInterval);
          let fi = 0;
          flavorEl.textContent = flavors[fi];
          window._footerFlavorInterval = setInterval(function() {
            fi = (fi + 1) % flavors.length;
            flavorEl.textContent = flavors[fi];
          }, 8e3);
        } else {
          flavorEl.textContent = tObj.footerText;
        }
      } else {
        DOM_CACHE.labelFooter.innerText = tObj.footerText;
      }
    }
    if (DOM_CACHE.bulkLabelText) {
      DOM_CACHE.bulkLabelText.innerText = tObj.bulkLabel;
    }
    if (DOM_CACHE.offlineModalTitle) DOM_CACHE.offlineModalTitle.innerText = tObj.offlineModalTitle;
    if (DOM_CACHE.offlineModalText) DOM_CACHE.offlineModalText.innerText = tObj.offlineModalText;
    if (DOM_CACHE.offlineModalDoubleBtn) DOM_CACHE.offlineModalDoubleBtn.innerText = tObj.offlineDoubleBtn;
    if (DOM_CACHE.offlineModalClaimBtn) DOM_CACHE.offlineModalClaimBtn.innerText = tObj.offlineClaimBtn;
    if (DOM_CACHE.langModalTitle) DOM_CACHE.langModalTitle.innerText = tObj.langModalTitle;
    if (DOM_CACHE.langModalText) DOM_CACHE.langModalText.innerText = tObj.langModalText;
    if (DOM_CACHE.langModalClose) DOM_CACHE.langModalClose.innerText = tObj.langModalClose;
    if (DOM_CACHE.settingsDangerTitle) {
      const base = (tObj.dangerZoneTitle || "\u05D0\u05D6\u05D5\u05E8 \u05DE\u05E1\u05D5\u05DB\u05DF").replace("\u26A0\uFE0F", "").trim();
      DOM_CACHE.settingsDangerTitle.innerHTML = `${base} <span aria-hidden="true">\u26A0\uFE0F</span>`;
    }
    if (DOM_CACHE.settingsThemeTitle) DOM_CACHE.settingsThemeTitle.innerText = tObj.themeTitle || "\u05D1\u05D7\u05E8 \u05E6\u05D1\u05E2 \u05E8\u05E7\u05E2";
    const hapticsLabel = document.getElementById("settings-haptics-label");
    if (hapticsLabel) {
      hapticsLabel.innerText = tObj.settingsHapticsLabel || "\u05E8\u05D8\u05D8 \u05D1\u05DE\u05D2\u05E2";
    }
    const notifLabel = document.getElementById("settings-notif-label");
    if (notifLabel) {
      notifLabel.innerText = tObj.settingsNotifLabel || "\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D3\u05D7\u05D9\u05E4\u05D4";
    }
    if (DOM_CACHE.resetBtn) {
      const base = (tObj.resetGameBtn || "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DE\u05E9\u05D7\u05E7 \u05DE\u05D5\u05D7\u05DC\u05D8").replace("\u26A0\uFE0F", "").trim();
      DOM_CACHE.resetBtn.innerHTML = `<span aria-hidden="true">\u26A0\uFE0F</span> ${base}`;
    }
    if (DOM_CACHE.resetConfirmLabel) DOM_CACHE.resetConfirmLabel.innerText = tObj.resetConfirmLabel || "I confirm full reset";
    const gdprTextEl = document.getElementById("gdpr-text");
    if (gdprTextEl) gdprTextEl.innerText = tObj.gdprText || "Your data is stored on your device only.";
    const gdprAcceptEl = document.getElementById("gdpr-accept-btn");
    if (gdprAcceptEl) gdprAcceptEl.innerText = tObj.gdprAcceptBtn || "Got it \u2713";
    const gdprPrivacyLinkEl = document.getElementById("gdpr-privacy-link");
    if (gdprPrivacyLinkEl) gdprPrivacyLinkEl.innerText = tObj.privacyPolicyLink || "\u{1F512} Privacy Policy";
    const gdprTermsLinkEl = document.getElementById("gdpr-terms-link");
    if (gdprTermsLinkEl) gdprTermsLinkEl.innerText = tObj.termsOfServiceLink || "\u{1F4DC} Terms of Service";
    const settingsPrivacyLink = document.getElementById("settings-privacy-link");
    if (settingsPrivacyLink) settingsPrivacyLink.innerText = tObj.privacyPolicyLink || "\u{1F512} Privacy Policy";
    const settingsTermsLink = document.getElementById("settings-terms-link");
    if (settingsTermsLink) settingsTermsLink.innerText = tObj.termsOfServiceLink || "\u{1F4DC} Terms of Service";
    const analyticsBtnText = document.getElementById("analytics-btn-text");
    if (analyticsBtnText) analyticsBtnText.innerText = tObj.analyticsShortcutBtn ? tObj.analyticsShortcutBtn.replace("\u{1F4CA} ", "") : "\u05D3\u05D5\u05D7 \u05DE\u05D3\u05D3\u05D9\u05DD \u05D5\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05D4";
    const elLangOptions = document.querySelectorAll(".lang-option-card");
    elLangOptions.forEach((opt) => {
      if (opt.getAttribute("data-lang") === lang) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
    const activeTabEl = document.querySelector(".tab-btn.active");
    const activeTab = activeTabEl ? activeTabEl.getAttribute("data-tab") : "upgrades";
    if (typeof window.invalidateTabHashes === "function") window.invalidateTabHashes();
    if (activeTab === "upgrades" && typeof window.renderUpgradesTab === "function") window.renderUpgradesTab();
    else if (activeTab === "managers" && typeof window.renderManagersTab === "function") window.renderManagersTab();
    else if (activeTab === "departments" && typeof window.renderDepartmentsTab === "function") window.renderDepartmentsTab();
    else if (activeTab === "missions" && typeof window.renderMissionsTab === "function") window.renderMissionsTab();
    else if (activeTab === "branches" && typeof window.renderBranchesTab === "function") window.renderBranchesTab();
    else if (activeTab === "daily") {
      if (typeof window.renderDailyChallengesSection === "function") window.renderDailyChallengesSection();
      if (typeof window.renderAchievementsTab === "function") window.renderAchievementsTab();
    }
    if (DOM_CACHE.labelAdvControl) DOM_CACHE.labelAdvControl.title = tObj.tooltips.adv;
    if (DOM_CACHE.vaultGraphic) {
      DOM_CACHE.vaultGraphic.title = tObj.tooltips.vault;
      DOM_CACHE.vaultGraphic.setAttribute("aria-label", tObj.tooltips.vault);
    }
    if (DOM_CACHE.vaultGraphicLabel) DOM_CACHE.vaultGraphicLabel.innerText = tObj.vaultBankLabel || "BANK";
    if (DOM_CACHE.vaultMiniLabel) DOM_CACHE.vaultMiniLabel.innerText = tObj.vaultMiniLabel || "Vault";
    if (DOM_CACHE.cashLiveBadge) DOM_CACHE.cashLiveBadge.innerText = tObj.cashLiveBadge || "\u25CF LIVE";
    if (DOM_CACHE.skipLink) DOM_CACHE.skipLink.innerText = tObj.skipLinkText || "Skip to content";
    if (DOM_CACHE.analyticsBtn) {
      DOM_CACHE.analyticsBtn.title = tObj.analyticsBtnTitle || "Metrics & Analytics";
      DOM_CACHE.analyticsBtn.setAttribute("aria-label", tObj.analyticsBtnTitle || "Metrics & Analytics");
    }
    if (DOM_CACHE.boostBtn) {
      DOM_CACHE.boostBtn.title = tObj.boostBtnTitle || "2x Income Booster";
      DOM_CACHE.boostBtn.setAttribute("aria-label", tObj.boostBtnTitle || "2x Income Booster");
    }
    if (DOM_CACHE.vaultInfoBtn) {
      DOM_CACHE.vaultInfoBtn.title = tObj.vaultInfoBtnTitle || "Vault interest info";
      DOM_CACHE.vaultInfoBtn.setAttribute("aria-label", tObj.vaultInfoBtnTitle || "Vault interest info");
    }
    const fortuneBadge = document.getElementById("fortune-wheel-badge");
    if (fortuneBadge) {
      fortuneBadge.innerText = tObj.wheelBadgeFree || "\u05D7\u05D9\u05E0\u05DD";
    }
    if (DOM_CACHE.fortuneWheelBtn) {
      DOM_CACHE.fortuneWheelBtn.title = tObj.fortuneWheelTitle || "Daily Fortune Wheel";
      DOM_CACHE.fortuneWheelBtn.setAttribute("aria-label", tObj.fortuneWheelTitle || "Daily Fortune Wheel");
    }
    if (DOM_CACHE.langBtn) DOM_CACHE.langBtn.setAttribute("aria-label", tObj.langModalTitle || "Settings & Language");
    if (DOM_CACHE.vaultMiniBtn) {
      DOM_CACHE.vaultMiniBtn.innerText = tObj.vaultMiniCollectBtn || "\u{1F4B0} Collect";
      DOM_CACHE.vaultMiniBtn.setAttribute("aria-label", tObj.tooltips.vault);
    }
    if (DOM_CACHE.doubleIncomeLabel) DOM_CACHE.doubleIncomeLabel.innerText = tObj.doubleIncomeLabel || "Double Income";
    if (DOM_CACHE.analyticsFromSettingsBtn) DOM_CACHE.analyticsFromSettingsBtn.innerText = tObj.analyticsShortcutBtn || "\u{1F4CA} Analytics Summary";
    if (DOM_CACHE.footerPrivacyLink) DOM_CACHE.footerPrivacyLink.innerText = tObj.footerPrivacyLink || "Privacy Policy";
    if (DOM_CACHE.footerTermsLink) DOM_CACHE.footerTermsLink.innerText = tObj.footerTermsLink || "Terms of Service";
    if (DOM_CACHE.controlPanelSection) DOM_CACHE.controlPanelSection.setAttribute("aria-label", tObj.controlPanelLabel || "Control Panel & Upgrades");
    if (DOM_CACHE.controlPanelSrHeading) DOM_CACHE.controlPanelSrHeading.innerText = tObj.controlPanelLabel || "Control Panel & Upgrades";
    if (DOM_CACHE.tabsNav) DOM_CACHE.tabsNav.setAttribute("aria-label", tObj.tabsNavLabel || "Internal navigation menu");
    if (DOM_CACHE.vaultEmptyBtn) DOM_CACHE.vaultEmptyBtn.setAttribute("aria-label", tObj.collectVault);
    if (DOM_CACHE.cash) DOM_CACHE.cash.setAttribute("aria-label", tObj.cashLabel);
    if (DOM_CACHE.vaultMiniIcon) DOM_CACHE.vaultMiniIcon.setAttribute("alt", tObj.vaultMiniLabel || "Vault");
    if (DOM_CACHE.vaultMiniFillEl) DOM_CACHE.vaultMiniFillEl.setAttribute("aria-label", tObj.vaultMiniFillLabel || "Side vault fill");
    if (DOM_CACHE.bankFloorSection) DOM_CACHE.bankFloorSection.setAttribute("aria-label", tObj.bankFloorLabel || "Bank branch view");
    if (DOM_CACHE.queueFillBar) DOM_CACHE.queueFillBar.setAttribute("aria-label", tObj.queueAriaLabel || "Customer queue");
    if (DOM_CACHE.advSlider) DOM_CACHE.advSlider.setAttribute("aria-label", tObj.advSliderLabel || "Ad campaign budget");
    const updateElText = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== void 0) el.innerText = val;
    };
    updateElText("weekly-modal-title", tObj.weeklyTitle);
    updateElText("weekly-modal-text", tObj.weeklyText);
    updateElText("weekly-ad-btn-text", tObj.weeklyAdBtn);
    const updateElHtml = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== void 0) el.innerHTML = val;
    };
    updateElText("weekly-lbl-eps", tObj.weeklyEpsLabel);
    updateElText("weekly-lbl-clients", tObj.weeklyClientsLabel);
    updateElText("weekly-lbl-shares", tObj.weeklySharesLabel);
    updateElHtml("weekly-btn-reward-title", tObj.weeklyRewardBtnTitle);
    updateElHtml("weekly-btn-reward-sub", tObj.weeklyRewardBtnSub);
    updateElText("weekly-dismiss-main", tObj.weeklyDismissMain);
    updateElText("weekly-dismiss-sub", tObj.weeklyDismissSub);
    updateElText("login-reward-title-text", tObj.dailyRewardTitle);
    updateElText("login-reward-desc", tObj.dailyRewardCashDesc);
    updateElText("login-reward-collect-text", tObj.dailyRewardCollectBtn);
    updateElText("offline-modal-title", tObj.offlineModalTitle);
    updateElText("offline-modal-text", tObj.offlineModalText);
    updateElText("offline-double-btn", tObj.offlineDoubleBtn);
    updateElText("offline-claim-btn", tObj.offlineClaimBtn);
    updateElText("lang-modal-title-text", tObj.langModalTitle);
    updateElText("lang-modal-text", tObj.langModalText);
    updateElText("lang-modal-close-text", tObj.settingsClose || tObj.langModalClose);
    updateElText("settings-theme-title-text", tObj.themeTitle);
    updateElText("settings-haptics-label", tObj.settingsHapticsLabel);
    updateElText("settings-notif-label", tObj.settingsNotifLabel);
    updateElText("settings-danger-title-text", (tObj.dangerZoneTitle || "").replace("\u26A0\uFE0F", "").trim());
    updateElText("reset-confirm-label", tObj.resetConfirmLabel);
    updateElText("reset-btn-text", (tObj.resetGameBtn || "").replace("\u26A0\uFE0F", "").trim());
    updateElText("prestige-modal-title", tObj.prestigeModalTitle);
    updateElText("prestige-modal-text", tObj.branches && tObj.branches.prestigeDesc ? tObj.branches.prestigeDesc : tObj.prestigeModalText || "Reset progress in this branch to claim Golden Shares.");
    updateElText("prestige-reward-label", tObj.prestigeRewardLabel);
    updateElText("prestige-regular-btn", tObj.prestigeRegularBtn);
    updateElText("prestige-cancel-btn", tObj.cancelBtn || tObj.prestigeCancelBtn || "Cancel");
    updateElText("analytics-modal-title", tObj.analyticsModalTitle);
    updateElText("analytics-modal-title-text", tObj.analyticsModalTitle);
    updateElText("analytics-branch-name-live", tObj.analyticsLiveHeader || "Live Real-Time Data");
    updateElText("analytics-title-general", tObj.analyticsTitleGeneral);
    updateElText("analytics-label-eps", tObj.analyticsLabelEps);
    updateElText("analytics-label-vault", tObj.analyticsLabelVault);
    updateElText("analytics-title-tellers", tObj.analyticsTitleTellers);
    updateElText("analytics-title-ops", tObj.analyticsOpsFlowTitle || "Operations Chain Balance");
    updateElText("analytics-title-warnings", tObj.analyticsTitleWarnings);
    updateElText("analytics-close-btn", tObj.analyticsCloseBtn || tObj.close || "Close");
    updateElText("fortune-wheel-title", tObj.fortuneWheelTitle);
    updateElText("fortune-wheel-title-text", tObj.fortuneWheelTitle);
    updateElText("fortune-wheel-subtitle", tObj.fortuneWheelSubtitle);
    updateElText("fortune-spin-hint", tObj.fortuneWheelSpinHint || tObj.fortuneSpinHint);
    updateElText("fortune-spin-btn", tObj.fortuneWheelSpinBtn || tObj.fortuneSpinBtn);
    updateElText("fortune-ad-spin-text", tObj.fortuneWheelAdSpinBtn || tObj.fortuneAdSpinBtn);
    updateElText("fortune-hub-text", tObj.fortuneWheelSpinHub || "SPIN");
    updateElText("fortune-close-btn", tObj.fortuneWheelClose || tObj.fortuneCloseBtn);
    updateElText("discovery-tip-btn", tObj.gotItBtn);
    updateMuteButton();
    rebuildTellersDOM();
    draw();
  }
  function applyTheme(themeName) {
    const root = document.documentElement;
    if (themeName === "white") {
      root.style.setProperty("--bg-color", "#faf9f6");
      root.style.setProperty("--surface-color", "rgba(244, 242, 237, 0.92)");
      root.style.setProperty("--surface-hover", "rgba(255, 255, 255, 0.98)");
      root.style.setProperty("--border-color", "rgba(184, 134, 11, 0.25)");
      root.style.setProperty("--border-glow", "rgba(184, 134, 11, 0.08)");
      root.style.setProperty("--text-main", "#2c2a25");
      root.style.setProperty("--text-muted", "#7a766a");
      root.style.setProperty("--glass-blur", "blur(12px)");
      document.body.style.backgroundImage = "radial-gradient(at 0% 0%, rgba(212, 175, 55, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(250, 249, 246, 1) 0px, transparent 100%)";
    } else if (themeName === "blue") {
      root.style.setProperty("--bg-color", "#080c1d");
      root.style.setProperty("--surface-color", "rgba(13, 22, 54, 0.78)");
      root.style.setProperty("--surface-hover", "rgba(20, 32, 75, 0.92)");
      root.style.setProperty("--border-color", "rgba(223, 171, 41, 0.22)");
      root.style.setProperty("--border-glow", "rgba(223, 171, 41, 0.12)");
      root.style.setProperty("--text-main", "#f3f4f6");
      root.style.setProperty("--text-muted", "#9ca3af");
      root.style.setProperty("--glass-blur", "blur(16px)");
      document.body.style.backgroundImage = "radial-gradient(at 0% 0%, rgba(223, 171, 41, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.06) 0px, transparent 50%)";
    } else {
      root.style.setProperty("--bg-color", "#06070a");
      root.style.setProperty("--surface-color", "rgba(13, 15, 23, 0.82)");
      root.style.setProperty("--surface-hover", "rgba(22, 25, 38, 0.95)");
      root.style.setProperty("--border-color", "rgba(168, 85, 247, 0.35)");
      root.style.setProperty("--border-glow", "rgba(223, 171, 41, 0.25)");
      root.style.setProperty("--text-main", "#f3f4f6");
      root.style.setProperty("--text-muted", "#9ca3af");
      root.style.setProperty("--glass-blur", "blur(12px)");
      document.body.style.backgroundImage = "radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(223, 171, 41, 0.12) 0px, transparent 50%)";
    }
    document.querySelectorAll(".theme-option-btn-choice").forEach((btn) => {
      if (btn.getAttribute("data-theme") === themeName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    try {
      window.localStorage.setItem("idle_bank_theme", themeName);
    } catch (e) {
      console.warn("Could not save theme preference:", e);
    }
  }

  // ui/events/purchase-feedback.js
  function triggerMilestoneConfetti(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const container = document.getElementById("floating-container") || document.body;
    const colors = ["#dfab29", "#ffd700", "#10b981", "#3b82f6", "#ec4899", "#a855f7"];
    const MAX_CONFETTI = window.innerWidth <= 768 ? 15 : 30;
    const particles = [];
    for (let i = 0; i < MAX_CONFETTI; i++) {
      const particle = document.createElement("div");
      particle.className = "confetti-particle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 110;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - (30 + Math.random() * 40);
      particle.style.setProperty("--dx", `${dx}px`);
      particle.style.setProperty("--dy", `${dy}px`);
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      const size = 5 + Math.random() * 6;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      if (Math.random() > 0.5) {
        particle.style.borderRadius = "0px";
      }
      container.appendChild(particle);
      particles.push(particle);
    }
    setTimeout(() => particles.forEach((p) => p.remove()), 1200);
  }
  function handlePurchaseFeedback2(btn, e, beforeCash, beforeLevelOrUnlocked, type, extraId) {
    const afterCash = game.state.cash;
    const spent = beforeCash - afterCash;
    let afterLevelOrUnlocked = false;
    let isUnlock = false;
    if (type === "teller") {
      afterLevelOrUnlocked = game.state.tellers[extraId].level;
    } else if (type === "guard") {
      afterLevelOrUnlocked = game.state.guards[extraId].level;
    } else if (type === "unlock-teller") {
      afterLevelOrUnlocked = game.state.tellers[extraId].unlocked;
      isUnlock = true;
    } else if (type === "unlock-guard") {
      afterLevelOrUnlocked = game.state.guards[extraId].unlocked;
      isUnlock = true;
    } else if (type === "vault") {
      afterLevelOrUnlocked = game.state.vault.level;
    } else if (type === "queue") {
      afterLevelOrUnlocked = game.state.queueUpgradeLevel;
    } else if (type === "hire-manager") {
      afterLevelOrUnlocked = game.state.managers[extraId];
      isUnlock = true;
    } else if (type === "upgrade-manager") {
      afterLevelOrUnlocked = game.state.managerUpgrades[extraId].level;
    } else if (type === "unlock-dept") {
      const deptObj = game.state.departments.find((d) => d.id === extraId);
      afterLevelOrUnlocked = deptObj ? deptObj.unlocked : false;
      isUnlock = true;
    }
    const rect = btn.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
    const y = e && e.clientY ? e.clientY : rect.top;
    const card = btn.closest(".upgrade-card") || btn.closest(".upg-new-layout") || btn.closest(".mgr-new-layout");
    if (card) {
      card.classList.remove("sparkle-flash");
      void card.offsetWidth;
      card.classList.add("sparkle-flash");
    }
    if (spent > 0) {
      spawnFloating(`-${formatMoney(spent)}`, x, y, "red");
      if (typeof spawnParticles === "function") {
        spawnParticles(x, y, 8, "sparkle");
      }
    }
    if (isUnlock) {
      if (afterLevelOrUnlocked && !beforeLevelOrUnlocked) {
        setTimeout(() => {
          spawnFloating(`UNLOCKED! \u{1F513}`, x, y - 25, "gold");
        }, 150);
      }
    } else {
      const levelDiff = afterLevelOrUnlocked - beforeLevelOrUnlocked;
      if (levelDiff > 0) {
        setTimeout(() => {
          spawnFloating(`LEVEL UP! +${levelDiff} \u26A1`, x, y - 25, "gold");
        }, 150);
        if (type === "teller") {
          const milestones = [10, 25, 50, 100];
          const reached = milestones.find((m) => beforeLevelOrUnlocked < m && afterLevelOrUnlocked >= m);
          if (reached) {
            setTimeout(() => {
              triggerMilestoneConfetti(btn);
              spawnFloating(`MILESTONE Lv ${reached}! \u{1F3C6}\u{1F389}`, x, y - 55, "#dfab29");
              if (typeof rebuildTellersDOM === "function") rebuildTellersDOM();
            }, 250);
          }
        }
      }
    }
  }
  function handleMissionRedirect2(missionType, targetId) {
    let tabName = "upgrades";
    let selector = "";
    switch (missionType) {
      case "upgrade_teller": {
        tabName = "upgrades";
        const tId = targetId !== void 0 ? targetId : 0;
        selector = `.buy-btn[data-type="teller"][data-id="${tId}"], .buy-btn[data-action="unlock-teller"][data-id="${tId}"]`;
        break;
      }
      case "upgrade_guard": {
        tabName = "upgrades";
        const gId = targetId !== void 0 ? targetId : 0;
        selector = `.buy-btn[data-type="guard"][data-id="${gId}"], .buy-btn[data-action="unlock-guard"][data-id="${gId}"]`;
        break;
      }
      case "upgrade_vault":
        tabName = "upgrades";
        selector = "#upgrade-vault-btn";
        break;
      case "clients":
        tabName = "upgrades";
        selector = "#upgrade-queue-btn";
        break;
      case "accumulate_cash":
      case "earn_cash":
      case "earn_eps":
      case "serve_rich_vip":
      case "vip_collector":
      case "spend_cash":
      case "break_the_wall":
        tabName = "upgrades";
        selector = '.buy-btn[data-type="teller"][data-id="0"], .buy-btn[data-action="unlock-teller"][data-id="0"]';
        break;
      case "hire_managers":
      case "manager_hire":
      case "all_managers":
        tabName = "managers";
        selector = ".buy-mgr-btn";
        break;
      case "upgrade_managers":
        tabName = "managers";
        selector = ".upgrade-mgr-btn";
        break;
      case "unlock_departments":
      case "department_unlock":
        tabName = "departments";
        selector = ".dept-action-btn:not(.active)";
        break;
      case "teller_max":
        tabName = "upgrades";
        selector = '.buy-btn[data-type="teller"][data-id="0"], .buy-btn[data-action="unlock-teller"][data-id="0"]';
        break;
      case "guard_trips":
        tabName = "upgrades";
        selector = '.buy-btn[data-type="guard"][data-id="0"]';
        break;
      case "boost_run":
        tabName = "upgrades";
        selector = '.buy-btn[data-type="teller"][data-id="0"]';
        break;
      case "department_grind":
        tabName = "managers";
        selector = `.upgrade-mgr-btn[data-mgr-type="${targetId}"], .buy-mgr-btn[data-mgr="${targetId}"]`;
        break;
      case "missions_veteran":
        tabName = "missions";
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
        const card = targetBtn.closest(".new-upg-wrapper, .upgrade-card, .manager-card, .department-card, .prestige-panel, .gold-upgrade-card");
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("mission-highlight");
          setTimeout(() => {
            card.classList.remove("mission-highlight");
          }, 2500);
        }
      }
    }, 300);
  }

  // ui/tabs/tab-shared.js
  var _buyBtnCache = null;
  var _lastManagersHash = null;
  var _lastBranchesHash = null;
  function setCurrentUpgradeMode(mode) {
    window.currentUpgradeMode = mode;
  }
  function invalidateTabHashes() {
    _lastManagersHash = null;
    _lastBranchesHash = null;
    _buyBtnCache = null;
  }
  function resetBuyBtnCache() {
    _buyBtnCache = null;
  }
  function getBuyBtnCache(container) {
    if (!_buyBtnCache) _buyBtnCache = container.querySelectorAll(".buy-btn");
    return _buyBtnCache;
  }
  function checkManagersHashUnchanged(hash) {
    if (hash && hash === _lastManagersHash) return true;
    _lastManagersHash = hash;
    _buyBtnCache = null;
    return false;
  }
  function checkBranchesHashUnchanged(hash) {
    if (hash && hash === _lastBranchesHash) return true;
    _lastBranchesHash = hash;
    _buyBtnCache = null;
    return false;
  }
  var statLabels = {
    he: {
      satisfaction: "\u05E9\u05D1\u05D9\u05E2\u05D5\u05EA \u05E8\u05E6\u05D5\u05DF",
      client_speed: "\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA",
      auto_vault: "\u05E8\u05D9\u05E7\u05D5\u05DF \u05DB\u05E1\u05E4\u05EA \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9",
      bank_yield: "\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05D4\u05D1\u05E0\u05E7",
      courier_speed: "\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D1\u05DC\u05D3\u05E8\u05D9\u05DD",
      teller_speed: "\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05DB\u05E1\u05E4\u05E8\u05D9\u05DD",
      counter_cap: "\u05E7\u05D9\u05D1\u05D5\u05DC\u05EA \u05E2\u05DE\u05D3\u05D5\u05EA",
      base_income: "\u05E8\u05D5\u05D5\u05D7 \u05D1\u05E1\u05D9\u05E1\u05D9",
      dept_yields: "\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05DE\u05D7\u05DC\u05E7\u05D5\u05EA",
      gold_shares: "\u05DE\u05E0\u05D9\u05D5\u05EA \u05D6\u05D4\u05D1 \u05D1\u05E4\u05E8\u05E1\u05D8\u05D9\u05D2'",
      ad_bonus: "\u05D1\u05D5\u05E0\u05D5\u05E1 \u05E4\u05E8\u05E1\u05D5\u05DD",
      offline_time: "\u05E9\u05E2\u05D5\u05EA \u05D0\u05D5\u05E4\u05DC\u05D9\u05D9\u05DF \u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9\u05D5\u05EA",
      offline_income: "\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA \u05D0\u05D5\u05E4\u05DC\u05D9\u05D9\u05DF",
      hourlyProfit: "\u05E8\u05D5\u05D5\u05D7 \u05E0\u05D5\u05E1\u05E3:",
      perHour: "\u05DC\u05E9\u05E2\u05D4",
      lockedLabel: "\u05E0\u05E2\u05D5\u05DC",
      hireBtn: "\u05D2\u05D9\u05D5\u05E1",
      upgradeBtn: "\u05E9\u05D3\u05E8\u05D2",
      activeLabel: "\u05E4\u05E2\u05D9\u05DC",
      totalYield: "\u05E8\u05D5\u05D5\u05D7 \u05DC\u05E9\u05E0\u05D9\u05D9\u05D4",
      totalUpgrade: '\u05E1\u05D4"\u05DB \u05E9\u05D3\u05E8\u05D5\u05D2',
      unlockCost: "\u05E2\u05DC\u05D5\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4",
      autoText: "\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9",
      maxLabel: "\u05DE\u05E7\u05E1\u05D9\u05DE\u05DC\u05D9",
      bestValue: "\u{1F525} \u05D4\u05DB\u05D9 \u05DE\u05E9\u05EA\u05DC\u05DD"
    },
    en: {
      satisfaction: "Satisfaction",
      client_speed: "Client Speed",
      auto_vault: "Auto Vault Collect",
      bank_yield: "Bank Yield",
      courier_speed: "Courier Speed",
      teller_speed: "Teller Speed",
      counter_cap: "Desk Capacity",
      base_income: "Base Yield",
      dept_yields: "Dept Yields",
      gold_shares: "Prestige Gold Shares",
      ad_bonus: "Ad Campaign Boost",
      offline_time: "Max Offline Hours",
      offline_income: "Offline Income",
      hourlyProfit: "Extra Yield:",
      perHour: "/ hr",
      lockedLabel: "Locked",
      hireBtn: "Hire",
      upgradeBtn: "Upgrade",
      activeLabel: "Active",
      totalYield: "Total Yield",
      totalUpgrade: "Total Upgrade",
      unlockCost: "Unlock Cost",
      autoText: "Auto",
      maxLabel: "Maximum",
      bestValue: "\u{1F525} Best Value"
    },
    es: {
      satisfaction: "Satisfacci\xF3n",
      client_speed: "Vel. de Clientes",
      auto_vault: "Recogida de Caja Auto",
      bank_yield: "Rendimiento del Banco",
      courier_speed: "Vel. de Courier",
      teller_speed: "Vel. de Cajeros",
      counter_cap: "Capacidad de Desk",
      base_income: "Rendimiento Base",
      dept_yields: "Ingresos de Depts",
      gold_shares: "Acciones de Oro",
      ad_bonus: "Bono de Publicidad",
      offline_time: "Horas Offline M\xE1x",
      offline_income: "Ingresos Offline",
      hourlyProfit: "Rendimiento Extra:",
      perHour: "/ h",
      lockedLabel: "Bloqueado",
      hireBtn: "Contratar",
      upgradeBtn: "Mejorar",
      activeLabel: "Activo",
      totalYield: "Rendimiento Total",
      totalUpgrade: "Total Mejora",
      unlockCost: "Costo de Apertura",
      autoText: "Auto",
      maxLabel: "M\xE1ximo",
      bestValue: "\u{1F525} Mejor Oferta"
    },
    ru: {
      satisfaction: "\u0423\u0434\u043E\u0432\u043B\u0435\u0442\u0432\u043E\u0440\u0435\u043D\u0438\u0435",
      client_speed: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432",
      auto_vault: "\u0410\u0432\u0442\u043E-\u0441\u0431\u043E\u0440 \u0441\u0435\u0439\u0444\u0430",
      bank_yield: "\u0414\u043E\u0445\u043E\u0434 \u0431\u0430\u043D\u043A\u0430",
      courier_speed: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043A\u0443\u0440\u044C\u0435\u0440\u043E\u0432",
      teller_speed: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043A\u0430\u0441\u0441\u0438\u0440\u043E\u0432",
      counter_cap: "\u041B\u0438\u043C\u0438\u0442 \u043A\u0430\u0441\u0441",
      base_income: "\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u0434\u043E\u0445\u043E\u0434",
      dept_yields: "\u0414\u043E\u0445\u043E\u0434 \u043E\u0442\u0434\u0435\u043B\u043E\u0432",
      gold_shares: "\u0417\u043E\u043B\u043E\u0442\u044B\u0435 \u0430\u043A\u0446\u0438\u0438",
      ad_bonus: "\u0411\u043E\u043D\u0443\u0441 \u0440\u0435\u043A\u043B\u0430\u043C\u044B",
      offline_time: "\u041C\u0430\u043A\u0441. \u0447\u0430\u0441\u043E\u0432 \u043E\u0444\u0444\u043B\u0430\u0439\u043D",
      offline_income: "\u041E\u0444\u0444\u043B\u0430\u0439\u043D \u0434\u043E\u0445\u043E\u0434",
      hourlyProfit: "\u0414\u043E\u043F. \u0434\u043E\u0445\u043E\u0434:",
      perHour: "/ \u0447",
      lockedLabel: "\u0417\u0430\u043A\u0440\u044B\u0442\u043E",
      hireBtn: "\u041D\u0430\u043D\u044F\u0442\u044C",
      upgradeBtn: "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u044C",
      activeLabel: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E",
      totalYield: "\u041E\u0431\u0449\u0438\u0439 \u0434\u043E\u0445\u043E\u0434",
      totalUpgrade: "\u0418\u0442\u043E\u0433\u043E \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439",
      unlockCost: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F",
      autoText: "\u0410\u0432\u0442\u043E",
      maxLabel: "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C",
      bestValue: "\u{1F525} \u041B\u0443\u0447\u0448\u0430\u044F \u0446\u0435\u043D\u0430"
    }
  };
  function createSeparator(container) {
    const hr = document.createElement("hr");
    hr.style.border = "0";
    hr.style.borderTop = "1px solid var(--border-color)";
    container.appendChild(hr);
  }
  function buildEntityCard(type, entity, lang, tObj, currentUpgradeMode) {
    const card = document.createElement("div");
    card.className = "upgrade-card";
    const id = entity.id;
    if (entity.unlocked) {
      const details = game.getBulkUpgradeDetails(type, id, window.currentUpgradeMode, entity.level, game.state.cash);
      const levelsToBuy = details.levels;
      const nextLevel = entity.level + levelsToBuy;
      const cost = details.cost;
      let capacity, speed, nextCapacity, nextSpeed, title, desc, speedLabel, capLabel;
      let avatarBgUrl = "", avatarBgPos = "center 25%", avatarBgSize = "cover";
      if (type === "teller") {
        capacity = game.getTellerCapacity(entity.level);
        speed = game.getTellerSpeed(entity.level).toFixed(1);
        nextCapacity = game.getTellerCapacity(nextLevel);
        nextSpeed = game.getTellerSpeed(nextLevel).toFixed(1);
        avatarBgUrl = `images/teller-${id % 8 + 1}.png`;
        avatarBgPos = "center center";
        avatarBgSize = "cover";
        title = tObj.tellerTitle(id + 1, entity.level);
        desc = tObj.tellerDesc;
        speedLabel = tObj.tellerSpeed;
        capLabel = tObj.tellerCap;
      } else {
        capacity = game.getGuardCapacity(entity.level);
        speed = game.getGuardSpeed(entity.level).toFixed(1);
        nextCapacity = game.getGuardCapacity(nextLevel);
        nextSpeed = game.getGuardSpeed(nextLevel).toFixed(1);
        avatarBgUrl = "images/guard.png";
        avatarBgPos = "center center";
        avatarBgSize = "contain";
        title = tObj.guardTitle(id + 1, entity.level);
        desc = tObj.guardDesc;
        speedLabel = tObj.guardSpeed;
        capLabel = tObj.guardCap;
      }
      const canBuy = details.canAfford;
      const tellerMaxLvl = type === "teller" ? typeof GAME_CONFIG !== "undefined" && GAME_CONFIG.getTellerTieredMaxLevel ? GAME_CONFIG.getTellerTieredMaxLevel(id) : ((Number(id) || 0) + 1) * 100 : null;
      const isTellerMax = type === "teller" && entity.level >= tellerMaxLvl;
      card.className = "upgrade-card premium-upg-card";
      let eps = 0, nextEps = 0;
      if (type === "teller") {
        const reward = game.economyManager.getCurrentBaseReward() * (game.economyManager.getTotalMultiplier() || 1);
        eps = reward / speed;
        nextEps = reward / nextSpeed;
      }
      card.innerHTML = `
            <div class="upg-v2-avatar-large" style="background-image: url('${avatarBgUrl}'); background-position: ${avatarBgPos}; background-size: ${avatarBgSize};"></div>
            <div class="upg-v2-content-overlay">
                <div class="upg-v2-header-row">
                    <div class="upg-v2-badge">${type === "teller" ? translations[lang].tellerLabel || "\u05DB\u05E1\u05E4\u05E8" : translations[lang].guardLabel || "\u05E9\u05D5\u05DE\u05E8"} ${id + 1}</div>
                    <div class="upg-v2-main-title">
                        <svg class="bank-icon-title" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l8-6 8 6"></path><rect x="4" y="10" width="16" height="12" rx="2"></rect><path d="M12 2v6"></path><path d="M8 2h8"></path><path d="M9 14h6"></path><path d="M9 18h6"></path></svg>
                        ${type === "teller" ? `${translations[lang].levelAbbr || "\u05E8\u05DE\u05D4"} ${entity.level} / ${tellerMaxLvl}` : `${translations[lang].levelAbbr || "\u05E8\u05DE\u05D4"} ${entity.level}`}
                    </div>
                </div>
                
                <div class="upg-v2-desc-text">${desc}</div>
                
                <div class="upg-v2-stats-glass-box">
                    <div class="upg-v2-stat">
                        <div class="upg-v2-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        </div>
                        <div class="upg-v2-stat-label">${capLabel}</div>
                        <div class="upg-v2-stat-val">
                            <span class="val-current">${formatMoney(capacity)}</span>
                            <span class="val-arrow arrow" style="color: #4ade80;">\u2794</span>
                            <span class="val-next">${formatMoney(nextCapacity)}</span>
                        </div>
                    </div>
                    ${type === "teller" ? `
                    <div class="upg-v2-stat">
                        <div class="upg-v2-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
                        </div>
                        <div class="upg-v2-stat-label">${(statLabels[lang] || statLabels.en).totalYield}</div>
                        <div class="upg-v2-stat-val">
                            <span class="val-current">${formatMoney(eps)}</span>
                            <span class="val-arrow arrow" style="color: #4ade80;">\u2794</span>
                            <span class="val-next">${formatMoney(nextEps)}</span>
                        </div>
                    </div>
                    ` : ""}
                    <div class="upg-v2-stat">
                        <div class="upg-v2-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div class="upg-v2-stat-label">${speedLabel}</div>
                        <div class="upg-v2-stat-val">
                            <span class="val-current">${speed}${translations[lang].secAbbr || ""}</span>
                            <span class="val-arrow arrow" style="color: #4ade80;">\u2794</span>
                            <span class="val-next">${nextSpeed}${translations[lang].secAbbr || ""}</span>
                        </div>
                    </div>
                </div>
                
                ${isTellerMax ? `
                <button class="upg-v2-buy-btn buy-btn disabled" disabled style="margin-top: auto; cursor: default; background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border-color: rgba(223, 171, 41, 0.4);">
                    <div class="upg-v2-btn-center">
                        <div class="upg-v2-btn-lbl" style="color: #dfab29; font-weight: 800;">
                            \u{1F451} ${translations[lang].maxLevel || "MAX"}
                        </div>
                    </div>
                </button>
                ` : `
                <button class="upg-v2-buy-btn buy-btn ${canBuy ? "" : "disabled"}" data-type="${type}" data-id="${id}" ${canBuy ? "" : "disabled"} aria-label="${translations[lang].upgradeLabel} ${title} \u2014 ${formatMoney(cost)}">
                    <div class="upg-v2-btn-left">
                        <svg class="premium-cash-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#fff2a8" />
                                    <stop offset="40%" stop-color="#d4af37" />
                                    <stop offset="80%" stop-color="#aa7c11" />
                                    <stop offset="100%" stop-color="#664600" />
                                </linearGradient>
                                <linearGradient id="cashGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stop-color="#4ade80" />
                                    <stop offset="100%" stop-color="#166534" />
                                </linearGradient>
                                <filter id="glow">
                                    <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.8"/>
                                </filter>
                            </defs>
                            <!-- Stack of Cash -->
                            <rect x="15" y="40" width="70" height="40" rx="4" fill="url(#cashGrad)" filter="url(#glow)" transform="rotate(-10 50 50)" />
                            <rect x="10" y="30" width="70" height="40" rx="4" fill="#22c55e" filter="url(#glow)" transform="rotate(-5 50 50)" />
                            <rect x="5" y="20" width="70" height="40" rx="4" fill="#4ade80" filter="url(#glow)" />
                            <rect x="15" y="30" width="50" height="20" rx="2" fill="#14532d" />
                            <circle cx="40" cy="40" r="6" fill="#4ade80" />
                            <!-- Gold Coins -->
                            <ellipse cx="75" cy="70" rx="18" ry="6" fill="#8c6600" />
                            <ellipse cx="75" cy="68" rx="18" ry="6" fill="url(#goldGrad)" filter="url(#glow)" />
                            <ellipse cx="75" cy="62" rx="18" ry="6" fill="#8c6600" />
                            <ellipse cx="75" cy="60" rx="18" ry="6" fill="url(#goldGrad)" filter="url(#glow)" />
                            <ellipse cx="65" cy="80" rx="20" ry="8" fill="#8c6600" />
                            <ellipse cx="65" cy="76" rx="20" ry="8" fill="url(#goldGrad)" filter="url(#glow)" />
                            <ellipse cx="65" cy="70" rx="20" ry="8" fill="#8c6600" />
                            <ellipse cx="65" cy="66" rx="20" ry="8" fill="url(#goldGrad)" filter="url(#glow)" />
                            <!-- Star Sparkle -->
                            <path d="M 20 10 L 22 18 L 30 20 L 22 22 L 20 30 L 18 22 L 10 20 L 18 18 Z" fill="#ffffff" filter="url(#glow)" />
                            <path d="M 85 45 L 86 50 L 91 51 L 86 52 L 85 57 L 84 52 L 79 51 L 84 50 Z" fill="#ffffff" filter="url(#glow)" />
                        </svg>
                    </div>
                    <div class="upg-v2-btn-center">
                        <div class="upg-v2-btn-lbl">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                            ${translations[lang].upgradeLabel}
                            <span class="upg-v2-btn-amount" style="display: ${levelsToBuy > 1 ? "inline" : "none"};">+${levelsToBuy}</span>
                        </div>
                        <div class="upg-v2-btn-cost">
                            ${formatMoney(cost)}
                        </div>
                    </div>
                    <div class="upg-v2-btn-right">
                        <div class="dark-circle-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>
                </button>
                `}
            </div>
        `;
      if (avatarBgUrl) {
        const avEl = card.querySelector(".card-avatar");
        if (avEl) {
          avEl.style.backgroundImage = `url('${avatarBgUrl}')`;
          avEl.style.backgroundPosition = avatarBgPos;
          avEl.style.backgroundSize = avatarBgSize;
        }
      }
    } else {
      let cost, avatarBgUrl2 = "", avatarBgPos2 = "center 25%", avatarBgSize2 = "cover", title, desc, unlockAction, unlockText;
      if (type === "teller") {
        cost = game.tellerUnlockCosts[id];
        avatarBgUrl2 = `images/teller-${id % 8 + 1}.png`;
        avatarBgPos2 = "center center";
        avatarBgSize2 = "cover";
        title = tObj.tellerLocked(id + 1);
        desc = tObj.tellerLockedDesc;
        unlockAction = "unlock-teller";
        unlockText = translations[lang].unlockLabel;
      } else {
        cost = game.guardUnlockCosts[id];
        avatarBgUrl2 = "images/guard.png";
        avatarBgPos2 = "center center";
        avatarBgSize2 = "contain";
        title = tObj.guardLocked(id + 1);
        desc = tObj.guardLockedDesc;
        unlockAction = "unlock-guard";
        unlockText = tObj.guardUnlockBtn;
      }
      const canBuy = game.state.cash >= cost;
      card.className = "upgrade-card premium-upg-card locked-card";
      card.innerHTML = `
            <div class="upg-v2-avatar-large" style="background-image: url('${avatarBgUrl2}'); background-position: ${avatarBgPos2}; background-size: ${avatarBgSize2};"></div>
            <div class="upg-v2-content-overlay">
                <div class="upg-v2-header-row">
                    <div class="upg-v2-badge" style="border-color: rgba(255,255,255,0.2); color: #94a3b8;">${translations[lang].lockedLabel}</div>
                    <div class="upg-v2-main-title" style="color: #cbd5e1;">${title}</div>
                </div>
                
                <div class="upg-v2-desc-text">${desc}</div>
                
                <button class="upg-v2-buy-btn buy-btn ${canBuy ? "" : "disabled"}" data-action="${unlockAction}" data-id="${id}" ${canBuy ? "" : "disabled"} aria-label="${translations[lang].unlockLabel} ${id + 1} \u2014 ${formatMoney(cost)}">
                    <div class="upg-v2-btn-left">
                        <div class="upg-v2-btn-lbl" style="color: ${canBuy ? "#2b1f02" : "#64748b"};">${unlockText}</div>
                        <div class="upg-v2-btn-cost">
                            <svg class="upg-v2-coin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                            <span class="upg-v2-btn-sub">${(statLabels[lang] || statLabels.en).unlockCost}</span>
                            ${formatMoney(cost)}
                        </div>
                    </div>
                    <div class="upg-v2-btn-right">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${canBuy ? "#ffe066" : "#475569"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                </button>
            </div>
        `;
      if (avatarBgUrl2) {
        const avEl2 = card.querySelector(".card-avatar");
        if (avEl2) {
          avEl2.style.backgroundImage = `url('${avatarBgUrl2}')`;
          avEl2.style.backgroundPosition = avatarBgPos2;
          avEl2.style.backgroundSize = avatarBgSize2;
        }
      }
    }
    return card;
  }

  // ui/tabs/upgrades-tab.js
  function renderUpgradesTab2() {
    const container = document.getElementById("tab-upgrades");
    if (!container) return;
    resetBuyBtnCache();
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].upgrades;
    const tellersGrid = document.createElement("div");
    tellersGrid.className = "upgrades-grid";
    container.appendChild(tellersGrid);
    game.state.tellers.forEach((t) => {
      const card = buildEntityCard("teller", t, lang, tObj, window.currentUpgradeMode);
      tellersGrid.appendChild(card);
    });
    createSeparator(container);
    const guardsGrid = document.createElement("div");
    guardsGrid.className = "upgrades-grid";
    container.appendChild(guardsGrid);
    game.state.guards.forEach((g) => {
      const card = buildEntityCard("guard", g, lang, tObj, window.currentUpgradeMode);
      guardsGrid.appendChild(card);
    });
    createSeparator(container);
    const miscGrid = document.createElement("div");
    miscGrid.className = "upgrades-grid";
    container.appendChild(miscGrid);
    const vault = game.state.vault;
    const details = game.getBulkUpgradeDetails("vault", null, window.currentUpgradeMode, vault.level, game.state.cash);
    const vLevelsToBuy = details.levels;
    const vCost = details.cost;
    const vCap = game.getVaultCapacity(vault.level);
    const nextVCap = game.getVaultCapacity(vault.level + vLevelsToBuy);
    const vCanBuy = details.canAfford;
    const vaultCard = document.createElement("div");
    vaultCard.className = "upgrade-card premium-upg-card";
    vaultCard.innerHTML = `
        <div class="upg-v2-avatar-large" style="background-image: url('images/vault-door.png'); background-position: center; background-size: cover;"></div>
        <div class="upg-v2-content-overlay">
            <div class="upg-v2-header-row">
                <div class="upg-v2-badge">${translations[lang].vaultTitle || "\u05DB\u05E1\u05E4\u05EA"}</div>
                <div class="upg-v2-main-title">${translations[lang].levelAbbr || "\u05E8\u05DE\u05D4"} ${vault.level}</div>
            </div>
            
            <div class="upg-v2-desc-text">${tObj.vaultDesc}</div>
            
            <div class="upg-v2-stats-glass-box">
                <div class="upg-v2-stat">
                    <div class="upg-v2-stat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
                    </div>
                    <div class="upg-v2-stat-label">${tObj.vaultCap}</div>
                    <div class="upg-v2-stat-val">${formatMoney(vCap)} <span class="arrow" style="color: #4ade80;">\u2794</span> ${formatMoney(nextVCap)}</div>
                </div>
            </div>
            
            <button class="upg-v2-buy-btn buy-btn ${vCanBuy ? "" : "disabled"}" id="upgrade-vault-btn" ${vCanBuy ? "" : "disabled"} aria-label="${translations[lang].upgradeLabel} ${translations[lang].vaultTitle} \u2014 ${formatMoney(vCost)}">
                <div class="upg-v2-btn-left">
                    <div class="upg-v2-btn-sparkles">\u2728</div>
                </div>
                <div class="upg-v2-btn-center">
                    <div class="upg-v2-btn-lbl">${translations[lang].upgradeLabel} <span class="upg-v2-btn-amount">${vLevelsToBuy > 1 ? "+" + vLevelsToBuy : ""}</span></div>
                    <div class="upg-v2-btn-cost">${formatMoney(vCost)}</div>
                </div>
                <div class="upg-v2-btn-right">
                    <div class="dark-circle-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
            </button>
        </div>
    `;
    miscGrid.appendChild(vaultCard);
    createSeparator(container);
    const queueLvl = game.state.queueUpgradeLevel || 1;
    const qDetails = game.getBulkUpgradeDetails("queue", null, window.currentUpgradeMode, queueLvl, game.state.cash);
    const qLevelsToBuy = qDetails.levels;
    const qCost = qDetails.cost;
    const qCap = game.getBaseQueueCapacity(queueLvl);
    const nextQCap = game.getBaseQueueCapacity(queueLvl + qLevelsToBuy);
    const qCanBuy = qDetails.canAfford;
    const queueCard = document.createElement("div");
    queueCard.className = "upgrade-card";
    if (queueLvl >= GAME_CONFIG.QUEUE_MAX_LEVEL) {
      queueCard.className = "upgrade-card premium-upg-card";
      queueCard.innerHTML = `
        <div class="upg-v2-avatar-large" style="background-image: url('images/client-1.png'); background-position: center; background-size: cover;"></div>
        <div class="upg-v2-content-overlay">
            <div class="upg-v2-header-row">
                <div class="upg-v2-badge">${translations[lang].alertQueueLabel}</div>
                <div class="upg-v2-main-title">${tObj.queueMaxTitle}</div>
            </div>
            
            <div class="upg-v2-desc-text">${tObj.queueMaxDesc(qCap)}</div>
            
            <button class="upg-v2-buy-btn buy-btn disabled" disabled style="margin-top: auto;">
                <div class="upg-v2-btn-center">
                    <div class="upg-v2-btn-lbl" style="color: #64748b;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        ${translations[lang].maxLevel}
                    </div>
                </div>
            </button>
        </div>
        `;
    } else {
      queueCard.className = "upgrade-card premium-upg-card";
      queueCard.innerHTML = `
        <div class="upg-v2-avatar-large" style="background-image: url('images/client-1.png'); background-position: center; background-size: cover;"></div>
        <div class="upg-v2-content-overlay">
            <div class="upg-v2-header-row">
                <div class="upg-v2-badge">${translations[lang].alertQueueLabel}</div>
                <div class="upg-v2-main-title">${translations[lang].levelAbbr || "\u05E8\u05DE\u05D4"} ${queueLvl}</div>
            </div>
            
            <div class="upg-v2-desc-text">${tObj.queueDesc}</div>
            
            <div class="upg-v2-stats-glass-box">
                <div class="upg-v2-stat">
                    <div class="upg-v2-stat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div class="upg-v2-stat-label">${tObj.queueCap}</div>
                    <div class="upg-v2-stat-val">${qCap} <span class="arrow" style="color: #4ade80;">\u2794</span> ${nextQCap}</div>
                </div>
            </div>
            
            <button class="upg-v2-buy-btn buy-btn ${qCanBuy ? "" : "disabled"}" id="upgrade-queue-btn" ${qCanBuy ? "" : "disabled"}>
                <div class="upg-v2-btn-left">
                    <div class="upg-v2-btn-sparkles">\u2728</div>
                </div>
                <div class="upg-v2-btn-center">
                    <div class="upg-v2-btn-lbl">${translations[lang].upgradeLabel || "\u05E9\u05D3\u05E8\u05D2"} <span class="upg-v2-btn-amount">${qLevelsToBuy > 1 ? "+" + qLevelsToBuy : ""}</span></div>
                    <div class="upg-v2-btn-cost">${formatMoney(qCost)}</div>
                </div>
                <div class="upg-v2-btn-right">
                    <div class="dark-circle-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
            </button>
        </div>
    `;
    }
    miscGrid.appendChild(queueCard);
    let bestBtnSelector = null;
    let maxRatio = -1;
    game.state.tellers.forEach((t) => {
      if (!t.unlocked) return;
      const details2 = game.getBulkUpgradeDetails("teller", t.id, window.currentUpgradeMode, t.level, game.state.cash);
      if (details2.canAfford && details2.cost > 0) {
        const nextLvl = t.level + details2.levels;
        const nextSpeed = Math.max(0.1, game.getTellerSpeed(nextLvl));
        const currentSpeed = Math.max(0.1, game.getTellerSpeed(t.level));
        const epsIncrease = 1 / nextSpeed - 1 / currentSpeed;
        let ratio = epsIncrease / details2.cost;
        if (epsIncrease === 0) {
          ratio = details2.levels * 1e-7 / details2.cost;
        }
        if (ratio > maxRatio) {
          maxRatio = ratio;
          bestBtnSelector = `.buy-btn[data-type="teller"][data-id="${t.id}"]`;
        }
      }
    });
    if (bestBtnSelector) {
      const btn = container.querySelector(bestBtnSelector);
      if (btn) {
        const card = btn.closest(".upgrade-card");
        if (card) {
          card.classList.add("smart-recommendation-glow");
          card.style.position = "relative";
          const badge = document.createElement("div");
          badge.className = "recommended-badge";
          badge.innerText = (statLabels[lang] || statLabels.en).bestValue;
          card.appendChild(badge);
        }
      }
    } else {
      const firstAffordable = container.querySelector(".buy-btn:not(.disabled)");
      if (firstAffordable) {
        const card = firstAffordable.closest(".upgrade-card");
        if (card) {
          card.classList.add("smart-recommendation-glow");
          card.style.position = "relative";
          const badge = document.createElement("div");
          badge.className = "recommended-badge";
          badge.innerText = (statLabels[lang] || statLabels.en).bestValue;
          card.appendChild(badge);
        }
      }
    }
  }

  // ui/tabs/managers-tab.js
  function renderManagersTab() {
    const container = document.getElementById("tab-managers");
    if (!container) return;
    let hash = null;
    try {
      hash = JSON.stringify({
        managers: game.state.managers,
        managerUpgrades: game.state.managerUpgrades,
        cash: Math.floor(game.state.cash / 1e3)
      });
    } catch {
    }
    if (checkManagersHashUnchanged(hash)) return;
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].managers;
    const managersKeys = ["customer", "operations", "finance", "accountant", "service", "vip", "marketing"];
    const managerConfigs = {
      customer: { theme: "theme-gold", gem: "\u{1F451}", img: "manager-1.png" },
      finance: { theme: "theme-blue", gem: "\u{1F48E}", img: "manager-2.png" },
      accountant: { theme: "theme-teal", gem: "\u23F1\uFE0F", img: "manager-7.png" },
      operations: { theme: "theme-purple", gem: "\u{1F52E}", img: "manager-3.png" },
      service: { theme: "theme-amber", gem: "\u{1F538}", img: "manager-4.png" },
      vip: { theme: "theme-red", gem: "\u{1F4B0}", img: "manager-5.png" },
      marketing: { theme: "theme-green", gem: "\u{1F539}", img: "manager-6.png" }
    };
    const grid = document.createElement("div");
    grid.className = "managers-grid";
    container.appendChild(grid);
    managersKeys.sort((a, b) => {
      const getCost = (type) => {
        const mData = game.getManagerRenderData(type);
        if (!mData) return Infinity;
        if (!mData.isUnlocked) return mData.cost;
        if (!mData.isHired) return mData.cost;
        if (mData.level < 5) {
          const details = game.getBulkUpgradeDetails("manager", type, window.currentUpgradeMode || "x1", mData.level, game.state.cash);
          return details.cost;
        }
        return Infinity;
      };
      return getCost(a) - getCost(b);
    });
    managersKeys.forEach((type) => {
      const config = managerConfigs[type];
      const mData = game.getManagerRenderData(type);
      if (!mData) return;
      const isUnlocked = mData.isUnlocked;
      const isHired = mData.isHired;
      const cost = mData.cost;
      const canBuy = game.state.cash >= cost;
      const level = mData.level;
      const card = document.createElement("div");
      card.className = `upgrade-card manager-card feature-card ${config.theme} ${isUnlocked ? isHired ? "active" : "" : "locked"}`;
      let bodyHtml = "";
      let footerHtml = "";
      if (!isUnlocked) {
        const deptName = type === "finance" ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_LOANS] : type === "vip" ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_VIP] : type === "service" ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_STOCK] : type === "marketing" ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_LAUNDERING] : "";
        bodyHtml = `
                <div class="mgr-card-bg"></div>
                <div class="mgr-layout-wrapper">
                    <div class="mgr-portrait-col" style="filter: grayscale(1) brightness(0.5);">
                        <img src="images/${config.img}" class="mgr-portrait-img">
                        <div class="mgr-gem-badge">${config.gem}</div>
                    </div>
                    <div class="mgr-content-col">
                        <div class="mgr-top-row">
                            <div class="mgr-title-group">
                                <div class="mgr-title">${tObj.names[type]}</div>
                                <div class="mgr-stars"><span class="star gray-star">\u2605</span><span class="star gray-star">\u2605</span><span class="star gray-star">\u2605</span><span class="star gray-star">\u2605</span><span class="star gray-star">\u2605</span></div>
                                <div class="mgr-lvl-badge">${translations[lang].levelAbbr || "Lv"} 0</div>
                            </div>
                            <div class="mgr-hex-icon"><div class="hex-inner">\u{1F512}</div></div>
                        </div>
                        <div class="mgr-stats-list">
                            <div class="mgr-stat-pill" style="justify-content: center; padding: 1rem 0;">
                                <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500; text-align: center;">
                                    \u{1F512} ${translations[lang].requiresUnlocking || "Requires unlocking:"} <br>
                                    <span style="color: var(--primary-gold); margin-top: 0.2rem; display: inline-block;">${deptName}</span>
                                </div>
                            </div>
                        </div>
            `;
        footerHtml = `
                        <div class="mgr-footer-row">
                            <div class="mgr-footer-info">
                                <div class="mgr-footer-lbl">${statLabels[lang].hourlyProfit}</div>
                                <div class="mgr-footer-val-box">
                                    <span class="mgr-footer-val" style="color: var(--text-muted);">-</span>
                                </div>
                            </div>
                            <button class="buy-btn mgr-buy-btn disabled" disabled>
                                ${statLabels[lang].lockedLabel} \u{1F512}
                            </button>
                        </div>
                    </div>
                </div>
            `;
      } else {
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
          starsHtml += `<span class="star ${i <= level ? "gold-star" : "gray-star"}">\u2605</span>`;
        }
        let stat1Lbl = "", stat2Lbl = "";
        let icon1 = "", icon2 = "";
        if (type === "customer") {
          stat1Lbl = statLabels[lang].client_speed;
          stat2Lbl = statLabels[lang].satisfaction;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
        } else if (type === "finance") {
          stat1Lbl = statLabels[lang].auto_vault;
          stat2Lbl = statLabels[lang].bank_yield;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>';
        } else if (type === "operations") {
          stat1Lbl = statLabels[lang].courier_speed;
          stat2Lbl = statLabels[lang].counter_cap;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
        } else if (type === "service") {
          stat1Lbl = statLabels[lang].counter_cap;
          stat2Lbl = statLabels[lang].base_income;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
        } else if (type === "vip") {
          stat1Lbl = statLabels[lang].dept_yields;
          stat2Lbl = statLabels[lang].gold_shares;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>';
        } else if (type === "marketing") {
          stat1Lbl = statLabels[lang].ad_bonus;
          stat2Lbl = statLabels[lang].offline_time;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12A10 10 0 0 0 11 2v20a10 10 0 0 0 11-10z"></path></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        } else if (type === "accountant") {
          stat1Lbl = statLabels[lang].offline_time;
          stat2Lbl = statLabels[lang].offline_income;
          icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
          icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
          if (!mData.stat1Val || mData.stat1Val === "") {
            const c = GAME_CONFIG.MANAGER_COEFFICIENTS["accountant"];
            if (c) {
              mData.stat1Val = `+${c.offlineLimitBoost * level}h`;
              mData.stat2Val = `+${Math.round(c.offlineIncomeBoost * 100 * level)}%`;
            }
          }
        }
        bodyHtml = `
                <div class="mgr-card-bg"></div>
                <div class="mgr-layout-wrapper">
                    <div class="mgr-portrait-col">
                        <img src="images/${config.img}" class="mgr-portrait-img">
                        <div class="mgr-gem-badge">${config.gem}</div>
                    </div>
                    <div class="mgr-content-col">
                        <div class="mgr-top-row">
                            <div class="mgr-title-group">
                                <div class="mgr-title">${tObj.names[type]}</div>
                                <div class="mgr-stars">${starsHtml}</div>
                                <div class="mgr-lvl-badge">${translations[lang].levelAbbr || "Lv"} ${level}</div>
                            </div>
                            <div class="mgr-hex-icon"><div class="hex-inner">\u{1F48E}</div></div>
                        </div>
                        <div class="mgr-stats-list">
                            <div class="mgr-stat-pill">
                                <div class="mgr-stat-val">${mData.stat1Val}</div>
                                <div class="mgr-stat-label-group">
                                    <span class="mgr-stat-label">${stat1Lbl}</span>
                                    <div class="mgr-stat-icon-circle">${icon1}</div>
                                </div>
                            </div>
                            <div class="mgr-stat-pill">
                                <div class="mgr-stat-val">${mData.stat2Val}</div>
                                <div class="mgr-stat-label-group">
                                    <span class="mgr-stat-label">${stat2Lbl}</span>
                                    <div class="mgr-stat-icon-circle">${icon2}</div>
                                </div>
                            </div>
                        </div>
            `;
        let actionBtnHtml = "";
        if (!isHired) {
          actionBtnHtml = `
                    <button class="buy-btn buy-mgr-btn mgr-buy-btn ${canBuy ? "" : "disabled"}" data-mgr="${type}" ${canBuy ? "" : "disabled"} aria-label="${statLabels[lang].hireBtn} ${tObj.names[type]} \u2014 ${formatMoney(cost)}">
                        ${statLabels[lang].hireBtn}<br>${formatMoney(cost)}
                    </button>
                `;
        } else if (level < 5) {
          const details = game.getBulkUpgradeDetails("manager", type, window.currentUpgradeMode, level, game.state.cash);
          const costToUpgrade = details.cost;
          const canUpgrade = details.canAfford;
          const levelsToBuy = details.levels;
          actionBtnHtml = `
                    <button class="buy-btn upgrade-mgr-btn mgr-buy-btn ${canUpgrade ? "" : "disabled"}" data-mgr-type="${type}" ${canUpgrade ? "" : "disabled"} aria-label="${statLabels[lang].upgradeBtn} ${tObj.names[type]} \u2014 ${formatMoney(costToUpgrade)}">
                        ${statLabels[lang].upgradeBtn}${levelsToBuy > 1 ? ` <span class="upgrade-amount-text">+${levelsToBuy}</span>` : ""}<br>${formatMoney(costToUpgrade)}
                    </button>
                `;
        } else {
          actionBtnHtml = `
                    <div class="mgr-active-badge">
                        ${statLabels[lang].activeLabel} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                `;
        }
        footerHtml = `
                        <div class="mgr-footer-row">
                            <div class="mgr-footer-info">
                                <div class="mgr-footer-lbl">${statLabels[lang].hourlyProfit}</div>
                                <div class="mgr-footer-val-box">
                                    <span class="mgr-footer-val">${isHired ? formatMoney(mData.extraHourly) : formatMoney(0)}</span>
                                    <span class="per-hour-lbl">${statLabels[lang].perHour}</span>
                                </div>
                            </div>
                            ${actionBtnHtml}
                        </div>
                    </div>
                </div>
            `;
      }
      card.innerHTML = bodyHtml + footerHtml;
      grid.appendChild(card);
    });
    container.querySelectorAll(".buy-mgr-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        initSound();
        const type = btn.getAttribute("data-mgr");
        const beforeCash = game.state.cash;
        const beforeHired = game.state.managers[type];
        game.hireManager(type);
        if (!beforeHired && game.state.managers[type] && typeof window.showDiscoveryTip === "function") {
          window.showDiscoveryTip("manager");
        }
        handlePurchaseFeedback(btn, e, beforeCash, beforeHired, "hire-manager", type);
        renderManagersTab();
      });
    });
    container.querySelectorAll(".upgrade-mgr-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        initSound();
        const type = btn.getAttribute("data-mgr-type");
        const beforeCash = game.state.cash;
        const beforeLevel = game.state.managerUpgrades[type] ? game.state.managerUpgrades[type].level : 1;
        game.upgradeManagerBulk(type, window.currentUpgradeMode);
        handlePurchaseFeedback(btn, e, beforeCash, beforeLevel, "upgrade-manager", type);
        updateButtonAffordability2();
      });
    });
  }

  // ui/tabs/departments-tab.js
  function getDepartmentIconSvg(id, isUnlocked) {
    const shadow = isUnlocked ? "filter: drop-shadow(0 0 8px rgba(223, 171, 41, 0.75)) brightness(1.15);" : "filter: grayscale(1) opacity(0.3);";
    const size = 44;
    const strokeAttr = isUnlocked ? 'stroke="rgba(255, 223, 128, 0.5)" stroke-width="0.6" stroke-linejoin="round"' : "";
    switch (id) {
      case 0:
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="url(#goldGrad-${id})" ${strokeAttr} style="${shadow}">
                <defs>
                    <linearGradient id="goldGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f5cf6d" />
                        <stop offset="50%" stop-color="#dfab29" />
                        <stop offset="100%" stop-color="#9a7211" />
                    </linearGradient>
                </defs>
                <path d="M4 17h16v3H4v-3zm2-8h12v7H6v-7zm1-5h10v3H7V5zM9 11h2v2H9v-2zm4 0h2v2h-2v-2zm-4 3h2v2H9v-2zm4 0h2v2h-2v-2z" />
            </svg>`;
      case 1:
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="url(#goldGrad-${id})" ${strokeAttr} style="${shadow}">
                <defs>
                    <linearGradient id="goldGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f5cf6d" />
                        <stop offset="50%" stop-color="#dfab29" />
                        <stop offset="100%" stop-color="#9a7211" />
                    </linearGradient>
                </defs>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v-2zm0-4H8v-2h8v-2zm-3-5V3.5L17.5 8H13z" />
                <path d="M16 16.5l3.5-3 3.5 3v4.5h-7v-4.5z" />
            </svg>`;
      case 2:
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="url(#goldGrad-${id})" ${strokeAttr} style="${shadow}">
                <defs>
                    <linearGradient id="goldGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f5cf6d" />
                        <stop offset="50%" stop-color="#dfab29" />
                        <stop offset="100%" stop-color="#9a7211" />
                    </linearGradient>
                </defs>
                <path d="M2 4l4 6 6-7 6 7 4-6-2 13H4L2 4zm2 15h16v2H4v-2z" />
            </svg>`;
      case 3:
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="url(#goldGrad-${id})" ${strokeAttr} style="${shadow}">
                <defs>
                    <linearGradient id="goldGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f5cf6d" />
                        <stop offset="50%" stop-color="#dfab29" />
                        <stop offset="100%" stop-color="#9a7211" />
                    </linearGradient>
                </defs>
                <path d="M4 16h3v5H4v-5zm5-6h3v11H9V10zm5-4h3v15h-3V6zm5-4h3v19h-3V2z" />
                <path d="M2 11l6-6 4 3 8-8h-4V1h6v6h-1l-9 9-4-3-7 7z" />
            </svg>`;
      case 4:
        return `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="url(#goldGrad-${id})" ${strokeAttr} style="${shadow}">
                <defs>
                    <linearGradient id="goldGrad-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f5cf6d" />
                        <stop offset="50%" stop-color="#dfab29" />
                        <stop offset="100%" stop-color="#9a7211" />
                    </linearGradient>
                </defs>
                <path d="M12 2L2 7v2h20V7L12 2zm-8 8v9h2v-9H4zm5 0v9h2v-9H9zm5 0v9h2v-9h-2zm5 0v9h2v-9h-2zM2 20v2h20v-2H2z" />
            </svg>`;
      default:
        return "";
    }
  }
  function renderDepartmentsTab() {
    const container = document.getElementById("departments-container") || document.getElementById("tab-departments");
    if (!container) return;
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].departments;
    game.state.departments.forEach((d) => {
      const isUnlocked = d.unlocked;
      const unlockCost = game.getDepartmentUnlockCost(d);
      const canBuy = game.state.cash >= unlockCost;
      const card = document.createElement("div");
      card.className = `upgrade-card department-card feature-card ${isUnlocked ? "active" : "locked"}`;
      const reward = game.getDepartmentReward(d.id);
      const iconSvg = getDepartmentIconSvg(d.id, isUnlocked);
      const activeBadgeHtml = isUnlocked ? `
            <span class="dept-active-badge">
                <span class="badge-dot"></span>
                <span>${translations[lang].activeLabel || "Active"}</span>
            </span>
        ` : "";
      const profitLbl = translations[lang] && translations[lang].profitLabel ? translations[lang].profitLabel.replace(":", "").trim() : lang === "he" ? "\u05E8\u05D5\u05D5\u05D7" : "Profit";
      const currentProfit = isUnlocked ? reward : d.baseReward;
      const statsBarsHtml = `
            <div class="dept-stat-bar">
                <span class="stat-bar-label">${profitLbl}:</span>
                <span class="stat-bar-sep">|</span>
                <span class="stat-bar-val adj-val">${formatMoney(currentProfit)}</span>
            </div>
        `;
      let actionBtnHtml = "";
      if (!isUnlocked) {
        actionBtnHtml = `
                <button class="dept-action-btn buy-btn ${canBuy ? "" : "disabled"}" data-dept-idx="${d.id}" ${canBuy ? "" : "disabled"}>
                    <span class="btn-arrow">\u25B2</span>
                    <span class="btn-lbl">${tObj.unlock}</span>
                    <span class="btn-cost">${formatMoney(unlockCost)}</span>
                </button>
            `;
      } else {
        actionBtnHtml = `
                <div class="max-jewel-container">
                    <div class="max-jewel">
                        <div class="jewel-content">
                            <div class="jewel-check">\u2713</div>
                            <div class="jewel-text">MAX</div>
                        </div>
                    </div>
                    <div class="max-jewel-label">${(statLabels[lang] || statLabels.en).maxLabel}</div>
                </div>
            `;
      }
      const titleShieldHtml = isUnlocked ? `<span class="dept-title-shield"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polygon points="12 8 13.5 10.5 16 11 14 13 14.5 15.5 12 14.5 9.5 15.5 10 13 8 11 10.5 10.5 12 8" fill="currentColor" stroke="none"/></svg></span>` : "";
      card.innerHTML = `
            ${titleShieldHtml}
            <div class="dept-card-top">
                <div class="dept-card-action">
                    ${actionBtnHtml}
                </div>
                <div class="dept-card-divider"></div>
                <div class="dept-card-center">
                    <div class="dept-title-row">
                        <span class="dept-title-text">${tObj.names[d.id]}</span>
                    </div>
                    ${activeBadgeHtml}
                </div>
                <div class="dept-icon-frame">
                    <div class="dept-ring dept-ring-1"></div>
                    <div class="dept-ring dept-ring-2"></div>
                    <div class="dept-icon-content">
                        ${iconSvg}
                    </div>
                </div>
            </div>
            <div class="dept-card-bottom">
                ${statsBarsHtml}
            </div>
        `;
      container.appendChild(card);
    });
    container.querySelectorAll(".dept-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (btn.classList.contains("disabled") || btn.disabled) return;
        const deptId = parseInt(btn.getAttribute("data-dept-idx"), 10);
        if (game.unlockDepartment(deptId)) {
          if (typeof window.hapticTap === "function") window.hapticTap(12);
          if (typeof window.spawnFloatingText === "function") {
            window.spawnFloatingText(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, `+${translations[lang].departments.unlockedMsg || "Unlocked!"}`, "gold");
          }
          renderDepartmentsTab();
          if (typeof window.draw === "function") window.draw();
        }
      });
    });
  }

  // ui/tabs/branches-tab.js
  function renderBranchesTab() {
    const container = document.getElementById("tab-branches");
    if (!container) return;
    let hash = null;
    try {
      hash = JSON.stringify({
        currentBranch: game.state.currentBranch,
        shares: game.state.shares,
        cash: Math.floor(game.state.cash / 1e3)
      });
    } catch {
    }
    if (checkBranchesHashUnchanged(hash)) return;
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].branches;
    const sharesGained = game.calculatePrestigeShares();
    const canPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
    const currentReq = game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
    const percent = Math.round((0.05 + (game.state.goldUpgrades.shareEfficiency || 0) * 0.01) * 100);
    const dynamicBoostText = tObj.prestigeBoost.replace("5%", `${percent}%`).replace("+5%", `+${percent}%`);
    const prestigeCard = document.createElement("div");
    prestigeCard.className = "prestige-panel";
    prestigeCard.innerHTML = `
        <div class="prestige-title">${tObj.prestigeTitle}</div>
        <div class="prestige-description">
            ${tObj.prestigeDesc}
            <br>
            <span style="color: var(--primary-gold)">${dynamicBoostText}</span>
        </div>
        
        <div class="prestige-showcase-box">
            <div class="prestige-particle"></div>
            <div class="prestige-particle"></div>
            <div class="prestige-particle"></div>
            <div class="prestige-particle"></div>
            <div class="showcase-label">${tObj.prestigeRewardLabel}</div>
            <div class="showcase-value">${tObj.prestigeRewardValue(sharesGained)}</div>
        </div>

        <button class="prestige-beveled-btn main-prestige-btn ${canPrestige ? "" : "disabled"}" id="main-prestige-btn">
            ${tObj.sellAndBuild}
        </button>
        <div class="prestige-btn-subtext">
            ${typeof tObj.prestigeMinLabel === "function" ? tObj.prestigeMinLabel(formatMoney(currentReq)) : formatMoney(currentReq)}
        </div>
    `;
    container.appendChild(prestigeCard);
    game.branches.forEach((b, idx) => {
      const isCurrent = game.state.currentBranch === idx;
      const isSold = idx < game.state.currentBranch;
      const card = document.createElement("div");
      card.className = `branch-card bg-branch-${idx} ${isCurrent ? "current" : ""}`;
      let actionBtnHtml = "";
      if (!isSold && !isCurrent) {
        const isAvailable = idx === game.state.currentBranch + 1;
        if (isAvailable) {
          const openLbl = (tObj.openBranch || (lang === "he" ? "\u05E2\u05D1\u05D5\u05E8 \u05DC\u05E1\u05E0\u05D9\u05E3 \u05D7\u05D3\u05E9" : lang === "es" ? "\xA1Ir a la Nueva Sucursal" : lang === "ru" ? "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043D\u043E\u0432\u044B\u0439 \u0444\u0438\u043B\u0438\u0430\u043B" : "Travel to Next Branch")).replace("!", "").trim();
          actionBtnHtml = `
                    <button class="branch-action-btn gold-gradient-btn ${canPrestige ? "" : "disabled"}" data-prestige-branch="${idx}">
                        <i class="fas fa-university" style="margin-inline-end:6px"></i>${openLbl}
                    </button>
                `;
        } else {
          actionBtnHtml = `
                    <button class="branch-action-btn ghost-gold disabled" disabled>
                        <i class="fas fa-lock" style="margin-inline-end:6px"></i>${tObj.locked}
                    </button>
                `;
        }
      }
      const costToEnter = idx > 0 ? game.branches[idx - 1].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9) : 0;
      const requirementText = isSold ? translations[lang].branches.sold : idx === 0 ? translations[lang].branches.active.replace(" \u{1F3DB}", "") : `${translations[lang].branches.minCash(formatMoney(costToEnter))}`;
      const statusPillHtml = isCurrent ? `
            <div class="branch-status-pill">
                <span class="pulse-dot"></span>
                <span>${translations[lang].branches.active.replace(" \u{1F3DB}", "")}</span>
            </div>
        ` : "";
      card.innerHTML = `
            <div class="branch-card-right">
                <div class="branch-header-row">
                    <div class="branch-name">${tObj.names[idx]}</div>
                    <div class="branch-nav-icons" dir="ltr">
                        <!-- Removed branch-diamond-icon as requested -->
                        <i class="fas fa-chevron-right chevron-icon"></i>
                    </div>
                </div>
                <div class="branch-desc">${tObj.descs[idx] || b.desc}</div>
                ${idx > 0 && !isCurrent ? `
                <div class="branch-req-pill">
                    <div class="branch-req-pill-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="branch-req-pill-text">
                        <span class="req-label">${tObj.minCashLabel}</span>
                        <span class="req-val">${isSold ? translations[lang].branches.sold : idx === 0 ? translations[lang].branches.active.replace(" \u{1F3DB}", "") : formatMoney(costToEnter)}</span>
                    </div>
                    <div class="branch-req-pill-crown">\u{1F451}</div>
                </div>
                ` : ""}
                ${statusPillHtml}
            </div>
            <div class="branch-card-left">
                <div class="multiplier-hexagon-badge">
                    <div class="hex-crown"><i class="fas fa-crown"></i></div>
                    <div class="mult-val">${b.baseMultiplier}x</div>
                    <div class="mult-lbl">${translations[lang].multiplier}</div>
                </div>
                <div class="branch-action-wrapper">
                    ${actionBtnHtml}
                </div>
            </div>
        `;
      container.appendChild(card);
    });
    const presBtns = container.querySelectorAll("[data-prestige-branch]");
    presBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
          if (!currentCanPrestige) {
            if (typeof showToast === "function") showToast(translations[game.state.language || "en"].branches.notEnoughCashToast, "danger");
            return;
          }
          initSound();
          const target = parseInt(btn.getAttribute("data-prestige-branch"));
          openPrestigeModal(target);
        } catch (err) {
          console.error("[Prestige branch button] click failed:", err);
          if (typeof showToast === "function") showToast(translations[game.state.language || "en"].branches.screenErrorToast + ": " + err.message, "danger");
          if (typeof reportCrash === "function") reportCrash("branch prestige btn click: " + err.message, err.stack);
        }
      });
    });
    const mainPresBtn = container.querySelector("#main-prestige-btn");
    if (mainPresBtn) {
      mainPresBtn.addEventListener("click", () => {
        try {
          const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
          if (!currentCanPrestige) {
            if (typeof showToast === "function") showToast(translations[game.state.language || "en"].branches.notEnoughCashToast, "danger");
            return;
          }
          initSound();
          const targetBranch = game.state.currentBranch;
          openPrestigeModal(targetBranch);
        } catch (err) {
          console.error("[Main prestige button] click failed:", err);
          if (typeof showToast === "function") showToast(translations[game.state.language || "en"].branches.screenErrorToast + ": " + err.message, "danger");
          if (typeof reportCrash === "function") reportCrash("main prestige btn click: " + err.message, err.stack);
        }
      });
    }
    const goBtns = container.querySelectorAll("[data-go-branch]");
    goBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        initSound();
        const target = parseInt(btn.getAttribute("data-go-branch"));
        prevCustomerQueueString = "";
        prevTellerClientStates = {};
        game.travelToBranch(target);
        refreshAllTabs();
      });
    });
    const goldShopSection = document.createElement("div");
    goldShopSection.className = "gold-shop-panel";
    const goldUpgradesKeys = ["startingCash", "guardSpeed", "premiumYield", "shareEfficiency", "offlineEarnings", "tellerCapacityBoost", "vaultCapacityBoost", "eventBonus", "managerDiscount"];
    let goldCardsHtml = "";
    const iconMapping = {
      startingCash: "images/gold-chest.png",
      guardSpeed: "images/gold-truck.png",
      premiumYield: "images/gold-vip.png",
      shareEfficiency: "images/gold-bars.png",
      offlineEarnings: "images/vault.png",
      tellerCapacityBoost: "images/manager-4.png",
      vaultCapacityBoost: "images/vault-door.png",
      eventBonus: "images/client-9.png",
      managerDiscount: "images/manager-1.png"
    };
    goldUpgradesKeys.forEach((key) => {
      const currentLvl = game.state.goldUpgrades && game.state.goldUpgrades[key] ? game.state.goldUpgrades[key] : 0;
      const upgradeData = translations[lang].goldUpgrades[key];
      let maxLvl = 5;
      const cost = game.getGoldUpgradeCost(key);
      let desc = "";
      if (key === "startingCash") {
        maxLvl = 4;
        const startingCashOptions2 = GAME_CONFIG.STARTING_CASH_OPTIONS;
        const nextVal = startingCashOptions2[currentLvl + 1] || startingCashOptions2[startingCashOptions2.length - 1];
        desc = upgradeData.desc(currentLvl, nextVal);
      } else if (key === "guardSpeed" || key === "premiumYield" || key === "offlineEarnings" || key === "tellerCapacityBoost" || key === "vaultCapacityBoost" || key === "eventBonus") {
        maxLvl = 5;
        desc = upgradeData.desc(currentLvl);
      } else if (key === "shareEfficiency" || key === "managerDiscount") {
        maxLvl = 4;
        desc = upgradeData.desc(currentLvl);
      }
      const isMax = currentLvl >= maxLvl;
      const canAfford = game.state.shares >= cost;
      const iconSrc = iconMapping[key];
      let cleanTitle = upgradeData.title.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "").trim();
      goldCardsHtml += `
            <div class="gold-upgrade-card ${isMax ? "is-maxed" : ""}">
                <div class="gold-card-right">
                    <img class="gold-big-illustration" src="${iconSrc}" alt="${upgradeData.title}">
                </div>
                <div class="gold-card-middle">
                    <div class="gold-upgrade-title">${cleanTitle}</div>
                    <div class="gold-upgrade-desc">${desc}</div>
                    <div class="gold-upgrade-action-row">
                        <span class="gold-level-pill">
                            ${currentLvl}/${maxLvl}
                        </span>
                        ${isMax ? `
                            <div class="gold-max-reached-btn">
                                \u{1F451} ${translations[lang].maxLevel}
                            </div>
                        ` : `
                            <button class="buy-btn ${canAfford ? "" : "disabled"} buy-gold-btn" data-gold-up="${key}" ${canAfford ? "" : "disabled"}>
                                ${cost} \u{1FA99}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    const startingCashLvl = game.state.goldUpgrades && game.state.goldUpgrades.startingCash ? game.state.goldUpgrades.startingCash : 0;
    const startingCashOptions = GAME_CONFIG.STARTING_CASH_OPTIONS;
    const startingCashVal = startingCashOptions[startingCashLvl] || startingCashOptions[0];
    const premiumYieldLvl = game.state.goldUpgrades && game.state.goldUpgrades.premiumYield ? game.state.goldUpgrades.premiumYield : 0;
    const branchProfitsPct = premiumYieldLvl * 10;
    const guardSpeedLvl = game.state.goldUpgrades && game.state.goldUpgrades.guardSpeed ? game.state.goldUpgrades.guardSpeed : 0;
    const courierSpeedPct = guardSpeedLvl * 10;
    const prestigeBonusPct = Math.round((game.getPrestigeMultiplier() - 1) * 100);
    const tTotalEffect = translations[lang].goldTotalEffect || translations.en.goldTotalEffect;
    const tBranchProfits = translations[lang].goldBranchProfits || translations.en.goldBranchProfits;
    const tCourierSpeed = translations[lang].goldCourierSpeed || translations.en.goldCourierSpeed;
    const tStartingCapital = translations[lang].goldStartingCapital || translations.en.goldStartingCapital;
    let grandBonusHtml = "";
    if (typeof translations[lang].goldGrandBonus === "function") {
      grandBonusHtml = translations[lang].goldGrandBonus(prestigeBonusPct);
    } else {
      grandBonusHtml = translations.en.goldGrandBonus(prestigeBonusPct);
    }
    const summaryPanelHtml = `
        <div class="gold-summary-box">
            <div class="gold-summary-title">\u{1F4C8} ${tTotalEffect}</div>
            <div class="gold-summary-grid">
                <div class="gold-stat-box">
                    <span class="gold-stat-val">+${branchProfitsPct}%</span>
                    <span class="gold-stat-desc">${tBranchProfits}</span>
                </div>
                <div class="gold-stat-box">
                    <span class="gold-stat-val">+${courierSpeedPct}%</span>
                    <span class="gold-stat-desc">${tCourierSpeed}</span>
                </div>
                <div class="gold-stat-box">
                    <span class="gold-stat-val">${formatMoney(startingCashVal)}</span>
                    <span class="gold-stat-desc">${tStartingCapital}</span>
                </div>
            </div>
            <div class="gold-grand-bonus-row">
                ${grandBonusHtml}
            </div>
        </div>
    `;
    let rawTitle = translations[lang].goldShopTitle.replace("\u{1F3DB}\uFE0F", "").trim();
    let parts = rawTitle.split("(");
    let formattedTitle = parts[0].trim();
    if (parts.length > 1) {
      formattedTitle += `<br><span class="prestige-subtitle">(${parts[1]}</span>`;
    }
    goldShopSection.innerHTML = `
        <div class="prestige-shop-header">
            <div class="prestige-shop-bg-stars"></div>
            <div class="prestige-title-wrapper">
                <img src="images/golden_temple.png" class="prestige-temple-img" alt="Temple" />
                <div class="prestige-title-text">${formattedTitle}</div>
            </div>
        </div>
        <div class="gold-upgrades-grid">
            ${goldCardsHtml}
        </div>
        ${summaryPanelHtml}
    `;
    container.appendChild(goldShopSection);
    container.querySelectorAll(".buy-gold-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        initSound();
        const key = btn.getAttribute("data-gold-up");
        game.buyGoldUpgrade(key);
        renderBranchesTab();
      });
    });
  }

  // ui/tabs/missions-tab.js
  function renderMissionsTab() {
    const container = document.getElementById("tab-missions");
    if (!container) return;
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].missions;
    const rootT = translations[lang];
    const completedCount = game.state.missionsCompleted || 0;
    const summaryHeader = document.createElement("div");
    summaryHeader.className = "missions-summary-header";
    summaryHeader.innerHTML = `
        <div class="summary-badge">
            <span class="trophy-icon">\u{1F3C6}</span>
            <span>${translations[lang].missionCompletedTitle}: ${completedCount}</span>
        </div>
        <p class="summary-desc">${translations[lang].missionCompletedDesc}</p>
    `;
    container.appendChild(summaryHeader);
    const sortedMissions = [...game.state.missions].sort((a, b) => {
      const aReady = a.completed && !a.claimed;
      const bReady = b.completed && !b.claimed;
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      return 0;
    });
    sortedMissions.forEach((m) => {
      const card = document.createElement("div");
      card.className = `mission-card ${m.completed ? "completed" : ""}`;
      card.setAttribute("data-mission-id", m.id);
      const targetVal = m.target || 1;
      const progressVal = m.progress || 0;
      const percent = Math.min(100, progressVal / targetVal * 100);
      let titleKey = m.type;
      if (m.type === "upgrade_teller") titleKey = "teller";
      else if (m.type === "upgrade_guard") titleKey = "guard";
      else if (m.type === "upgrade_vault") titleKey = "vault";
      else if (m.type === "accumulate_cash") titleKey = "cash";
      const title = tObj[titleKey + "Title"] || tObj.defaultTitle;
      let progressDesc = "";
      const descFn = tObj[titleKey + "Desc"] || tObj.defaultDesc;
      if (typeof descFn === "function") {
        if (m.type === "earn_eps" || m.type === "accumulate_cash" || m.type === "earn_cash" || m.type === "boost_run") {
          progressDesc = descFn(formatMoney(m.target));
        } else if (m.type === "upgrade_teller" || m.type === "upgrade_guard") {
          progressDesc = descFn(m.target, m.targetId !== void 0 ? m.targetId + 1 : 1);
        } else if (m.type === "department_grind") {
          progressDesc = descFn(m.target, m.targetId);
        } else {
          progressDesc = descFn(m.target);
        }
      } else {
        progressDesc = descFn;
      }
      const imgMap = {
        "clients": "./images/client-10.png",
        "accumulate_cash": "./images/gold-chest.png",
        "upgrade_teller": "./images/teller-7.png",
        "upgrade_guard": "./images/guard_circle.png",
        "upgrade_vault": "./images/vault.png",
        "unlock_departments": "./images/gold-truck.png",
        "hire_managers": "./images/manager_circle.png",
        "earn_eps": "./images/eps_circle.png",
        "earn_cash": "./images/gold-bars.png",
        "serve_rich_vip": "./images/client-6.png",
        "vip_marathon": "./images/gold-vip.png",
        "vip_collector": "./images/gold-vip.png",
        "department_unlock": "./images/gold-truck.png",
        "upgrade_managers": "./images/manager_circle.png",
        "manager_hire": "./images/manager_circle.png",
        "break_the_wall": "./images/manager-7.png",
        "upgrade_arrows": "./images/upgrade-arrows.png",
        "guard_trips": "./images/guard_circle.png",
        "all_managers": "./images/manager_circle.png",
        "department_grind": "./images/manager-1.png",
        "missions_veteran": "./images/gold-chest.png",
        "boost_run": "./images/boost_run_circle.png"
      };
      const imgSrc = imgMap[m.type] || "./images/icon.png";
      let rewardAmtHtml = "";
      if (m.reward && typeof m.reward === "object" && m.reward.type) {
        const shareLbl = rootT.sharesLabel || "Gold Shares";
        rewardAmtHtml = `<span class="claim-reward-amount">+${m.reward.amount} ${shareLbl} \u{1FA99}</span>`;
      } else {
        rewardAmtHtml = `<span class="claim-reward-amount">+${formatMoney(m.reward)} \u{1F4B0}</span>`;
      }
      let actionZoneHtml = "";
      if (m.completed && !m.claimed) {
        actionZoneHtml = `
            <div class="mission-action-zone">
                <button class="claim-reward-btn" data-mission-id="${m.id}">
                    ${rootT.claimReward || "Claim!"}
                    ${rewardAmtHtml}
                </button>
            </div>
            `;
      }
      let rewardBadgeHtml = "";
      if (m.reward && typeof m.reward === "object" && m.reward.type) {
        const shareLbl = rootT.sharesLabel || "Gold Shares";
        rewardBadgeHtml = `<span>${rootT.rewardLabel || "Reward:"} +${m.reward.amount} ${shareLbl} \u{1FA99}</span>`;
      } else {
        rewardBadgeHtml = `<span>${rootT.profitLabel || "Profit:"} +${formatMoney(m.reward)} \u{1F4B0}</span>`;
      }
      const circleRadius = 24;
      const circleCircumference = 2 * Math.PI * circleRadius;
      const strokeDashoffset = circleCircumference - percent / 100 * circleCircumference;
      card.innerHTML = `
            <div class="mission-reward-badge">
                ${rewardBadgeHtml}
            </div>
            <div class="mission-card-top">
                <div class="mission-image-box">
                    <div class="mission-image-glow"></div>
                    <img class="mission-illustration" src="${imgSrc}" alt="" />
                </div>
                <div class="mission-content-middle">
                    <div class="mission-details">
                        <div class="mission-title">${title}</div>
                        <div class="mission-desc">${progressDesc}</div>
                    </div>
                    <div class="mission-progress-row">
                        <div class="mission-progress-outer">
                            <div class="mission-progress-bar" style="width: ${percent}%"></div>
                            <div class="progress-text-overlay">
                                ${["earn_eps", "accumulate_cash", "earn_cash", "boost_run"].includes(m.type) ? formatMoney(progressVal) : progressVal}
                                /
                                ${["earn_eps", "accumulate_cash", "earn_cash", "boost_run"].includes(m.type) ? formatMoney(targetVal) : targetVal}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mission-circle-progress">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle class="circle-bg" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" />
                        <circle class="circle-value" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" stroke-dasharray="${circleCircumference}" stroke-dashoffset="${strokeDashoffset}" />
                    </svg>
                    <div class="circle-text">${Math.round(percent)}%</div>
                </div>
            </div>
            ${actionZoneHtml}
        `;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".claim-reward-btn")) {
          return;
        }
        handleMissionRedirect(m.type, m.targetId);
      });
      container.appendChild(card);
    });
    container.querySelectorAll(".claim-reward-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window._isClaimingMission) return;
        window._isClaimingMission = true;
        setTimeout(() => {
          window._isClaimingMission = false;
        }, 500);
        initSound();
        const missionId = btn.getAttribute("data-mission-id");
        const collected = game.claimMissionReward(missionId);
        if (collected && collected.type !== "none" && collected.amount > 0) {
          btn.disabled = true;
          const rectBtn = btn.getBoundingClientRect();
          if (collected.type === "cash") {
            spawnFloating("+" + formatMoney(collected.amount), rectBtn.left + rectBtn.width / 2, rectBtn.top, "green", "2.2rem", true);
          } else {
            const lang2 = game.state && game.state.language || "en";
            const shareLbl = (translations[lang2] || translations.en).sharesLabel || "Gold Shares";
            spawnFloating("+" + collected.amount + " " + shareLbl + " \u{1FA99}", rectBtn.left + rectBtn.width / 2, rectBtn.top, "gold", "2.2rem", true);
          }
          if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") {
            window.gameAudio.playUnlock();
          }
          renderMissionsTab();
        }
      });
    });
  }
  function updateMissionsTabProgress() {
    const container = document.getElementById("tab-missions");
    if (!container) return;
    if (game.state.missions) {
      game.state.missions.forEach((m) => {
        const card = container.querySelector('.mission-card[data-mission-id="' + m.id + '"]');
        if (!card) return;
        const targetVal = m.target || 1;
        const progressVal = m.progress || 0;
        const percent = Math.min(100, progressVal / targetVal * 100);
        const bar = card.querySelector(".mission-progress-bar");
        if (bar) bar.style.width = percent + "%";
        const textOverlay = card.querySelector(".progress-text-overlay");
        if (textOverlay) {
          const isCashType = ["earn_eps", "accumulate_cash", "earn_cash", "boost_run"].includes(m.type);
          const pStr = isCashType ? formatMoney(progressVal) : progressVal;
          const tStr = isCashType ? formatMoney(targetVal) : targetVal;
          const newText = pStr + " / " + tStr;
          if (textOverlay.innerText !== newText) textOverlay.innerText = newText;
        }
        const circleRadius = 32;
        const circleCircumference = 2 * Math.PI * circleRadius;
        const strokeDashoffset = circleCircumference - percent / 100 * circleCircumference;
        const circleValue = card.querySelector(".circle-value");
        if (circleValue) circleValue.setAttribute("stroke-dashoffset", strokeDashoffset);
        const circleText = card.querySelector(".circle-text");
        if (circleText) {
          const newPct = Math.round(percent) + "%";
          if (circleText.innerText !== newPct) circleText.innerText = newPct;
        }
        if (m.completed && !card.classList.contains("completed")) {
          if (typeof window.renderMissionsTab === "function") {
            window.renderMissionsTab();
          }
        }
      });
    }
  }
  window.updateMissionsTabProgress = updateMissionsTabProgress;

  // ui/tabs/achievements-tab.js
  function playAchievementUnlockFeedback(achievement) {
    const cardEl = document.querySelector(`.achievement-card[data-achievement-id="${achievement.id}"]`);
    const fromRect = cardEl ? cardEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    spawnFloating("\u{1F3C6} +" + (achievement.bonusPercent * 100).toFixed(2).replace(/\.?0+$/, "") + "%", fromRect.left + fromRect.width / 2, fromRect.top, "gold", "2.2rem", true);
    if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") {
      window.gameAudio.playUnlock();
    }
  }
  function renderAchievementsTab() {
    const container = document.getElementById("tab-achievements");
    if (!container) return;
    container.innerHTML = "";
    const lang = game.state.language || "en";
    const tObj = translations[lang].achievements || {};
    const rootT = translations[lang];
    const unlocked = game.state.achievements && game.state.achievements.unlocked || {};
    const claimed = game.state.achievements && game.state.achievements.claimed || {};
    const bonusPercent = game.state.achievements && game.state.achievements.bonusPercent || 0;
    const unlockedCount = GAME_CONFIG.ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
    const totalCount = GAME_CONFIG.ACHIEVEMENTS.length;
    const summaryHeader = document.createElement("div");
    summaryHeader.className = "missions-summary-header achievements-summary-header";
    summaryHeader.innerHTML = `
        <div class="summary-badge">
            <span class="trophy-icon">\u{1F3C6}</span>
            <span>${rootT.achievementsCompletedTitle || "Achievements"}: ${unlockedCount}/${totalCount}</span>
        </div>
        <p class="summary-desc">${rootT.achievementsCompletedDesc || ""} (+${(bonusPercent * 100).toFixed(2).replace(/\.?0+$/, "")}%)</p>
    `;
    container.appendChild(summaryHeader);
    const sortPriority = (a) => {
      if (unlocked[a.id] && !claimed[a.id]) return 0;
      if (!unlocked[a.id]) return 1;
      return 2;
    };
    const sortedAchievements = [...GAME_CONFIG.ACHIEVEMENTS].sort((a, b) => sortPriority(a) - sortPriority(b));
    const cashCategories = ["cash"];
    sortedAchievements.forEach((a) => {
      const isUnlocked = !!unlocked[a.id];
      const isClaimed = !!claimed[a.id];
      const progress = game.getAchievementProgress(a.id);
      const card = document.createElement("div");
      card.className = `achievement-card mission-card ${isUnlocked ? "unlocked" : ""} ${isClaimed ? "claimed" : ""}`;
      card.setAttribute("data-achievement-id", a.id);
      const title = tObj[a.i18nKey + "Title"] || a.id;
      const descFn = tObj[a.i18nKey + "Desc"];
      const targetDisplay = cashCategories.includes(a.category) ? formatMoney(a.threshold) : a.threshold;
      const desc = typeof descFn === "function" ? descFn(targetDisplay) : descFn || "";
      const circleRadius = 24;
      const circleCircumference = 2 * Math.PI * circleRadius;
      const strokeDashoffset = circleCircumference - progress.percent / 100 * circleCircumference;
      const progressCurrentDisplay = cashCategories.includes(a.category) ? formatMoney(progress.current) : progress.current;
      const shareLbl = rootT.sharesLabel || "Gold Shares";
      let statusHtml;
      if (isUnlocked && !isClaimed) {
        statusHtml = `
                <div class="mission-action-zone">
                    <button class="claim-achievement-btn" data-achievement-id="${a.id}">
                        ${rootT.claimReward || "Claim!"}
                    </button>
                </div>`;
      } else if (isUnlocked && isClaimed) {
        statusHtml = `<div class="achievement-unlocked-badge">\u2713 +${(a.bonusPercent * 100).toFixed(2).replace(/\.?0+$/, "")}%</div>`;
      } else {
        statusHtml = `<div class="mission-progress-row">
                   <div class="mission-progress-outer">
                       <div class="mission-progress-bar" style="width: ${progress.percent}%"></div>
                       <div class="progress-text-overlay">${progressCurrentDisplay} / ${targetDisplay}</div>
                   </div>
               </div>`;
      }
      const rewardBadgeHtml = isUnlocked && !isClaimed ? `<div class="mission-reward-badge"><span>+${a.rewardShares} ${shareLbl} \u{1FA99}</span></div>` : "";
      card.innerHTML = `
            ${rewardBadgeHtml}
            <div class="mission-image-box achievement-icon-box">
                <div class="mission-image-glow"></div>
                <span class="achievement-icon">${a.icon}</span>
            </div>
            <div class="mission-content-middle">
                <div class="mission-details">
                    <div class="mission-title">${title}</div>
                    <div class="mission-desc">${desc}</div>
                </div>
                ${statusHtml}
            </div>
            <div class="mission-circle-progress">
                <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle class="circle-bg" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" />
                    <circle class="circle-value" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" stroke-dasharray="${circleCircumference}" stroke-dashoffset="${isUnlocked ? 0 : strokeDashoffset}" />
                </svg>
                <div class="circle-text">${isUnlocked ? "\u2713" : Math.round(progress.percent) + "%"}</div>
            </div>
        `;
      container.appendChild(card);
    });
    container.querySelectorAll(".claim-achievement-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window._isClaimingAchievement) return;
        window._isClaimingAchievement = true;
        setTimeout(() => {
          window._isClaimingAchievement = false;
        }, 500);
        initSound();
        const achId = btn.getAttribute("data-achievement-id");
        const collected = game.claimAchievementReward(achId);
        if (collected && collected.type !== "none" && collected.amount > 0) {
          btn.disabled = true;
          const rectBtn = btn.getBoundingClientRect();
          const lang2 = game.state && game.state.language || "en";
          const shareLbl2 = (translations[lang2] || translations.en).sharesLabel || "Gold Shares";
          spawnFloating("+" + collected.amount + " " + shareLbl2 + " \u{1FA99}", rectBtn.left + rectBtn.width / 2, rectBtn.top, "gold", "2.2rem", true);
          if (window.gameAudio && typeof window.gameAudio.playUnlock === "function") {
            window.gameAudio.playUnlock();
          }
          renderAchievementsTab();
        }
      });
    });
  }
  function updateAchievementsTabProgress() {
    const container = document.getElementById("tab-achievements");
    if (!container) return;
    const cashCategories = ["cash"];
    const unlocked = game.state.achievements && game.state.achievements.unlocked || {};
    GAME_CONFIG.ACHIEVEMENTS.forEach((a) => {
      const card = container.querySelector('.achievement-card[data-achievement-id="' + a.id + '"]');
      if (!card) return;
      const progress = game.getAchievementProgress(a.id);
      const targetDisplay = cashCategories.includes(a.category) ? formatMoney(a.threshold) : a.threshold;
      const progressCurrentDisplay = cashCategories.includes(a.category) ? formatMoney(progress.current) : progress.current;
      const bar = card.querySelector(".mission-progress-bar");
      if (bar) bar.style.width = progress.percent + "%";
      const textOverlay = card.querySelector(".progress-text-overlay");
      if (textOverlay) {
        const newText = progressCurrentDisplay + " / " + targetDisplay;
        if (textOverlay.innerText !== newText) textOverlay.innerText = newText;
      }
      const circleRadius = 24;
      const circleCircumference = 2 * Math.PI * circleRadius;
      const strokeDashoffset = circleCircumference - progress.percent / 100 * circleCircumference;
      const circleValue = card.querySelector(".circle-value");
      const isUnlocked = !!unlocked[a.id];
      if (circleValue) circleValue.setAttribute("stroke-dashoffset", isUnlocked ? 0 : strokeDashoffset);
      const circleText = card.querySelector(".circle-text");
      if (circleText) {
        const newPct = Math.round(progress.percent) + "%";
        if (circleText.innerText !== newPct) circleText.innerText = newPct;
      }
    });
  }
  window.updateAchievementsTabProgress = updateAchievementsTabProgress;

  // ui/tabs/index.js
  function refreshAllTabs() {
    invalidateTabHashes();
    const activeTabEl = document.querySelector(".tab-btn.active");
    const activeTab = activeTabEl ? activeTabEl.getAttribute("data-tab") : "upgrades";
    if (activeTab === "upgrades") renderUpgradesTab2();
    else if (activeTab === "managers") renderManagersTab();
    else if (activeTab === "departments") renderDepartmentsTab();
    else if (activeTab === "missions") renderMissionsTab();
    else if (activeTab === "branches") renderBranchesTab();
    else if (activeTab === "daily") {
      if (typeof window.renderDailyChallengesSection === "function") window.renderDailyChallengesSection();
      renderAchievementsTab();
    }
    rebuildTellersDOM();
  }
  function updateCostText(costEl, newCost) {
    if (!costEl) return;
    let node = costEl.lastChild;
    while (node && node.nodeType !== Node.TEXT_NODE) node = node.previousSibling;
    if (!node) {
      node = document.createTextNode("");
      costEl.appendChild(node);
    }
    if (node.textContent.trim() !== newCost) node.textContent = newCost;
  }
  function updateButtonAffordability2() {
    const activeTabEl = document.querySelector(".tab-btn.active");
    if (!activeTabEl) return;
    const activeTab = activeTabEl.getAttribute("data-tab");
    if (activeTab === "upgrades") {
      const container = document.getElementById("tab-upgrades");
      if (!container) return;
      const buttons = getBuyBtnCache(container);
      buttons.forEach((btn) => {
        const type = btn.getAttribute("data-type");
        const id = parseInt(btn.getAttribute("data-id"));
        if (type === "teller") {
          const t = game.state.tellers[id];
          if (t.unlocked) {
            const details = game.getBulkUpgradeDetails("teller", id, window.currentUpgradeMode, t.level, game.state.cash);
            btn.classList.toggle("disabled", !details.canAfford);
            btn.disabled = !details.canAfford;
            if (btn.classList.contains("upg-v2-buy-btn")) {
              const amtEl = btn.querySelector(".upg-v2-btn-amount");
              const costEl = btn.querySelector(".upg-v2-btn-cost");
              const newAmt = details.levels > 1 ? "+" + details.levels : "";
              if (amtEl && amtEl.innerText !== newAmt) {
                amtEl.innerText = newAmt;
                amtEl.style.display = details.levels > 1 ? "inline" : "none";
              }
              const newCost = formatMoney(details.cost);
              updateCostText(costEl, newCost);
              const card = btn.closest(".premium-upg-card");
              if (card) {
                const titleAmtEl = card.querySelector(".upg-v2-level-up");
                const newTitleAmt = details.levels > 1 ? "(+" + details.levels + ")" : "";
                if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;
                const statVals = card.querySelectorAll(".upg-v2-stat-val");
                if (statVals.length >= 2) {
                  const lang = game.state.language || "en";
                  const secAbbr = translations[lang] && translations[lang].secAbbr || "";
                  const capacity = game.getTellerCapacity(t.level);
                  const speed = game.getTellerSpeed(t.level).toFixed(1);
                  const nextCapacity = game.getTellerCapacity(t.level + details.levels);
                  const nextSpeed = game.getTellerSpeed(t.level + details.levels).toFixed(1);
                  const newStatCap = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + formatMoney(nextCapacity) + "</span>";
                  const reward = game.economyManager.getCurrentBaseReward() * (game.economyManager.getTotalMultiplier() || 1);
                  const newStatYield = '<span class="val-current">' + formatMoney(reward / speed) + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + formatMoney(reward / nextSpeed) + "</span>";
                  const newStatSpeed = '<span class="val-current">' + speed + secAbbr + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + nextSpeed + secAbbr + "</span>";
                  if (statVals[0].innerHTML !== newStatCap) statVals[0].innerHTML = newStatCap;
                  if (statVals[1].innerHTML !== newStatYield) statVals[1].innerHTML = newStatYield;
                  if (statVals[2]) {
                    if (statVals[2].innerHTML !== newStatSpeed) statVals[2].innerHTML = newStatSpeed;
                  }
                }
              }
            }
          } else {
            const cost = game.tellerUnlockCosts[id];
            const canBuy = game.state.cash >= cost;
            btn.classList.toggle("disabled", !canBuy);
            btn.disabled = !canBuy;
          }
        } else if (type === "guard") {
          const g = game.state.guards[id];
          if (g.unlocked) {
            const details = game.getBulkUpgradeDetails("guard", id, window.currentUpgradeMode, g.level, game.state.cash);
            btn.classList.toggle("disabled", !details.canAfford);
            btn.disabled = !details.canAfford;
            if (btn.classList.contains("upg-v2-buy-btn")) {
              const amtEl = btn.querySelector(".upg-v2-btn-amount");
              const costEl = btn.querySelector(".upg-v2-btn-cost");
              const newAmt = details.levels > 1 ? "+" + details.levels : "";
              if (amtEl && amtEl.innerText !== newAmt) {
                amtEl.innerText = newAmt;
                amtEl.style.display = details.levels > 1 ? "inline" : "none";
              }
              const newCost = formatMoney(details.cost);
              updateCostText(costEl, newCost);
              const card = btn.closest(".premium-upg-card");
              if (card) {
                const titleAmtEl = card.querySelector(".upg-v2-level-up");
                const newTitleAmt = details.levels > 1 ? "(+" + details.levels + ")" : "";
                if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;
                const statVals = card.querySelectorAll(".upg-v2-stat-val");
                if (statVals.length >= 2) {
                  const lang = game.state.language || "en";
                  const secAbbr = translations[lang] && translations[lang].secAbbr || "";
                  const capacity = game.getGuardCapacity(g.level);
                  const speed = game.getGuardSpeed(g.level).toFixed(1);
                  const nextCapacity = game.getGuardCapacity(g.level + details.levels);
                  const nextSpeed = game.getGuardSpeed(g.level + details.levels).toFixed(1);
                  const newStatCap = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + formatMoney(nextCapacity) + "</span>";
                  const newStatSpeed = '<span class="val-current">' + speed + secAbbr + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + nextSpeed + secAbbr + "</span>";
                  if (statVals[0].innerHTML !== newStatCap) statVals[0].innerHTML = newStatCap;
                  if (statVals[1].innerHTML !== newStatSpeed) statVals[1].innerHTML = newStatSpeed;
                }
              }
            }
          } else {
            const cost = game.guardUnlockCosts[id];
            const canBuy = game.state.cash >= cost;
            btn.classList.toggle("disabled", !canBuy);
            btn.disabled = !canBuy;
          }
        } else if (type === "vault" || btn.id === "upgrade-vault-btn") {
          const details = game.getBulkUpgradeDetails("vault", null, window.currentUpgradeMode, game.state.vault.level, game.state.cash);
          btn.classList.toggle("disabled", !details.canAfford);
          btn.disabled = !details.canAfford;
          if (btn.classList.contains("upg-v2-buy-btn")) {
            const amtEl = btn.querySelector(".upg-v2-btn-amount");
            const costEl = btn.querySelector(".upg-v2-btn-cost");
            const newAmt = details.levels > 1 ? "+" + details.levels : "";
            if (amtEl && amtEl.innerText !== newAmt) {
              amtEl.innerText = newAmt;
              amtEl.style.display = details.levels > 1 ? "inline" : "none";
            }
            const newCost = formatMoney(details.cost);
            updateCostText(costEl, newCost);
            const card = btn.closest(".premium-upg-card");
            if (card) {
              const titleAmtEl = card.querySelector(".upg-v2-level-up");
              const newTitleAmt = details.levels > 1 ? "(+" + details.levels + ")" : "";
              if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;
              const statVals = card.querySelectorAll(".upg-v2-stat-val");
              if (statVals.length >= 1) {
                const capacity = game.getVaultCapacity(game.state.vault.level);
                const nextCapacity = game.getVaultCapacity(game.state.vault.level + details.levels);
                const newStat0 = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + formatMoney(nextCapacity) + "</span>";
                if (statVals[0].innerHTML !== newStat0) statVals[0].innerHTML = newStat0;
              }
            }
          }
        } else if (btn.id === "upgrade-queue-btn") {
          const details = game.getBulkUpgradeDetails("queue", null, window.currentUpgradeMode, game.state.queueUpgradeLevel || 1, game.state.cash);
          btn.classList.toggle("disabled", !details.canAfford);
          btn.disabled = !details.canAfford;
          if (btn.classList.contains("upg-v2-buy-btn")) {
            const amtEl = btn.querySelector(".upg-v2-btn-amount");
            const costEl = btn.querySelector(".upg-v2-btn-cost");
            const newAmt = details.levels > 1 ? "+" + details.levels : "";
            if (amtEl && amtEl.innerText !== newAmt) amtEl.innerText = newAmt;
            const newCost = formatMoney(details.cost);
            updateCostText(costEl, newCost);
            const card = btn.closest(".premium-upg-card");
            if (card) {
              const titleAmtEl = card.querySelector(".upg-v2-level-up");
              const newTitleAmt = details.levels > 1 ? "(+" + details.levels + ")" : "";
              if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;
              const statVals = card.querySelectorAll(".upg-v2-stat-val");
              if (statVals.length >= 1) {
                const capacity = game.getBaseQueueCapacity(game.state.queueUpgradeLevel || 1);
                const nextCapacity = game.getBaseQueueCapacity((game.state.queueUpgradeLevel || 1) + details.levels);
                const newStat0 = '<span class="val-current">' + capacity + '</span><span class="val-arrow arrow" style="color: #4ade80;">\u2794</span><span class="val-next">' + nextCapacity + "</span>";
                if (statVals[0].innerHTML !== newStat0) statVals[0].innerHTML = newStat0;
              }
            }
          }
        }
      });
      const mainPresBtn = container.querySelector("#main-prestige-btn");
      if (mainPresBtn && game.branches[game.state.currentBranch]) {
        const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.9);
        mainPresBtn.classList.toggle("disabled", !currentCanPrestige);
        mainPresBtn.disabled = !currentCanPrestige;
        const actionBtns = container.querySelectorAll(".branch-action-btn[data-prestige-branch]");
        actionBtns.forEach((btn) => {
          btn.classList.toggle("disabled", !currentCanPrestige);
          btn.disabled = !currentCanPrestige;
        });
      }
    } else if (activeTab === "managers") {
      const container = document.getElementById("tab-managers");
      if (!container) return;
      const buttons = container.querySelectorAll(".buy-btn");
      const lang = game.state.language || "en";
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const type = btn.getAttribute("data-type") || btn.getAttribute("data-mgr-type");
        if (type) {
          const mgr = game.state.managerUpgrades[type];
          if (mgr) {
            if (mgr.level >= 5) {
              renderManagersTab();
              return;
            }
            const isHired = game.state.managers[type];
            const details = game.getBulkUpgradeDetails("manager", type, window.currentUpgradeMode, mgr.level, game.state.cash);
            btn.classList.toggle("disabled", !details.canAfford);
            btn.disabled = !details.canAfford;
            const newText = `${translations[lang].upgradeLabel}${details.levels > 1 ? ` <span class="upgrade-amount-text">+${details.levels}</span>` : ""}<br>${formatMoney(details.cost)}`;
            if (btn.innerHTML !== newText) {
              btn.innerHTML = newText;
            }
            const card = btn.closest(".upgrade-card");
            if (card) {
              const lvlBadge = card.querySelector(".mgr-lvl-badge");
              if (lvlBadge) {
                lvlBadge.innerText = `${translations[lang].levelAbbr || "Lv"} ${mgr.level}${details.levels > 1 ? ` (+${details.levels})` : ""}`;
              }
              const starsBox = card.querySelector(".mgr-stars-box");
              if (starsBox) {
                let starsHtml = "";
                for (let j = 1; j <= 5; j++) {
                  starsHtml += `<span class="star ${j <= mgr.level ? "gold-star" : "gray-star"}">\u2605</span>`;
                }
                starsBox.innerHTML = starsHtml;
              }
              const statVals = card.querySelectorAll(".mgr-stat-val");
              if (statVals.length >= 2) {
                const coefs = GAME_CONFIG.MANAGER_COEFFICIENTS[type];
                let s1 = "", s2 = "";
                if (coefs) {
                  if (type === "customer") {
                    s1 = `+${Math.round(coefs.spawnIntervalBoost * 100 * mgr.level)}%`;
                    s2 = `+${Math.round(coefs.incomeBoost * 100 * mgr.level)}%`;
                  } else if (type === "finance") {
                    s1 = (statLabels[lang] || statLabels.en).autoText;
                    s2 = `+${Math.round(coefs.deptIncomeBoost * 100 * mgr.level)}%`;
                  } else if (type === "operations") {
                    s1 = `+${Math.round(coefs.guardSpeedBoost * 100 * mgr.level)}%`;
                    s2 = `+${Math.round(coefs.guardCapBoost * 100 * mgr.level)}%`;
                  } else if (type === "service") {
                    s1 = `+${Math.round(coefs.capacityBoost * 100 * mgr.level)}%`;
                    s2 = `+${Math.round(coefs.epsBoost * 100 * mgr.level)}%`;
                  } else if (type === "vip") {
                    s1 = `+${Math.round(coefs.incomeBoost * 100 * mgr.level)}%`;
                    s2 = `+${Math.round(coefs.prestigeSharesBoost * 100 * mgr.level)}%`;
                  } else if (type === "marketing") {
                    s1 = `+${Math.round(coefs.adBoost * 100 * mgr.level)}%`;
                    s2 = `+${coefs.offlineLimitBoost * mgr.level}`;
                  } else if (type === "accountant") {
                    s1 = `+${coefs.offlineLimitBoost * mgr.level}h`;
                    s2 = `+${Math.round(coefs.offlineIncomeBoost * 100 * mgr.level)}%`;
                  }
                }
                statVals[0].innerText = s1;
                statVals[1].innerText = s2;
              }
              const footerVal = card.querySelector(".mgr-footer-val");
              if (footerVal) {
                const eps = game.getEarningsPerSecond();
                let contribution = 0;
                const coefsFV = GAME_CONFIG.MANAGER_COEFFICIENTS[type];
                if (isHired && coefsFV && coefsFV.incomeBoost) {
                  contribution = coefsFV.incomeBoost * mgr.level;
                }
                const extraHourly = eps * 3600 * contribution;
                const perHourStr = (statLabels[lang] || statLabels.en).perHour;
                footerVal.innerText = `${isHired ? formatMoney(extraHourly) : formatMoney(0)} ${perHourStr}`;
              }
            }
          }
        } else {
          const mgrType = btn.getAttribute("data-mgr");
          if (mgrType) {
            const cost = game.managerCosts[mgrType];
            const canBuy = game.state.cash >= cost;
            btn.classList.toggle("disabled", !canBuy);
            btn.disabled = !canBuy;
          }
        }
      }
    } else if (activeTab === "departments") {
      const container = document.getElementById("tab-departments");
      if (!container) return;
      const buttons = container.querySelectorAll(".buy-btn");
      buttons.forEach((btn) => {
        const deptId = parseInt(btn.getAttribute("data-dept-idx"));
        const dept = game.state.departments.find((d) => d.id === deptId);
        if (dept && !dept.unlocked) {
          const cost = game.getDepartmentUnlockCost(dept);
          const canBuy = window.game.state.cash >= cost;
          if (canBuy) {
            btn.classList.remove("disabled");
            btn.removeAttribute("disabled");
            btn.disabled = false;
          } else {
            btn.classList.add("disabled");
            btn.setAttribute("disabled", "disabled");
            btn.disabled = true;
          }
        }
      });
    }
  }
  window.renderUpgradesTab = renderUpgradesTab2;
  window.renderManagersTab = renderManagersTab;
  window.renderDepartmentsTab = renderDepartmentsTab;
  window.renderBranchesTab = renderBranchesTab;
  window.renderMissionsTab = renderMissionsTab;
  window.renderAchievementsTab = renderAchievementsTab;
  window.playAchievementUnlockFeedback = playAchievementUnlockFeedback;
  window.refreshAllTabs = refreshAllTabs;
  window.updateButtonAffordability = updateButtonAffordability2;
  window.invalidateTabHashes = invalidateTabHashes;

  // ui/events/notifications.js
  var NotificationService = {
    available: false,
    async init() {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
          if (window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
            this.available = true;
          }
        }
      } catch (e) {
        console.warn("NotificationService init error:", e);
      }
    },
    async requestPermission() {
      if (!this.available) return false;
      try {
        const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        return result.display === "granted";
      } catch (e) {
        console.warn("Failed to request notification permission:", e);
        return false;
      }
    },
    async checkPermission() {
      if (!this.available) return false;
      try {
        const result = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
        return result.display === "granted";
      } catch (e) {
        console.warn("Failed to check notification permission:", e);
        return false;
      }
    },
    async scheduleReminders(game2) {
      if (!this.available || !game2 || !game2.state) return;
      if (game2.state.notificationsEnabled === false) return;
      try {
        const hasPermission = await this.checkPermission();
        if (!hasPermission) return;
        await this.cancelAll();
        const lang = game2.state.language || "en";
        const t = translations[lang] || translations["en"];
        const notifications = [];
        const now = Date.now();
        if (game2.saveManager && typeof game2.saveManager.getOfflineLimitHours === "function") {
          const limitHours = game2.saveManager.getOfflineLimitHours();
          const msUntilFull = limitHours * 3600 * 1e3;
          notifications.push({
            id: 101,
            title: t.notifOfflineTitle || "\u{1F3E6} Vault is full!",
            body: t.notifOfflineBody || "Your offline earnings have reached maximum capacity \u2014 come collect them",
            schedule: { at: new Date(now + msUntilFull) }
          });
        }
        const streak = game2.state.loginStreak || 1;
        const nextReward = typeof game2.getDailyLoginReward === "function" ? game2.getDailyLoginReward(streak + 1) : null;
        const rewardText = nextReward ? _rewardIcon(nextReward.type) + " " + _rewardShortText(nextReward) : "";
        notifications.push({
          id: 102,
          title: typeof t.notifDailyTitle === "function" ? t.notifDailyTitle(streak) : t.notifDailyTitle || "\u{1F525} Daily Streak!",
          body: typeof t.notifDailyBody === "function" ? t.notifDailyBody(rewardText) : t.notifDailyBody || "Keep up your login streak and claim your bonus",
          schedule: { at: new Date(now + 24 * 3600 * 1e3) }
        });
        notifications.push({
          id: 103,
          title: t.notifComebackTitle || "\u{1F634} Your bank misses you",
          body: t.notifComebackBody || "The employees are getting bored \u2014 quick check-in?",
          schedule: { at: new Date(now + 72 * 3600 * 1e3) }
        });
        notifications.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime());
        const MIN_GAP_MS = 3 * 3600 * 1e3;
        for (let i = 1; i < notifications.length; i++) {
          const prevTime = notifications[i - 1].schedule.at.getTime();
          const currTime = notifications[i].schedule.at.getTime();
          if (currTime - prevTime < MIN_GAP_MS) {
            notifications[i].schedule.at = new Date(prevTime + MIN_GAP_MS);
          }
        }
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications
        });
      } catch (e) {
        console.warn("Failed to schedule reminders:", e);
      }
    },
    async cancelAll() {
      if (!this.available) return;
      try {
        await window.Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: 101 }, { id: 102 }, { id: 103 }]
        });
      } catch (e) {
        console.warn("Failed to cancel notifications:", e);
      }
    }
  };

  // ui/events/review.js
  var ReviewService = {
    available: false,
    init() {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
          if (window.Capacitor.Plugins && window.Capacitor.Plugins.AppReview) {
            this.available = true;
          }
        }
      } catch (e) {
        console.warn("ReviewService init error:", e);
      }
    },
    async maybeRequest(game2) {
      if (!game2 || !game2.state || !game2.state.stats) return;
      if (game2.state.stats.reviewRequested) return;
      if (!this.available) return;
      if ((game2.state.stats.prestigeCount || 0) < 2) return;
      game2.state.stats.reviewRequested = true;
      game2.saveGame();
      try {
        await window.Capacitor.Plugins.AppReview.requestReview();
      } catch (e) {
        console.warn("AppReview request error:", e);
      }
    }
  };

  // ui/events/index.js
  window.onboardingManager = onboardingManager;
  var uiEventsInitialized = false;
  function initUIEvents() {
    if (uiEventsInitialized) return;
    uiEventsInitialized = true;
    initFocusTrapObserver();
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          if (overlay.id === "fortune-wheel-modal" && window._wheelIsSpinning) return;
          initSound2();
          overlay.classList.remove("active");
          if (overlay.id === "weekly-modal" && window.game && window.game.state) {
            window.game.state.lastWeeklyReward = Date.now();
            window.game.saveGame();
          }
        }
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const modals = [
        { id: "fortune-wheel-modal", closeId: "fortune-close-btn" },
        { id: "prestige-modal", closeId: "prestige-cancel-btn" },
        { id: "lang-modal", closeId: "lang-modal-close" },
        { id: "login-reward-modal", closeId: "login-reward-collect-btn" },
        { id: "offline-modal", closeId: "offline-claim-btn" },
        { id: "weekly-modal", closeId: "weekly-close-btn" },
        { id: "analytics-modal", closeId: "analytics-close-btn" },
        { id: "event-modal", closeId: null }
      ];
      for (const { id, closeId } of modals) {
        const el = document.getElementById(id);
        if (el && el.classList.contains("active")) {
          const closeBtn = document.getElementById(closeId);
          if (closeBtn) closeBtn.click();
          break;
        }
      }
    });
    if (DOM_CACHE.resetBtn) {
      const confirmCheck = document.getElementById("reset-confirm-checkbox");
      if (confirmCheck) {
        confirmCheck.addEventListener("change", (e) => {
          DOM_CACHE.resetBtn.disabled = !e.target.checked;
        });
      }
      DOM_CACHE.resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        initSound2();
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
        const lang = game.state.language || "en";
        let confirmMsg = "\u05D4\u05D0\u05DD \u05D0\u05EA\u05D4 \u05D1\u05D8\u05D5\u05D7 \u05E9\u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05D0\u05E4\u05E1 \u05D0\u05EA \u05D4\u05DE\u05E9\u05D7\u05E7 \u05D5\u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05DE-0? \u05DB\u05DC \u05D4\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA \u05E9\u05DC\u05DA \u05EA\u05D9\u05DE\u05D7\u05E7 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF!";
        if (lang === "en") {
          confirmMsg = "Are you sure you want to reset the game and start from 0? All your progress will be completely deleted!";
        } else if (lang === "es") {
          confirmMsg = "\xBFEst\xE1s seguro de que quieres restablecer el juego y empezar desde 0? \xA1Todo tu progreso se eliminar\xE1 por completo!";
        } else if (lang === "ru") {
          confirmMsg = "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0438\u0433\u0440\u0443 \u0438 \u043D\u0430\u0447\u0430\u0442\u044C \u0441 0? \u0412\u0435\u0441\u044C \u0432\u0430\u0448 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0431\u0443\u0434\u0435\u0442 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u0434\u0430\u043B\u0435\u043D!";
        }
        if (confirm(confirmMsg)) {
          game.clearSave();
          location.reload();
        }
      });
    }
    if (DOM_CACHE.langBtn) {
      DOM_CACHE.langBtn.addEventListener("click", () => {
        initSound2();
        if (DOM_CACHE.langModalClose) DOM_CACHE.langModalClose.style.display = "inline-block";
        if (DOM_CACHE.langModal) activateModal(DOM_CACHE.langModal);
      });
    }
    if (DOM_CACHE.langModalClose) {
      DOM_CACHE.langModalClose.addEventListener("click", () => {
        initSound2();
        if (DOM_CACHE.langModal) DOM_CACHE.langModal.classList.remove("active");
      });
    }
    if (DOM_CACHE.boostBtn) {
      DOM_CACHE.boostBtn.addEventListener("click", () => {
        initSound2();
        openBoostModal();
      });
    }
    if (DOM_CACHE.analyticsBtn) {
      DOM_CACHE.analyticsBtn.addEventListener("click", () => {
        initSound2();
        openAnalyticsModal();
      });
    }
    const analyticsFromSettingsBtn = document.getElementById("analytics-from-settings-btn");
    if (analyticsFromSettingsBtn) {
      analyticsFromSettingsBtn.addEventListener("click", () => {
        if (DOM_CACHE.langModal) DOM_CACHE.langModal.classList.remove("active");
        openAnalyticsModal();
      });
    }
    const fortuneWheelBtn = document.getElementById("fortune-wheel-btn");
    if (fortuneWheelBtn) {
      fortuneWheelBtn.addEventListener("click", () => {
        initSound2();
        openFortuneWheel();
      });
    }
    const headerDailyBtn = document.getElementById("header-daily-btn");
    if (headerDailyBtn) {
      headerDailyBtn.addEventListener("click", () => {
        initSound2();
        hapticTap();
        const existingTabBtn = document.querySelector('.tab-btn[data-tab="daily"]');
        if (existingTabBtn) {
          existingTabBtn.click();
        }
        syncBottomNav("daily");
        setTimeout(() => {
          const achievementsContainer = document.getElementById("tab-achievements");
          if (achievementsContainer) {
            achievementsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      });
    }
    updateFortuneWheelBtnState();
    if (DOM_CACHE.muteBtn) {
      DOM_CACHE.muteBtn.addEventListener("click", () => {
        initSound2();
        if (window.gameAudio && typeof window.gameAudio.toggleMute === "function") {
          window.gameAudio.toggleMute();
        }
        updateMuteButton();
        if (window.gameAudio && !window.gameAudio.isMuted && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
      });
    }
    const elLangOptions = document.querySelectorAll(".lang-option-card");
    elLangOptions.forEach((opt) => {
      opt.addEventListener("click", () => {
        try {
          initSound2();
          const selectedLang = opt.getAttribute("data-lang");
          game.setLanguage(selectedLang);
          window.localStorage.setItem("idle_bank_language_chosen", "true");
          DOM_CACHE.langModal.classList.remove("active");
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
    document.querySelectorAll(".theme-option-btn-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          initSound2();
          const theme = btn.getAttribute("data-theme");
          applyTheme(theme);
          if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
            window.gameAudio.playClick();
          }
        } catch (err) {
          console.error("Error inside theme options selection click handler:", err);
        }
      });
    });
    const hapticsToggle = document.getElementById("settings-haptics-checkbox");
    if (hapticsToggle) {
      hapticsToggle.addEventListener("change", (e) => {
        initSound2();
        if (window.game && window.game.state) {
          window.game.state.hapticsEnabled = e.target.checked;
          window.game.saveGame();
        }
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
      });
    }
    const notifToggle = document.getElementById("settings-notif-checkbox");
    if (notifToggle) {
      notifToggle.addEventListener("change", (e) => {
        initSound2();
        if (window.game && window.game.state) {
          window.game.state.notificationsEnabled = e.target.checked;
          window.game.saveGame();
          if (!e.target.checked && window.NotificationService) {
            window.NotificationService.cancelAll();
          } else if (e.target.checked && window.NotificationService) {
            window.NotificationService.requestPermission();
          }
        }
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
      });
    }
    if (DOM_CACHE.langModal) {
      DOM_CACHE.langModal.addEventListener("click", (e) => {
        try {
          if (e.target === DOM_CACHE.langModal && window.localStorage.getItem("idle_bank_language_chosen")) {
            initSound2();
            DOM_CACHE.langModal.classList.remove("active");
          }
        } catch (err) {
          console.error("Error closing language modal on overlay click:", err);
        }
      });
    }
    if (DOM_CACHE.advSlider) {
      DOM_CACHE.advSlider.addEventListener("input", () => {
        const sliderVal = parseInt(DOM_CACHE.advSlider.value);
        const dynamicMax = game.getAdMaxBudget();
        let budget = 0;
        if (sliderVal > 0) {
          budget = Math.round(dynamicMax * (sliderVal / 1e3));
          budget = Math.max(1, Math.round(budget));
        }
        game.setAdvBudget(budget);
        updateAdvDisplay2(budget);
      });
      DOM_CACHE.advSlider.addEventListener("change", () => {
        game.saveGame();
      });
    }
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        tabButtons.forEach((b) => b.classList.remove("active"));
        tabPanes.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const targetPane = document.getElementById(`tab-${tabId}`);
        document.querySelectorAll('.tab-btn[role="tab"]').forEach((b) => {
          b.setAttribute("aria-selected", b.classList.contains("active") ? "true" : "false");
        });
        if (targetPane) targetPane.classList.add("active");
        if (DOM_CACHE.bulkSelector) {
          if (tabId === "upgrades" || tabId === "managers") {
            DOM_CACHE.bulkSelector.style.display = "flex";
          } else {
            DOM_CACHE.bulkSelector.style.display = "none";
          }
        }
        if (tabId === "daily" && typeof window.renderDailyChallengesSection === "function") {
          window.renderDailyChallengesSection();
        }
        if (typeof window.invalidateTabHashes === "function") window.invalidateTabHashes();
        if (tabId === "upgrades" && typeof window.renderUpgradesTab === "function") window.renderUpgradesTab();
        else if (tabId === "managers" && typeof window.renderManagersTab === "function") window.renderManagersTab();
        else if (tabId === "departments" && typeof window.renderDepartmentsTab === "function") window.renderDepartmentsTab();
        else if (tabId === "missions" && typeof window.renderMissionsTab === "function") window.renderMissionsTab();
        else if (tabId === "daily") {
          if (typeof window.renderDailyChallengesSection === "function") window.renderDailyChallengesSection();
          if (typeof window.renderAchievementsTab === "function") window.renderAchievementsTab();
        } else if (tabId === "branches" && typeof window.renderBranchesTab === "function") window.renderBranchesTab();
        syncBottomNav(tabId);
        initSound2();
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
      });
    });
    const BNAV_RENDERERS = {
      upgrades: "renderUpgradesTab",
      managers: "renderManagersTab",
      departments: "renderDepartmentsTab",
      missions: "renderMissionsTab",
      branches: "renderBranchesTab"
    };
    document.querySelectorAll(".bottom-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        hapticTap();
        const tab = btn.dataset.tab;
        const existingTabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (existingTabBtn) {
          existingTabBtn.click();
        }
        const targetPane = document.getElementById(`tab-${tab}`);
        if (targetPane && !targetPane.classList.contains("active")) {
          document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
          document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
          targetPane.classList.add("active");
          if (existingTabBtn) existingTabBtn.classList.add("active");
          const rid = BNAV_RENDERERS[tab];
          if (rid && typeof window[rid] === "function") window[rid]();
          if (typeof window.invalidateTabHashes === "function") window.invalidateTabHashes();
          if (window.gameAudio && typeof window.gameAudio.playClick === "function") window.gameAudio.playClick();
        }
        syncBottomNav(tab);
        const controlPanel = document.getElementById("control-panel-section") || targetPane;
        if (controlPanel && (window.innerWidth <= 950 || window.matchMedia("(pointer: coarse)").matches)) {
          controlPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    const vaultMiniBtn = document.getElementById("vault-mini-btn");
    if (vaultMiniBtn) {
      vaultMiniBtn.addEventListener("click", () => {
        hapticTap();
        const mainVaultBtn = document.getElementById("collect-vault-btn");
        if (mainVaultBtn) mainVaultBtn.click();
      });
    }
    if (DOM_CACHE.bulkSelector) {
      DOM_CACHE.bulkSelector.addEventListener("click", (e) => {
        const btn = e.target.closest(".bulk-btn-option");
        if (!btn) return;
        initSound2();
        setCurrentUpgradeMode(btn.getAttribute("data-mode"));
        DOM_CACHE.bulkSelector.querySelectorAll(".bulk-btn-option").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (typeof refreshAllTabs === "function") {
          const scrollPos = document.getElementById("tab-upgrades") ? document.getElementById("tab-upgrades").scrollTop : 0;
          refreshAllTabs();
          if (document.getElementById("tab-upgrades")) document.getElementById("tab-upgrades").scrollTop = scrollPos;
        } else if (typeof updateButtonAffordability === "function") {
          updateButtonAffordability();
        }
      });
    }
    const tabUpgrades = document.getElementById("tab-upgrades");
    if (tabUpgrades) {
      tabUpgrades.addEventListener("click", (e) => {
        const btn = e.target.closest(".buy-btn");
        if (!btn || btn.classList.contains("disabled")) return;
        initSound2();
        hapticTap();
        const type = btn.getAttribute("data-type");
        const id = parseInt(btn.getAttribute("data-id"));
        if (isNaN(id) && (type === "teller" || type === "guard")) return;
        const action = btn.getAttribute("data-action");
        const beforeCash = game.state.cash;
        let beforeVal = 0;
        let feedType = "";
        if (type === "teller") {
          beforeVal = game.state.tellers[id].level;
          feedType = "teller";
          game.upgradeTellerBulk(id, window.currentUpgradeMode);
        } else if (type === "guard") {
          beforeVal = game.state.guards[id].level;
          feedType = "guard";
          game.upgradeGuardBulk(id, window.currentUpgradeMode);
        } else if (action === "unlock-teller") {
          beforeVal = game.state.tellers[id].unlocked;
          feedType = "unlock-teller";
          game.unlockTeller(id);
        } else if (action === "unlock-guard") {
          beforeVal = game.state.guards[id].unlocked;
          feedType = "unlock-guard";
          game.unlockGuard(id);
          if (!beforeVal) showDiscoveryTip("guard");
        } else if (btn.id === "upgrade-vault-btn") {
          beforeVal = game.state.vault.level;
          feedType = "vault";
          game.upgradeVaultBulk(window.currentUpgradeMode);
        } else if (btn.id === "upgrade-queue-btn") {
          beforeVal = game.state.queueUpgradeLevel || 1;
          feedType = "queue";
          game.upgradeQueueBulk(window.currentUpgradeMode);
        } else {
          return;
        }
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
        handlePurchaseFeedback2(btn, e, beforeCash, beforeVal, feedType, id);
        if (feedType === "unlock-teller" || feedType === "unlock-guard") {
          renderUpgradesTab();
          if (feedType === "unlock-teller" && typeof window.rebuildTellersDOM === "function") {
            window.rebuildTellersDOM();
            if (typeof window.recalcGuardAnchors === "function") window.recalcGuardAnchors();
          }
        } else {
          const scrollPos = tabUpgrades.scrollTop;
          if (typeof refreshAllTabs === "function") {
            refreshAllTabs();
          } else if (typeof updateButtonAffordability === "function") {
            updateButtonAffordability();
          }
          tabUpgrades.scrollTop = scrollPos;
        }
      });
    }
    if (DOM_CACHE.offlineModalDoubleBtn) {
      DOM_CACHE.offlineModalDoubleBtn.addEventListener("click", () => {
        initSound2();
        const extra = game && game.offlineEarningsReport && game.offlineEarningsReport > 0 ? game.offlineEarningsReport : 0;
        if (DOM_CACHE.offlineModal) DOM_CACHE.offlineModal.classList.remove("active");
        playAd(() => {
          if (extra > 0) {
            game.addCash(extra);
            if (window.gameAudio && typeof window.gameAudio.playChaChing === "function") {
              window.gameAudio.playChaChing();
            }
            spawnFloating("+" + formatMoney(extra), window.innerWidth / 2, window.innerHeight / 2 - 40, "green", null, true);
          }
          game.offlineEarningsReport = 0;
          game.saveGame();
          draw();
        });
      });
    }
    const gdprAcceptBtn = document.getElementById("gdpr-accept-btn");
    if (gdprAcceptBtn) {
      gdprAcceptBtn.addEventListener("click", () => {
        localStorage.setItem("gdpr_consent", "1");
        const banner = document.getElementById("gdpr-banner");
        if (banner) banner.style.display = "none";
      });
    }
    const handlePrivacyLinkClick = async (e) => {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        if (typeof AdService !== "undefined" && typeof AdService.showPrivacyOptions === "function") {
          const handled = await AdService.showPrivacyOptions();
          if (handled) {
            e.preventDefault();
            return;
          }
        }
      }
    };
    const gdprPrivacyLink = document.getElementById("gdpr-privacy-link");
    if (gdprPrivacyLink) gdprPrivacyLink.addEventListener("click", handlePrivacyLinkClick);
    const gdprTermsLink = document.getElementById("gdpr-terms-link");
    if (gdprTermsLink) gdprTermsLink.addEventListener("click", handlePrivacyLinkClick);
    const settingsPrivacyLink = document.getElementById("settings-privacy-link");
    if (settingsPrivacyLink) settingsPrivacyLink.addEventListener("click", handlePrivacyLinkClick);
    if (DOM_CACHE.offlineModalClaimBtn) {
      DOM_CACHE.offlineModalClaimBtn.addEventListener("click", () => {
        initSound2();
        if (DOM_CACHE.offlineModal) DOM_CACHE.offlineModal.classList.remove("active");
        game.offlineEarningsReport = 0;
        game.saveGame();
        draw();
      });
    }
    const prestigeModal = document.getElementById("prestige-modal");
    const prestigeAdBtn = document.getElementById("prestige-ad-btn");
    const prestigeRegularBtn = document.getElementById("prestige-regular-btn");
    const prestigeCancelBtn = document.getElementById("prestige-cancel-btn");
    if (prestigeAdBtn) {
      prestigeAdBtn.addEventListener("click", () => {
        initSound2();
        if (prestigeModal) {
          const target = parseInt(prestigeModal.getAttribute("data-target-branch"));
          const sharesPreview = game.calculatePrestigeShares() * 3;
          const _prT = translations[game.state && game.state.language || "en"] || translations.en;
          const branchName = game.branches && game.branches[target] ? game.branches[target].name : (_prT.branchLabel || "Branch") + " " + target;
          prestigeModal.classList.remove("active");
          playAd(() => {
            triggerPrestigeCeremony(sharesPreview, branchName, () => {
              game.prestige(target, true);
              game.saveGame();
              if (typeof applyLanguage === "function") applyLanguage(game.state && game.state.language || window.gameLanguage || "he");
              if (typeof syncBottomNav === "function") syncBottomNav("upgrades");
              const firstTabBtn = document.querySelector(".tab-btn");
              if (firstTabBtn) firstTabBtn.click();
              ReviewService.maybeRequest(game);
              draw();
            });
          });
        }
      });
    }
    if (prestigeRegularBtn) {
      prestigeRegularBtn.addEventListener("click", () => {
        initSound2();
        if (prestigeModal) {
          const target = parseInt(prestigeModal.getAttribute("data-target-branch"));
          const sharesPreview = game.calculatePrestigeShares();
          const _prT2 = translations[game.state && game.state.language || "en"] || translations.en;
          const branchName = game.branches && game.branches[target] ? game.branches[target].name : (_prT2.branchLabel || "Branch") + " " + target;
          prestigeModal.classList.remove("active");
          triggerPrestigeCeremony(sharesPreview, branchName, () => {
            game.prestige(target, false);
            game.saveGame();
            if (typeof applyLanguage === "function") applyLanguage(game.state && game.state.language || window.gameLanguage || "he");
            if (typeof syncBottomNav === "function") syncBottomNav("upgrades");
            const firstTabBtn = document.querySelector(".tab-btn");
            if (firstTabBtn) firstTabBtn.click();
            ReviewService.maybeRequest(game);
            draw();
          });
        }
      });
    }
    if (prestigeCancelBtn) {
      prestigeCancelBtn.addEventListener("click", () => {
        initSound2();
        if (prestigeModal) {
          prestigeModal.classList.remove("active");
        }
      });
    }
    if (DOM_CACHE.vaultEmptyBtn) {
      DOM_CACHE.vaultEmptyBtn.addEventListener("click", () => {
        initSound2();
        if (typeof hapticTap === "function") hapticTap(15);
        const collected = game.collectVault();
        if (collected > 0) {
          const rectBtn = DOM_CACHE.vaultEmptyBtn.getBoundingClientRect();
          spawnFloating("+" + formatMoney(collected), rectBtn.left + rectBtn.width / 2, rectBtn.top, "green", null, true);
          spawnVaultCoins(collected, rectBtn);
          game.saveGame();
          draw();
          var tips = game.state.discoveredTips || {};
          if (!tips.vault && tips.start) showDiscoveryTip("vault");
        }
      });
    }
    const vaultInfoBtn = document.getElementById("vault-info-btn");
    if (vaultInfoBtn) {
      vaultInfoBtn.addEventListener("click", () => {
        initSound2();
        const lang = game.state.language || "en";
        const tObj = translations[lang];
        if (tObj && typeof window.showToast === "function") {
          window.showToast(tObj.vaultInfoMsg, "info");
        }
      });
    }
    const vaultGraphicEl = DOM_CACHE.vaultGraphic;
    if (vaultGraphicEl) {
      vaultGraphicEl.addEventListener("click", () => {
        initSound2();
        for (let i = 0; i < game.state.guards.length; i++) {
          const g = game.state.guards[i];
          if (g.unlocked && g.state === "idle") {
            if (game.triggerGuard(g.id)) {
              break;
            }
          }
        }
        if (DOM_CACHE.vaultEmptyBtn) DOM_CACHE.vaultEmptyBtn.click();
      });
      vaultGraphicEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          vaultGraphicEl.click();
        }
      });
    }
    const triggerFirstInteraction = () => {
      initSound2();
      document.removeEventListener("click", triggerFirstInteraction);
      document.removeEventListener("touchstart", triggerFirstInteraction);
      document.removeEventListener("keydown", triggerFirstInteraction);
    };
    document.addEventListener("click", triggerFirstInteraction);
    document.addEventListener("touchstart", triggerFirstInteraction);
    document.addEventListener("keydown", triggerFirstInteraction);
    const camera = document.querySelector(".security-camera");
    if (camera) {
      camera.style.cursor = "pointer";
      camera.addEventListener("click", (e) => {
        initSound2();
        camera.classList.remove("camera-wiggle");
        void camera.offsetWidth;
        camera.classList.add("camera-wiggle");
        const bonus = 10 * (game.state.currentBranch + 1);
        game.addCash(bonus);
        const rect = camera.getBoundingClientRect();
        spawnFloating("+$" + bonus, rect.left + rect.width / 2, rect.top, "green", null, true);
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
        draw();
      });
    }
    const atm = document.querySelector(".atm-machine");
    if (atm) {
      atm.style.cursor = "pointer";
      atm.addEventListener("click", (e) => {
        initSound2();
        atm.classList.remove("atm-vibrate");
        void atm.offsetWidth;
        atm.classList.add("atm-vibrate");
        const receipt = document.createElement("div");
        receipt.className = "atm-receipt";
        receipt.innerText = "$" + 15 * (game.state.currentBranch + 1);
        atm.appendChild(receipt);
        setTimeout(() => receipt.remove(), 1200);
        const bonus = 15 * (game.state.currentBranch + 1);
        game.addCash(bonus);
        const rect = atm.getBoundingClientRect();
        spawnFloating("+$" + bonus, rect.left + rect.width / 2, rect.top, "green", null, true);
        if (window.gameAudio && typeof window.gameAudio.playClick === "function") {
          window.gameAudio.playClick();
        }
        draw();
      });
    }
    const plants = document.querySelectorAll(".potted-plant");
    plants.forEach((plant) => {
      plant.style.cursor = "pointer";
      plant.addEventListener("click", (e) => {
        initSound2();
        plant.classList.remove("plant-shake");
        void plant.offsetWidth;
        plant.classList.add("plant-shake");
        const leaf = document.createElement("div");
        leaf.className = "falling-leaf";
        leaf.innerText = "\u{1F343}";
        plant.appendChild(leaf);
        setTimeout(() => leaf.remove(), 1500);
        const bonus = 2 * (game.state.currentBranch + 1);
        game.addCash(bonus);
        const rect = plant.getBoundingClientRect();
        spawnFloating("+$" + bonus, rect.left + rect.width / 2, rect.top, "green", null, true);
        draw();
      });
    });
    setTimeout(() => {
      if (window.game && window.game.state) {
        checkWeeklyReward();
      }
    }, 2e3);
    initTutorialEvents();
    maybeStartTutorial();
  }
  window.showTutorialStep = function() {
  };
  window.completeTutorial = function() {
  };
  window.applyLanguage = applyLanguage;
  window.applyTheme = applyTheme;
  window.playAd = playAd;
  window.formatTime = formatTime2;
  window.activateModal = activateModal;
  window.openPrestigeModal = openPrestigeModal2;
  window.openBoostModal = openBoostModal;
  window.openAnalyticsModal = openAnalyticsModal;
  window.updateAdvDisplay = updateAdvDisplay2;
  window.updateMuteButton = updateMuteButton;
  window.initSound = initSound2;
  window.handlePurchaseFeedback = handlePurchaseFeedback2;
  window.handleMissionRedirect = handleMissionRedirect2;
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

  // app.js
  window.onboardingManager = onboardingManager;
  (() => {
    "use strict";
    if (!window.gameAudio) {
      window.gameAudio = {
        playClick: () => {
        },
        playUnlock: () => {
        },
        playChaChing: () => {
        },
        toggleMute: () => false,
        isMuted: true,
        init: () => {
        }
      };
    }
    function reportCrash2(message, stack) {
      try {
        const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
        const crashlytics = isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseCrashlytics;
        if (crashlytics) {
          const fullMessage = stack ? `${message}
${stack}` : String(message);
          crashlytics.recordException({ message: fullMessage.slice(0, 2e3) });
        }
      } catch {
      }
    }
    window.reportCrash = reportCrash2;
    window.game = void 0;
    window.currentUpgradeMode = "x1";
    window.lastTime = void 0;
    window.rafId = void 0;
    window.prevCustomerQueueString = "";
    window.prevTellerClientStates = {};
    window.DOM_CACHE = {
      stickyBar: null,
      stickyCash: null,
      stickyEps: null,
      stickyShares: null,
      missionsTabBadge: null,
      dailyTabBadge: null,
      cash: null,
      eps: null,
      shares: null,
      multiplier: null,
      branchName: null,
      muteBtn: null,
      resetBtn: null,
      advSlider: null,
      advDisplay: null,
      boostBtn: null,
      analyticsBtn: null,
      vaultInfoBtn: null,
      fortuneWheelBtn: null,
      vaultMiniLabel: null,
      skipLink: null,
      resetConfirmLabel: null,
      vaultMiniBtn: null,
      doubleIncomeLabel: null,
      analyticsFromSettingsBtn: null,
      footerPrivacyLink: null,
      footerTermsLink: null,
      controlPanelSection: null,
      controlPanelSrHeading: null,
      tabsNav: null,
      bottomNav: null,
      vaultMiniIcon: null,
      vaultMiniFillEl: null,
      bankFloorSection: null,
      langBtn: null,
      langModal: null,
      langModalClose: null,
      bulkSelector: null,
      customerLine: null,
      tellersZone: null,
      securityPath: null,
      guardAvatar: null,
      guardStatus: null,
      guardLoad: null,
      vaultGraphic: null,
      vaultFill: null,
      vaultStats: null,
      vaultEmptyBtn: null,
      queueLabel: null,
      queueZone: null,
      tabBranches: null,
      advLimitMax: null,
      floatingContainer: null,
      vaultCapValue: null,
      vaultYieldValue: null,
      vaultProgressLabel: null,
      prestigePreviewLabel: null,
      offlineModalClaimBtn: null,
      appTitle: null,
      labelCash: null,
      labelPerSecond: null,
      labelShares: null,
      labelMultiplier: null,
      labelSimulatorTitle: null,
      labelPanelBadge: null,
      labelAdvTitle: null,
      labelAdvLimitOff: null,
      labelGuardClickHint: null,
      labelVaultTitle: null,
      labelVaultLoading: null,
      labelVaultSubtitle: null,
      labelVaultYieldTitle: null,
      labelVaultYieldSub: null,
      labelVaultCapTitle: null,
      labelVaultVolumeTitle: null,
      labelCollectVaultBtn: null,
      tabBtnUpgrades: null,
      tabBtnManagers: null,
      tabBtnDepartments: null,
      tabBtnMissions: null,
      tabBtnBranches: null,
      labelFooter: null,
      bulkLabelText: null,
      offlineModalTitle: null,
      offlineModalText: null,
      langModalTitle: null,
      langModalText: null,
      settingsDangerTitle: null,
      settingsThemeTitle: null,
      labelAdvControl: null,
      vaultGraphicLabel: null,
      cashLiveBadge: null,
      splashSubtitle: null
    };
    document.addEventListener("DOMContentLoaded", () => {
      try {
        window.DOM_CACHE.cash = document.getElementById("cash-value");
        DOM_CACHE.stickyBar = document.getElementById("sticky-balance-bar");
        DOM_CACHE.stickyCash = document.getElementById("sticky-cash-val");
        DOM_CACHE.stickyEps = document.getElementById("sticky-eps-val");
        DOM_CACHE.stickyShares = document.getElementById("sticky-shares-val");
        DOM_CACHE.missionsTabBadge = document.getElementById("missions-tab-badge");
        DOM_CACHE.dailyTabBadge = document.getElementById("daily-tab-badge");
        window.DOM_CACHE.eps = document.getElementById("eps-value");
        window.DOM_CACHE.shares = document.getElementById("shares-value");
        window.DOM_CACHE.multiplier = document.getElementById("multiplier-value");
        window.DOM_CACHE.branchName = document.getElementById("branch-name");
        window.DOM_CACHE.muteBtn = document.getElementById("mute-btn");
        window.DOM_CACHE.resetBtn = document.getElementById("reset-game-btn");
        window.DOM_CACHE.advSlider = document.getElementById("adv-budget-slider");
        window.DOM_CACHE.advDisplay = document.getElementById("adv-budget-display");
        window.DOM_CACHE.boostBtn = document.getElementById("boost-btn");
        window.DOM_CACHE.boostLiveTimerPill = document.getElementById("boost-live-timer-pill");
        window.DOM_CACHE.headerDailyBtn = document.getElementById("header-daily-btn");
        window.DOM_CACHE.boostLiveTimerVal = document.getElementById("boost-live-timer-val");
        window.DOM_CACHE.analyticsBtn = document.getElementById("analytics-btn");
        window.DOM_CACHE.vaultInfoBtn = document.getElementById("vault-info-btn");
        window.DOM_CACHE.fortuneWheelBtn = document.getElementById("fortune-wheel-btn");
        window.DOM_CACHE.vaultMiniLabel = document.getElementById("vault-mini-label");
        window.DOM_CACHE.skipLink = document.getElementById("skip-link");
        window.DOM_CACHE.resetConfirmLabel = document.getElementById("reset-confirm-label");
        window.DOM_CACHE.vaultMiniBtn = document.getElementById("vault-mini-btn");
        window.DOM_CACHE.doubleIncomeLabel = document.getElementById("double-income-label");
        window.DOM_CACHE.analyticsFromSettingsBtn = document.getElementById("analytics-from-settings-btn");
        window.DOM_CACHE.footerPrivacyLink = document.getElementById("footer-privacy-link");
        window.DOM_CACHE.footerTermsLink = document.getElementById("footer-terms-link");
        window.DOM_CACHE.controlPanelSection = document.getElementById("control-panel-section");
        window.DOM_CACHE.controlPanelSrHeading = document.getElementById("control-panel-sr-heading");
        window.DOM_CACHE.tabsNav = document.getElementById("tabs-nav");
        window.DOM_CACHE.bottomNav = document.getElementById("bottom-nav");
        window.DOM_CACHE.vaultMiniIcon = document.getElementById("vault-mini-icon");
        window.DOM_CACHE.vaultMiniFillEl = document.getElementById("vault-mini-fill");
        window.DOM_CACHE.bankFloorSection = document.getElementById("bank-floor-section");
        window.DOM_CACHE.langBtn = document.getElementById("lang-btn");
        window.DOM_CACHE.langModal = document.getElementById("lang-modal");
        window.DOM_CACHE.langModalClose = document.getElementById("lang-modal-close");
        window.DOM_CACHE.bulkSelector = document.getElementById("global-bulk-selector");
        window.DOM_CACHE.customerLine = document.getElementById("customer-line");
        window.DOM_CACHE.tellersZone = document.getElementById("tellers-zone");
        window.DOM_CACHE.vaultGraphic = document.getElementById("vault-graphic");
        window.DOM_CACHE.vaultFill = document.getElementById("vault-fill");
        window.DOM_CACHE.vaultStats = document.getElementById("vault-stats");
        window.DOM_CACHE.vaultEmptyBtn = document.getElementById("collect-vault-btn");
        window.DOM_CACHE.queueLabel = document.getElementById("queue-label");
        window.DOM_CACHE.queueZone = document.querySelector(".queue-zone");
        window.DOM_CACHE.tabBranches = document.getElementById("tab-branches");
        window.DOM_CACHE.advLimitMax = document.getElementById("label-adv-limit-max");
        window.DOM_CACHE.floatingContainer = document.getElementById("floating-container");
        window.DOM_CACHE.vaultCapValue = document.getElementById("vault-cap-value");
        window.DOM_CACHE.vaultYieldValue = document.getElementById("vault-yield-value");
        window.DOM_CACHE.vaultProgressLabel = document.getElementById("vault-progress-label");
        window.DOM_CACHE.prestigePreviewLabel = document.getElementById("prestige-preview-label");
        window.DOM_CACHE.offlineModal = document.getElementById("offline-modal");
        window.DOM_CACHE.offlineModalAmount = document.getElementById("modal-amount");
        window.DOM_CACHE.offlineModalDoubleBtn = document.getElementById("offline-double-btn");
        window.DOM_CACHE.offlineModalClaimBtn = document.getElementById("offline-claim-btn");
        window.DOM_CACHE.appTitle = document.getElementById("app-title");
        window.DOM_CACHE.labelCash = document.getElementById("label-cash");
        window.DOM_CACHE.labelPerSecond = document.getElementById("label-per-second");
        window.DOM_CACHE.labelShares = document.getElementById("label-shares");
        window.DOM_CACHE.labelMultiplier = document.getElementById("label-multiplier");
        window.DOM_CACHE.labelSimulatorTitle = document.getElementById("label-simulator-title");
        window.DOM_CACHE.labelPanelBadge = document.getElementById("label-panel-badge");
        window.DOM_CACHE.labelAdvTitle = document.getElementById("label-adv-title");
        window.DOM_CACHE.labelAdvLimitOff = document.getElementById("label-adv-limit-off");
        window.DOM_CACHE.labelGuardClickHint = document.getElementById("label-guard-click-hint");
        window.DOM_CACHE.labelVaultTitle = document.getElementById("label-vault-title");
        window.DOM_CACHE.labelVaultLoading = document.getElementById("label-vault-loading");
        window.DOM_CACHE.labelVaultSubtitle = document.getElementById("label-vault-subtitle");
        window.DOM_CACHE.labelVaultYieldTitle = document.getElementById("label-vault-yield-title");
        window.DOM_CACHE.labelVaultYieldSub = document.getElementById("label-vault-yield-sub");
        window.DOM_CACHE.labelVaultCapTitle = document.getElementById("label-vault-cap-title");
        window.DOM_CACHE.labelVaultVolumeTitle = document.getElementById("label-vault-volume-title");
        window.DOM_CACHE.labelCollectVaultBtn = document.getElementById("label-collect-vault-btn");
        window.DOM_CACHE.tabBtnUpgrades = document.getElementById("tab-btn-upgrades");
        window.DOM_CACHE.tabBtnManagers = document.getElementById("tab-btn-managers");
        window.DOM_CACHE.tabBtnDepartments = document.getElementById("tab-btn-departments");
        window.DOM_CACHE.tabBtnMissions = document.getElementById("tab-btn-missions");
        window.DOM_CACHE.tabBtnBranches = document.getElementById("tab-btn-branches");
        window.DOM_CACHE.labelFooter = document.getElementById("label-footer");
        window.DOM_CACHE.bulkLabelText = document.getElementById("bulk-label-text");
        window.DOM_CACHE.offlineModalTitle = document.getElementById("offline-modal-title");
        window.DOM_CACHE.offlineModalText = document.getElementById("offline-modal-text");
        window.DOM_CACHE.langModalTitle = document.getElementById("lang-modal-title");
        window.DOM_CACHE.langModalText = document.getElementById("lang-modal-text");
        window.DOM_CACHE.settingsDangerTitle = document.getElementById("settings-danger-title");
        window.DOM_CACHE.settingsThemeTitle = document.getElementById("settings-theme-title");
        window.DOM_CACHE.labelAdvControl = document.getElementById("label-adv-control");
        window.DOM_CACHE.vaultGraphicLabel = document.getElementById("vault-graphic-label");
        window.DOM_CACHE.cashLiveBadge = document.getElementById("cash-live-badge");
        window.DOM_CACHE.splashSubtitle = document.getElementById("splash-subtitle");
        window.DOM_CACHE.queueCapLabel = document.getElementById("queue-capacity-label");
        window.DOM_CACHE.queueFillBar = document.getElementById("queue-progress-fill");
        window.DOM_CACHE.queueStatText = document.getElementById("queue-status-text");
        window.DOM_CACHE.queueStatIcon = document.getElementById("queue-status-icon");
        window.DOM_CACHE.queueStatSubtext = document.getElementById("queue-status-subtext");
        window.DOM_CACHE.queueStatBadge = document.getElementById("queue-status-badge");
        window.DOM_CACHE.queueWrapper = document.getElementById("queue-wrapper");
        if (typeof window.IdleBankGame !== "function") {
          console.error("IdleBankGame class is not defined. game.js may have failed to load.");
          throw new Error("IdleBankGame not defined \u2014 caught by boot try/catch");
        }
        window.game = new window.IdleBankGame();
        delete window.IdleBankGame;
        if (typeof window.DailyChallengeController === "function") {
          window.dailyChallengeController = new window.DailyChallengeController(window.game);
          window.dailyChallengeController.checkAndReset();
        }
        initUIEvents();
        let defaultLang = "en";
        const navLang = (navigator.language || navigator.userLanguage || "").toLowerCase();
        if (navLang.startsWith("he")) defaultLang = "he";
        else if (navLang.startsWith("es")) defaultLang = "es";
        else if (navLang.startsWith("ru")) defaultLang = "ru";
        const chosenLang = window.game.state.language || defaultLang;
        const isFirstTime = !window.localStorage.getItem("idle_bank_language_chosen");
        if (isFirstTime) {
          window.game.setLanguage(defaultLang);
          applyLanguage(defaultLang);
          if (DOM_CACHE.langModalClose) DOM_CACHE.langModalClose.style.display = "none";
          const showLangModal = () => {
            if (DOM_CACHE.langModal) window.activateModal(DOM_CACHE.langModal);
          };
          if (window.NotificationQueue) {
            window.NotificationQueue.request("lang-modal", window.NotificationQueue.PRIORITY.CRITICAL, showLangModal);
          } else {
            showLangModal();
          }
        } else {
          applyLanguage(chosenLang);
        }
        const savedTheme = window.localStorage.getItem("idle_bank_theme") || "blue";
        applyTheme(savedTheme);
        const hapticsCheckbox = document.getElementById("settings-haptics-checkbox");
        if (hapticsCheckbox) {
          hapticsCheckbox.checked = window.game.state.hapticsEnabled !== false;
        }
        const notifCheckbox = document.getElementById("settings-notif-checkbox");
        if (notifCheckbox) {
          notifCheckbox.checked = window.game.state.notificationsEnabled !== false;
        }
        if (window.NotificationService) window.NotificationService.init();
        if (window.ReviewService) window.ReviewService.init();
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            cancelAnimationFrame(window.rafId);
            if (window.game) {
              window.game.saveGame(true);
              if (window.NotificationService) {
                if (window.game.state.tutorialCompleted) {
                  window.NotificationService.requestPermission().then(() => {
                    window.NotificationService.scheduleReminders(window.game);
                  });
                }
              }
            }
            if (window.gameAudio && typeof window.gameAudio.suspend === "function") {
              window.gameAudio.suspend();
            }
          } else {
            if (window.NotificationService) window.NotificationService.cancelAll();
            if (window.gameAudio && typeof window.gameAudio.resume === "function") {
              window.gameAudio.resume();
            }
            window.game.recalculateEps();
            window.game.calculateOfflineEarnings();
            if (typeof window.showOfflineEarningsModal === "function") {
              window.showOfflineEarningsModal();
            }
            window.lastTime = performance.now();
            refreshAllTabs();
            cancelAnimationFrame(window.rafId);
            window.rafId = requestAnimationFrame(tick);
          }
        });
        if (typeof window.showOfflineEarningsModal === "function") {
          window.showOfflineEarningsModal();
        }
        const vaultGraphicEl = document.getElementById("vault-graphic");
        if (vaultGraphicEl) {
          if (!vaultGraphicEl.querySelector(".vault-door-img")) {
            const vaultImg = document.createElement("img");
            vaultImg.className = "vault-door-img";
            vaultImg.src = "images/vault-door.png";
            vaultImg.alt = "";
            vaultGraphicEl.insertBefore(vaultImg, vaultGraphicEl.firstChild);
          }
        }
        window.DOM_CACHE.vaultDoorImg = document.querySelector(".vault-door-img");
        const splashScreen = document.getElementById("splash-screen");
        if (splashScreen) {
          if (typeof window.rebuildTellersDOM === "function") window.rebuildTellersDOM();
          if (typeof initCoinPool === "function") initCoinPool();
          if (typeof window.renderUpgradesTab === "function") window.renderUpgradesTab();
          if (typeof window.renderManagersTab === "function") window.renderManagersTab();
          if (typeof window.renderDepartmentsTab === "function") window.renderDepartmentsTab();
          if (typeof window.renderMissionsTab === "function") window.renderMissionsTab();
          if (typeof window.renderBranchesTab === "function") window.renderBranchesTab();
          if (window.Capacitor) {
            document.documentElement.classList.add("is-capacitor");
            if (typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() === "android") {
              document.documentElement.classList.add("is-android");
            }
          }
          if (window.Capacitor && window.Capacitor.Plugins) {
            if (window.Capacitor.Plugins.SplashScreen) {
              window.Capacitor.Plugins.SplashScreen.hide();
            }
            const SB = window.Capacitor.Plugins.StatusBar;
            if (SB) {
              try {
                SB.setOverlaysWebView({ overlay: false }).catch(() => {
                });
                SB.setStyle({ style: "DARK" }).catch(() => {
                });
                SB.setBackgroundColor({ color: "#03050a" }).catch(() => {
                });
              } catch (_e) {
              }
            }
            const CapApp = window.Capacitor.Plugins.App;
            if (CapApp) {
              try {
                CapApp.addListener("backButton", ({ canGoBack }) => {
                  const modals = Array.from(document.querySelectorAll(".modal.active, .modal:not([hidden]).show, .tutorial-modal.active"));
                  if (modals.length > 0) {
                    const topModal = modals[modals.length - 1];
                    topModal.classList.remove("active", "show");
                    topModal.setAttribute("hidden", "true");
                    return;
                  }
                  CapApp.exitApp();
                });
              } catch (_e) {
              }
            }
          }
          const finishSplash = () => {
            setTimeout(() => {
              splashScreen.style.opacity = "0";
              splashScreen.style.transform = "scale(1.05)";
              splashScreen.style.visibility = "hidden";
              setTimeout(() => splashScreen.remove(), 800);
            }, 500);
          };
          const fill = document.getElementById("splash-progress-fill");
          const pText = document.getElementById("splash-progress-text");
          if (fill && pText) {
            let progress = 0;
            const interval = setInterval(() => {
              progress += Math.floor(Math.random() * 12) + 8;
              if (progress >= 100) progress = 100;
              fill.style.width = progress + "%";
              pText.innerText = progress + "%";
              if (progress === 100) {
                clearInterval(interval);
                finishSplash();
              }
            }, 80);
          } else {
            finishSplash();
          }
        }
        if (!localStorage.getItem("gdpr_consent")) {
          setTimeout(() => {
            const banner = document.getElementById("gdpr-banner");
            if (banner) banner.style.display = "flex";
          }, 1800);
        }
        window.lastTime = performance.now();
        cancelAnimationFrame(window.rafId);
        window.rafId = requestAnimationFrame(tick);
        if (window.PerformanceManager) {
          const urlParams = new URLSearchParams(window.location.search);
          const forcePerf = urlParams.get("perf");
          window.PerformanceManager.apply(forcePerf || window.game.state.perfMode);
          window.PerformanceManager.probe().then((fps) => {
            if (typeof fps === "number") window.game.state.lastMeasuredFps = fps;
            const finalMode = forcePerf || window.game.state.perfMode;
            window.PerformanceManager.apply(finalMode, fps);
          });
        }
        if (window.Capacitor && "serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let reg of registrations) {
              reg.unregister();
            }
          });
        } else if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
          navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((reg) => {
            reg.update();
          }).catch((err) => console.error("Service Worker registration failed", err));
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (typeof window.game !== "undefined" && window.game && typeof window.game.saveGame === "function") {
              window.game.saveGame(true);
            }
            window.location.reload();
          });
        }
      } catch (bootErr) {
        console.error("[IDLE BANK BOOT ERROR]", bootErr);
        const splashScreen = document.getElementById("splash-screen");
        if (splashScreen) {
          splashScreen.style.opacity = "0";
          splashScreen.style.visibility = "hidden";
          setTimeout(() => splashScreen.remove(), 800);
        }
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
          window.Capacitor.Plugins.SplashScreen.hide();
        }
      }
    });
    window.addEventListener("beforeunload", () => {
      if (window.game) {
        window.game.saveGame(true);
      }
    });
    window.onerror = function(message, source, lineno, colno, error) {
      console.error("Global crash intercepted:", message, "at", source, ":", lineno);
      reportCrash2(`${message} at ${source}:${lineno}:${colno}`, error && error.stack);
      const activeGame = window.game;
      if (activeGame) {
        try {
          activeGame.saveGame(true);
        } catch (saveErr) {
          console.error("Failed to save state during window.onerror crash recovery:", saveErr);
        }
      }
      return false;
    };
    window.addEventListener("unhandledrejection", function(event) {
      console.error("Unhandled promise rejection intercepted:", event.reason);
      const reason = event.reason;
      reportCrash2(reason && reason.message ? reason.message : String(reason), reason && reason.stack);
      const activeGame = window.game;
      if (activeGame) {
        try {
          activeGame.saveGame(true);
        } catch (saveErr) {
          console.error("Failed to save state during unhandledrejection crash recovery:", saveErr);
        }
      }
    });
  })();
})();
//# sourceMappingURL=app.bundle.js.map
