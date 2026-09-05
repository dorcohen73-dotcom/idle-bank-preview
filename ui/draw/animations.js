export let activeCoins = [];

let isVaultRectDirty = true;
let cachedVaultRect = { left: 0, top: 0, width: 0, height: 0, x: 0, y: 0 };

if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => { isVaultRectDirty = true; }, { passive: true });
    window.addEventListener('resize', () => { isVaultRectDirty = true; }, { passive: true });
    window.addEventListener('orientationchange', () => { isVaultRectDirty = true; }, { passive: true });
}

export function getVaultTargetRect() {
    if (isVaultRectDirty) {
        let targetEl = DOM_CACHE.vaultGraphic;
        if (window.innerWidth <= 768) {
            const miniIcon = document.querySelector('.vault-mini-icon');
            if (miniIcon && window.getComputedStyle(miniIcon).display !== 'none') {
                targetEl = miniIcon;
            }
        }
        cachedVaultRect = targetEl ? targetEl.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0, x: 0, y: 0 };
        isVaultRectDirty = false;
    }
    return cachedVaultRect;
}

let floatingTextPool = [];
const FLOATING_POOL_SIZE = 40;
let activeFloatingText = [];

export function initFloatingPool() {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById('floating-container');
    if (!floatContainer) return;
    
    for (let i = 0; i < FLOATING_POOL_SIZE; i++) {
        const div = document.createElement('div');
        div.className = 'floating-cash';
        div.style.cssText = 'display:none;opacity:0;position:absolute;left:0;top:0;';
        floatContainer.appendChild(div);
        floatingTextPool.push({
            element: div,
            active: false
        });
    }
}

export function getFloatingFromPool() {
    if (floatingTextPool.length === 0) initFloatingPool();
    for (let i = 0; i < floatingTextPool.length; i++) {
        if (!floatingTextPool[i].active) return floatingTextPool[i];
    }
    if (activeFloatingText.length > 0) {
        const oldest = activeFloatingText[0];
        activeFloatingText.shift();
        oldest.poolObj.active = false;
        oldest.element.style.display = 'none';
        return oldest.poolObj;
    }
    return floatingTextPool[0];
}

let spawnCounter = 0;

export function spawnFloating(text, x, y, type = 'gold', fontSize = null, important = false) {
    // Guard against hidden elements / invalid coordinates leaking behind header
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y) || (x <= 10 && y <= 60) || y < 50) {
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
    if (type === 'gold') colorStr = 'var(--primary-gold)';
    else if (type === 'red' || type === 'danger') colorStr = 'var(--danger-red)';
    else if (type === 'green' || type === 'money') colorStr = 'var(--green-light)';

    div.style.cssText = `position:absolute;left:0;top:0;display:block;color:${colorStr};font-size:${fontSize || '1.2rem'};will-change:transform,opacity;`;
    div.innerText = text;

    activeFloatingText.push({
        poolObj: floatObj,
        element: div,
        startX: x,
        startY: y,
        colorStr: colorStr,
        fontSize: fontSize || '1.2rem',
        progress: 0,
        duration: 1.2
    });
}

export function updateFloatingText(dt) {
    for (let i = activeFloatingText.length - 1; i >= 0; i--) {
        const f = activeFloatingText[i];
        f.progress += dt;
        const t = Math.min(1.0, f.progress / f.duration);
        
        const easeT = 1 - Math.pow(1 - t, 3);
        const currentY = f.startY - easeT * 50;
        
        let opacity = 1;
        if (t < 0.15) opacity = t / 0.15;
        else if (t > 0.7) opacity = 1 - ((t - 0.7) / 0.3);
        
        f.element.style.transform = `translate3d(${f.startX}px,${currentY}px,0) scale(${1 + (1-easeT)*0.2})`;
        f.element.style.opacity = opacity;
        
        if (t >= 1.0) {
            f.element.style.display = 'none';
            f.poolObj.active = false;
            activeFloatingText.splice(i, 1);
        }
    }
}

let coinPool = [];
const COIN_POOL_SIZE = 120;

export function initCoinPool() {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById('floating-container');
    if (!floatContainer) return;
    
    for (let i = 0; i < COIN_POOL_SIZE; i++) {
        const coin = document.createElement('div');
        coin.className = 'flying-coin';
        coin.style.cssText = 'display:none;opacity:0;';
        floatContainer.appendChild(coin);
        coinPool.push({
            element: coin,
            active: false
        });
    }
}

export function getCoinFromPool() {
    if (coinPool.length === 0) {
        initCoinPool();
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
        oldestCoin.element.style.display = 'none';
        return oldestCoin.poolObj;
    }
    return coinPool[0];
}

export function clearActiveCoins() {
    activeCoins.forEach(c => {
        c.element.style.display = 'none';
        c.element.style.opacity = '0';
        if (c.poolObj) {
            c.poolObj.active = false;
        }
    });
    activeCoins.length = 0;
}

export function updateActiveCoins(dt) {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById('floating-container');
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
        const t = Math.min(1.0, c.progress / c.duration);
        const easeT = t * (2 - t);
        
        const currentX = c.startX + (c.endX - c.startX) * easeT;
        const arcY = -c.arcHeight * Math.sin(t * Math.PI);
        const currentY = c.startY + (c.endY - c.startY) * easeT + arcY;
        
        let transformStr = "";
        let opacity = 1.0 - t * 0.65;
        
        if (c.type === 'particle') {
            const spin = c.randomPhase * 40 + t * 360;
            const scale = 1.0 - t * 0.8;
            transformStr = `scale(${scale}) rotate(${spin}deg)`;
            opacity = 1.0 - Math.pow(t, 2);
        } else if (c.type === 'cash') {
            const wiggle = Math.sin(t * Math.PI * 4.5 + c.randomPhase) * 22;
            transformStr = `scale(${1.2 - t * 0.25}) rotate(${wiggle}deg)`;
        } else {
            const spin = c.randomPhase * 40 + t * 480;
            transformStr = `scale(${1.1 - t * 0.25}) rotate(${spin}deg)`;
        }
        
        c.element.style.cssText = `transform:translate3d(${currentX}px,${currentY}px,0) ${transformStr};opacity:${opacity};display:block;position:absolute;left:0;top:0;will-change:transform,opacity;`;
        
        if (t >= 1.0) {
            c.element.style.cssText = 'display:none;opacity:0;';
            c.poolObj.active = false;
            if (c.isLast && !c.playedSound) {
                c.playedSound = true;
                if (c.type === 'cash') {
                    window.gameAudio.playChaChing();
                }
            }
            activeCoins.splice(i, 1);
        }
    }
}

export function spawnParticles(x, y, count = 10, type = 'gold') {
    const floatContainer = DOM_CACHE.floatingContainer || document.getElementById('floating-container');
    if (!floatContainer) return;
    if (coinPool.length === 0) initCoinPool();

    for (let i = 0; i < count; i++) {
        const coinObj = getCoinFromPool();
        if (!coinObj) continue;
        coinObj.active = true;
        const coin = coinObj.element;
        coin.innerText = type === 'star' ? '✨' : (type === 'sparkle' ? '🌟' : '💰');
        coin.style.display = 'none';

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
            type: 'particle',
            isLast: false,
            playedSound: true,
            arcHeight: -20 + Math.random() * 40,
            randomPhase: Math.random() * Math.PI * 2
        });
    }
}

// Flying coin particle animation between two screen rects — disabled for
// performance on weaker devices; kept as a no-op since callers still invoke it.
export function animateCoins() {
}
