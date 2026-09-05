import { formatMoney, cachedLang } from './format.js';
import { showToast } from './toast.js';

let lastVaultPercent = -1;
let prevVaultStatsHtml = '';
let vaultFullToastShown = false;

const _prestigePreviewTexts = {
    he: (val) => `אם תעשה Prestige עכשיו: +${val} מניות 🏅`,
    en: (val) => `Prestige now: +${val} shares 🏅`,
    es: (val) => `Prestigio ahora: +${val} acciones 🏅`,
    ru: (val) => `Престиж сейчас: +${val} акций 🏅`
};

// Per-frame refresh of the vault fill bar/stats, prestige buttons and preview,
// and the vault door's cosmetic level-based visual progression.
export function updateVaultDisplay(tObj, vaultData) {
    const vPercent = vaultData.fillPercent;
    const vCap = vaultData.capacity;

    if (vPercent !== lastVaultPercent) {
        lastVaultPercent = vPercent;
        if (DOM_CACHE.vaultFill) {
            DOM_CACHE.vaultFill.style.width = `${vPercent}%`;
            DOM_CACHE.vaultFill.setAttribute('aria-valuenow', Math.round(vPercent));
        }
    }

    // Always keep vault mini bar synchronized with current active language and format
    if (typeof window.updateVaultMiniBar === 'function') {
        const vLvl = (window.game && window.game.state && window.game.state.vaultLevel) || (vaultData && vaultData.level) || 1;
        window.updateVaultMiniBar(vPercent, vaultData.cashStored > 0, vaultData.cashStored, vaultData.capacity, vaultData.yieldPerHour, vLvl);
    }

    if (vPercent >= 95) {
        if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.add('vault-full');
        if (!vaultFullToastShown) {
            showToast(tObj.vaultFullMsg || "Vault is full — empty it", 'danger');
            vaultFullToastShown = true;
        }
    } else {
        if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.remove('vault-full');
        vaultFullToastShown = false;
    }

    if (vaultData.cashStored >= vCap) {
        if (DOM_CACHE.vaultFill) DOM_CACHE.vaultFill.classList.add('full');
        if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.add('full');
    } else {
        if (DOM_CACHE.vaultFill) DOM_CACHE.vaultFill.classList.remove('full');
        if (DOM_CACHE.vaultGraphic) DOM_CACHE.vaultGraphic.classList.remove('full');
    }

    const newVaultStatsHtml = `
        <div>
            <span class="vault-current-value">${formatMoney(vaultData.cashStored)}</span> / <span class="vault-limit-label">${formatMoney(vCap)}</span>
        </div>
    `;
    if (prevVaultStatsHtml !== newVaultStatsHtml) {
        if (DOM_CACHE.vaultStats) DOM_CACHE.vaultStats.innerHTML = newVaultStatsHtml;
        prevVaultStatsHtml = newVaultStatsHtml;
    }

    // Update new premium elements: capacity label, yield per hour, progress label
    const elVaultCapValue = DOM_CACHE.vaultCapValue;
    if (elVaultCapValue) {
        const newCapText = formatMoney(vCap);
        if (elVaultCapValue.innerText !== newCapText) {
            elVaultCapValue.innerText = newCapText;
        }
    }

    const elVaultYieldValue = DOM_CACHE.vaultYieldValue;
    if (elVaultYieldValue) {
        const newYieldText = `+${formatMoney(vaultData.yieldPerHour)}`;
        if (elVaultYieldValue.innerText !== newYieldText) {
            elVaultYieldValue.innerText = newYieldText;
        }
    }

    const elVaultProgressLabel = DOM_CACHE.vaultProgressLabel || document.getElementById('vault-progress-label');
    if (elVaultProgressLabel) {
        const progressLabelFn = tObj.vaultProgressLabel;
        const newProgressText = typeof progressLabelFn === 'function' ? progressLabelFn(vPercent) : `${vPercent}%`;
        if (elVaultProgressLabel.innerText !== newProgressText) {
            elVaultProgressLabel.innerText = newProgressText;
        }
    }

    if (DOM_CACHE.vaultEmptyBtn) {
        if (vaultData.cashStored <= 0) {
            DOM_CACHE.vaultEmptyBtn.classList.add('disabled');
        } else {
            DOM_CACHE.vaultEmptyBtn.classList.remove('disabled');
        }
    }

    // Update prestige buttons state visually
    const branchTab = DOM_CACHE.tabBranches;
    if (branchTab && branchTab.classList.contains('active')) {
        const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.90);
        const prestigeBtns = branchTab.querySelectorAll('.main-prestige-btn, .branch-action-btn[data-prestige-branch]');
        const prestigeReq = game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.90);
        prestigeBtns.forEach(btn => {
            if (currentCanPrestige) {
                btn.classList.remove('disabled');
                btn.removeAttribute('disabled');
                btn.innerText = tObj.branches.sellAndBuild;
            } else {
                btn.classList.add('disabled');
                btn.setAttribute('disabled', 'true');
                btn.innerText = tObj.branches.minCash(formatMoney(prestigeReq));
            }
        });
    }

    // Update prestige shares preview (_prestigePreviewTexts is defined at module scope)
    const pendingShares = game.calculatePrestigeShares();
    const previewEl = DOM_CACHE.prestigePreviewLabel;
    if (previewEl) {
        const textFn = _prestigePreviewTexts[cachedLang] || _prestigePreviewTexts.he;
        previewEl.innerText = textFn(pendingShares);
    }

    // Dynamic vault visual progression
    const vaultImg = DOM_CACHE.vaultDoorImg;
    if (vaultImg) {
        if (vaultData.level >= 50) {
            vaultImg.style.filter = 'drop-shadow(0 0 20px gold) hue-rotate(45deg) brightness(1.2)';
            vaultImg.style.transform = 'scale(1.05)';
        } else if (vaultData.level >= 25) {
            vaultImg.style.filter = 'drop-shadow(0 0 10px silver) brightness(1.1)';
            vaultImg.style.transform = 'scale(1.02)';
        } else {
            vaultImg.style.filter = 'none';
            vaultImg.style.transform = 'scale(1)';
        }
    }
}
