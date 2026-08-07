(function initActivityManager() {
    const ACTIVITY_TICK_MS = 100;
    const DEFAULT_ALERT_DURATION_MS = 4500;

    let currentActivity = null;
    let alertState = null;
    const listeners = new Set();

    function nowMs() {
        return Date.now();
    }

    function resolveDurationMs(activity) {
        try {
            const dynamic = typeof activity.getDurationMs === 'function'
                ? Number(activity.getDurationMs(activity.context || {}))
                : Number(activity.durationMs);
            if (Number.isFinite(dynamic) && dynamic > 0) {
                return dynamic;
            }
        } catch (error) {
            console.error('Activity duration resolver failed:', error);
        }
        return 1000;
    }

    function updateDerivedTiming(activity, now) {
        const duration = Math.max(1, Number(activity.durationMs) || 1);
        activity.progressPercent = Math.min(100, Math.max(0, (activity.progressMs / duration) * 100));
        activity.timeRemainingMs = Math.max(0, duration - activity.progressMs);
        activity.startedAt = now - activity.progressMs;
    }

    function getPublicActivity(activity) {
        if (!activity) return null;
        return {
            id: activity.id,
            type: activity.type,
            displayName: activity.displayName,
            startedAt: activity.startedAt,
            durationMs: activity.durationMs,
            progressMs: activity.progressMs,
            progressPercent: activity.progressPercent,
            timeRemainingMs: activity.timeRemainingMs,
            rewards: Array.isArray(activity.rewards) ? activity.rewards : [],
            skill: activity.skill || null,
            skillXp: Number(activity.skillXp || 0),
            cancellable: activity.cancellable !== false,
            blocks: Array.isArray(activity.blocks) ? activity.blocks : [],
            completedCycles: Number(activity.completedCycles || 0),
            context: activity.context || {},
            status: 'active',
        };
    }

    function cleanupExpiredAlert(now = nowMs()) {
        if (alertState && now >= alertState.expiresAt) {
            alertState = null;
        }
    }

    function getState() {
        cleanupExpiredAlert();
        return {
            active: Boolean(currentActivity),
            currentActivity: getPublicActivity(currentActivity),
            alert: alertState ? { ...alertState } : null,
        };
    }

    function emitState() {
        const state = getState();
        listeners.forEach((listener) => {
            try {
                listener(state);
            } catch (error) {
                console.error('Activity state listener failed:', error);
            }
        });
        window.dispatchEvent(new CustomEvent('activityStateChanged', { detail: state }));
    }

    function pushAlert(message, severity = 'info', durationMs = DEFAULT_ALERT_DURATION_MS) {
        if (!message) return;
        alertState = {
            message: String(message),
            severity,
            createdAt: nowMs(),
            expiresAt: nowMs() + Math.max(1000, Number(durationMs) || DEFAULT_ALERT_DURATION_MS),
        };
        emitState();
    }

    function cancelActivity(reason = 'cancelled', options = {}) {
        if (!currentActivity) {
            return { ok: false, reason: 'No active activity.' };
        }
        const cancelled = getPublicActivity(currentActivity);
        currentActivity = null;
        if (!options.silent && options.alertMessage) {
            pushAlert(options.alertMessage, options.alertSeverity || 'warning');
            return { ok: true, reason, cancelled };
        }
        emitState();
        return { ok: true, reason, cancelled };
    }

    function startActivity(payload) {
        if (!payload || typeof payload !== 'object') {
            return { ok: false, reason: 'Invalid activity payload.' };
        }
        if (currentActivity) {
            return { ok: false, reason: 'Another activity is already active.' };
        }

        const now = nowMs();
        const next = {
            id: payload.id || `activity-${now}`,
            type: payload.type || 'generic',
            displayName: payload.displayName || payload.id || 'Activity',
            durationMs: Number(payload.durationMs) || 1000,
            progressMs: 0,
            progressPercent: 0,
            timeRemainingMs: Number(payload.durationMs) || 1000,
            rewards: Array.isArray(payload.rewards) ? payload.rewards : [],
            skill: payload.skill || null,
            skillXp: Number(payload.skillXp || 0),
            cancellable: payload.cancellable !== false,
            blocks: Array.isArray(payload.blocks) ? payload.blocks : [],
            repeat: payload.repeat !== false,
            context: payload.context || {},
            getDurationMs: payload.getDurationMs,
            onComplete: payload.onComplete,
            completedCycles: 0,
            startedAt: now,
            lastUpdatedAt: now,
        };

        next.durationMs = resolveDurationMs(next);
        updateDerivedTiming(next, now);

        currentActivity = next;
        emitState();
        return { ok: true, activity: getPublicActivity(currentActivity) };
    }

    function tick() {
        const now = nowMs();
        cleanupExpiredAlert(now);
        if (!currentActivity) return;

        const deltaMs = Math.max(0, now - (currentActivity.lastUpdatedAt || now));
        currentActivity.lastUpdatedAt = now;
        if (deltaMs <= 0) {
            updateDerivedTiming(currentActivity, now);
            emitState();
            return;
        }

        currentActivity.progressMs += deltaMs;

        let guard = 0;
        while (currentActivity && currentActivity.progressMs >= currentActivity.durationMs && guard < 20) {
            guard += 1;
            currentActivity.progressMs -= currentActivity.durationMs;
            currentActivity.completedCycles = (currentActivity.completedCycles || 0) + 1;

            let completionResult = { ok: true };
            if (typeof currentActivity.onComplete === 'function') {
                try {
                    completionResult = currentActivity.onComplete({
                        activity: getPublicActivity(currentActivity),
                        cycle: currentActivity.completedCycles,
                        now,
                    }) || { ok: true };
                } catch (error) {
                    completionResult = { ok: false, reason: 'Activity callback failed.' };
                    console.error('Activity completion callback failed:', error);
                }
            }

            if (!completionResult.ok) {
                currentActivity = null;
                if (completionResult.alertMessage) {
                    pushAlert(
                        completionResult.alertMessage,
                        completionResult.alertSeverity || 'warning',
                        completionResult.alertDurationMs
                    );
                } else {
                    emitState();
                }
                return;
            }

            if (completionResult.alertMessage) {
                pushAlert(
                    completionResult.alertMessage,
                    completionResult.alertSeverity || 'info',
                    completionResult.alertDurationMs
                );
            }

            if (!currentActivity.repeat) {
                currentActivity = null;
                emitState();
                return;
            }

            currentActivity.durationMs = resolveDurationMs(currentActivity);
        }

        if (!currentActivity) return;
        updateDerivedTiming(currentActivity, now);
        emitState();
    }

    function getBlockingReason(nextType) {
        if (!currentActivity) return null;
        if (nextType && nextType === currentActivity.type) {
            return `${currentActivity.displayName} is already active.`;
        }
        return 'Another activity is already active.';
    }

    function clearActivityOnLoad() {
        if (!currentActivity) {
            alertState = null;
            emitState();
            return;
        }
        currentActivity = null;
        alertState = null;
        emitState();
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    setInterval(tick, ACTIVITY_TICK_MS);

    window.activityManager = {
        startActivity,
        cancelActivity,
        clearActivityOnLoad,
        getState,
        getBlockingReason,
        isActivityActive: () => Boolean(currentActivity),
        pushAlert,
        subscribe,
        tick,
    };
})();
