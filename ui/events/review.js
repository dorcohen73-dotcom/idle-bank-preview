export const ReviewService = {
    available: false,
    
    init() {
        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.AppReview) {
                    this.available = true;
                }
            }
        } catch (e) {
            console.warn('ReviewService init error:', e);
        }
    },
    
    async maybeRequest(game) {
        if (!game || !game.state || !game.state.stats) return;
        
        // 1. If already requested, exit
        if (game.state.stats.reviewRequested) return;
        
        // 2. If not native or plugin not available, exit silently
        if (!this.available) return;
        
        // 3. If prestigeCount < 2, exit
        if ((game.state.stats.prestigeCount || 0) < 2) return;
        
        // 4. Mark as requested and save
        game.state.stats.reviewRequested = true;
        game.saveGame();
        
        // 5. Try requesting review
        try {
            await window.Capacitor.Plugins.AppReview.requestReview();
        } catch (e) {
            console.warn('AppReview request error:', e);
        }
    }
};
