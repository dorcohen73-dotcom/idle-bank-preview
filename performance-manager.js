class PerformanceManager {
    static _isEco = false;

    static probe() {
        return new Promise((resolve) => {
            let frames = 0;
            let settled = false;
            const startTime = performance.now();
            const duration = 1500; // 1.5 seconds

            const settle = (value) => {
                if (settled) return;
                settled = true;
                clearTimeout(guard);
                resolve(value);
            };

            // Background tabs pause requestAnimationFrame entirely — without this
            // guard the promise would never resolve and apply() would never run.
            // Resolves undefined = "could not measure"; auto mode then decides by
            // hardware hints only.
            const guard = setTimeout(() => settle(undefined), 4000);

            const tick = (now) => {
                if (settled) return;
                frames++;
                if (now - startTime < duration) {
                    requestAnimationFrame(tick);
                } else {
                    const elapsed = now - startTime;
                    settle(Math.round((frames / elapsed) * 1000));
                }
            };
            requestAnimationFrame(tick);
        });
    }

    static apply(mode, fps) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('perf');
        if (urlMode === 'eco' || urlMode === 'full') {
            mode = urlMode;
        }

        if (mode === 'eco') {
            this._isEco = true;
        } else if (mode === 'full') {
            this._isEco = false;
        } else {
            // 'auto' — measured fps is the primary signal; hardware hints alone
            // only force eco on genuinely weak devices (low memory AND few cores).
            const memory = navigator.deviceMemory || Infinity;
            const cores = navigator.hardwareConcurrency || Infinity;

            if ((typeof fps === 'number' && fps < 45) || (memory <= 2 && cores <= 4)) {
                this._isEco = true;
            } else {
                this._isEco = false;
            }
        }

        if (this._isEco) {
            document.body.classList.add('perf-eco');
        } else {
            document.body.classList.remove('perf-eco');
        }
    }

    static isEco() {
        return this._isEco;
    }
}

window.PerformanceManager = PerformanceManager;
