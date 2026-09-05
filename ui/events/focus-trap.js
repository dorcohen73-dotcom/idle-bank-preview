let _focusTrapHandlers = new Map();
let _previouslyFocused = new Map();

export function _getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
}

export function trapFocus(modal) {
    if (_focusTrapHandlers.has(modal)) return; // already trapped
    if (document.activeElement && document.activeElement !== document.body) {
        _previouslyFocused.set(modal, document.activeElement);
    }
    const handler = function(e) {
        if (e.key !== 'Tab') return;
        const focusable = _getFocusableElements(modal);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };
    _focusTrapHandlers.set(modal, handler);
    modal.addEventListener('keydown', handler);
    // Move focus to first focusable element inside modal
    const focusable = _getFocusableElements(modal);
    if (focusable.length > 0) focusable[0].focus();
}

export function releaseFocus(modal) {
    const handler = _focusTrapHandlers.get(modal);
    if (!handler) return;
    modal.removeEventListener('keydown', handler);
    _focusTrapHandlers.delete(modal);

    const toRestore = _previouslyFocused.get(modal);
    _previouslyFocused.delete(modal);
    if (toRestore && document.body.contains(toRestore) && typeof toRestore.focus === 'function') {
        toRestore.focus();
    }
}

export function initFocusTrapObserver() {
    // MutationObserver על כל modal-overlay — מפעיל/משחרר focus trap בהוספה/הסרת class 'active'
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        const obs = new MutationObserver(() => {
            if (modal.classList.contains('active')) {
                trapFocus(modal);
            } else {
                releaseFocus(modal);
                if (window.NotificationQueue) window.NotificationQueue.notifyClosed(modal.id);
            }
        });
        obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
}
