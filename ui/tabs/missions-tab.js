// Dynamic builder for Missions Tab
export function renderMissionsTab() {
    const container = document.getElementById('tab-missions');
    if (!container) return;
    container.innerHTML = '';

    const lang = game.state.language || 'en';
    const tObj = translations[lang].missions;
    const rootT = translations[lang];
    const completedCount = game.state.missionsCompleted || 0;
    
    // Top Board Pannel (Brushed Silver with Gold Border)
    const summaryHeader = document.createElement('div');
    summaryHeader.className = 'missions-summary-header';
    summaryHeader.innerHTML = `
        <div class="summary-badge">
            <span class="trophy-icon">🏆</span>
            <span>${translations[lang].missionCompletedTitle}: ${completedCount}</span>
        </div>
        <p class="summary-desc">${translations[lang].missionCompletedDesc}</p>
    `;
    container.appendChild(summaryHeader);

    // Render active missions (now up to 5) - sorted so completed but unclaimed missions bubble to the top
    const sortedMissions = [...game.state.missions].sort((a, b) => {
        const aReady = a.completed && !a.claimed;
        const bReady = b.completed && !b.claimed;
        if (aReady && !bReady) return -1;
        if (!aReady && bReady) return 1;
        return 0;
    });
    sortedMissions.forEach(m => {
        const card = document.createElement('div');
        card.className = `mission-card ${m.completed ? 'completed' : ''}`;
        card.setAttribute('data-mission-id', m.id);

        const targetVal = m.target || 1;
        const progressVal = m.progress || 0;
        const percent = Math.min(100, (progressVal / targetVal) * 100);

        // Resolve titleKey for mapping legacy/game structure to locales
        let titleKey = m.type;
        if (m.type === 'upgrade_teller') titleKey = 'teller';
        else if (m.type === 'upgrade_guard') titleKey = 'guard';
        else if (m.type === 'upgrade_vault') titleKey = 'vault';
        else if (m.type === 'accumulate_cash') titleKey = 'cash';

        const title = tObj[titleKey + "Title"] || tObj.defaultTitle;
        let progressDesc = '';
        const descFn = tObj[titleKey + "Desc"] || tObj.defaultDesc;
        if (typeof descFn === 'function') {
            if (m.type === 'earn_eps' || m.type === 'accumulate_cash' || m.type === 'earn_cash' || m.type === 'boost_run') {
                progressDesc = descFn(formatMoney(m.target));
            } else if (m.type === 'upgrade_teller' || m.type === 'upgrade_guard') {
                progressDesc = descFn(m.target, (m.targetId !== undefined ? m.targetId + 1 : 1));
            } else if (m.type === 'department_grind') {
                progressDesc = descFn(m.target, m.targetId);
            } else {
                progressDesc = descFn(m.target);
            }
        } else {
            progressDesc = descFn;
        }

        // 3D Illustration Mapping
        const imgMap = {
            'clients': './images/client-10.png',
            'accumulate_cash': './images/gold-chest.png',
            'upgrade_teller': './images/teller-7.png',
            'upgrade_guard': './images/guard_circle.png',
            'upgrade_vault': './images/vault.png',
            'unlock_departments': './images/gold-truck.png',
            'hire_managers': './images/manager_circle.png',
            'earn_eps': './images/eps_circle.png',
            'earn_cash': './images/gold-bars.png',
            'serve_rich_vip': './images/client-6.png',
            'vip_marathon': './images/gold-vip.png',
            'vip_collector': './images/gold-vip.png',
            'department_unlock': './images/gold-truck.png',
            'upgrade_managers': './images/manager_circle.png',
            'manager_hire': './images/manager_circle.png',
            'break_the_wall': './images/manager-7.png',
            'upgrade_arrows': './images/upgrade-arrows.png',
            'guard_trips': './images/guard_circle.png',
            'all_managers': './images/manager_circle.png',
            'department_grind': './images/manager-1.png',
            'missions_veteran': './images/gold-chest.png',
            'boost_run': './images/boost_run_circle.png'
        };
        const imgSrc = imgMap[m.type] || './images/icon.png';

        let rewardAmtHtml = '';
        if (m.reward && typeof m.reward === 'object' && m.reward.type) {
            const shareLbl = rootT.sharesLabel || 'Gold Shares';
            rewardAmtHtml = `<span class="claim-reward-amount">+${m.reward.amount} ${shareLbl} 🪙</span>`;
        } else {
            rewardAmtHtml = `<span class="claim-reward-amount">+${formatMoney(m.reward)} 💰</span>`;
        }

        let actionZoneHtml = '';
        if (m.completed && !m.claimed) {
            actionZoneHtml = `
            <div class="mission-action-zone">
                <button class="claim-reward-btn" data-mission-id="${m.id}">
                    ${rootT.claimReward || 'Claim!'}
                    ${rewardAmtHtml}
                </button>
            </div>
            `;
        }

        // Resolve reward display (may be cash number or {type,amount} object)
        let rewardBadgeHtml = '';
        if (m.reward && typeof m.reward === 'object' && m.reward.type) {
            const shareLbl = rootT.sharesLabel || 'Gold Shares';
            rewardBadgeHtml = `<span>${rootT.rewardLabel || 'Reward:'} +${m.reward.amount} ${shareLbl} 🪙</span>`;
        } else {
            rewardBadgeHtml = `<span>${rootT.profitLabel || 'Profit:'} +${formatMoney(m.reward)} 💰</span>`;
        }

        const circleRadius = 24;
        const circleCircumference = 2 * Math.PI * circleRadius;
        const strokeDashoffset = circleCircumference - (percent / 100) * circleCircumference;

        card.innerHTML = `
            <div class="mission-reward-badge">
                ${rewardBadgeHtml}
            </div>
            <div class="mission-card-top">
                <div class="mission-image-box">
                    <div class="mission-image-glow"></div>
                    <img class="mission-illustration" src="${imgSrc}" alt="" />
                </div>
                <div class="mission-content-middle">
                    <div class="mission-details">
                        <div class="mission-title">${title}</div>
                        <div class="mission-desc">${progressDesc}</div>
                    </div>
                    <div class="mission-progress-row">
                        <div class="mission-progress-outer">
                            <div class="mission-progress-bar" style="width: ${percent}%"></div>
                            <div class="progress-text-overlay">
                                ${['earn_eps','accumulate_cash','earn_cash','boost_run'].includes(m.type) ? formatMoney(progressVal) : progressVal}
                                /
                                ${['earn_eps','accumulate_cash','earn_cash','boost_run'].includes(m.type) ? formatMoney(targetVal) : targetVal}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mission-circle-progress">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle class="circle-bg" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" />
                        <circle class="circle-value" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" stroke-dasharray="${circleCircumference}" stroke-dashoffset="${strokeDashoffset}" />
                    </svg>
                    <div class="circle-text">${Math.round(percent)}%</div>
                </div>
            </div>
            ${actionZoneHtml}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.claim-reward-btn')) {
                return;
            }
            handleMissionRedirect(m.type, m.targetId);
        });

        container.appendChild(card);
    });

    container.querySelectorAll('.claim-reward-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window._isClaimingMission) return;
            window._isClaimingMission = true;
            setTimeout(() => { window._isClaimingMission = false; }, 500);

            initSound();
            const missionId = btn.getAttribute('data-mission-id');
            const collected = game.claimMissionReward(missionId);
            if (collected && collected.type !== 'none' && collected.amount > 0) {
                btn.disabled = true;
                const rectBtn = btn.getBoundingClientRect();
                if (collected.type === 'cash') {
                    spawnFloating('+' + formatMoney(collected.amount), rectBtn.left + rectBtn.width/2, rectBtn.top, 'green', '2.2rem', true);
                } else {
                    // shares / gold reward
                    const lang = (game.state && game.state.language) || 'en';
                    const shareLbl = (translations[lang] || translations.en).sharesLabel || 'Gold Shares';
                    spawnFloating('+' + collected.amount + ' ' + shareLbl + ' 🪙', rectBtn.left + rectBtn.width/2, rectBtn.top, 'gold', '2.2rem', true);
                }

                if (window.gameAudio && typeof window.gameAudio.playUnlock === 'function') {
                    window.gameAudio.playUnlock();
                }

                renderMissionsTab();
            }
        });
    });
}

export function updateMissionsTabProgress() {
    const container = document.getElementById('tab-missions');
    if (!container) return;
    if (game.state.missions) {
        game.state.missions.forEach(m => {
            const card = container.querySelector('.mission-card[data-mission-id="' + m.id + '"]');
            if (!card) return;
            const targetVal = m.target || 1;
            const progressVal = m.progress || 0;
            const percent = Math.min(100, (progressVal / targetVal) * 100);
            const bar = card.querySelector('.mission-progress-bar');
            if (bar) bar.style.width = percent + '%';
            const textOverlay = card.querySelector('.progress-text-overlay');
            if (textOverlay) {
                const isCashType = ['earn_eps','accumulate_cash','earn_cash','boost_run'].includes(m.type);
                const pStr = isCashType ? formatMoney(progressVal) : progressVal;
                const tStr = isCashType ? formatMoney(targetVal) : targetVal;
                const newText = pStr + ' / ' + tStr;
                if (textOverlay.innerText !== newText) textOverlay.innerText = newText;
            }
            const circleRadius = 32;
            const circleCircumference = 2 * Math.PI * circleRadius;
            const strokeDashoffset = circleCircumference - (percent / 100) * circleCircumference;
            const circleValue = card.querySelector('.circle-value');
            if (circleValue) circleValue.setAttribute('stroke-dashoffset', strokeDashoffset);
            const circleText = card.querySelector('.circle-text');
            if (circleText) {
                const newPct = Math.round(percent) + '%';
                if (circleText.innerText !== newPct) circleText.innerText = newPct;
            }
            if (m.completed && !card.classList.contains('completed')) {
                if (typeof window.renderMissionsTab === 'function') {
                    window.renderMissionsTab();
                }
            }
        });
    }
}

window.updateMissionsTabProgress = updateMissionsTabProgress;
