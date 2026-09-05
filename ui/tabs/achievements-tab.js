// Fires coin/float/sound feedback for achievements unlocked on a live tick (never for the silent
// load-time backfill). Called from ui-events.js's tabRefreshTimer right after game.checkAchievements().
export function playAchievementUnlockFeedback(achievement) {
    const cardEl = document.querySelector(`.achievement-card[data-achievement-id="${achievement.id}"]`);
    const fromRect = cardEl ? cardEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

    spawnFloating('🏆 +' + (achievement.bonusPercent * 100).toFixed(2).replace(/\.?0+$/, '') + '%', fromRect.left + fromRect.width / 2, fromRect.top, 'gold', '2.2rem', true);
    if (window.gameAudio && typeof window.gameAudio.playUnlock === 'function') {
        window.gameAudio.playUnlock();
    }
}

export function renderAchievementsTab() {
    const container = document.getElementById('tab-achievements');
    if (!container) return;
    container.innerHTML = '';

    const lang = game.state.language || 'en';
    const tObj = translations[lang].achievements || {};
    const rootT = translations[lang];
    const unlocked = (game.state.achievements && game.state.achievements.unlocked) || {};
    const claimed = (game.state.achievements && game.state.achievements.claimed) || {};
    const bonusPercent = (game.state.achievements && game.state.achievements.bonusPercent) || 0;
    const unlockedCount = GAME_CONFIG.ACHIEVEMENTS.filter(a => unlocked[a.id]).length;
    const totalCount = GAME_CONFIG.ACHIEVEMENTS.length;

    const summaryHeader = document.createElement('div');
    summaryHeader.className = 'missions-summary-header achievements-summary-header';
    summaryHeader.innerHTML = `
        <div class="summary-badge">
            <span class="trophy-icon">🏆</span>
            <span>${rootT.achievementsCompletedTitle || 'Achievements'}: ${unlockedCount}/${totalCount}</span>
        </div>
        <p class="summary-desc">${rootT.achievementsCompletedDesc || ''} (+${(bonusPercent * 100).toFixed(2).replace(/\.?0+$/, '')}%)</p>
    `;
    container.appendChild(summaryHeader);

    // Sort: ready-to-claim (unlocked & unclaimed) bubble to the top, locked stay in natural
    // config order in the middle, already-claimed sink to the bottom and out of the way.
    const sortPriority = (a) => {
        if (unlocked[a.id] && !claimed[a.id]) return 0;
        if (!unlocked[a.id]) return 1;
        return 2;
    };
    const sortedAchievements = [...GAME_CONFIG.ACHIEVEMENTS].sort((a, b) => sortPriority(a) - sortPriority(b));

    const cashCategories = ['cash'];
    sortedAchievements.forEach(a => {
        const isUnlocked = !!unlocked[a.id];
        const isClaimed = !!claimed[a.id];
        const progress = game.getAchievementProgress(a.id);

        const card = document.createElement('div');
        card.className = `achievement-card mission-card ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}`;
        card.setAttribute('data-achievement-id', a.id);

        const title = tObj[a.i18nKey + 'Title'] || a.id;
        const descFn = tObj[a.i18nKey + 'Desc'];
        const targetDisplay = cashCategories.includes(a.category) ? formatMoney(a.threshold) : a.threshold;
        const desc = typeof descFn === 'function' ? descFn(targetDisplay) : (descFn || '');

        const circleRadius = 24;
        const circleCircumference = 2 * Math.PI * circleRadius;
        const strokeDashoffset = circleCircumference - (progress.percent / 100) * circleCircumference;

        const progressCurrentDisplay = cashCategories.includes(a.category) ? formatMoney(progress.current) : progress.current;
        const shareLbl = rootT.sharesLabel || 'Gold Shares';

        let statusHtml;
        if (isUnlocked && !isClaimed) {
            statusHtml = `
                <div class="mission-action-zone">
                    <button class="claim-achievement-btn" data-achievement-id="${a.id}">
                        ${rootT.claimReward || 'Claim!'}
                    </button>
                </div>`;
        } else if (isUnlocked && isClaimed) {
            statusHtml = `<div class="achievement-unlocked-badge">✓ +${(a.bonusPercent * 100).toFixed(2).replace(/\.?0+$/, '')}%</div>`;
        } else {
            statusHtml = `<div class="mission-progress-row">
                   <div class="mission-progress-outer">
                       <div class="mission-progress-bar" style="width: ${progress.percent}%"></div>
                       <div class="progress-text-overlay">${progressCurrentDisplay} / ${targetDisplay}</div>
                   </div>
               </div>`;
        }

        const rewardBadgeHtml = (isUnlocked && !isClaimed)
            ? `<div class="mission-reward-badge"><span>+${a.rewardShares} ${shareLbl} 🪙</span></div>`
            : '';

        card.innerHTML = `
            ${rewardBadgeHtml}
            <div class="mission-image-box achievement-icon-box">
                <div class="mission-image-glow"></div>
                <span class="achievement-icon">${a.icon}</span>
            </div>
            <div class="mission-content-middle">
                <div class="mission-details">
                    <div class="mission-title">${title}</div>
                    <div class="mission-desc">${desc}</div>
                </div>
                ${statusHtml}
            </div>
            <div class="mission-circle-progress">
                <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle class="circle-bg" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" />
                    <circle class="circle-value" cx="32" cy="32" r="${circleRadius}" stroke-width="5" fill="none" stroke-dasharray="${circleCircumference}" stroke-dashoffset="${isUnlocked ? 0 : strokeDashoffset}" />
                </svg>
                <div class="circle-text">${isUnlocked ? '✓' : Math.round(progress.percent) + '%'}</div>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.claim-achievement-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window._isClaimingAchievement) return;
            window._isClaimingAchievement = true;
            setTimeout(() => { window._isClaimingAchievement = false; }, 500);

            initSound();
            const achId = btn.getAttribute('data-achievement-id');
            const collected = game.claimAchievementReward(achId);
            if (collected && collected.type !== 'none' && collected.amount > 0) {
                btn.disabled = true;
                const rectBtn = btn.getBoundingClientRect();
                const lang2 = (game.state && game.state.language) || 'en';
                const shareLbl2 = (translations[lang2] || translations.en).sharesLabel || 'Gold Shares';
                spawnFloating('+' + collected.amount + ' ' + shareLbl2 + ' 🪙', rectBtn.left + rectBtn.width / 2, rectBtn.top, 'gold', '2.2rem', true);

                if (window.gameAudio && typeof window.gameAudio.playUnlock === 'function') {
                    window.gameAudio.playUnlock();
                }

                renderAchievementsTab();
            }
        });
    });
}

export function updateAchievementsTabProgress() {
    const container = document.getElementById('tab-achievements');
    if (!container) return;
    const cashCategories = ['cash'];
    const unlocked = (game.state.achievements && game.state.achievements.unlocked) || {};
    GAME_CONFIG.ACHIEVEMENTS.forEach(a => {
        const card = container.querySelector('.achievement-card[data-achievement-id="' + a.id + '"]');
        if (!card) return;
        const progress = game.getAchievementProgress(a.id);
        const targetDisplay = cashCategories.includes(a.category) ? formatMoney(a.threshold) : a.threshold;
        const progressCurrentDisplay = cashCategories.includes(a.category) ? formatMoney(progress.current) : progress.current;
        const bar = card.querySelector('.mission-progress-bar');
        if (bar) bar.style.width = progress.percent + '%';
        const textOverlay = card.querySelector('.progress-text-overlay');
        if (textOverlay) {
            const newText = progressCurrentDisplay + ' / ' + targetDisplay;
            if (textOverlay.innerText !== newText) textOverlay.innerText = newText;
        }
        const circleRadius = 24;
        const circleCircumference = 2 * Math.PI * circleRadius;
        const strokeDashoffset = circleCircumference - (progress.percent / 100) * circleCircumference;
        const circleValue = card.querySelector('.circle-value');
        const isUnlocked = !!unlocked[a.id];
        if (circleValue) circleValue.setAttribute('stroke-dashoffset', isUnlocked ? 0 : strokeDashoffset);
        const circleText = card.querySelector('.circle-text');
        if (circleText) {
            const newPct = Math.round(progress.percent) + '%';
            if (circleText.innerText !== newPct) circleText.innerText = newPct;
        }
    });
}

window.updateAchievementsTabProgress = updateAchievementsTabProgress;
