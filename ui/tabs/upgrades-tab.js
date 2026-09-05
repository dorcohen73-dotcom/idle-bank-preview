import { buildEntityCard, createSeparator, statLabels, resetBuyBtnCache,  } from './tab-shared.js';

// Dynamic builder for Upgrades Tab
export function renderUpgradesTab() {
    const container = document.getElementById('tab-upgrades');
    if (!container) return;
    resetBuyBtnCache();
    container.innerHTML = '';

    const lang = game.state.language || 'en';
    const tObj = translations[lang].upgrades;

    // Teller upgrade cards
    const tellersGrid = document.createElement('div');
    tellersGrid.className = 'upgrades-grid';
    container.appendChild(tellersGrid);

    game.state.tellers.forEach(t => {
        const card = buildEntityCard('teller', t, lang, tObj, window.currentUpgradeMode);
        tellersGrid.appendChild(card);
    });

    // Separator line
    createSeparator(container);

    // Guard upgrade cards
    const guardsGrid = document.createElement('div');
    guardsGrid.className = 'upgrades-grid';
    container.appendChild(guardsGrid);

    game.state.guards.forEach(g => {
        const card = buildEntityCard('guard', g, lang, tObj, window.currentUpgradeMode);
        guardsGrid.appendChild(card);
    });

    // Separator line
    createSeparator(container);

    // Misc upgrade cards (Vault, Queue)
    const miscGrid = document.createElement('div');
    miscGrid.className = 'upgrades-grid';
    container.appendChild(miscGrid);

    // Vault upgrade card
    const vault = game.state.vault;
    const details = game.getBulkUpgradeDetails('vault', null, window.currentUpgradeMode, vault.level, game.state.cash);
    const vLevelsToBuy = details.levels;
    const vCost = details.cost;
    const vCap = game.getVaultCapacity(vault.level);
    const nextVCap = game.getVaultCapacity(vault.level + vLevelsToBuy);
    const vCanBuy = details.canAfford;

    const vaultCard = document.createElement('div');
    vaultCard.className = 'upgrade-card premium-upg-card';
    vaultCard.innerHTML = `
        <div class="upg-v2-avatar-large" style="background-image: url('images/vault-door.png'); background-position: center; background-size: cover;"></div>
        <div class="upg-v2-content-overlay">
            <div class="upg-v2-header-row">
                <div class="upg-v2-badge">${translations[lang].vaultTitle || 'כספת'}</div>
                <div class="upg-v2-main-title">${translations[lang].levelAbbr || 'רמה'} ${vault.level}</div>
            </div>
            
            <div class="upg-v2-desc-text">${tObj.vaultDesc}</div>
            
            <div class="upg-v2-stats-glass-box">
                <div class="upg-v2-stat">
                    <div class="upg-v2-stat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
                    </div>
                    <div class="upg-v2-stat-label">${tObj.vaultCap}</div>
                    <div class="upg-v2-stat-val">${formatMoney(vCap)} <span class="arrow" style="color: #4ade80;">➔</span> ${formatMoney(nextVCap)}</div>
                </div>
            </div>
            
            <button class="upg-v2-buy-btn buy-btn ${vCanBuy ? '' : 'disabled'}" id="upgrade-vault-btn" ${vCanBuy ? '' : 'disabled'} aria-label="${translations[lang].upgradeLabel} ${translations[lang].vaultTitle} — ${formatMoney(vCost)}">
                <div class="upg-v2-btn-left">
                    <div class="upg-v2-btn-sparkles">✨</div>
                </div>
                <div class="upg-v2-btn-center">
                    <div class="upg-v2-btn-lbl">${translations[lang].upgradeLabel} <span class="upg-v2-btn-amount">${vLevelsToBuy > 1 ? '+'+vLevelsToBuy : ''}</span></div>
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

    // Queue upgrade card line
    createSeparator(container);

    // Lobby Queue Capacity upgrade card
    const queueLvl = game.state.queueUpgradeLevel || 1;
    const qDetails = game.getBulkUpgradeDetails('queue', null, window.currentUpgradeMode, queueLvl, game.state.cash);
    const qLevelsToBuy = qDetails.levels;
    const qCost = qDetails.cost;
    const qCap = game.getBaseQueueCapacity(queueLvl);
    const nextQCap = game.getBaseQueueCapacity(queueLvl + qLevelsToBuy);
    const qCanBuy = qDetails.canAfford;

    const queueCard = document.createElement('div');
    queueCard.className = 'upgrade-card';

    if (queueLvl >= GAME_CONFIG.QUEUE_MAX_LEVEL) {
        queueCard.className = 'upgrade-card premium-upg-card';
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
        queueCard.className = 'upgrade-card premium-upg-card';
        queueCard.innerHTML = `
        <div class="upg-v2-avatar-large" style="background-image: url('images/client-1.png'); background-position: center; background-size: cover;"></div>
        <div class="upg-v2-content-overlay">
            <div class="upg-v2-header-row">
                <div class="upg-v2-badge">${translations[lang].alertQueueLabel}</div>
                <div class="upg-v2-main-title">${translations[lang].levelAbbr || 'רמה'} ${queueLvl}</div>
            </div>
            
            <div class="upg-v2-desc-text">${tObj.queueDesc}</div>
            
            <div class="upg-v2-stats-glass-box">
                <div class="upg-v2-stat">
                    <div class="upg-v2-stat-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div class="upg-v2-stat-label">${tObj.queueCap}</div>
                    <div class="upg-v2-stat-val">${qCap} <span class="arrow" style="color: #4ade80;">➔</span> ${nextQCap}</div>
                </div>
            </div>
            
            <button class="upg-v2-buy-btn buy-btn ${qCanBuy ? '' : 'disabled'}" id="upgrade-queue-btn" ${qCanBuy ? '' : 'disabled'}>
                <div class="upg-v2-btn-left">
                    <div class="upg-v2-btn-sparkles">✨</div>
                </div>
                <div class="upg-v2-btn-center">
                    <div class="upg-v2-btn-lbl">${translations[lang].upgradeLabel || 'שדרג'} <span class="upg-v2-btn-amount">${qLevelsToBuy > 1 ? '+'+qLevelsToBuy : ''}</span></div>
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

    // Smart Recommendation Highlight
    let bestBtnSelector = null;
    let maxRatio = -1;

    // Check tellers for best EPS/Cost ratio
    game.state.tellers.forEach(t => {
        if (!t.unlocked) return;
        const details = game.getBulkUpgradeDetails('teller', t.id, window.currentUpgradeMode, t.level, game.state.cash);
        if (details.canAfford && details.cost > 0) {
            const nextLvl = t.level + details.levels;
            const nextSpeed = Math.max(0.1, game.getTellerSpeed(nextLvl));
            const currentSpeed = Math.max(0.1, game.getTellerSpeed(t.level));
            const epsIncrease = (1 / nextSpeed) - (1 / currentSpeed);
            
            let ratio = epsIncrease / details.cost;
            if (epsIncrease === 0) {
                // If speed is maxed out, fallback to most levels per cost
                ratio = (details.levels * 0.0000001) / details.cost;
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
            const card = btn.closest('.upgrade-card');
            if (card) {
                card.classList.add('smart-recommendation-glow');
                card.style.position = 'relative';
                const badge = document.createElement('div');
                badge.className = 'recommended-badge';
                badge.innerText = (statLabels[lang] || statLabels.en).bestValue;
                card.appendChild(badge);
            }
        }
    } else {
        // Fallback: Just highlight the first affordable upgrade
        const firstAffordable = container.querySelector('.buy-btn:not(.disabled)');
        if (firstAffordable) {
            const card = firstAffordable.closest('.upgrade-card');
            if (card) {
                card.classList.add('smart-recommendation-glow');
                card.style.position = 'relative';
                const badge = document.createElement('div');
                badge.className = 'recommended-badge';
                badge.innerText = (statLabels[lang] || statLabels.en).bestValue;
                card.appendChild(badge);
            }
        }
    }
}

