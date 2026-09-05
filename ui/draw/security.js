import { formatMoney } from './format.js';

let hubClickBound = false;

function bindHubClickListener() {
    if (hubClickBound) return;
    const hub = document.getElementById('guard-stations-hub');
    if (!hub) return;

    hub.addEventListener('click', (e) => {
        const bay = e.target.closest('.guard-station-bay');
        if (!bay) return;
        const gid = bay.getAttribute('data-guard-id');
        if (gid !== null && gid !== undefined) {
            if (window.gameAudio && window.gameAudio.playClick) {
                try { window.gameAudio.playClick(); } catch (_) {}
            }

            // Switch to Upgrades Tab
            const upgBtn = document.getElementById('tab-btn-upgrades') || document.querySelector('[data-tab="upgrades"]');
            if (upgBtn) upgBtn.click();

            // Scroll to guard upgrade / unlock card in the tab
            setTimeout(() => {
                const card = document.querySelector(`.upgrade-card[data-type="guard"][data-id="${gid}"], [data-action="unlock-guard"][data-id="${gid}"]`)
                          || document.querySelector(`.upgrades-grid:nth-of-type(2) .upgrade-card:nth-child(${parseInt(gid, 10) + 1})`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('highlight-glow');
                    setTimeout(() => card.classList.remove('highlight-glow'), 1800);
                }
            }, 120);
        }
    });

    hubClickBound = true;
}

export function renderGuardStationsHub(lang) {
    const hub = document.getElementById('guard-stations-hub');
    if (!hub || !window.game || !window.game.state || !Array.isArray(window.game.state.guards)) return;

    bindHubClickListener();

    const currentLang = lang || (window.game && window.game.state && window.game.state.language) || 'he';
    const t = (typeof translations !== "undefined" && translations[currentLang]) ? translations[currentLang] : ((window.translations && window.translations[currentLang]) || (window.translations && window.translations.he) || {});
    const unlockCosts = (window.GAME_CONFIG && window.GAME_CONFIG.GUARD_UNLOCK_COSTS) || [0, 2500, 70000];

    const guardsHtml = window.game.state.guards.map((g, idx) => {
        const cost = unlockCosts[idx] || 0;
        if (g.unlocked) {
            const isOnDuty = g.state && g.state !== 'idle';
            const statusText = isOnDuty ? (t.guardOnDuty || 'בסיור') : (t.guardReady || 'מוכן');
            return `
                <div class="guard-station-bay active" id="guard-bay-${g.id}" data-guard-id="${g.id}" title="${t.guardLabel || 'בלדר'} ${g.id + 1}">
                    <div class="guard-bay-slot" id="guard-slot-${g.id}">
                        <span class="guard-bay-slot-base"></span>
                    </div>
                    <div class="guard-bay-content">
                        <div class="guard-bay-name">${t.guardLabel || 'בלדר'} ${g.id + 1}</div>
                        <div class="guard-bay-lvl-pill">${t.levelAbbr || t.levelLabel || 'Lvl'} ${g.level || 1}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="guard-station-bay locked" id="guard-bay-${g.id}" data-guard-id="${g.id}" title="${t.unlockLabel || 'פתיחה'} ${t.guardLabel || 'בלדר'} ${g.id + 1}">
                    <div class="guard-bay-slot">
                        <span class="guard-bay-lock-icon">🔒</span>
                    </div>
                    <div class="guard-bay-content">
                        <div class="guard-bay-name-row">
                            <span class="guard-bay-name">${t.guardLabel || 'בלדר'} ${g.id + 1}</span>
                        </div>
                        <div class="guard-bay-status locked">${t.guardLockedLabel || t.lockedLabel || 'Locked'}</div>
                    </div>
                </div>
            `;
        }
    }).join('');

    if (hub.innerHTML !== guardsHtml) {
        hub.innerHTML = guardsHtml;
    }
}

