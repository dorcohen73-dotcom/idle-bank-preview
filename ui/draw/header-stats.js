import { formatMoney, fastFormat, formatNumberCompact, cachedLang } from './format.js';

let lastCash = -1;
let lastEps = -1;
let lastShares = -1;
let lastMultiplier = -1;
let lastBranch = -1;
let lastLang = '';

// Upper stats bar: cash / EPS / shares / multiplier / branch name.
export function updateHeaderStats(lang, tObj) {
    if (game.state.cash !== lastCash || lang !== lastLang) {
        lastCash = game.state.cash;
        DOM_CACHE.cash.innerText = formatMoney(game.state.cash);
        if (typeof window.checkPrestigeTip === 'function') window.checkPrestigeTip();
    }

    const currentEps = game.getEarningsPerSecond();
    if (currentEps !== lastEps || lang !== lastLang) {
        lastEps = currentEps;
        DOM_CACHE.eps.innerText = formatMoney(currentEps);
    }

    if (game.state.shares !== lastShares || lang !== lastLang) {
        lastShares = game.state.shares;
        DOM_CACHE.shares.innerText = formatNumberCompact(game.state.shares, true);
    }

    const mult = game.getTotalMultiplier();
    if (mult !== lastMultiplier || lang !== lastLang) {
        lastMultiplier = mult;
        DOM_CACHE.multiplier.innerText = formatNumberCompact(mult) + 'x';
    }

    // Always update sticky stats directly in DOM
    const sCash = document.getElementById('sticky-cash-val');
    if (sCash) sCash.innerText = formatMoney(game.state.cash);
    const sEps = document.getElementById('sticky-eps-val');
    if (sEps) sEps.innerText = formatMoney(currentEps);
    const sShares = document.getElementById('sticky-shares-val');
    if (sShares) sShares.innerText = formatNumberCompact(game.state.shares, true);

    if (game.state.currentBranch !== lastBranch || lang !== lastLang) {
        lastBranch = game.state.currentBranch;
        const branchName = (tObj.branches && tObj.branches.names && tObj.branches.names[game.state.currentBranch])
            || (game.branches && game.branches[game.state.currentBranch] && game.branches[game.state.currentBranch].name)
            || ((tObj.branchLabel || 'Branch') + ' ' + (game.state.currentBranch + 1));
        const bEl = DOM_CACHE.branchName || document.getElementById('branch-name');
        if (bEl) bEl.innerText = (tObj.bankPrefix || '') + branchName;
    }

    lastLang = lang;
}

// Refresh advertising campaign dynamic display state (slider + max label).
export function updateAdCampaignDisplay() {
    if (DOM_CACHE.advSlider) {
        const maxBudget = game.getAdMaxBudget();
        const budget = game.state.advBudget || 0;
        if (budget === 0) {
            DOM_CACHE.advSlider.value = 0;
        } else {
            DOM_CACHE.advSlider.value = Math.round(1000 * (budget / maxBudget));
        }

        const maxLabelEl = DOM_CACHE.advLimitMax;
        if (maxLabelEl) {
            maxLabelEl.innerText = formatMoney(maxBudget);
        }
    }
    updateAdvDisplay(game.state.advBudget || 0);
}

