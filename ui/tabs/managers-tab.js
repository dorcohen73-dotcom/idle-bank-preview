import { statLabels, checkManagersHashUnchanged } from './tab-shared.js';
import { updateButtonAffordability } from './index.js';

// Dynamic builder for Managers Tab
export function renderManagersTab() {
    const container = document.getElementById('tab-managers');
    if (!container) return;
    let hash = null;
    try {
        hash = JSON.stringify({
            managers: game.state.managers,
            managerUpgrades: game.state.managerUpgrades,
            cash: Math.floor(game.state.cash / 1000)
        });
    } catch { /* render unconditionally on serialization error */ }
    if (checkManagersHashUnchanged(hash)) return;
    container.innerHTML = '';

    const lang = game.state.language || 'en';
    const tObj = translations[lang].managers;

    const managersKeys = ['customer', 'operations', 'finance', 'accountant', 'service', 'vip', 'marketing'];
    const managerConfigs = {
        customer: { theme: 'theme-gold', gem: '👑', img: 'manager-1.png' },
        finance: { theme: 'theme-blue', gem: '💎', img: 'manager-2.png' },
        accountant: { theme: 'theme-teal', gem: '⏱️', img: 'manager-7.png' },
        operations: { theme: 'theme-purple', gem: '🔮', img: 'manager-3.png' },
        service: { theme: 'theme-amber', gem: '🔸', img: 'manager-4.png' },
        vip: { theme: 'theme-red', gem: '💰', img: 'manager-5.png' },
        marketing: { theme: 'theme-green', gem: '🔹', img: 'manager-6.png' }
    };

    const grid = document.createElement('div');
    grid.className = 'managers-grid';
    container.appendChild(grid);

    // Sort managers by effective cost (cheapest first)
    managersKeys.sort((a, b) => {
        const getCost = (type) => {
            const mData = game.getManagerRenderData(type);
            if (!mData) return Infinity;
            if (!mData.isUnlocked) return mData.cost;
            if (!mData.isHired) return mData.cost;
            if (mData.level < 5) {
                const details = game.getBulkUpgradeDetails('manager', type, window.currentUpgradeMode || 'x1', mData.level, game.state.cash);
                return details.cost;
            }
            return Infinity; // Max level managers go to the bottom
        };
        return getCost(a) - getCost(b);
    });

    managersKeys.forEach(type => {
        const config = managerConfigs[type];
        const mData = game.getManagerRenderData(type);
        if (!mData) return;

        const isUnlocked = mData.isUnlocked;
        const isHired = mData.isHired;
        const cost = mData.cost;
        const canBuy = game.state.cash >= cost;
        const level = mData.level;

        const card = document.createElement('div');
        card.className = `upgrade-card manager-card feature-card ${config.theme} ${isUnlocked ? (isHired ? 'active' : '') : 'locked'}`;

        let bodyHtml = '';
        let footerHtml = '';

        if (!isUnlocked) {
            // Locked Manager layout
            const deptName = (type === 'finance' ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_LOANS] :
                              (type === 'vip' ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_VIP] :
                               (type === 'service' ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_STOCK] :
                                (type === 'marketing' ? translations[lang].departments.names[GAME_CONFIG.DEPT_ID_LAUNDERING] : ''))));

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
                                <div class="mgr-stars"><span class="star gray-star">★</span><span class="star gray-star">★</span><span class="star gray-star">★</span><span class="star gray-star">★</span><span class="star gray-star">★</span></div>
                                <div class="mgr-lvl-badge">${translations[lang].levelAbbr || 'Lv'} 0</div>
                            </div>
                            <div class="mgr-hex-icon"><div class="hex-inner">🔒</div></div>
                        </div>
                        <div class="mgr-stats-list">
                            <div class="mgr-stat-pill" style="justify-content: center; padding: 1rem 0;">
                                <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500; text-align: center;">
                                    🔒 ${translations[lang].requiresUnlocking || 'Requires unlocking:'} <br>
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
                                ${statLabels[lang].lockedLabel} 🔒
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Unlocked Manager layout
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<span class="star ${i <= level ? 'gold-star' : 'gray-star'}">★</span>`;
            }

            // Determine custom statistics descriptions
            let stat1Lbl = '', stat2Lbl = '';
            let icon1 = '', icon2 = '';
            if (type === 'customer') {
                stat1Lbl = statLabels[lang].client_speed;
                stat2Lbl = statLabels[lang].satisfaction;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
            } else if (type === 'finance') {
                stat1Lbl = statLabels[lang].auto_vault;
                stat2Lbl = statLabels[lang].bank_yield;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>';
            } else if (type === 'operations') {
                stat1Lbl = statLabels[lang].courier_speed;
                stat2Lbl = statLabels[lang].counter_cap;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
            } else if (type === 'service') {
                stat1Lbl = statLabels[lang].counter_cap;
                stat2Lbl = statLabels[lang].base_income;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
            } else if (type === 'vip') {
                stat1Lbl = statLabels[lang].dept_yields;
                stat2Lbl = statLabels[lang].gold_shares;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>';
            } else if (type === 'marketing') {
                stat1Lbl = statLabels[lang].ad_bonus;
                stat2Lbl = statLabels[lang].offline_time;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12A10 10 0 0 0 11 2v20a10 10 0 0 0 11-10z"></path></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
            } else if (type === 'accountant') {
                stat1Lbl = statLabels[lang].offline_time;
                stat2Lbl = statLabels[lang].offline_income;
                icon1 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
                icon2 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
                
                // Fallback in case game.js cache fails to update
                if (!mData.stat1Val || mData.stat1Val === '') {
                    const c = GAME_CONFIG.MANAGER_COEFFICIENTS['accountant'];
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
                                <div class="mgr-lvl-badge">${translations[lang].levelAbbr || 'Lv'} ${level}</div>
                            </div>
                            <div class="mgr-hex-icon"><div class="hex-inner">💎</div></div>
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

            // Action button
            let actionBtnHtml = '';
            if (!isHired) {
                actionBtnHtml = `
                    <button class="buy-btn buy-mgr-btn mgr-buy-btn ${canBuy ? '' : 'disabled'}" data-mgr="${type}" ${canBuy ? '' : 'disabled'} aria-label="${statLabels[lang].hireBtn} ${tObj.names[type]} — ${formatMoney(cost)}">
                        ${statLabels[lang].hireBtn}<br>${formatMoney(cost)}
                    </button>
                `;
            } else if (level < 5) {
                const details = game.getBulkUpgradeDetails('manager', type, window.currentUpgradeMode, level, game.state.cash);
                const costToUpgrade = details.cost;
                const canUpgrade = details.canAfford;
                const levelsToBuy = details.levels;
                
                actionBtnHtml = `
                    <button class="buy-btn upgrade-mgr-btn mgr-buy-btn ${canUpgrade ? '' : 'disabled'}" data-mgr-type="${type}" ${canUpgrade ? '' : 'disabled'} aria-label="${statLabels[lang].upgradeBtn} ${tObj.names[type]} — ${formatMoney(costToUpgrade)}">
                        ${statLabels[lang].upgradeBtn}${levelsToBuy > 1 ? ` <span class="upgrade-amount-text">+${levelsToBuy}</span>` : ''}<br>${formatMoney(costToUpgrade)}
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

    // Add Hired/Upgrade Event Listeners
    container.querySelectorAll('.buy-mgr-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            initSound();
            const type = btn.getAttribute('data-mgr');
            const beforeCash = game.state.cash;
            const beforeHired = game.state.managers[type];

            game.hireManager(type);

            // Discovery tip on first manager hire
            if (!beforeHired && game.state.managers[type] && typeof window.showDiscoveryTip === 'function') {
                window.showDiscoveryTip('manager');
            }

            handlePurchaseFeedback(btn, e, beforeCash, beforeHired, 'hire-manager', type);
            renderManagersTab();
        });
    });

    container.querySelectorAll('.upgrade-mgr-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            initSound();
            const type = btn.getAttribute('data-mgr-type');
            const beforeCash = game.state.cash;
            const beforeLevel = game.state.managerUpgrades[type] ? game.state.managerUpgrades[type].level : 1;

            game.upgradeManagerBulk(type, window.currentUpgradeMode);

            handlePurchaseFeedback(btn, e, beforeCash, beforeLevel, 'upgrade-manager', type);
            updateButtonAffordability();
        });
    });
}