// Get exact coordinates for a specific teller index relative to floorMap
function getTellerAnchorPos(floorMap, tellerIndex) {
    const mapRect = floorMap.getBoundingClientRect();
    const tellerNode = document.getElementById(`teller-node-${tellerIndex}`) || document.querySelectorAll('.teller-counter')[tellerIndex];
    if (tellerNode) {
        const rect = tellerNode.getBoundingClientRect();
        return {
            x: rect.left - mapRect.left + (rect.width / 2),
            y: rect.top - mapRect.top + (rect.height * 0.65) // Natural collection point right at counter desk
        };
    }
    const tellersZone = document.getElementById('tellers-zone');
    if (tellersZone) {
        const zRect = tellersZone.getBoundingClientRect();
        return {
            x: zRect.left - mapRect.left + (zRect.width / 2),
            y: zRect.top - mapRect.top + 60
        };
    }
    return { x: 150, y: 300 };
}

// Get exact coordinates for a guard's home station slot relative to floorMap
function getStationSlotPos(floorMap, guardId) {
    const mapRect = floorMap.getBoundingClientRect();
    const slotEl = document.getElementById(`guard-slot-${guardId}`) || document.getElementById(`guard-bay-${guardId}`);
    if (slotEl) {
        const rect = slotEl.getBoundingClientRect();
        return {
            x: rect.left - mapRect.left + (rect.width / 2),
            y: rect.top - mapRect.top + (rect.height / 2)
        };
    }
    return { x: 50 + guardId * 100, y: 150 };
}

// Smooth multi-segment interpolation
function getCourierPos(gData) {
    const floorMap = document.getElementById('floor-map');
    if (!floorMap) return { x: 0, y: 0 };

    const stationPos = getStationSlotPos(floorMap, gData.id);

    // State 1: Idle or at station
    if (!gData.state || gData.state === 'idle' || gData.state === 'depositing') {
        return stationPos;
    }

    // State 2: Moving from Station (or previous teller) to Target Teller
    if (gData.state.startsWith('moving_to_teller_')) {
        const targetTi = parseInt(gData.state.slice('moving_to_teller_'.length), 10);
        const targetPos = getTellerAnchorPos(floorMap, targetTi);

        // Previous anchor: station for first teller, or previous teller
        const lastTi = gData.lastCollectedTellerIndex;
        const isFirstStop = typeof lastTi !== 'number' || lastTi < 0 || lastTi === targetTi;
        const startPos = isFirstStop ? stationPos : getTellerAnchorPos(floorMap, lastTi);

        // Calculate progress percentage based on segmentPosition
        const targetAnchor = (window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS)
            ? (window.GAME_CONFIG.GUARD_TELLER_ANCHORS[targetTi] || 0.1 * (targetTi + 1))
            : (0.1 * (targetTi + 1));
        const startAnchor = (typeof lastTi === 'number' && lastTi >= 0)
            ? ((window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS) ? window.GAME_CONFIG.GUARD_TELLER_ANCHORS[lastTi] : 0.1 * (lastTi + 1))
            : 0.0;

        const totalDist = Math.abs(targetAnchor - startAnchor);
        let t = 0;
        if (totalDist > 0) {
            t = Math.abs(gData.position - startAnchor) / totalDist;
        } else {
            t = 1;
        }
        t = Math.max(0, Math.min(1, t));

        return {
            x: startPos.x + t * (targetPos.x - startPos.x),
            y: startPos.y + t * (targetPos.y - startPos.y)
        };
    }

    // State 3: Collecting at Target Teller
    if (gData.state.startsWith('collecting_from_teller_')) {
        const ti = parseInt(gData.state.slice('collecting_from_teller_'.length), 10);
        return getTellerAnchorPos(floorMap, ti);
    }

    // State 4: Moving from Last Teller directly back UP to Station
    if (gData.state === 'moving_to_vault') {
        const lastTi = (typeof gData.lastCollectedTellerIndex === 'number' && gData.lastCollectedTellerIndex >= 0)
            ? gData.lastCollectedTellerIndex
            : 0;
        const startPos = getTellerAnchorPos(floorMap, lastTi);

        const startAnchor = (window.GAME_CONFIG && window.GAME_CONFIG.GUARD_TELLER_ANCHORS)
            ? (window.GAME_CONFIG.GUARD_TELLER_ANCHORS[lastTi] || 0.1 * (lastTi + 1))
            : 0.1;
        const targetAnchor = 0.0; // Station

        const totalDist = Math.abs(startAnchor - targetAnchor);
        let t = 0;
        if (totalDist > 0) {
            t = Math.abs(startAnchor - gData.position) / totalDist;
        } else {
            t = 1;
        }
        t = Math.max(0, Math.min(1, t));

        return {
            x: startPos.x + t * (stationPos.x - startPos.x),
            y: startPos.y + t * (stationPos.y - startPos.y)
        };
    }

    return stationPos;
}

