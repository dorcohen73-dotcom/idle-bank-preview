import { formatMoney } from './format.js';
import { spawnFloating } from './animations.js';

export let TELLER_DOM_CACHE = {};
let prevTellerCashHtml = {};
let prevTellerClientStates = {};

export function rebuildTellersDOM() {
    const lang = game.state.language || 'en';
    DOM_CACHE.tellersZone.innerHTML = '';
    DOM_CACHE.tellersZone.className = `tellers-zone count-${game.state.tellers.length}`;

    // Reset cached teller elements
    for (const id in TELLER_DOM_CACHE) {
        delete TELLER_DOM_CACHE[id];
    }

    game.state.tellers.forEach(t => {
        const div = document.createElement('div');
        div.id = `teller-node-${t.id}`;
        div.className = `teller-counter ${t.unlocked ? 'active' : 'locked'}`;
        div.setAttribute('data-id', t.id);

        if (t.unlocked) {
            div.innerHTML = `
                <div class="glass-showcase">
                    <img class="teller-bg-img" src="images/teller-${(t.id % 8) + 1}.png?v=20260626" alt="" />
                    <div class="client-slot-3d" id="teller-client-${t.id}" title="${translations[lang].servingClientLabel}"></div>
                </div>
                <div class="gold-plaque">
                    <div class="plaque-header">
                        <span class="plaque-title">${translations[lang].tellerLabel} ${t.id + 1}</span>
                        <span class="plaque-level${t.level >= 10 ? ' milestone-active' : ''}" id="teller-lvl-lbl-${t.id}">${translations[lang].levelLabel} ${t.level}</span>
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

            // Cache DOM elements for Game Loop performance optimization
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

            // Handle manual process start if NO manager
            div.addEventListener('click', (e) => {
                initSound();
                if (typeof window !== 'undefined' && window.onboardingManager && window.onboardingManager.isStep(1)) {
                    if (t.id === 0) {
                        game.state.tellers[0].cashStored = Math.max(50, game.state.tellers[0].cashStored || 0);
                        game.collectTellerCash(0);
                        window.onboardingManager.advance();
                        return;
                    }
                }
                if (!e.target.closest('.plaque-collect-btn')) {
                    game.clickTeller(t.id);
                }
            });

            // Handle manual desk collect
            const collectBtn = div.querySelector(`#teller-collect-${t.id}`);
            collectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                initSound();
                if (typeof window !== 'undefined' && window.onboardingManager && window.onboardingManager.isStep(1)) {
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
                    spawnFloating('+' + formatMoney(collected), rectBtn.left + rectBtn.width/2, rectBtn.top, 'green');
                }
            });
        } else {
            const cost = game.tellerUnlockCosts[t.id];
            div.innerHTML = `
                <div class="lock-info">
                    <div class="lock-icon">🔒</div>
                    <div style="font-size:0.8rem; margin-bottom: 0.15rem;">${translations[lang].unlockLabel}</div>
                    <div class="lock-cost">${formatMoney(cost)}</div>
                </div>
            `;

            div.addEventListener('click', () => {
                initSound();
                if (game.unlockTeller(t.id)) {
                    rebuildTellersDOM();
                    renderUpgradesTab();
                }
            });
        }

        DOM_CACHE.tellersZone.appendChild(div);
    });
}

