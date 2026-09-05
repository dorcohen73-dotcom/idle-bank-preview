import { _rewardIcon, _rewardShortText } from './modals.js';

export const NotificationService = {
    available: false,

    async init() {
        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
                    this.available = true;
                }
            }
        } catch (e) {
            console.warn('NotificationService init error:', e);
        }
    },

    async requestPermission() {
        if (!this.available) return false;
        try {
            const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.warn('Failed to request notification permission:', e);
            return false;
        }
    },

    async checkPermission() {
        if (!this.available) return false;
        try {
            const result = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.warn('Failed to check notification permission:', e);
            return false;
        }
    },

    async scheduleReminders(game) {
        if (!this.available || !game || !game.state) return;
        if (game.state.notificationsEnabled === false) return;

        try {
            const hasPermission = await this.checkPermission();
            if (!hasPermission) return;

            // First cancel all to avoid duplicates
            await this.cancelAll();

            const lang = game.state.language || 'en';
            const t = translations[lang] || translations['en'];
            const notifications = [];
            const now = Date.now();

            // 1. Offline Vault Full (101)
            if (game.saveManager && typeof game.saveManager.getOfflineLimitHours === 'function') {
                const limitHours = game.saveManager.getOfflineLimitHours();
                const msUntilFull = limitHours * 3600 * 1000;
                notifications.push({
                    id: 101,
                    title: t.notifOfflineTitle || '🏦 Vault is full!',
                    body: t.notifOfflineBody || 'Your offline earnings have reached maximum capacity — come collect them',
                    schedule: { at: new Date(now + msUntilFull) }
                });
            }

            // 2. Daily Reward (102)
            // Daily reset happens at midnight local time usually, or just +24h from last login.
            // game.state.lastLoginDate tracks midnight of last login.
            // So next daily reward is at lastLoginDate + 24 hours.
            // Wait, streak uses calendar days. Let's schedule it for 24h from now, or midnight next day?
            // "בחצות הבא / +~20-24 שעות" - 24h from now is safe and encourages streak.
            // Content is personalized (current streak + tomorrow's actual reward) instead of a generic
            // "gift waiting" line, so the loss-aversion framing ("don't break your streak") has real
            // numbers behind it — reuses the same getDailyLoginReward() the in-app streak strip shows.
            const streak = game.state.loginStreak || 1;
            const nextReward = typeof game.getDailyLoginReward === 'function' ? game.getDailyLoginReward(streak + 1) : null;
            const rewardText = nextReward ? (_rewardIcon(nextReward.type) + ' ' + _rewardShortText(nextReward)) : '';
            notifications.push({
                id: 102,
                title: typeof t.notifDailyTitle === 'function' ? t.notifDailyTitle(streak) : (t.notifDailyTitle || '🔥 Daily Streak!'),
                body: typeof t.notifDailyBody === 'function' ? t.notifDailyBody(rewardText) : (t.notifDailyBody || 'Keep up your login streak and claim your bonus'),
                schedule: { at: new Date(now + (24 * 3600 * 1000)) }
            });

            // 3. Comeback (103) - 72 hours (3 days) of inactivity
            notifications.push({
                id: 103,
                title: t.notifComebackTitle || '😴 Your bank misses you',
                body: t.notifComebackBody || 'The employees are getting bored — quick check-in?',
                schedule: { at: new Date(now + (72 * 3600 * 1000)) } 
            });

            // Sort by scheduled time and enforce a minimum gap of 3 hours
            notifications.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime());
            const MIN_GAP_MS = 3 * 3600 * 1000;
            for (let i = 1; i < notifications.length; i++) {
                const prevTime = notifications[i - 1].schedule.at.getTime();
                const currTime = notifications[i].schedule.at.getTime();
                if (currTime - prevTime < MIN_GAP_MS) {
                    notifications[i].schedule.at = new Date(prevTime + MIN_GAP_MS);
                }
            }

            await window.Capacitor.Plugins.LocalNotifications.schedule({
                notifications: notifications
            });
        } catch (e) {
            console.warn('Failed to schedule reminders:', e);
        }
    },

    async cancelAll() {
        if (!this.available) return;
        try {
            await window.Capacitor.Plugins.LocalNotifications.cancel({
                notifications: [{ id: 101 }, { id: 102 }, { id: 103 }]
            });
        } catch (e) {
            console.warn('Failed to cancel notifications:', e);
        }
    }
};
