// Game Configuration Constants for Idle Bank Empire
const GAME_CONFIG = {
    // Tellers Formulas
    TELLER_BASE_SPEED: 10.0,
    TELLER_SPEED_LEVEL_STEP: 0.1, // linear processing-time reduction per teller level
    TELLER_MIN_SPEED: 0.2,
    TELLER_ABSOLUTE_MIN_SPEED: 0.05,
    TELLER_AUTO_SPEED_FACTOR: 0.7,
    TELLER_SKILL_SPEED_DECAY: 0.03, // Rachel's level upgrades: -3% per level

    TELLER_BASE_CAPACITY: 150,
    TELLER_CAPACITY_GROWTH: 1.08,

    TELLER_BASE_UPGRADE_COST: 60,
    TELLER_TIER_GROWTH: [
        { maxLevel: 10, growth: 1.12 },
        { maxLevel: 25, growth: 1.18 },
        { maxLevel: 50, growth: 1.28 },
        { maxLevel: 99, growth: 1.35 },
        { maxLevel: Infinity, growth: 1.08 }
    ],
    TELLER_MAX_LEVEL: 99,
    getTellerTieredMaxLevel: (tellerId) => ((Number(tellerId) || 0) + 1) * 100,
    TELLER_POST_MAX_BONUS_PER_LEVEL: 0.005,
    TELLER_POST_MAX_COST_GROWTH: 1.08,

    // Guards Formulas
    GUARD_BASE_SPEED: 10.0,
    GUARD_SPEED_LEVEL_STEP: 0.1, // linear cooldown reduction per guard level (idle wait between rounds)
    GUARD_MIN_SPEED: 0.8,
    GUARD_ABSOLUTE_MIN_SPEED: 1.0,
    GUARD_AUTO_SPEED_FACTOR: 0.7,
    GUARD_SKILL_SPEED_DECAY: 0.04, // Alon's level upgrades: -4% per level
    GUARD_SPEED_GOLD_UPGRADE_FACTOR: 0.10, // Guard speed gold upgrade: -10% per level
    GUARD_WALK_ANIM_DURATION: 1.35, // Natural, calm walk time per counter (seconds)
    GUARD_COLLECT_MIN_DURATION: 0.90, // Substantial, visible pause when collecting cash at counter
    GUARD_COLLECT_MAX_DURATION: 1.80, // Substantial, visible pause when picking up full capacity

    // Base tuned so a level-1 guard's EFFECTIVE capacity (this base x GUARD_AUTO_CAPACITY_FACTOR
    // 1.5 x the operations manager's guardCapBoost, both of which apply out of the box since
    // operations starts hired by default — see game.js initial state) lands at ~208, just above
    // a single teller's capacity through level 5 (204) and clearly behind it by level 6-7
    // (220-238). That's the realistic early-game scenario: one teller, guard never touched yet.
    // With the old base of 250 (effective 450) the crossover didn't land until teller level ~16,
    // by which point a player following the game's own "best value" recommendation had long since
    // stopped noticing the guard existed. Verified via a deterministic sim over economy-manager.js's
    // real formulas (levels 1-40) — see commit message for the crossover table.
    GUARD_BASE_CAPACITY: 115,
    // Set EQUAL to TELLER_CAPACITY_GROWTH (both 1.08) rather than to GUARD_UPGRADE_COST_GROWTH
    // (1.14). A guard's job is to keep pace with the cash piling up at tellers — matching cost
    // growth instead (tried first) made a lockstep-leveled guard balloon to ~200x oversized by
    // level 100 (guard-cap/teller-cap ratio: 0.26 at lvl1 -> 6.36 at lvl50 -> 218.56 at lvl100 —
    // verified via a deterministic sim over economy-manager.js's real formulas), i.e. upgrading
    // past ~lvl40 bought capacity nobody needed. Matching teller growth instead keeps that ratio
    // in a stable ~0.2-1.0 band across the entire 1-100 range, so the guard stays relevant
    // (and neglecting it still creates real backpressure) at every stage, not just early game.
    // This replaces an earlier design (0.05, deliberately slower, meant to make guards
    // permanently fall behind on purpose) that had already been made moot in practice by
    // getGuardCapacity()'s EPS-based scaling — see economy-manager.js.
    GUARD_CAPACITY_GROWTH: 1.08,
    GUARD_AUTO_CAPACITY_FACTOR: 1.5, // Alon manager auto capacity multiplier (+50%)

    GUARD_BASE_UPGRADE_COST: 130,
    GUARD_UPGRADE_COST_GROWTH: 1.14,

    VAULT_BASE_CAPACITY: 1500,
    VAULT_CAPACITY_GROWTH: 1.10,

    // Base was 250 - nearly double the guard's 130 and >4x the teller's 60 at level 1,
    // on top of getVaultCapacity() completely ignoring vault level once EPS-based scaling
    // kicked in (see economy-manager.js), so the very first vault upgrades cost the most
    // of any building while doing the least. Brought down closer to the guard's cost now
    // that vault level always compounds capacity again.
    VAULT_BASE_UPGRADE_COST: 150,
    VAULT_UPGRADE_COST_GROWTH: 1.14,

    // Queue Lobby Formulas
    QUEUE_BASE_CAPACITY: 5,
    QUEUE_CAPACITY_STEP: 5,
    QUEUE_BRANCH_BONUS_FACTOR: 5,
    QUEUE_BASE_UPGRADE_COST: 2000,
    QUEUE_UPGRADE_COST_GROWTH: 15,
    QUEUE_MAX_LEVEL: 6,

    // Timers & Intervals
    AUTO_SAVE_INTERVAL_SEC: 5.0,
    TAB_REFRESH_INTERVAL_SEC: 1.0,

    // Offline earnings balance: "full automation" (operations+finance hired) earns offline
    // cash uncapped by any vault/teller capacity, unlike the other two offline modes. This
    // factor throttles that uncapped path so long offline sessions don't out-pace active play.
    OFFLINE_FULL_AUTO_EFFICIENCY: 0.5,

    // Mission reward balance: reward scales sub-linearly with the player's current EPS so
    // rising income doesn't keep inflating mission payouts 1:1 (which fed a runaway
    // buy-upgrades -> higher EPS -> bigger mission reward loop within a single branch).
    // Tuned so referenceReward matches the old linear formula (~eps*300) around eps=10.
    MISSION_REWARD_EPS_EXPONENT: 0.7,
    MISSION_REWARD_SCALE: 600,

    // SVG Cache limits
    SVG_CACHE_MAX_SIZE: 200,

    // Branches and prestige constants
    PRESTIGE_THRESHOLD_RATIO: 0.90,
    BRANCH_PRESTIGE_CAPS: [800, 1800, 2600, 6000, 10000],
    BRANCHES: [
        { name: "קאש-אפ (CashUp)", baseMultiplier: 1, minCashToPrestige: 900000, desc: "הבנק המקומי הראשון שלך. כאן הכל מתחיל." },
        { name: "נאו-בנק (NeoBank)", baseMultiplier: 3, minCashToPrestige: 75000000, desc: "ענק פיננסי גלובלי. לקוחות עשירים יותר ותנועת כספים מהירה." },
        { name: "קריפטו איקס (Crypto X)", baseMultiplier: 10, minCashToPrestige: 15000000000, desc: "לב הפיננסים האירופאי. עסקאות נדל\"ן ו-corporate banking." },
        { name: "מון-טרייד (MoonTrade)", baseMultiplier: 20, minCashToPrestige: 7500000000000, desc: "מרכז העסקים של וול סטריט. עסקאות ענק, הלוואות מפלצתיות ורווחים אדירים." },
        { name: "הייפ קפיטל (Hype Capital)", baseMultiplier: 50, minCashToPrestige: 3000000000000000, desc: "אימפריית ההשקעות העולמית. רווחים אגדיים שממלאים את כספות הזהב בשניות." }
    ],

    TELLER_UNLOCK_COSTS: [0, 800, 20000, 600000, 18000000, 500000000, 12500000000, 300000000000],
    GUARD_UNLOCK_COSTS: [0, 2500, 70000],
    
    // Manager hire and upgrade costs catalog
    MANAGER_COSTS: {
        customer: 150,
        operations: 15000,
        finance: 300000,
        accountant: 900000,
        service: 4500000,
        vip: 150000000,
        marketing: 6000000000
    },

    MANAGER_UPGRADE_COSTS: {
        customer: [0, 900, 3000, 15000, 75000],
        operations: [0, 45000, 150000, 540000, 1800000],
        finance: [0, 900000, 3000000, 9600000, 30000000],
        accountant: [0, 2400000, 7500000, 24000000, 75000000],
        service: [0, 13500000, 45000000, 150000000, 450000000],
        vip: [0, 450000000, 1500000000, 4800000000, 15000000000],
        marketing: [0, 18000000000, 60000000000, 180000000000, 600000000000]
    },

    MANAGER_UPGRADE_COSTS_DEFAULT: [0, 45000, 240000, 1200000, 6000000],
    GOLD_UPGRADE_COSTS: { 
        startingCash: 40, 
        guardSpeed: 80, 
        premiumYield: 120, 
        shareEfficiency: 200,
        offlineEarnings: 120,
        tellerCapacityBoost: 160,
        vaultCapacityBoost: 160,
        eventBonus: 240,
        managerDiscount: 400
    },
    STARTING_CASH_OPTIONS: [180, 1000, 5000, 25000, 100000],
    DEPT_ID_CASH: 0,
    DEPT_ID_LOANS: 1,
    DEPT_ID_VIP: 2,
    DEPT_ID_STOCK: 3,
    DEPT_ID_LAUNDERING: 4,
    MANAGER_COEFFICIENTS: {
        customer: { spawnIntervalBoost: 0.06, incomeBoost: 0.06 },
        finance: { incomeBoost: 0.10, deptIncomeBoost: 0.12 },
        operations: { guardSpeedBoost: 0.04, tellerSpeedBoost: 0.03, guardCapBoost: 0.20 },
        accountant: { offlineLimitBoost: 2.0, offlineIncomeBoost: 0.15 },
        service: { capacityBoost: 0.05, incomeBoost: 0.08, epsBoost: 0.05, offlineLimitBoost: 0 },
        vip: { incomeBoost: 0.07, prestigeBoost: 0.04, prestigeSharesBoost: 0.08 },
        marketing: { adBoost: 0.10, offlineLimitBoost: 1 }
    },

    WHEEL_PRIZES: [
        { type: 'cash',   label: 'cash_small',  weight: 40, value: 1 },
        { type: 'shares', label: 'shares_2',    weight: 5,  value: 15 },
        { type: 'cash',   label: 'cash_medium', weight: 15, value: 2 },
        { type: 'cash',   label: 'cash_big',    weight: 5,  value: 4 },
        { type: 'shares', label: 'shares_1',    weight: 20, value: 5 },
        { type: 'boost',  label: 'boost_2x',    weight: 15, value: 4 }
    ],

    // AdMob configuration IDs
    ADMOB_CONFIG: {
        APP_ID: "ca-app-pub-1189054329275307~5576716143",
        REWARDED_AD_UNIT_ID: "ca-app-pub-1189054329275307/1609550976"
    },

    // Multi-stop guard route anchors — fractional position (0.0–1.0) along #security-path
    // Centers for a 4-column equal-grid (1fr each): (i + 0.5) / 4 in RTL visual order.
    // DOM-computed values override these at runtime via _recalcGuardAnchors().
    GUARD_TELLER_ANCHORS: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    GUARD_VAULT_ANCHOR: 0.05,

    // Achievements — static catalog. Each unlocks a small permanent GLOBAL income multiplier bonus
    // (never resets on prestige — reads lifetime stats that already don't reset either) the instant
    // its condition is met, PLUS a one-time gold-shares reward (rewardShares, scaled to difficulty)
    // that the player claims manually via the tab.
    // id is persisted in save data — never rename/reuse an id once shipped.
    ACHIEVEMENTS: [
        { id: 'cash_1', category: 'cash', statPath: 'lifetimeCash', threshold: 50000, bonusPercent: 0.005, rewardShares: 5, icon: '<img src="images/gold-chest.png" class="achievement-img" alt="Cash" />', i18nKey: 'cash_1' },
        { id: 'cash_2', category: 'cash', statPath: 'lifetimeCash', threshold: 50000000, bonusPercent: 0.01, rewardShares: 15, icon: '<img src="images/gold-bars.png" class="achievement-img" alt="Cash" />', i18nKey: 'cash_2' },
        { id: 'cash_3', category: 'cash', statPath: 'lifetimeCash', threshold: 50000000000, bonusPercent: 0.015, rewardShares: 50, icon: '<img src="images/vault.png" class="achievement-img" alt="Cash" />', i18nKey: 'cash_3' },
        { id: 'missions_1', category: 'missions', statPath: 'missionsCompleted', threshold: 20, bonusPercent: 0.005, rewardShares: 5, icon: '<img src="images/nav_trophy.png" class="achievement-img" alt="Missions" />', i18nKey: 'missions_1' },
        { id: 'missions_2', category: 'missions', statPath: 'missionsCompleted', threshold: 300, bonusPercent: 0.01, rewardShares: 15, icon: '<img src="images/eps_circle.png" class="achievement-img" alt="Missions" />', i18nKey: 'missions_2' },
        { id: 'manager_first_max', category: 'managers', statPath: 'managerFirstMax', threshold: 1, bonusPercent: 0.0075, rewardShares: 5, icon: '<img src="images/nav_suit.png" class="achievement-img" alt="Manager" />', i18nKey: 'manager_first_max' },
        { id: 'manager_all_max', category: 'managers', statPath: 'managerAllMax', threshold: 7, bonusPercent: 0.015, rewardShares: 50, icon: '<img src="images/manager_circle.png" class="achievement-img" alt="Manager" />', i18nKey: 'manager_all_max' },
        { id: 'vip_1', category: 'vip', statPath: 'vipServedTotal', threshold: 100, bonusPercent: 0.005, rewardShares: 5, icon: '<img src="images/gold-vip.png" class="achievement-img" alt="VIP" />', i18nKey: 'vip_1' },
        { id: 'vip_2', category: 'vip', statPath: 'vipServedTotal', threshold: 1500, bonusPercent: 0.01, rewardShares: 15, icon: '<img src="images/gold-vip.png" class="achievement-img" alt="VIP" />', i18nKey: 'vip_2' },
        { id: 'guard_1', category: 'guard', statPath: 'guardTripsTotal', threshold: 50000, bonusPercent: 0.005, rewardShares: 15, icon: '<img src="images/guard_circle.png" class="achievement-img" alt="Guard" />', i18nKey: 'guard_1' },
        { id: 'login_streak_7', category: 'login', statPath: 'loginStreak', threshold: 7, bonusPercent: 0.005, rewardShares: 15, icon: '<img src="images/nav_calendar.png" class="achievement-img" alt="Login" />', i18nKey: 'login_streak_7' },
        { id: 'branches_all', category: 'branches', statPath: 'visitedBranchesAll', threshold: 5, bonusPercent: 0.01, rewardShares: 50, icon: '<img src="images/nav_globe.png" class="achievement-img" alt="Branches" />', i18nKey: 'branches_all' },
        { id: 'prestige_1', category: 'prestige', statPath: 'shares', threshold: 400, bonusPercent: 0.005, rewardShares: 15, icon: '<img src="images/boost_run_circle.png" class="achievement-img" alt="Prestige" />', i18nKey: 'prestige_1' }
    ]
};

