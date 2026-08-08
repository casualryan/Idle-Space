// Cross-tab save ownership and rotating recovery snapshots.

const COREBOUND_SAVE_WRITER_LEASE_KEY = 'idleCombatGameSave_writerLease';
const COREBOUND_SAVE_BACKUP_KEY_PREFIX = 'idleCombatGameSave_backup_';
const COREBOUND_SAVE_WRITER_LEASE_MS = 15000;
const COREBOUND_SAVE_WRITER_HEARTBEAT_MS = 3000;
const COREBOUND_SAVE_BACKUP_INTERVAL_MS = 60000;
const COREBOUND_SAVE_BACKUP_COUNT = 5;

function createCoreboundSaveCoordinator(options = {}) {
    const storage = options.storage || localStorage;
    const eventTarget = options.eventTarget || window;
    const now = typeof options.now === 'function' ? options.now : () => Date.now();
    const setIntervalFn = typeof options.setIntervalFn === 'function' ? options.setIntervalFn : setInterval;
    const clearIntervalFn = typeof options.clearIntervalFn === 'function' ? options.clearIntervalFn : clearInterval;
    const leaseMs = Number(options.leaseMs) > 0 ? Number(options.leaseMs) : COREBOUND_SAVE_WRITER_LEASE_MS;
    const heartbeatMs = Number(options.heartbeatMs) > 0
        ? Number(options.heartbeatMs)
        : COREBOUND_SAVE_WRITER_HEARTBEAT_MS;
    const backupIntervalMs = Number(options.backupIntervalMs) >= 0
        ? Number(options.backupIntervalMs)
        : COREBOUND_SAVE_BACKUP_INTERVAL_MS;
    const backupCount = Number(options.backupCount) > 0
        ? Math.floor(Number(options.backupCount))
        : COREBOUND_SAVE_BACKUP_COUNT;
    const tabId = options.tabId || `tab-${now()}-${Math.random().toString(36).slice(2)}`;
    const ownershipListeners = new Set();
    let heartbeatTimer = null;
    let lastKnownOwnership = false;

    function parseStoredObject(raw) {
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (_) {
            return null;
        }
    }

    function readLease() {
        return parseStoredObject(storage.getItem(COREBOUND_SAVE_WRITER_LEASE_KEY));
    }

    function notifyOwnershipIfChanged(force = false) {
        const lease = readLease();
        const ownsLease = lease?.tabId === tabId;
        if (!force && ownsLease === lastKnownOwnership) return ownsLease;
        lastKnownOwnership = ownsLease;
        ownershipListeners.forEach(listener => {
            try {
                listener(ownsLease, lease);
            } catch (error) {
                console.error('Save ownership listener failed:', error);
            }
        });
        return ownsLease;
    }

    function writeLease(existingLease = null) {
        const timestamp = now();
        storage.setItem(COREBOUND_SAVE_WRITER_LEASE_KEY, JSON.stringify({
            tabId,
            acquiredAt: existingLease?.tabId === tabId
                ? Number(existingLease.acquiredAt || timestamp)
                : timestamp,
            heartbeatAt: timestamp,
            expiresAt: timestamp + leaseMs
        }));
        return notifyOwnershipIfChanged();
    }

    function claimOwnership({ force = false } = {}) {
        const lease = readLease();
        const liveOtherOwner = lease?.tabId
            && lease.tabId !== tabId
            && Number(lease.expiresAt || 0) > now();
        if (liveOtherOwner && !force) {
            notifyOwnershipIfChanged(true);
            return false;
        }
        return writeLease(lease);
    }

    function isWriter() {
        return notifyOwnershipIfChanged();
    }

    function refreshOwnership() {
        const lease = readLease();
        if (lease?.tabId !== tabId) {
            notifyOwnershipIfChanged();
            return false;
        }
        return writeLease(lease);
    }

    function relinquishOwnership() {
        if (readLease()?.tabId === tabId) {
            storage.removeItem(COREBOUND_SAVE_WRITER_LEASE_KEY);
        }
        notifyOwnershipIfChanged(true);
    }

    function startHeartbeat() {
        if (heartbeatTimer != null) return;
        heartbeatTimer = setIntervalFn(refreshOwnership, heartbeatMs);
    }

    function stopHeartbeat() {
        if (heartbeatTimer == null) return;
        clearIntervalFn(heartbeatTimer);
        heartbeatTimer = null;
    }

    function getBackupKey(slotIndex, backupIndex) {
        return `${COREBOUND_SAVE_BACKUP_KEY_PREFIX}${Number(slotIndex)}_${Number(backupIndex)}`;
    }

    function getBackups(slotIndex) {
        const backups = [];
        for (let index = 1; index <= backupCount; index++) {
            const raw = storage.getItem(getBackupKey(slotIndex, index));
            const state = parseStoredObject(raw);
            if (!state) continue;
            backups.push({ index, raw, state });
        }
        return backups;
    }

    function backupCurrentSave(slotIndex, currentRaw, { force = false } = {}) {
        const currentState = parseStoredObject(currentRaw);
        if (!currentState) return false;

        const newestBackup = parseStoredObject(storage.getItem(getBackupKey(slotIndex, 1)));
        const currentSavedAt = Number(currentState.meta?.savedAt || 0);
        const newestSavedAt = Number(newestBackup?.meta?.savedAt || 0);
        if (!force && newestBackup && currentSavedAt - newestSavedAt < backupIntervalMs) {
            return false;
        }

        for (let index = backupCount; index >= 2; index--) {
            const prior = storage.getItem(getBackupKey(slotIndex, index - 1));
            if (prior) storage.setItem(getBackupKey(slotIndex, index), prior);
            else storage.removeItem(getBackupKey(slotIndex, index));
        }
        storage.setItem(getBackupKey(slotIndex, 1), currentRaw);
        return true;
    }

    function clearBackups(slotIndex) {
        for (let index = 1; index <= backupCount; index++) {
            storage.removeItem(getBackupKey(slotIndex, index));
        }
    }

    if (typeof eventTarget?.addEventListener === 'function') {
        eventTarget.addEventListener('storage', event => {
            if (event?.key === COREBOUND_SAVE_WRITER_LEASE_KEY) notifyOwnershipIfChanged();
        });
    }

    if (options.autoClaim !== false) {
        // The newest page load becomes authoritative. Existing fixed-version tabs
        // receive the storage event and immediately become read-only.
        claimOwnership({ force: true });
        startHeartbeat();
    }

    return Object.freeze({
        tabId,
        isWriter,
        takeControl: () => claimOwnership({ force: true }),
        relinquishOwnership,
        refreshOwnership,
        startHeartbeat,
        stopHeartbeat,
        onOwnershipChange(listener) {
            if (typeof listener !== 'function') return () => {};
            ownershipListeners.add(listener);
            listener(isWriter(), readLease());
            return () => ownershipListeners.delete(listener);
        },
        backupCurrentSave,
        getBackups,
        clearBackups
    });
}

window.createCoreboundSaveCoordinator = createCoreboundSaveCoordinator;
window.coreboundSaveCoordinator = createCoreboundSaveCoordinator();
