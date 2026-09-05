import { invalidateTabHashes, getBuyBtnCache, statLabels } from './tab-shared.js';
import { renderUpgradesTab } from './upgrades-tab.js';
import { renderManagersTab } from './managers-tab.js';
import { renderDepartmentsTab } from './departments-tab.js';
import { renderBranchesTab } from './branches-tab.js';
import { renderMissionsTab } from './missions-tab.js';
import { renderAchievementsTab, playAchievementUnlockFeedback } from './achievements-tab.js';

// Refresh all active tabs
function refreshAllTabs() {
    invalidateTabHashes();
    const activeTabEl = document.querySelector('.tab-btn.active');
    const activeTab = activeTabEl ? activeTabEl.getAttribute('data-tab') : 'upgrades';
    if (activeTab === 'upgrades') renderUpgradesTab();
    else if (activeTab === 'managers') renderManagersTab();
    else if (activeTab === 'departments') renderDepartmentsTab();
    else if (activeTab === 'missions') renderMissionsTab();
    else if (activeTab === 'branches') renderBranchesTab();
    else if (activeTab === 'daily') {
        if (typeof window.renderDailyChallengesSection === 'function') window.renderDailyChallengesSection();
        renderAchievementsTab();
    }
    rebuildTellersDOM();
}

// .upg-v2-btn-cost wraps an icon + sub-label span with the price as a trailing
// text node - writing .innerText there wipes those sibling elements, so only
// the trailing text node is touched.
function updateCostText(costEl, newCost) {
    if (!costEl) return;
    let node = costEl.lastChild;
    while (node && node.nodeType !== Node.TEXT_NODE) node = node.previousSibling;
    if (!node) {
        node = document.createTextNode('');
        costEl.appendChild(node);
    }
    if (node.textContent.trim() !== newCost) node.textContent = newCost;
}

