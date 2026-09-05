// Shared helpers and state for the ui/tabs/* render modules.
// game, translations, formatMoney, GAME_CONFIG stay classic-script globals (see build plan).

let _buyBtnCache = null;
let _lastManagersHash = null;
let _lastBranchesHash = null;



export function setCurrentUpgradeMode(mode) {
    window.currentUpgradeMode = mode;
}

export function invalidateTabHashes() {
    _lastManagersHash = null;
    _lastBranchesHash = null;
    _buyBtnCache = null;
}

export function resetBuyBtnCache() {
    _buyBtnCache = null;
}

export function getBuyBtnCache(container) {
    if (!_buyBtnCache) _buyBtnCache = container.querySelectorAll('.buy-btn');
    return _buyBtnCache;
}

// Returns true (and leaves cached state untouched) when the tab's hash hasn't
// changed since the last render, so the caller can skip re-rendering.
export function checkManagersHashUnchanged(hash) {
    if (hash && hash === _lastManagersHash) return true;
    _lastManagersHash = hash;
    _buyBtnCache = null;
    return false;
}

export function checkBranchesHashUnchanged(hash) {
    if (hash && hash === _lastBranchesHash) return true;
    _lastBranchesHash = hash;
    _buyBtnCache = null;
    return false;
}

export const statLabels = {
    he: {
        satisfaction: "שביעות רצון",
        client_speed: "מהירות לקוחות",
        auto_vault: "ריקון כספת אוטומטי",
        bank_yield: "הכנסות הבנק",
        courier_speed: "מהירות בלדרים",
        teller_speed: "מהירות כספרים",
        counter_cap: "קיבולת עמדות",
        base_income: "רווח בסיסי",
        dept_yields: "הכנסות מחלקות",
        gold_shares: "מניות זהב בפרסטיג'",
        ad_bonus: "בונוס פרסום",
        offline_time: "שעות אופליין מקסימליות",
        offline_income: "הכנסות אופליין",
        hourlyProfit: "רווח נוסף:",
        perHour: "לשעה",
        lockedLabel: "נעול",
        hireBtn: "גיוס",
        upgradeBtn: "שדרג",
        activeLabel: "פעיל",
        totalYield: "רווח לשנייה",
        totalUpgrade: 'סה"כ שדרוג',
        unlockCost: "עלות פתיחה",
        autoText: "אוטומטי",
        maxLabel: "מקסימלי",
        bestValue: "🔥 הכי משתלם"
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
        bestValue: "🔥 Best Value"
    },
    es: {
        satisfaction: "Satisfacción",
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
        offline_time: "Horas Offline Máx",
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
        maxLabel: "Máximo",
        bestValue: "🔥 Mejor Oferta"
    },
    ru: {
        satisfaction: "Удовлетворение",
        client_speed: "Скорость клиентов",
        auto_vault: "Авто-сбор сейфа",
        bank_yield: "Доход банка",
        courier_speed: "Скорость курьеров",
        teller_speed: "Скорость кассиров",
        counter_cap: "Лимит касс",
        base_income: "Базовый доход",
        dept_yields: "Доход отделов",
        gold_shares: "Золотые акции",
        ad_bonus: "Бонус рекламы",
        offline_time: "Макс. часов оффлайн",
        offline_income: "Оффлайн доход",
        hourlyProfit: "Доп. доход:",
        perHour: "/ ч",
        lockedLabel: "Закрыто",
        hireBtn: "Нанять",
        upgradeBtn: "Улучшить",
        activeLabel: "Активно",
        totalYield: "Общий доход",
        totalUpgrade: "Итого улучшений",
        unlockCost: "Стоимость открытия",
        autoText: "Авто",
        maxLabel: "Максимум",
        bestValue: "🔥 Лучшая цена"
    }
};

// Helper to build teller/guard upgrade/unlock cards
export function createSeparator(container) {
    const hr = document.createElement('hr');
    hr.style.border = '0';
    hr.style.borderTop = '1px solid var(--border-color)';
    container.appendChild(hr);
}

