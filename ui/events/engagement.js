import { onboardingManager } from './onboarding.js';
import { initSound, playAd, AdService } from './ads.js';

let vipBannerCountdownInterval = null;

    export function triggerVipVisitBanner() {
        if (document.getElementById('vip-visit-banner')) return;

        const lang = (game.state && game.state.language) || 'en';
        const tObj = translations[lang] || translations.en;

        const banner = document.createElement('div');
        banner.id = 'vip-visit-banner';
        banner.className = 'vip-visit-banner';

        let prestigeAmount = typeof game.calculatePrestigeShares === 'function' ? game.calculatePrestigeShares() : 10;
        let ownedShares = (game.state && game.state.shares) ? game.state.shares : 0;
        let totalEffectiveShares = ownedShares + prestigeAmount;
        
        // VIP Share Reward Rules:
        // 1. 30% of potential prestige gain
        // 2. 5% of total effective shares (so it's always relevant even if gain is 0)
        // 3. Absolute minimum of 3 shares
        let shareReward = Math.max(3, Math.ceil(prestigeAmount * 0.30), Math.ceil(totalEffectiveShares * 0.05));

        let hourlyProfit = typeof game.getEarningsPerSecond === 'function' ? game.getEarningsPerSecond() * 3600 : 0;
        let cashReward = Math.ceil(hourlyProfit * 0.30);

        const serveText = tObj.vipCloseBtn || 'המשך כרגיל';
        const rewardType = Math.random() < 0.5 ? 'shares' : 'cash';
        
        let premiumText = '';
        if (rewardType === 'shares') {
            premiumText = typeof tObj.vipPremiumBtn === 'function' ? tObj.vipPremiumBtn(shareReward) : (tObj.vipPremiumBtn || 'VIP Premium');
        } else {
            premiumText = tObj.vipPremiumCashBtn ? tObj.vipPremiumCashBtn(formatMoney(cashReward)) : `VIP Premium (פרסומת + ${formatMoney(cashReward)})`;
        }

        const vipName = tObj.vipBannerTitle || 'לקוח עסקי';

        banner.innerHTML = `
            <div class="vip-premium-content">
                <div class="vip-red-carpet"></div>
                <div class="vip-shimmer"></div>
                <div class="vip-profile">
                    <div class="vip-avatar">💎</div>
                    <div class="vip-ring"></div>
                </div>
                <div class="vip-info">
                    <div class="vip-title-wrap"><span class="vip-badge">VIP</span> <span class="vip-name">${vipName}</span></div>
                </div>
                <div class="vip-progress-wrap">
                    <div class="vip-progress-bar" id="vip-progress-bar"></div>
                </div>
                <div class="vip-actions">
                    ${!AdService.isInCooldown('short') ? `
                    <button class="vip-btn vip-serve-premium" id="vip-serve-ad"><span class="btn-icon">🎬</span> ${premiumText}</button>
                    ` : ''}
                    <button class="vip-btn vip-serve-cash" id="vip-serve-cash">${serveText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        let secsLeft = 25;
        const totalSecs = 25;
        const progressBar = document.getElementById('vip-progress-bar');

        if (vipBannerCountdownInterval) clearInterval(vipBannerCountdownInterval);
        vipBannerCountdownInterval = setInterval(() => {
            secsLeft--;
            if (progressBar) {
                const pct = (secsLeft / totalSecs) * 100;
                progressBar.style.width = pct + '%';
            }
            if (secsLeft <= 0) {
                clearInterval(vipBannerCountdownInterval);
                removeVipVisitBanner();
            }
        }, 1000);

        document.getElementById('vip-serve-cash').addEventListener('click', () => {
            initSound();
            serveVipVisitor('none');
        });
        const premiumAdBtn = document.getElementById('vip-serve-ad');
        if (premiumAdBtn) {
            premiumAdBtn.addEventListener('click', () => {
                initSound();
                serveVipVisitor(rewardType);
            });
        }
    }

    export function removeVipVisitBanner() {
        if (vipBannerCountdownInterval) {
            clearInterval(vipBannerCountdownInterval);
            vipBannerCountdownInterval = null;
        }
        if (window._vipBannerRetryTimeout) {
            clearTimeout(window._vipBannerRetryTimeout);
            window._vipBannerRetryTimeout = null;
        }
        const banner = document.getElementById('vip-visit-banner');
        if (banner) banner.remove();
    }

    export function serveVipVisitor(rewardType) {
        removeVipVisitBanner();
        game.state.vipVisitActive = false;
        game.state.nextVipVisit = Date.now() + (600 + Math.random() * 60) * 1000;
        game.state.vipVisitExpiry = 0;
        game.state.vipServedTotal = (game.state.vipServedTotal || 0) + 1;
        game.missionsDirty = true;

        if (rewardType === 'shares') {
            playAd(() => {
                let prestigeAmount = typeof game.calculatePrestigeShares === 'function' ? game.calculatePrestigeShares() : 10;
                let ownedShares = (game.state && game.state.shares) ? game.state.shares : 0;
                let totalEffectiveShares = ownedShares + prestigeAmount;
                let shareReward = Math.max(3, Math.ceil(prestigeAmount * 0.30), Math.ceil(totalEffectiveShares * 0.05));
                
                game.addShares(shareReward);
                const msg = `⭐ ${shareReward} VIP Shares ⭐`;
                spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, 'gold');
                for (let i = 0; i < 20; i++) {
                    setTimeout(() => spawnFloating('💎', window.innerWidth / 2 + (Math.random() * 160 - 80), window.innerHeight / 2 + (Math.random() * 160 - 80), 'gold'), Math.random() * 800);
                }
                draw();
            }, 'short');
        } else if (rewardType === 'cash') {
            playAd(() => {
                let hourlyProfit = typeof game.getEarningsPerSecond === 'function' ? game.getEarningsPerSecond() * 3600 : 0;
                let cashReward = Math.ceil(hourlyProfit * 0.30);

                game.addCash(cashReward);
                const msg = `💵 +${formatMoney(cashReward)} 💵`;
                spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, 'green');
                for (let i = 0; i < 20; i++) {
                    setTimeout(() => spawnFloating('💵', window.innerWidth / 2 + (Math.random() * 160 - 80), window.innerHeight / 2 + (Math.random() * 160 - 80), 'green'), Math.random() * 800);
                }
                draw();
            }, 'short');
        } else {
            game.saveGame();
            draw();
        }
    }

    export function renderDailyChallengesSection() {
        if (!window.game || !window.game.state) return;
        if (!window.dailyChallengeController) return;

        window.dailyChallengeController.checkAndReset();

        const lang = (game.state && game.state.language) || 'en';
        const tObj = translations[lang] || translations.en;
        const container = document.getElementById('daily-challenges-content');
        if (!container) return;

        container.innerHTML = '';

        // Countdown to midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        const msToMidnight = tomorrow - now;
        const hToMidnight = Math.floor(msToMidnight / 3600000).toString().padStart(2, '0');
        const mToMidnight = Math.floor((msToMidnight % 3600000) / 60000).toString().padStart(2, '0');
        const resetText = tObj.dailyResetLabel ? tObj.dailyResetLabel(hToMidnight, mToMidnight) : `${hToMidnight}:${mToMidnight}`;

        const headerEl = document.createElement('div');
        headerEl.className = 'daily-header-ai';
        headerEl.innerHTML = `
            <div class="daily-header-title">
                <i class="fas fa-calendar-alt" style="color:var(--text-light); margin-left:8px;"></i> ${tObj.dailyChallengesTitle || 'אתגרי היום'}
            </div>
            <div class="daily-header-box">
                <span class="daily-subtitle">${tObj.dailyChallengesSubtitle || '3 אתגרים קשים שמתאפסים בחצות'}</span>
                <span class="daily-reset-timer">${resetText}</span>
            </div>
        `;
        container.appendChild(headerEl);

        const challenges = game.state.dailyChallenges || [];

        if (challenges.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.style.color = 'var(--text-muted)';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.padding = '1rem';
            emptyEl.textContent = tObj.loadingChallengesMsg || 'Loading...';
            container.appendChild(emptyEl);
            return;
        }

        challenges.forEach((c, idx) => {
            const typeLabel = (tObj.dailyChallengeTypes && tObj.dailyChallengeTypes[c.type]) || c.type;
            const pct = c.target > 0 ? Math.min(100, Math.floor((c.progress / c.target) * 100)) : 0;
            const rewardText = c.reward && c.reward.type === 'gold'
                ? (tObj.dailyRewardGold ? tObj.dailyRewardGold(c.reward.amount) : `+${c.reward.amount} gold`)
                : (tObj.dailyRewardShares ? tObj.dailyRewardShares(c.reward.amount) : `+${c.reward.amount}`);

            const card = document.createElement('div');
            card.className = 'daily-challenge-card' + (c.completed ? ' completed' : '') + (c.claimed ? ' claimed' : '');
            card.innerHTML = `
                <div class="daily-card-top">
                    <span class="daily-reward-pill">${rewardText}</span>
                    <span class="daily-card-title">${typeLabel} <i class="fas fa-star" style="color:#fde047; margin-right:5px;"></i></span>
                </div>
                <div class="daily-card-progress">
                    <div class="daily-progress-wrap">
                        <div class="daily-progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="daily-card-bottom">
                    ${c.completed && !c.claimed
                        ? `<button class="daily-claim-btn" data-idx="${idx}">${tObj.dailyClaimBtn || 'קבל פרס'}</button>
                           <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>`
                        : c.claimed
                            ? `<span class="daily-claimed-label">${tObj.dailyClaimedLabel || 'נאסף'}</span>
                               <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>`
                            : `<span class="daily-pct-text">${pct}%</span>
                               <span class="daily-amount-text">${formatMoney(c.progress)} / ${formatMoney(c.target)}</span>`
                    }
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.daily-claim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window._isClaimingDaily) return;
                window._isClaimingDaily = true;
                setTimeout(() => { window._isClaimingDaily = false; }, 500);

                initSound();
                const idx = parseInt(btn.getAttribute('data-idx'));
                const claimed = window.dailyChallengeController.claimReward(idx);
                if (claimed) {
                    btn.disabled = true;
                    const lang2 = (game.state && game.state.language) || 'en';
                    const tObj2 = translations[lang2] || translations.en;
                    const c = game.state.dailyChallenges[idx];
                    let msg = '+1';
                    if (c && c.reward) {
                        msg = c.reward.type === 'gold'
                            ? (tObj2.dailyRewardGold ? tObj2.dailyRewardGold(c.reward.amount) : `+${c.reward.amount}`)
                            : (tObj2.dailyRewardShares ? tObj2.dailyRewardShares(c.reward.amount) : `+${c.reward.amount}`);
                    }
                    spawnFloating(msg, window.innerWidth / 2, window.innerHeight / 2 - 40, 'gold');
                    if (window.gameAudio && typeof window.gameAudio.playUnlock === 'function') window.gameAudio.playUnlock();
                    renderDailyChallengesSection();
                    draw();
                }
            });
        });
    }

    export function startPromoRecording(durationMs = 15000) {
        // Create a 'Start Recording' button to satisfy Chrome's user gesture requirement
        const startBtn = document.createElement('button');
        startBtn.innerHTML = '🔴 התחל הקלטה עכשיו!';
        startBtn.style.cssText = 'position:fixed; top:40%; left:50%; transform:translate(-50%, -50%); z-index:999999; padding:20px 40px; font-size:24px; font-weight:bold; background:#e74c3c; color:white; border:4px solid white; border-radius:15px; cursor:pointer; box-shadow:0 10px 40px rgba(0,0,0,0.8);';
        
        startBtn.onclick = async () => {
            startBtn.remove(); // Remove this button
            
            // Optimize for recording: force English and remove heavy backdrop filter
            if (game) { game.state.language = 'en'; draw(); }
            const s = document.createElement('style');
            s.innerHTML = '* { backdrop-filter: none !important; }';
            document.head.appendChild(s);

            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { frameRate: { ideal: 60 } },
                    audio: false
                });
                let mediaRecorder;
                try { mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 8000000 }); }
                catch { mediaRecorder = new MediaRecorder(stream); }
                
                const chunks = [];
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    
                    // Show a giant download button on screen to bypass browser auto-download blocks
                    const btn = document.createElement('button');
                    btn.innerHTML = '🎥 הסרטון מוכן! לחץ כאן להורדה';
                    btn.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:999999; padding:20px 40px; font-size:24px; font-weight:bold; background:#4CAF50; color:white; border:4px solid white; border-radius:15px; cursor:pointer; box-shadow:0 10px 40px rgba(0,0,0,0.8);';
                    
                    btn.onclick = () => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'idle_bank_promo_en.webm';
                        document.body.appendChild(a);
                        a.click();
                        btn.innerHTML = '✅ מעולה! הקובץ יורד';
                        setTimeout(() => btn.remove(), 3000);
                    };
                    document.body.appendChild(btn);

                    stream.getTracks().forEach(track => track.stop());
                    console.log("🎬 Promo Recording ready! Waiting for user to click download button.");
                    s.remove(); // Restore styling after recording
                };
                mediaRecorder.start();
                console.log(`🎥 Recording started! Will automatically stop and download after ${durationMs / 1000} seconds.`);
                setTimeout(() => mediaRecorder.stop(), durationMs);
            } catch(err) {
                console.error("Screen recording was cancelled or failed:", err);
                s.remove();
            }
        };
        document.body.appendChild(startBtn);
        console.log("Waiting for user to click the start button...");
    };

    export function spawnVaultCoins(amount, btnRect) {
    }

    const DISCOVERY_TIPS = {
        vault: {
            he: { icon: '🔐', title: 'הכספת מחכה לך!', body: 'הדלפקים שלחו כסף לכספת. לחץ "רוקן כספת" להוסיף אותו ליתרה. שדרג את הכספת כדי שתחזיק יותר כסף.' },
            en: { icon: '🔐', title: 'The vault is waiting!', body: 'Tellers have sent cash to the vault. Tap "Empty Vault" to add it to your balance. Upgrade the vault to hold more.' },
            es: { icon: '🔐', title: '¡La bóveda te espera!', body: 'Las cajas han enviado dinero a la bóveda. Toca "Vaciar Bóveda" para añadirlo a tu saldo. Mejora la bóveda para que guarde más.' },
            ru: { icon: '🔐', title: 'Хранилище ждёт!', body: 'Кассы отправили деньги в хранилище. Нажми «Опустошить», чтобы добавить их на счёт. Улучши хранилище, чтобы оно вмещало больше.' }
        },
        guard: {
            he: { icon: '🚐', title: 'גילית: בלדרים!', body: 'הבלדר מעביר כסף מהדלפקים לכספת אוטומטית — בלי שתצטרך ללחוץ. שדרג אותו כדי שיעביר מהר יותר ויכיל יותר.' },
            en: { icon: '🚐', title: 'Discovered: Couriers!', body: 'The courier automatically transfers cash from tellers to the vault — no tapping needed. Upgrade it for faster and larger transfers.' },
            es: { icon: '🚐', title: '¡Descubriste: Mensajeros!', body: 'El mensajero transfiere dinero de las cajas a la bóveda automáticamente. ¡Mejóralo para transferencias más rápidas y mayores!' },
            ru: { icon: '🚐', title: 'Открытие: Курьеры!', body: 'Курьер автоматически переносит деньги из касс в хранилище — без нажатий. Улучши его для большей скорости и вместимости.' }
        },
        dept: {
            he: { icon: '🏢', title: 'גילית: מחלקות!', body: 'כל מחלקה שפותחים מכפילה את ההכנסה הכוללת של הבנק. פתח כמה שיותר מחלקות כדי לגדול מהר יותר.' },
            en: { icon: '🏢', title: 'Discovered: Departments!', body: 'Each department you unlock multiplies your total income. Open as many as possible to grow faster.' },
            es: { icon: '🏢', title: '¡Descubriste: Departamentos!', body: 'Cada departamento que abres multiplica los ingresos totales. Abre tantos como puedas para crecer más rápido.' },
            ru: { icon: '🏢', title: 'Открытие: Отделы!', body: 'Каждый открытый отдел умножает общий доход банка. Открывай как можно больше, чтобы расти быстрее.' }
        },
        manager: {
            he: { icon: '👔', title: 'גילית: מנהלים!', body: 'המנהל ממשיך לעבוד גם כשסוגרים את המשחק! שכור מנהלים לדלפקים ולבלדרים כדי שהבנק ירוץ לגמרי אוטומטי.' },
            en: { icon: '👔', title: 'Discovered: Managers!', body: 'The manager keeps working even when you close the game! Hire managers for tellers and couriers so the bank runs fully automatically.' },
            es: { icon: '👔', title: '¡Descubriste: Gerentes!', body: '¡El gerente sigue trabajando aunque cierres el juego! Contrata gerentes para cajas y mensajeros para automatizar el banco.' },
            ru: { icon: '👔', title: 'Открытие: Менеджеры!', body: 'Менеджер продолжает работать даже когда ты закрываешь игру! Нанимай менеджеров для касс и курьеров, чтобы банк работал автоматически.' }
        },
        prestige: {
            he: { icon: '⭐', title: 'הגיע הזמן ל-Prestige!', body: 'הבנק צמח מספיק. לחץ על "סניפים" ובחר Prestige — הבנק יתאפס, אבל תקבל מניות זהב שמגדילות את כל ההכנסה לצמיתות!' },
            en: { icon: '⭐', title: "Time to Prestige!", body: 'Your bank is big enough. Go to "Branches" and choose Prestige — the bank resets, but you earn Gold Shares that permanently multiply all income!' },
            es: { icon: '⭐', title: '¡Hora del Prestige!', body: 'Tu banco ya es suficientemente grande. Ve a "Sucursales" y elige Prestige — el banco se reinicia, pero obtienes Acciones de Oro que multiplican permanentemente todos los ingresos.' },
            ru: { icon: '⭐', title: 'Время для Prestige!', body: 'Банк достаточно вырос. Перейди в «Филиалы» и выбери Prestige — банк сбросится, но ты получишь Золотые Акции, которые навсегда умножат доход!' }
        },
        fortune: {
            he: { icon: '🎡', title: 'גילית: גלגל המזל!', body: 'הגלגל מתאפס כל 24 שעות. חזור כל יום לסובב ולזכות בכסף, מניות, או בונוסים.' },
            en: { icon: '🎡', title: 'Discovered: Fortune Wheel!', body: 'The wheel resets every 24 hours. Come back daily to spin and win cash, shares, or bonuses.' },
            es: { icon: '🎡', title: '¡Descubriste: la Ruleta!', body: 'La ruleta se reinicia cada 24 horas. Vuelve cada día para girarla y ganar dinero, acciones o bonificaciones.' },
            ru: { icon: '🎡', title: 'Открытие: Колесо Фортуны!', body: 'Колесо перезаряжается каждые 24 часа. Возвращайся каждый день, чтобы крутить и выигрывать деньги, акции или бонусы.' }
        }
    };

