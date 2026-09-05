let svgCache = new Map();
let cachedSuffixes = ['', ' אלף', ' מיליון', ' מיליארד', ' טריליון', ' קוודריליון', ' קווינטיליון', ' סקסטיליון', ' ספטיליון', ' אוקטיליון', ' נוניליון', ' דציליון'];
let cachedFallback = ' עצום';
export let cachedLang = 'he';

export function updateCachedSuffixes(lang) {
    cachedLang = lang || 'en';
    if (cachedLang === 'en') {
        cachedSuffixes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
        cachedFallback = ' monstrous';
    } else if (cachedLang === 'es') {
        cachedSuffixes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
        cachedFallback = ' monstruoso';
    } else if (cachedLang === 'ru') {
        cachedSuffixes = ['', ' тыс.', ' млн', ' млрд', ' трлн', ' квдрлн', ' квинт.', ' секст.', ' септ.', ' окт.', ' нон.', ' дец.'];
        cachedFallback = ' огромное';
    } else {
        cachedSuffixes = ['', ' אלף', ' מיליון', ' מיליארד', ' טריליון', ' קוודריליון', ' קווינטיליון', ' סקסטיליון', ' ספטיליון', ' אוקטיליון', ' נוניליון', ' דציליון'];
        cachedFallback = ' עצום';
    }
}
if (typeof window !== 'undefined') {
    window.updateCachedSuffixes = updateCachedSuffixes;
}

export function fastFormat(num, lang) {
    const separator = (lang === 'ru') ? ' ' : ',';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
}

export function formatMoney(num, noDecimals = false) {
    if (num === null || num === undefined || isNaN(num)) return '$0';
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const prefix = isNegative ? '-$' : '$';

    if (absNum < 1000) {
        return prefix + fastFormat(Math.floor(absNum), cachedLang);
    }
    const i = Math.floor(Math.log10(absNum) / 3);
    const suffix = cachedSuffixes[i] !== undefined ? cachedSuffixes[i] : cachedFallback;
    const rawVal = absNum / Math.pow(10, i * 3);
    const val = noDecimals ? Math.ceil(rawVal) : parseFloat(rawVal.toFixed(2));
    return prefix + fastFormat(val, cachedLang) + suffix;
}

export function formatNumberCompact(num, noDecimals = false) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const prefix = isNegative ? '-' : '';

    if (absNum < 1000) {
        return prefix + fastFormat(Math.floor(absNum), 'en');
    }
    const englishSuffixes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    const i = Math.floor(Math.log10(absNum) / 3);
    const suffix = englishSuffixes[i] !== undefined ? englishSuffixes[i] : ' monstrous';
    const rawVal = absNum / Math.pow(10, i * 3);
    const val = noDecimals ? Math.ceil(rawVal) : parseFloat(rawVal.toFixed(2));
    return prefix + fastFormat(val, 'en') + suffix;
}

export function getClientSVG(type, seed) {
    if (seed === undefined || seed === null || isNaN(seed)) {
        seed = 0;
    }
    if (!type) {
        type = 'normal';
    }
    
    const cleanType = type.replace(/[^a-zA-Z0-9]/g, '');
    const cacheKey = `${cleanType}_${seed}`;
    
    if (svgCache.has(cacheKey)) {
        // LRU: move to end by delete+re-set (Map preserves insertion order)
        const cached = svgCache.get(cacheKey);
        svgCache.delete(cacheKey);
        svgCache.set(cacheKey, cached);
        return cached;
    }

    // Choose which client portrait (1 to 10) to show based on client type and seed
    let imgNum = 1;
    if (type === 'rich') {
        imgNum = 9; // Rich client
    } else if (type === 'vip') {
        imgNum = 10; // VIP client
    } else {
        // Normal clients get 1 to 8 based on seed
        imgNum = (seed % 8) + 1;
    }
    
    let borderColor = 'rgba(255, 255, 255, 0.15)';
    let borderWidth = '1.5px';
    let glow = '';
    
    if (type === 'rich') {
        borderColor = 'rgba(251, 191, 36, 0.85)';
        borderWidth = '2px';
        glow = 'box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);';
    } else if (type === 'vip') {
        borderColor = 'rgba(192, 132, 252, 0.85)';
        borderWidth = '2px';
        glow = 'box-shadow: 0 0 8px rgba(192, 132, 252, 0.4);';
    }
    
    const resultHtml = `
        <div style="position: absolute; inset: 0; border-radius: 50%; overflow: hidden; border: ${borderWidth} solid ${borderColor}; ${glow} background: #0c0f1d;">
            <img src="images/client-${imgNum}.png" alt="Client" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
    `;
    
    if (svgCache.size >= GAME_CONFIG.SVG_CACHE_MAX_SIZE) {
        // Evict the oldest entry (first key in Map iteration order)
        svgCache.delete(svgCache.keys().next().value);
    }
    svgCache.set(cacheKey, resultHtml);
    
    return resultHtml;
}