function formatCompactTime(sec) {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    if (hours > 0) {
        return `${hours}h${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Refresh the 2x boost button — active countdown, offer countdown, or idle label.
export function updateBoostButtonDisplay(tObj) {
    if (DOM_CACHE.boostBtn) {
        let timerBadge = DOM_CACHE.boostBtn.querySelector('.boost-timer-badge');
        if (!timerBadge) {
            DOM_CACHE.boostBtn.innerHTML = '<span aria-hidden="true">⚡</span><span class="boost-timer-badge" id="boost-timer-badge">2x</span>';
            timerBadge = DOM_CACHE.boostBtn.querySelector('.boost-timer-badge');
        }

        const secs = game.state.boost2xTimeLeft || 0;
        const liveTimerPill = DOM_CACHE.boostLiveTimerPill || document.getElementById('boost-live-timer-pill');
        const liveTimerVal = DOM_CACHE.boostLiveTimerVal || document.getElementById('boost-live-timer-val');

        if (liveTimerPill) {
            liveTimerPill.style.display = 'inline-flex';
        }

        if (secs > 0) {
            const timeStr = formatCompactTime(secs);
            const fullTimeStr = formatTime(secs);
            const activeText = (tObj && typeof tObj.boostActive === 'function') ? tObj.boostActive(fullTimeStr) : `⚡ Boost: ${fullTimeStr}`;
            DOM_CACHE.boostBtn.title = activeText;
            DOM_CACHE.boostBtn.setAttribute('data-time', timeStr);
            DOM_CACHE.boostBtn.classList.add('active');
            DOM_CACHE.boostBtn.classList.remove('offer');

            if (liveTimerVal) {
                liveTimerVal.textContent = timeStr;
            }
            if (liveTimerPill) {
                liveTimerPill.classList.remove('idle-blink');
                if (secs <= 60) {
                    liveTimerPill.classList.add('urgent');
                    DOM_CACHE.boostBtn.classList.add('urgent-boost');
                } else {
                    liveTimerPill.classList.remove('urgent');
                    DOM_CACHE.boostBtn.classList.remove('urgent-boost');
                }
            }

            if (timerBadge) {
                timerBadge.textContent = '2x';
                timerBadge.classList.remove('urgent');
            }
        } else {
            DOM_CACHE.boostBtn.removeAttribute('data-time');
            DOM_CACHE.boostBtn.classList.remove('urgent-boost', 'active');
            if (liveTimerVal) {
                liveTimerVal.textContent = '00:00';
            }
            if (liveTimerPill) {
                liveTimerPill.classList.remove('urgent');
                liveTimerPill.classList.add('idle-blink');
            }

            const nowMs = Date.now();
            const offerEnd = window._boostOfferEndTime || 0;
            if (offerEnd > nowMs) {
                const offerSec = Math.ceil((offerEnd - nowMs) / 1000);
                const timeStr = formatTime(offerSec);
                const boostOfferFn = tObj ? tObj.boostOfferText : null;
                const offerText = typeof boostOfferFn === 'function' ? boostOfferFn(timeStr) : `⚡ OFFER! ${timeStr}`;
                DOM_CACHE.boostBtn.title = offerText;
                DOM_CACHE.boostBtn.classList.add('offer');
            } else {
                DOM_CACHE.boostBtn.title = (tObj && tObj.boostBtn) || "⚡ BOOST x2";
                DOM_CACHE.boostBtn.classList.remove('offer');
            }
            if (timerBadge) {
                timerBadge.textContent = '2x';
                timerBadge.classList.remove('urgent');
            }
        }
    }
}

// Update customer queue count display and visual status indicators (Clean & Breathable)
export function updateQueueDisplay(tObj) {
    const capLabel = DOM_CACHE.queueCapLabel;
    const fillBar  = DOM_CACHE.queueFillBar;
    const statText = DOM_CACHE.queueStatText;
    const statIcon = DOM_CACHE.queueStatIcon;
    const statPill = document.getElementById('queue-status-pill');

    if (capLabel && window.game) {
        const queueData = game.getQueueRenderData();
        const maxCap = queueData.capacity;
        const currentLen = queueData.currentLen;

        capLabel.textContent = `${currentLen}/${maxCap}`;

        if (fillBar) {
            const pct = Math.min(100, Math.max(0, (currentLen / maxCap) * 100));
            fillBar.style.width = `${pct}%`;
            fillBar.setAttribute('aria-valuenow', Math.round(pct));
        }

        const isTooLow = currentLen <= 1;
        const isTooHigh = currentLen >= maxCap - 1 || (maxCap > 0 && currentLen / maxCap >= 0.8);

        if (isTooLow) {
            if (statText) statText.textContent = tObj.queueStatusEmpty || 'התור פנוי';
            if (statIcon) statIcon.textContent = '!';
            if (statPill) statPill.className = 'queue-status-pill alert-pill';
        } else if (isTooHigh) {
            const spotsLeft = maxCap - currentLen;
            if (statText) {
                if (spotsLeft <= 0) {
                    statText.textContent = tObj.queueStatusFull || 'תור מלא!';
                } else if (spotsLeft === 1) {
                    statText.textContent = tObj.queueOneSpotLeft || 'נותר מקום 1';
                } else {
                    statText.textContent = tObj.queueSpotsLeft ? tObj.queueSpotsLeft(spotsLeft) : `נותרו ${spotsLeft} מקומות`;
                }
            }
            if (statIcon) statIcon.textContent = '⚠️';
            if (statPill) statPill.className = 'queue-status-pill warning-pill';
        } else {
            if (statText) statText.textContent = tObj.queueStatusOk || 'תור פעיל';
            if (statIcon) statIcon.textContent = '✔';
            if (statPill) statPill.className = 'queue-status-pill ok-pill';
        }
    }
}