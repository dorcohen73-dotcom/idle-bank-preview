import { updateCachedSuffixes, formatMoney, fastFormat, getClientSVG } from './format.js';
import { showToast } from './toast.js';
import {
    activeCoins, spawnFloating, updateFloatingText, initCoinPool,
    clearActiveCoins, updateActiveCoins, spawnParticles, animateCoins,
} from './animations.js';
import { rebuildTellersDOM, updateTellersDisplay } from './bank-floor.js';
import { updateGuardsDisplay } from './security.js';
import { updateVaultDisplay } from './vault.js';
import { updateHeaderStats, updateAdCampaignDisplay, updateBoostButtonDisplay, updateQueueDisplay } from './header-stats.js';
import { updateNotifications } from './notifications.js';

// Main per-frame render loop. Each concern below lives in its own named,
// independently-callable function (see ui/draw/*.js) — a deliberate step
// towards a future reactive model, where a given concern here can be swapped
// for a state-change listener without touching the others.
let drawFrameCounter = 0;

function draw() {
    const lang = window.gameLanguage || (window.game && window.game.state && window.game.state.language) || 'he';
    const tObj = translations[lang];
    const vaultData = game.getVaultRenderData();

    if (game.cheatWarning) {
        game.cheatWarning = false;
        showToast(tObj.cheatDetectedMsg || "⚠️ Save editing detected!", 'danger');
    }

    drawFrameCounter++;
    const isEco = window.PerformanceManager && window.PerformanceManager.isEco();
    const skipTextUpdates = isEco && (drawFrameCounter % 2 !== 0);

    if (!skipTextUpdates) {
        updateHeaderStats(lang, tObj);
        updateAdCampaignDisplay();
        updateBoostButtonDisplay(tObj);
        updateQueueDisplay(tObj);
        updateVaultDisplay(tObj, vaultData);
        updateNotifications();
    }

    // Visual movement always updates every frame for smoothness
    updateTellersDisplay(tObj, vaultData);
    updateGuardsDisplay(lang);
}

export {
    updateCachedSuffixes, showToast, fastFormat, formatMoney, getClientSVG,
    spawnFloating, updateFloatingText, updateActiveCoins, animateCoins, spawnParticles,
    initCoinPool, rebuildTellersDOM, clearActiveCoins, activeCoins,
    draw,
};

// Dual-exposed on window for classic <script> consumers and other ui/* modules
// that still call these as bare/window globals (see build plan).
window.updateCachedSuffixes = updateCachedSuffixes;
window.showToast = showToast;
window.fastFormat = fastFormat;
window.formatMoney = formatMoney;
window.getClientSVG = getClientSVG;
window.spawnFloating = spawnFloating;
window.updateFloatingText = updateFloatingText;
window.updateActiveCoins = updateActiveCoins;
window.animateCoins = animateCoins;
window.spawnParticles = spawnParticles;
window.initCoinPool = initCoinPool;
window.rebuildTellersDOM = rebuildTellersDOM;
window.draw = draw;
window.clearActiveCoins = clearActiveCoins;
window.activeCoins = activeCoins;