// Per-frame refresh of teller loading bars, cash labels, client slots and vault-full alert.
export function updateTellersDisplay(tObj, vaultData) {
    game.state.tellers.forEach(t => {
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
                    lvlLabel.classList.add('milestone-active');
                } else {
                    lvlLabel.classList.remove('milestone-active');
                }
                tCache.lastLevel = tData.level;
            }

            if (tData.isProcessing) {
                tNode.classList.add('processing');
                if (tData.progressPercent !== tCache.lastPercent) {
                    tCache.lastPercent = tData.progressPercent;
                    if (progressFill) progressFill.style.transform = `scaleX(${tData.progressPercent / 100})`;
                }
            } else {
                tNode.classList.remove('processing');
                if (tCache.lastPercent !== 0) {
                    tCache.lastPercent = 0;
                    if (progressFill) progressFill.style.transform = 'scaleX(0)';
                }
            }

            if (cashLabel) {
                let cashIcons = '';
                const safeCash = Math.max(0, tData.cashStored || 0);
                let cashText = formatMoney(safeCash);
                
                if (safeCash > 0) {
                    if (tData.fillPercent >= 100) {
                        cashIcons = '';
                        cashText = `<span class="teller-full-alert">${tObj.upgrades.tellerFull || 'Full Teller'}</span><br/><span style="font-size:0.9rem;">${formatMoney(safeCash)}</span>`;
                    } else if (tData.fillPercent >= 80) {
                        cashIcons = '💵💵💵 ';
                    } else if (tData.fillPercent >= 40) {
                        cashIcons = '💵💵 ';
                    } else {
                        cashIcons = '💵 ';
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
                if (prevTellerClientStates[tData.id] !== cacheKey) {
                    if (tData.isProcessing) {
                        clientSlot.classList.add('active');
                        const _t = tData.customerType || 'normal';
                        const _s = (tData.customerSeed === undefined || tData.customerSeed === null || isNaN(tData.customerSeed)) ? 0 : tData.customerSeed;
                        const _n = (_t === 'rich') ? 9 : (_t === 'vip') ? 10 : ((_s % 8) + 1);
                        clientSlot.style.setProperty('background-image', `url('images/client-${_n}.png')`, 'important');
                        clientSlot.style.setProperty('background-size', 'cover', 'important');
                        clientSlot.style.setProperty('background-position', 'center top', 'important');
                        clientSlot.innerHTML = '';

                        // VIP & Rich serving glow effects — batch read then write
                        tNode.classList.remove('vip-serving-glow', 'rich-serving-glow');
                        if (tData.customerType === 'vip') {
                            tNode.classList.add('vip-serving-glow');
                            const rect = tNode.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0 && rect.top > 80 && rect.bottom < window.innerHeight && rect.left > 10) {
                                spawnFloating('★ VIP ★', rect.left + rect.width / 2, rect.top + 20, 'rgba(192, 132, 252, 1)');
                            }
                        } else if (tData.customerType === 'rich') {
                            tNode.classList.add('rich-serving-glow');
                            const rect = tNode.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0 && rect.top > 80 && rect.bottom < window.innerHeight && rect.left > 10) {
                                spawnFloating('$ RICH $', rect.left + rect.width / 2, rect.top + 20, 'rgba(251, 191, 36, 1)');
                            }
                        }
                    } else {
                        clientSlot.classList.remove('active');
                        clientSlot.innerHTML = '<div class="idle-zzz">Zzz</div>';
                        clientSlot.style.removeProperty('background-image');
                        clientSlot.style.removeProperty('background-size');
                        clientSlot.style.removeProperty('background-position');
                        tNode.classList.remove('vip-serving-glow', 'rich-serving-glow');
                    }
                    prevTellerClientStates[tData.id] = cacheKey;
                }
            }

            const isFull = tData.fillPercent >= 100;
            if (isFull !== tCache.lastVaultFullAlert) {
                if (isFull) {
                    tNode.classList.add('vault-full-alert');
                } else {
                    tNode.classList.remove('vault-full-alert');
                }
                tCache.lastVaultFullAlert = isFull;
            }

            if (collectBtn) {
                const vaultSpace = vaultData.capacity - vaultData.cashStored;
                const isDisabled = tData.cashStored <= 0 || vaultSpace <= 0;
                if (isDisabled !== tCache.lastCollectDisabled) {
                    if (isDisabled) {
                        collectBtn.classList.add('disabled');
                    } else {
                        collectBtn.classList.remove('disabled');
                    }
                    tCache.lastCollectDisabled = isDisabled;
                }
            }
        }
    });
}
