// Customer flow — extracted verbatim from IdleBankGame (REFACTOR_PLAN phase 2):
// customer spawning (incl. ad-campaign spawn boost), queue management, assignment
// of queued customers to free tellers, and the teller processing tick (normal /
// rich / VIP rewards). Operates directly on game.state and game.customerQueue;
// no state-shape or behavior changes. game.js keeps thin facades.
class CustomerFlowController {
    constructor(game) {
        this.game = game;
    }

    // Manual "serve next customer" action (teller click in the UI).
    clickTeller(id) {
        const game = this.game;
        const teller = game.state.tellers[id];
        if (!teller || !teller.unlocked || teller.isProcessing) return false;
        
        if (game.customerQueue.length > 0 && teller.cashStored < game.getTellerCapacity(teller.level)) {
            const client = game.customerQueue.shift();
            teller.isProcessing = true;
            teller.customerType = client.type;
            teller.customerSeed = client.seed !== undefined ? client.seed : Math.floor(Math.random() * 1000);
            teller.processingTimeLeft = game.getTellerSpeed(teller.level);
            window.gameAudio.playClick();
            return true;
        }
        return false;
    }

    shiftQueue(count = 1) {
        const game = this.game;
        if (game.customerQueue.length > 0) {
            const shiftCount = Math.min(count, game.customerQueue.length);
            game.customerQueue = game.customerQueue.slice(shiftCount);
        }
    }

    clearQueue() {
        const game = this.game;
        game.customerQueue = [];
    }