export function buildEntityCard(type, entity, lang, tObj, currentUpgradeMode) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    const id = entity.id;

    if (entity.unlocked) {
        const details = game.getBulkUpgradeDetails(type, id, window.currentUpgradeMode, entity.level, game.state.cash);
        const levelsToBuy = details.levels;
        const nextLevel = entity.level + levelsToBuy;
        const cost = details.cost;
        
        let capacity, speed, nextCapacity, nextSpeed, title, desc, speedLabel, capLabel;
        let avatarBgUrl = '', avatarBgPos = 'center 25%', avatarBgSize = 'cover';
        if (type === 'teller') {
            capacity = game.getTellerCapacity(entity.level);
            speed = game.getTellerSpeed(entity.level).toFixed(1);
            nextCapacity = game.getTellerCapacity(nextLevel);
            nextSpeed = game.getTellerSpeed(nextLevel).toFixed(1);
            avatarBgUrl = `images/teller-${(id % 8) + 1}.png`;
            avatarBgPos = 'center center';
            avatarBgSize = 'cover';
            title = tObj.tellerTitle(id + 1, entity.level);
            desc = tObj.tellerDesc;
            speedLabel = tObj.tellerSpeed;
            capLabel = tObj.tellerCap;
        } else {
            capacity = game.getGuardCapacity(entity.level);
            speed = game.getGuardSpeed(entity.level).toFixed(1);
            nextCapacity = game.getGuardCapacity(nextLevel);
            nextSpeed = game.getGuardSpeed(nextLevel).toFixed(1);
            avatarBgUrl = 'images/guard.png';
            avatarBgPos = 'center center';
            avatarBgSize = 'contain';
            title = tObj.guardTitle(id + 1, entity.level);
            desc = tObj.guardDesc;
            speedLabel = tObj.guardSpeed;
            capLabel = tObj.guardCap;
        }

        const canBuy = details.canAfford;

        const tellerMaxLvl = type === 'teller' ? (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.getTellerTieredMaxLevel ? GAME_CONFIG.getTellerTieredMaxLevel(id) : ((Number(id) || 0) + 1) * 100) : null;
        const isTellerMax = type === 'teller' && entity.level >= tellerMaxLvl;

        card.className = 'upgrade-card premium-upg-card';
        let eps = 0, nextEps = 0;
        if (type === 'teller') {
            const reward = game.economyManager.getCurrentBaseReward() * (game.economyManager.getTotalMultiplier() || 1);
            eps = reward / speed;
            nextEps = reward / nextSpeed;
        }

        card.innerHTML = `
            <div class="upg-v2-avatar-large" style="background-image: url('${avatarBgUrl}'); background-position: ${avatarBgPos}; background-size: ${avatarBgSize};"></div>
            <div class="upg-v2-content-overlay">
                <div class="upg-v2-header-row">
                    <div class="upg-v2-badge">${type === 'teller' ? (translations[lang].tellerLabel || 'כספר') : (translations[lang].guardLabel || 'שומר')} ${id + 1}</div>
                    <div class="upg-v2-main-title">
                        <svg class="bank-icon-title" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l8-6 8 6"></path><rect x="4" y="10" width="16" height="12" rx="2"></rect><path d="M12 2v6"></path><path d="M8 2h8"></path><path d="M9 14h6"></path><path d="M9 18h6"></path></svg>
                        ${type === 'teller' ? `${translations[lang].levelAbbr || 'רמה'} ${entity.level} / ${tellerMaxLvl}` : `${translations[lang].levelAbbr || 'רמה'} ${entity.level}`}
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
                            <span class="val-arrow arrow" style="color: #4ade80;">➔</span>
                            <span class="val-next">${formatMoney(nextCapacity)}</span>
                        </div>
                    </div>
                    ${type === 'teller' ? `
                    <div class="upg-v2-stat">
                        <div class="upg-v2-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
                        </div>
                        <div class="upg-v2-stat-label">${(statLabels[lang] || statLabels.en).totalYield}</div>
                        <div class="upg-v2-stat-val">
                            <span class="val-current">${formatMoney(eps)}</span>
                            <span class="val-arrow arrow" style="color: #4ade80;">➔</span>
                            <span class="val-next">${formatMoney(nextEps)}</span>
                        </div>
                    </div>
                    ` : ''}
                    <div class="upg-v2-stat">
                        <div class="upg-v2-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div class="upg-v2-stat-label">${speedLabel}</div>
                        <div class="upg-v2-stat-val">
                            <span class="val-current">${speed}${translations[lang].secAbbr || ''}</span>
                            <span class="val-arrow arrow" style="color: #4ade80;">➔</span>
                            <span class="val-next">${nextSpeed}${translations[lang].secAbbr || ''}</span>
                        </div>
                    </div>
                </div>
                
                ${isTellerMax ? `
                <button class="upg-v2-buy-btn buy-btn disabled" disabled style="margin-top: auto; cursor: default; background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border-color: rgba(223, 171, 41, 0.4);">
                    <div class="upg-v2-btn-center">
                        <div class="upg-v2-btn-lbl" style="color: #dfab29; font-weight: 800;">
                            👑 ${translations[lang].maxLevel || 'MAX'}
                        </div>
                    </div>
                </button>
                ` : `
                <button class="upg-v2-buy-btn buy-btn ${canBuy ? '' : 'disabled'}" data-type="${type}" data-id="${id}" ${canBuy ? '' : 'disabled'} aria-label="${translations[lang].upgradeLabel} ${title} — ${formatMoney(cost)}">
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
                            <span class="upg-v2-btn-amount" style="display: ${levelsToBuy > 1 ? 'inline' : 'none'};">+${levelsToBuy}</span>
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
            const avEl = card.querySelector('.card-avatar');
            if (avEl) { avEl.style.backgroundImage = `url('${avatarBgUrl}')`; avEl.style.backgroundPosition = avatarBgPos; avEl.style.backgroundSize = avatarBgSize; }
        }
    } else {
        let cost, avatarBgUrl2 = '', avatarBgPos2 = 'center 25%', avatarBgSize2 = 'cover', title, desc, unlockAction, unlockText;
        if (type === 'teller') {
            cost = game.tellerUnlockCosts[id];
            avatarBgUrl2 = `images/teller-${(id % 8) + 1}.png`;
            avatarBgPos2 = 'center center';
            avatarBgSize2 = 'cover';
            title = tObj.tellerLocked(id + 1);
            desc = tObj.tellerLockedDesc;
            unlockAction = 'unlock-teller';
            unlockText = translations[lang].unlockLabel;
        } else {
            cost = game.guardUnlockCosts[id];
            avatarBgUrl2 = 'images/guard.png';
            avatarBgPos2 = 'center center';
            avatarBgSize2 = 'contain';
            title = tObj.guardLocked(id + 1);
            desc = tObj.guardLockedDesc;
            unlockAction = 'unlock-guard';
            unlockText = tObj.guardUnlockBtn;
        }

        const canBuy = game.state.cash >= cost;

        card.className = 'upgrade-card premium-upg-card locked-card';
        card.innerHTML = `
            <div class="upg-v2-avatar-large" style="background-image: url('${avatarBgUrl2}'); background-position: ${avatarBgPos2}; background-size: ${avatarBgSize2};"></div>
            <div class="upg-v2-content-overlay">
                <div class="upg-v2-header-row">
                    <div class="upg-v2-badge" style="border-color: rgba(255,255,255,0.2); color: #94a3b8;">${translations[lang].lockedLabel}</div>
                    <div class="upg-v2-main-title" style="color: #cbd5e1;">${title}</div>
                </div>
                
                <div class="upg-v2-desc-text">${desc}</div>
                
                <button class="upg-v2-buy-btn buy-btn ${canBuy ? '' : 'disabled'}" data-action="${unlockAction}" data-id="${id}" ${canBuy ? '' : 'disabled'} aria-label="${translations[lang].unlockLabel} ${id + 1} — ${formatMoney(cost)}">
                    <div class="upg-v2-btn-left">
                        <div class="upg-v2-btn-lbl" style="color: ${canBuy ? '#2b1f02' : '#64748b'};">${unlockText}</div>
                        <div class="upg-v2-btn-cost">
                            <svg class="upg-v2-coin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                            <span class="upg-v2-btn-sub">${(statLabels[lang] || statLabels.en).unlockCost}</span>
                            ${formatMoney(cost)}
                        </div>
                    </div>
                    <div class="upg-v2-btn-right">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${canBuy ? '#ffe066' : '#475569'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                </button>
            </div>
        `;
        if (avatarBgUrl2) {
            const avEl2 = card.querySelector('.card-avatar');
            if (avEl2) { avEl2.style.backgroundImage = `url('${avatarBgUrl2}')`; avEl2.style.backgroundPosition = avatarBgPos2; avEl2.style.backgroundSize = avatarBgSize2; }
        }
    }
    return card;
}