let _discoveryQueue = [];
let _discoveryActive = false;

    export function showDiscoveryTip(key) {
        if (!window.game || !window.game.state) return;
        if (!DISCOVERY_TIPS[key]) return;

        if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
        if (window.game.state.discoveredTips[key]) return;

        window.game.state.discoveredTips[key] = true;
        window.game.saveGame();

        _discoveryQueue.push(key);
        if (!_discoveryActive) _nextDiscoveryTip();
    }

    export function _nextDiscoveryTip() {
        if (_discoveryQueue.length === 0) { _discoveryActive = false; return; }
        _discoveryActive = true;
        var key = _discoveryQueue.shift();
        var tipSet = DISCOVERY_TIPS[key];
        if (!tipSet) { _nextDiscoveryTip(); return; }

        var lang = (window.game && window.game.state && window.game.state.language) || 'en';
        var tip = tipSet[lang] || tipSet.he;

        var panel   = document.getElementById('discovery-tip-panel');
        var iconEl  = document.getElementById('discovery-tip-icon');
        var titleEl = document.getElementById('discovery-tip-title');
        var bodyEl  = document.getElementById('discovery-tip-body');
        if (!panel || !iconEl || !titleEl || !bodyEl) { _discoveryActive = false; return; }

        iconEl.textContent  = tip.icon;
        titleEl.textContent = tip.title;
        bodyEl.textContent  = tip.body;

        var btnLabels = { he: 'הבנתי!', en: 'Got it!', es: '¡Entendido!', ru: 'Понял!' };
        var tipBtn = document.getElementById('discovery-tip-btn');
        if (tipBtn) tipBtn.textContent = btnLabels[lang] || 'Got it!';

        panel.style.display = 'flex';
        panel.classList.add('visible');
    }

    export function _dismissDiscoveryTip() {
        var panel = document.getElementById('discovery-tip-panel');
        if (panel) { panel.classList.remove('visible'); panel.style.display = 'none'; }
        _discoveryActive = false;
        if (_discoveryQueue.length > 0) setTimeout(_nextDiscoveryTip, 500);
    }

    export function initTutorialEvents() {
        var btn = document.getElementById('discovery-tip-btn');
        if (btn) btn.addEventListener('click', function() { initSound(); _dismissDiscoveryTip(); });
    }

    export function maybeStartTutorial() {
        if (!window.game || !window.game.state) return;
        if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
        var tips = window.game.state.discoveredTips;
        var isNew = !tips.start && !window.game.state.shares && !(window.game.state.missionsCompleted > 0);
        if (isNew) setTimeout(function() {
            // Wait for the language/offline/login-reward modal cascade to clear before showing the first tip
            var tryShow = function() {
                if (document.querySelector('.modal-overlay.active')) {
                    setTimeout(tryShow, 1000);
                    return;
                }
                showDiscoveryTip('start');
            };
            tryShow();
        }, 2500);
    }

    export function checkPrestigeTip() {
        if (!window.game || !window.game.state) return;
        if (!window.game.state.discoveredTips) window.game.state.discoveredTips = {};
        if (window.game.state.discoveredTips.prestige) return;
        var branches = (window.game && window.game.branches) || (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.BRANCHES);
        var branch = branches && branches[window.game.state.currentBranch];
        if (branch && window.game.state.cash >= branch.minCashToPrestige * (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.PRESTIGE_THRESHOLD_RATIO || 0.90)) {
            showDiscoveryTip('prestige');
        }
    }