// Lightweight inline updater to refresh buy buttons, text and enabled states dynamically without DOM recreation
function updateButtonAffordability() {
    const activeTabEl = document.querySelector('.tab-btn.active');
    if (!activeTabEl) return;
    const activeTab = activeTabEl.getAttribute('data-tab');
    
    if (activeTab === 'upgrades') {
        const container = document.getElementById('tab-upgrades');
        if (!container) return;
        const buttons = getBuyBtnCache(container);
        buttons.forEach(btn => {
            const type = btn.getAttribute('data-type');
            const id = parseInt(btn.getAttribute('data-id'));
            if (type === 'teller') {
                const t = game.state.tellers[id];
                if (t.unlocked) {
                    const details = game.getBulkUpgradeDetails('teller', id, window.currentUpgradeMode, t.level, game.state.cash);
                    btn.classList.toggle('disabled', !details.canAfford);
                    btn.disabled = !details.canAfford;
                    
                    if (btn.classList.contains('upg-v2-buy-btn')) {
                        const amtEl = btn.querySelector('.upg-v2-btn-amount');
                        const costEl = btn.querySelector('.upg-v2-btn-cost');
                        const newAmt = details.levels > 1 ? '+' + details.levels : '';
                        if (amtEl && amtEl.innerText !== newAmt) {
                            amtEl.innerText = newAmt;
                            amtEl.style.display = details.levels > 1 ? 'inline' : 'none';
                        }
                        const newCost = formatMoney(details.cost);
                        updateCostText(costEl, newCost);

                        const card = btn.closest('.premium-upg-card');
                        if (card) {
                            const titleAmtEl = card.querySelector('.upg-v2-level-up');
                            const newTitleAmt = details.levels > 1 ? '(+' + details.levels + ')' : '';
                            if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;

                            const statVals = card.querySelectorAll('.upg-v2-stat-val');
                            if (statVals.length >= 2) {
                                const lang = game.state.language || 'en';
                                const secAbbr = (translations[lang] && translations[lang].secAbbr) || '';
                                const capacity = game.getTellerCapacity(t.level);
                                const speed = game.getTellerSpeed(t.level).toFixed(1);
                                const nextCapacity = game.getTellerCapacity(t.level + details.levels);
                                const nextSpeed = game.getTellerSpeed(t.level + details.levels).toFixed(1);
                                const newStatCap = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + formatMoney(nextCapacity) + '</span>';
                                const reward = game.economyManager.getCurrentBaseReward() * (game.economyManager.getTotalMultiplier() || 1);
                                const newStatYield = '<span class="val-current">' + formatMoney(reward / speed) + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + formatMoney(reward / nextSpeed) + '</span>';
                                const newStatSpeed = '<span class="val-current">' + speed + secAbbr + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + nextSpeed + secAbbr + '</span>';
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
                    btn.classList.toggle('disabled', !canBuy);
                    btn.disabled = !canBuy;
                }
            } else if (type === 'guard') {
                const g = game.state.guards[id];
                if (g.unlocked) {
                    const details = game.getBulkUpgradeDetails('guard', id, window.currentUpgradeMode, g.level, game.state.cash);
                    btn.classList.toggle('disabled', !details.canAfford);
                    btn.disabled = !details.canAfford;
                    
                    if (btn.classList.contains('upg-v2-buy-btn')) {
                        const amtEl = btn.querySelector('.upg-v2-btn-amount');
                        const costEl = btn.querySelector('.upg-v2-btn-cost');
                        const newAmt = details.levels > 1 ? '+' + details.levels : '';
                        if (amtEl && amtEl.innerText !== newAmt) {
                            amtEl.innerText = newAmt;
                            amtEl.style.display = details.levels > 1 ? 'inline' : 'none';
                        }
                        const newCost = formatMoney(details.cost);
                        updateCostText(costEl, newCost);

                        const card = btn.closest('.premium-upg-card');
                        if (card) {
                            const titleAmtEl = card.querySelector('.upg-v2-level-up');
                            const newTitleAmt = details.levels > 1 ? '(+' + details.levels + ')' : '';
                            if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;

                            const statVals = card.querySelectorAll('.upg-v2-stat-val');
                            if (statVals.length >= 2) {
                                const lang = game.state.language || 'en';
                                const secAbbr = (translations[lang] && translations[lang].secAbbr) || '';
                                const capacity = game.getGuardCapacity(g.level);
                                const speed = game.getGuardSpeed(g.level).toFixed(1);
                                const nextCapacity = game.getGuardCapacity(g.level + details.levels);
                                const nextSpeed = game.getGuardSpeed(g.level + details.levels).toFixed(1);
                                const newStatCap = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + formatMoney(nextCapacity) + '</span>';
                                const newStatSpeed = '<span class="val-current">' + speed + secAbbr + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + nextSpeed + secAbbr + '</span>';
                                if (statVals[0].innerHTML !== newStatCap) statVals[0].innerHTML = newStatCap;
                                if (statVals[1].innerHTML !== newStatSpeed) statVals[1].innerHTML = newStatSpeed;
                            }
                        }
                    }
                } else {
                    const cost = game.guardUnlockCosts[id];
                    const canBuy = game.state.cash >= cost;
                    btn.classList.toggle('disabled', !canBuy);
                    btn.disabled = !canBuy;
                }
            } else if (type === 'vault' || btn.id === 'upgrade-vault-btn') {
                const details = game.getBulkUpgradeDetails('vault', null, window.currentUpgradeMode, game.state.vault.level, game.state.cash);
                btn.classList.toggle('disabled', !details.canAfford);
                btn.disabled = !details.canAfford;
                if (btn.classList.contains('upg-v2-buy-btn')) {
                    const amtEl = btn.querySelector('.upg-v2-btn-amount');
                    const costEl = btn.querySelector('.upg-v2-btn-cost');
                    const newAmt = details.levels > 1 ? '+' + details.levels : '';
                    if (amtEl && amtEl.innerText !== newAmt) {
                        amtEl.innerText = newAmt;
                        amtEl.style.display = details.levels > 1 ? 'inline' : 'none';
                    }
                    const newCost = formatMoney(details.cost);
                    updateCostText(costEl, newCost);

                    const card = btn.closest('.premium-upg-card');
                    if (card) {
                        const titleAmtEl = card.querySelector('.upg-v2-level-up');
                        const newTitleAmt = details.levels > 1 ? '(+' + details.levels + ')' : '';
                        if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;

                        const statVals = card.querySelectorAll('.upg-v2-stat-val');
                        if (statVals.length >= 1) {
                            const capacity = game.getVaultCapacity(game.state.vault.level);
                            const nextCapacity = game.getVaultCapacity(game.state.vault.level + details.levels);
                            const newStat0 = '<span class="val-current">' + formatMoney(capacity) + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + formatMoney(nextCapacity) + '</span>';
                            if (statVals[0].innerHTML !== newStat0) statVals[0].innerHTML = newStat0;
                        }
                    }
                }
            } else if (btn.id === 'upgrade-queue-btn') {
                const details = game.getBulkUpgradeDetails('queue', null, window.currentUpgradeMode, game.state.queueUpgradeLevel || 1, game.state.cash);
                btn.classList.toggle('disabled', !details.canAfford);
                btn.disabled = !details.canAfford;
                if (btn.classList.contains('upg-v2-buy-btn')) {
                    const amtEl = btn.querySelector('.upg-v2-btn-amount');
                    const costEl = btn.querySelector('.upg-v2-btn-cost');
                    const newAmt = details.levels > 1 ? '+' + details.levels : '';
                    if (amtEl && amtEl.innerText !== newAmt) amtEl.innerText = newAmt;
                    const newCost = formatMoney(details.cost);
                    updateCostText(costEl, newCost);

                    const card = btn.closest('.premium-upg-card');
                    if (card) {
                        const titleAmtEl = card.querySelector('.upg-v2-level-up');
                        const newTitleAmt = details.levels > 1 ? '(+' + details.levels + ')' : '';
                        if (titleAmtEl && titleAmtEl.innerText !== newTitleAmt) titleAmtEl.innerText = newTitleAmt;

                        const statVals = card.querySelectorAll('.upg-v2-stat-val');
                        if (statVals.length >= 1) {
                            const capacity = game.getBaseQueueCapacity(game.state.queueUpgradeLevel || 1);
                            const nextCapacity = game.getBaseQueueCapacity((game.state.queueUpgradeLevel || 1) + details.levels);
                            const newStat0 = '<span class="val-current">' + capacity + '</span><span class="val-arrow arrow" style="color: #4ade80;">➔</span><span class="val-next">' + nextCapacity + '</span>';
                            if (statVals[0].innerHTML !== newStat0) statVals[0].innerHTML = newStat0;
                        }
                    }
                }
            }
        });

        // Ensure main prestige button updates its state dynamically
        const mainPresBtn = container.querySelector('#main-prestige-btn');
        if (mainPresBtn && game.branches[game.state.currentBranch]) {
            const currentCanPrestige = game.state.cash >= game.branches[game.state.currentBranch].minCashToPrestige * (GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.90);
            mainPresBtn.classList.toggle('disabled', !currentCanPrestige);
            mainPresBtn.disabled = !currentCanPrestige;
            
            const actionBtns = container.querySelectorAll('.branch-action-btn[data-prestige-branch]');
            actionBtns.forEach(btn => {
                btn.classList.toggle('disabled', !currentCanPrestige);
                btn.disabled = !currentCanPrestige;
            });
        }
    } else if (activeTab === 'managers') {
        const container = document.getElementById('tab-managers');
        if (!container) return;
        const buttons = container.querySelectorAll('.buy-btn');
        const lang = game.state.language || 'en';
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const type = btn.getAttribute('data-type') || btn.getAttribute('data-mgr-type');
            if (type) {
                const mgr = game.state.managerUpgrades[type];
                if (mgr) {
                    if (mgr.level >= 5) {
                        renderManagersTab();
                        return;
                    }
                    const isHired = game.state.managers[type];
                    const details = game.getBulkUpgradeDetails('manager', type, window.currentUpgradeMode, mgr.level, game.state.cash);
                    btn.classList.toggle('disabled', !details.canAfford);
                    btn.disabled = !details.canAfford;
                    const newText = `${translations[lang].upgradeLabel}${details.levels > 1 ? ` <span class="upgrade-amount-text">+${details.levels}</span>` : ''}<br>${formatMoney(details.cost)}`;
                    if (btn.innerHTML !== newText) {
                        btn.innerHTML = newText;
                    }

                    const card = btn.closest('.upgrade-card');
                    if (card) {
                        const lvlBadge = card.querySelector('.mgr-lvl-badge');
                        if (lvlBadge) {
                            lvlBadge.innerText = `${translations[lang].levelAbbr || 'Lv'} ${mgr.level}${details.levels > 1 ? ` (+${details.levels})` : ''}`;
                        }

                        const starsBox = card.querySelector('.mgr-stars-box');
                        if (starsBox) {
                            let starsHtml = '';
                            for (let j = 1; j <= 5; j++) {
                                starsHtml += `<span class="star ${j <= mgr.level ? 'gold-star' : 'gray-star'}">★</span>`;
                            }
                            starsBox.innerHTML = starsHtml;
                        }

                        const statVals = card.querySelectorAll('.mgr-stat-val');
                        if (statVals.length >= 2) {
                            const coefs = GAME_CONFIG.MANAGER_COEFFICIENTS[type];
                            let s1 = '', s2 = '';
                            if (coefs) {
                                if (type === 'customer') {
                                    s1 = `+${Math.round(coefs.spawnIntervalBoost * 100 * mgr.level)}%`;
                                    s2 = `+${Math.round(coefs.incomeBoost * 100 * mgr.level)}%`;
                                } else if (type === 'finance') {
                                    s1 = (statLabels[lang] || statLabels.en).autoText;
                                    s2 = `+${Math.round(coefs.deptIncomeBoost * 100 * mgr.level)}%`;
                                } else if (type === 'operations') {
                                    s1 = `+${Math.round(coefs.guardSpeedBoost * 100 * mgr.level)}%`;
                                    s2 = `+${Math.round(coefs.guardCapBoost * 100 * mgr.level)}%`;
                                } else if (type === 'service') {
                                    s1 = `+${Math.round(coefs.capacityBoost * 100 * mgr.level)}%`;
                                    s2 = `+${Math.round(coefs.epsBoost * 100 * mgr.level)}%`;
                                } else if (type === 'vip') {
                                    s1 = `+${Math.round(coefs.incomeBoost * 100 * mgr.level)}%`;
                                    s2 = `+${Math.round(coefs.prestigeSharesBoost * 100 * mgr.level)}%`;
                                } else if (type === 'marketing') {
                                    s1 = `+${Math.round(coefs.adBoost * 100 * mgr.level)}%`;
                                    s2 = `+${coefs.offlineLimitBoost * mgr.level}`;
                                } else if (type === 'accountant') {
                                    s1 = `+${coefs.offlineLimitBoost * mgr.level}h`;
                                    s2 = `+${Math.round(coefs.offlineIncomeBoost * 100 * mgr.level)}%`;
                                }
                            }
                            statVals[0].innerText = s1;
                            statVals[1].innerText = s2;
                        }

                        const footerVal = card.querySelector('.mgr-footer-val');
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
                const mgrType = btn.getAttribute('data-mgr');
                if (mgrType) {
                    const cost = game.managerCosts[mgrType];
                    const canBuy = game.state.cash >= cost;
                    btn.classList.toggle('disabled', !canBuy);
                    btn.disabled = !canBuy;
                }
            }
        }
    } else if (activeTab === 'departments') {
        const container = document.getElementById('tab-departments');
        if (!container) return;
        const buttons = container.querySelectorAll('.buy-btn');
        buttons.forEach(btn => {
            const deptId = parseInt(btn.getAttribute('data-dept-idx'));
            const dept = game.state.departments.find(d => d.id === deptId);
            if (dept && !dept.unlocked) {
                const cost = game.getDepartmentUnlockCost(dept);
                const canBuy = window.game.state.cash >= cost;
                
                if (canBuy) {
                    btn.classList.remove('disabled');
                    btn.removeAttribute('disabled');
                    btn.disabled = false;
                } else {
                    btn.classList.add('disabled');
                    btn.setAttribute('disabled', 'disabled');
                    btn.disabled = true;
                }
            }
        });
    }
}

export {
    renderUpgradesTab,
    renderManagersTab,
    renderDepartmentsTab,
    renderBranchesTab,
    renderMissionsTab,
    renderAchievementsTab,
    playAchievementUnlockFeedback,
    refreshAllTabs,
    updateButtonAffordability,
    invalidateTabHashes,
};

// Dual-exposed on window for classic <script> consumers (save-manager.js,
// mission-controller.js) and other ui/* modules that still call these as bare/window globals.
window.renderUpgradesTab = renderUpgradesTab;
window.renderManagersTab = renderManagersTab;
window.renderDepartmentsTab = renderDepartmentsTab;
window.renderBranchesTab = renderBranchesTab;
window.renderMissionsTab = renderMissionsTab;
window.renderAchievementsTab = renderAchievementsTab;
window.playAchievementUnlockFeedback = playAchievementUnlockFeedback;
window.refreshAllTabs = refreshAllTabs;
window.updateButtonAffordability = updateButtonAffordability;
window.invalidateTabHashes = invalidateTabHashes;