Object.freeze(GAME_CONFIG.BRANCH_PRESTIGE_CAPS);
Object.freeze(GAME_CONFIG.BRANCHES);
GAME_CONFIG.BRANCHES.forEach(b => Object.freeze(b));
Object.freeze(GAME_CONFIG.TELLER_UNLOCK_COSTS);
Object.freeze(GAME_CONFIG.GUARD_UNLOCK_COSTS);
Object.freeze(GAME_CONFIG.MANAGER_COSTS);
Object.freeze(GAME_CONFIG.MANAGER_UPGRADE_COSTS);
Object.keys(GAME_CONFIG.MANAGER_UPGRADE_COSTS).forEach(k => Object.freeze(GAME_CONFIG.MANAGER_UPGRADE_COSTS[k]));
Object.freeze(GAME_CONFIG.MANAGER_UPGRADE_COSTS_DEFAULT);
Object.freeze(GAME_CONFIG.ADMOB_CONFIG);
Object.freeze(GAME_CONFIG.GOLD_UPGRADE_COSTS);
Object.freeze(GAME_CONFIG.STARTING_CASH_OPTIONS);
Object.freeze(GAME_CONFIG.MANAGER_COEFFICIENTS);
Object.keys(GAME_CONFIG.MANAGER_COEFFICIENTS).forEach(k => Object.freeze(GAME_CONFIG.MANAGER_COEFFICIENTS[k]));
GAME_CONFIG.WHEEL_PRIZES.forEach(p => Object.freeze(p));
Object.freeze(GAME_CONFIG.WHEEL_PRIZES);
Object.freeze(GAME_CONFIG.GUARD_TELLER_ANCHORS);
GAME_CONFIG.ACHIEVEMENTS.forEach(a => Object.freeze(a));
Object.freeze(GAME_CONFIG.ACHIEVEMENTS);
Object.freeze(GAME_CONFIG);

if (typeof window !== 'undefined') {
    window.GAME_CONFIG = GAME_CONFIG;
}