    sanitizeQueueAndTellers() {
        const game = this.game;
        if (!game.state || !game.state.departments) return;
        const richDept = game.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_STOCK);
        const vipDept = game.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_VIP);
        const richUnlocked = richDept ? richDept.unlocked : false;
        const vipUnlocked = vipDept ? vipDept.unlocked : false;

        if (game.customerQueue) {
            game.customerQueue.forEach(client => {
                if (client.type === 'vip' && !vipUnlocked) {
                    client.type = 'normal';
                }
                if (client.type === 'rich' && !richUnlocked) {
                    client.type = 'normal';
                }
            });
        }

        if (game.state.tellers) {
            game.state.tellers.forEach(t => {
                if (t.isProcessing) {
                    if (t.customerType === 'vip' && !vipUnlocked) {
                        t.customerType = 'normal';
                    }
                    if (t.customerType === 'rich' && !richUnlocked) {
                        t.customerType = 'normal';
                    }
                }
            });
        }
    }

    // Per-tick pipeline: spawn → cap queue → assign to tellers → advance processing.
    update(dt) {
        const game = this.game;
        const advBudget = game.state.advBudget || 0;
        // Spawning customers
        game.customerSpawnTimer += dt;
        let spawnInterval = 4.0;
        if (game.state.managers && game.state.managers.customer && game.state.managerUpgrades.customer) {
            const customerLvl = game.state.managerUpgrades.customer.level;
            // Base numerator matches the un-hired fallback above (4.0s) rather than 1.5s:
            // save-manager.js force-hires the customer manager for everyone from the start
            // ("prevent deadlock"), so the old 1.5s value was actually every player's
            // baseline, not an upgraded state. At 1.5s a single starting teller (5s/customer)
            // couldn't keep up at all - the queue hit its cap ~10s into a brand new game and
            // stayed there permanently. 4.0s at level 1 keeps the same upgrade curve but
            // starts close to what a level-1 teller can actually sustain.
            spawnInterval = 4.0 / (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.customer.spawnIntervalBoost * (customerLvl - 1));
        }
        
        let adMaxBudget = 0;
        let normalizedBudget = 0;
        if (game.state.advActive && advBudget > 0) {
            adMaxBudget = game.getAdMaxBudget();
            normalizedBudget = Math.min(1, advBudget / adMaxBudget);
        }

        // Organic walk-in traffic without an active campaign is deliberately slow (3x
        // slower than the customer-manager-driven rate) - most customers should only
        // show up because of marketing, not "for free". Without this, arrivals kept
        // pace with (or outran) teller throughput even at 0% ad spend, so the queue
        // could never actually drain no matter how little you invested. This scales
        // linearly down to no slowdown at 100% budget.
        const ORGANIC_SLOWDOWN = 3.0;
        spawnInterval *= (ORGANIC_SLOWDOWN - normalizedBudget * (ORGANIC_SLOWDOWN - 1));

        if (game.state.advActive && advBudget > 0) {
            let totalServiceRate = 0;
            game.state.tellers.forEach(t => {
                if (t.unlocked) {
                    const speed = game.getTellerSpeed(t.level);
                    totalServiceRate += (1 / speed);
                }
            });
            
            const baseSpawnRate = 1 / spawnInterval;
            // Cap scales with current teller throughput (not a fixed number) so the
            // campaign keeps mattering as tellers get upgraded in later stages.
            // We removed the absolute ceiling (Math.min(4)) so that setting the campaign 
            // to maximum will ALWAYS guarantee that customers spawn faster than tellers 
            // can serve them, effectively filling the queue (as the user expects).
            const maxSpawnRate = Math.max(2.5, totalServiceRate * 1.5);
            const maxBoostFactor = maxSpawnRate / baseSpawnRate;
            
            let boostFactor = 1 + normalizedBudget * (maxBoostFactor - 1);
            if (game.state.managers && game.state.managers.marketing && game.state.managerUpgrades.marketing) {
                boostFactor *= (1 + GAME_CONFIG.MANAGER_COEFFICIENTS.marketing.adBoost * game.state.managerUpgrades.marketing.level);
            }
            spawnInterval = spawnInterval / boostFactor;
        }

        if (game.customerSpawnTimer >= spawnInterval) {
            const maxQueue = game.getQueueCapacity(game.state.queueUpgradeLevel || 1);
            let spawnedAny = false;
            
            while (game.customerSpawnTimer >= spawnInterval) {
                if (game.customerQueue.length < maxQueue) {
                    game.customerSpawnTimer -= spawnInterval;
                    spawnedAny = true;
                    
                    let type = 'normal';
                const rand = Math.random();
                
                let vipThreshold = 0.95;
                let richThreshold = 0.80;
                if (game.state.advActive && advBudget > 0) {
                    const normalizedBudget = Math.min(1.0, advBudget / adMaxBudget);
                    vipThreshold -= (normalizedBudget * 0.15);
                    richThreshold -= (normalizedBudget * 0.30);
                }

                const deptStock = game.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_STOCK);
                const deptVip = game.state.departments.find(d => d.id === GAME_CONFIG.DEPT_ID_VIP);
                if (deptVip && deptVip.unlocked && rand > vipThreshold) {
                    type = 'vip';
                } else if (deptStock && deptStock.unlocked && rand > richThreshold) {
                    type = 'rich';
                }
                
                game.customerCounter++;
                game.customerQueue.push({ id: 'c_' + game.customerCounter, type, seed: Math.floor(Math.random() * 1000) });
            } else {
                // Queue is full. Prevent infinite timer accumulation.
                game.customerSpawnTimer = 0;
                
                // Queue is full - Marketing bounce mechanic
                if (game.state.advActive && advBudget > 0 && typeof window !== 'undefined' && window.UI && typeof window.UI.spawnFloating === 'function') {
                    const now = Date.now();
                    if (!game.lastBounceTime || now - game.lastBounceTime > 1500) {
                        game.lastBounceTime = now;
                        const doorX = window.innerWidth * 0.15;
                        const doorY = window.innerHeight * 0.85;
                        const lang = game.state.language || 'en';
                        const leftText = (typeof translations !== 'undefined' && translations[lang] && translations[lang].customerLeftText) || 'Customer left 😡';
                        window.UI.spawnFloating(leftText, doorX + (Math.random() * 40 - 20), doorY + (Math.random() * 20 - 10), 'red', '1.1rem');
                    }
                }
                break;
            }
        }
        }

        // Automating Teller actions
        let checkedCount = 0;
        let tellerIndex = game.lastTellerOffset || 0;
        let assignedCount = 0;
        
        while (checkedCount < game.state.tellers.length && assignedCount < game.customerQueue.length) {
            const t = game.state.tellers[tellerIndex];
            
            if (!t) {
                tellerIndex = (tellerIndex + 1) % game.state.tellers.length;
                checkedCount++;
                continue;
            }
            
            // EMERGENCY: Aggressive NaN prevention
            if (isNaN(t.cashStored) || t.cashStored === null || t.cashStored === undefined) {
                t.cashStored = 0;
            }
            if (isNaN(t.processingTimeLeft)) {
                t.processingTimeLeft = 0;
            }

            if (t.unlocked && !t.isProcessing && t.cashStored < game.getTellerCapacity(t.level)) {
                const client = game.customerQueue[assignedCount];
                if (!client) {
                    // Heal corrupt queue entry
                    game.customerQueue.splice(assignedCount, 1);
                    continue; // Skip teller advance, retry same assignedCount
                }
                t.isProcessing = true;
                t.customerType = client.type || 'normal';
                t.customerSeed = client.seed !== undefined ? client.seed : Math.floor(Math.random() * 1000);
                t.processingTimeLeft = game.getTellerSpeed(t.level) || 0.05;
                assignedCount++;
                tellerIndex = (tellerIndex + 1) % game.state.tellers.length;
            } else {
                tellerIndex = (tellerIndex + 1) % game.state.tellers.length;
            }
            checkedCount++;
        }
        game.lastTellerOffset = tellerIndex;
        if (assignedCount > 0) {
            game.customerQueue = game.customerQueue.slice(assignedCount);
        }

        const baseRewardForTick = game.getCurrentBaseReward() || 10;
        let finalRewardForTick = baseRewardForTick * (game.getTotalMultiplier() || 1);
        if (isNaN(finalRewardForTick)) finalRewardForTick = 10;

        // Updating Teller processing timers
        let _tickVipCount = 0;
        let _tickHadNonVip = false;
        game.state.tellers.forEach(t => {
            if (t.unlocked && t.isProcessing) {
                t.processingTimeLeft -= dt;
                if (t.processingTimeLeft <= 0) {
                    t.isProcessing = false;
                    t.processingTimeLeft = 0;
                    game.state.stats.clientsServed++;
                    if (t.customerType === 'vip' || t.customerType === 'rich') {
                        if (!game.state.stats.vipServed) game.state.stats.vipServed = 0;
                        game.state.stats.vipServed++;
                        _tickVipCount++;
                    } else {
                        _tickHadNonVip = true;
                    }
                    game.missionsDirty = true;

                    let thisTickReward = finalRewardForTick;
                    if (t.customerType === 'vip') {
                        thisTickReward *= 3.0;
                    } else if (t.customerType === 'rich') {
                        thisTickReward *= 1.8;
                    }

                    // boost_run tracking: accumulate cash earned while boost is active
                    if (game.state.boost2xTimeLeft > 0) {
                        game.state.boost2xUsedEver = true;
                        game.state.missions.forEach(m => {
                            if (m.type === 'boost_run' && !m.completed) {
                                m.boostCashAccumulator = (m.boostCashAccumulator || 0) + thisTickReward;
                            }
                        });
                    }

                    game.state.totalIncome += thisTickReward;
                    
                    if (isNaN(t.cashStored)) t.cashStored = 0;
                    t.cashStored = Math.round((t.cashStored + thisTickReward + Number.EPSILON) * 100) / 100;

                    const cap = game.getTellerCapacity(t.level) || 150;
                    if (t.cashStored > cap) {
                        t.cashStored = cap;
                    }
                }
            }
        });
    }
}