// Per-frame refresh of the security guard runners and stations hub
export function updateGuardsDisplay(lang) {
    // 1. Update the Guard Stations Hub
    renderGuardStationsHub(lang);

    const unlockedGuards = game.state.guards.filter(g => g.unlocked);
    const floorMap = document.getElementById('floor-map');
    if (!floorMap) return;

    if (unlockedGuards.length > 0) {
        // Reconciliation: remove extra guard-runner elements
        const currentGuardIds = unlockedGuards.map(g => g.id.toString());
        const existingRunners = Array.from(floorMap.querySelectorAll('.guard-runner'));
        existingRunners.forEach(node => {
            const gid = node.getAttribute('data-guard-id');
            if (!currentGuardIds.includes(gid)) {
                floorMap.removeChild(node);
            }
        });

        // Sync and render each unlocked guard inside floorMap
        unlockedGuards.forEach(g => {
            const gData = game.getGuardRenderData(g.id);
            if (!gData) return;

            let runner = floorMap.querySelector(`.guard-runner[data-guard-id="${gData.id}"]`);
            if (!runner) {
                runner = document.createElement('div');
                runner.className = 'guard-runner';
                runner.setAttribute('data-guard-id', gData.id.toString());
                runner.style.zIndex = '310';
                runner.style.willChange = 'transform, left, top';
                runner.style.position = 'absolute';
                
                const avatarEl = document.createElement('div');
                avatarEl.className = 'guard-runner-avatar';
                runner.appendChild(avatarEl);

                const loadEl = document.createElement('div');
                loadEl.className = 'guard-runner-load';
                runner.appendChild(loadEl);

                floorMap.appendChild(runner);
            }

            const isMovingToTeller = gData.state && gData.state.startsWith('moving_to_teller_');
            const isCollecting = gData.state && gData.state.startsWith('collecting_from_teller_');
            const isMovingToVault = gData.state === 'moving_to_vault';
            const isIdle = !gData.state || gData.state === 'idle' || gData.state === 'depositing';
            
            const pos = getCourierPos(gData);
            
            runner.style.left = `${pos.x}px`;
            runner.style.top = `${pos.y}px`;
            runner.style.transform = `translate(-50%, -50%)`;

            // Clean previous state and direction classes
            runner.className = 'guard-runner';
            runner.classList.add(`state-${gData.state || 'idle'}`);
            if (isMovingToTeller) runner.classList.add('state-moving_to_tellers');
            if (isCollecting) runner.classList.add('state-collecting');
            if (isIdle) runner.classList.add('state-idle-at-station');

            // Facing direction
            if (isMovingToTeller) {
                runner.classList.add('moving-left');
            } else if (gData.state === 'moving_to_vault') {
                runner.classList.add('moving-right');
            }

            // Update load label bubble
            const loadEl = runner.querySelector('.guard-runner-load');
            const loadText = gData.loadedCash > 0 ? formatMoney(gData.loadedCash) : '';
            if (loadEl.innerText !== loadText) {
                loadEl.innerText = loadText;
                loadEl.style.display = gData.loadedCash > 0 ? 'block' : 'none';
            }
        });

    } else {
        // Cleanup if no guards
        const existingRunners = Array.from(floorMap.querySelectorAll('.guard-runner'));
        existingRunners.forEach(node => floorMap.removeChild(node));
    }
}
