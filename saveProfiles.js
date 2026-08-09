// Character-profile storage. Each profile owns independent autosave and manual snapshots.

const COREBOUND_PROFILE_SLOT_COUNT = 5;
const COREBOUND_PROFILE_ACTIVE_SLOT_KEY = 'idleCombatGameSave_activeSlot';
const COREBOUND_PROFILE_KEY_PREFIX = 'idleCombatGameSave_profile_';
const COREBOUND_LEGACY_SLOT_KEY_PREFIX = 'idleCombatGameSave_slot_';
const COREBOUND_SAVE_KINDS = Object.freeze(['autosave', 'manual']);

function createCoreboundSaveProfileStore(options = {}) {
    const storage = options.storage || localStorage;

    function sanitizeSlot(slotIndex) {
        const parsed = Number(slotIndex);
        return Number.isInteger(parsed) && parsed >= 1 && parsed <= COREBOUND_PROFILE_SLOT_COUNT
            ? parsed
            : 1;
    }

    function sanitizeKind(saveKind) {
        return saveKind === 'manual' ? 'manual' : 'autosave';
    }

    function getSnapshotKey(slotIndex, saveKind = 'autosave') {
        return `${COREBOUND_PROFILE_KEY_PREFIX}${sanitizeSlot(slotIndex)}_${sanitizeKind(saveKind)}`;
    }

    function getLegacySnapshotKey(slotIndex) {
        return `${COREBOUND_LEGACY_SLOT_KEY_PREFIX}${sanitizeSlot(slotIndex)}`;
    }

    function readSnapshot(slotIndex, saveKind = 'autosave') {
        const slot = sanitizeSlot(slotIndex);
        const kind = sanitizeKind(saveKind);
        const key = getSnapshotKey(slot, kind);
        const raw = storage.getItem(key);
        if (raw != null) return { slot, kind, key, raw, legacy: false };

        // Pre-profile saves become the autosave side of their original slot. They
        // are deliberately left untouched until a successful load writes a new snapshot.
        if (kind === 'autosave') {
            const legacyKey = getLegacySnapshotKey(slot);
            const legacyRaw = storage.getItem(legacyKey);
            if (legacyRaw != null) {
                return { slot, kind, key: legacyKey, raw: legacyRaw, legacy: true };
            }
        }
        return { slot, kind, key, raw: null, legacy: false };
    }

    function writeSnapshot(slotIndex, saveKind, raw) {
        const slot = sanitizeSlot(slotIndex);
        const kind = sanitizeKind(saveKind);
        const key = getSnapshotKey(slot, kind);
        storage.setItem(key, String(raw));
        return { slot, kind, key };
    }

    function previewSnapshot(slotIndex, saveKind = 'autosave') {
        const snapshot = readSnapshot(slotIndex, saveKind);
        if (snapshot.raw == null) return { ...snapshot, state: 'empty' };
        try {
            const parsed = JSON.parse(snapshot.raw);
            const level = Math.max(1, Math.floor(Number(parsed?.player?.level) || 1));
            const credits = Math.max(0, Number(parsed?.player?.currency) || 0);
            const savedAt = Number(parsed?.meta?.savedAt || 0);
            return {
                ...snapshot,
                state: 'ok',
                level,
                credits,
                savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : null
            };
        } catch (_) {
            return { ...snapshot, state: 'corrupt' };
        }
    }

    function getProfile(slotIndex) {
        const slot = sanitizeSlot(slotIndex);
        const autosave = previewSnapshot(slot, 'autosave');
        const manual = previewSnapshot(slot, 'manual');
        return {
            slot,
            autosave,
            manual,
            occupied: autosave.state !== 'empty' || manual.state !== 'empty'
        };
    }

    function listProfiles() {
        return Array.from({ length: COREBOUND_PROFILE_SLOT_COUNT }, (_, index) => getProfile(index + 1));
    }

    function getActiveSlot() {
        return sanitizeSlot(storage.getItem(COREBOUND_PROFILE_ACTIVE_SLOT_KEY));
    }

    function setActiveSlot(slotIndex) {
        const slot = sanitizeSlot(slotIndex);
        storage.setItem(COREBOUND_PROFILE_ACTIVE_SLOT_KEY, String(slot));
        return slot;
    }

    function getContinueChoice() {
        const profiles = listProfiles();
        const storedActiveSlot = Number(storage.getItem(COREBOUND_PROFILE_ACTIVE_SLOT_KEY));
        const active = Number.isInteger(storedActiveSlot) && storedActiveSlot >= 1 && storedActiveSlot <= COREBOUND_PROFILE_SLOT_COUNT
            ? profiles.find(profile => profile.slot === storedActiveSlot)
            : null;
        if (active) {
            const activeSnapshots = [active.autosave, active.manual]
                .filter(snapshot => snapshot.state === 'ok')
                .sort((left, right) => {
                    const timeDifference = Number(right.savedAt || 0) - Number(left.savedAt || 0);
                    if (timeDifference !== 0) return timeDifference;
                    return left.kind === 'autosave' ? -1 : 1;
                });
            if (activeSnapshots.length > 0) return activeSnapshots[0];
        }

        const validSnapshots = profiles.flatMap(profile => [profile.autosave, profile.manual])
            .filter(snapshot => snapshot.state === 'ok')
            .sort((left, right) => {
                const timeDifference = Number(right.savedAt || 0) - Number(left.savedAt || 0);
                if (timeDifference !== 0) return timeDifference;
                return left.kind === 'autosave' ? -1 : 1;
            });
        return validSnapshots[0] || null;
    }

    function deleteProfile(slotIndex) {
        const slot = sanitizeSlot(slotIndex);
        for (const kind of COREBOUND_SAVE_KINDS) {
            storage.removeItem(getSnapshotKey(slot, kind));
        }
        storage.removeItem(getLegacySnapshotKey(slot));
        return slot;
    }

    return Object.freeze({
        slotCount: COREBOUND_PROFILE_SLOT_COUNT,
        saveKinds: COREBOUND_SAVE_KINDS,
        sanitizeSlot,
        sanitizeKind,
        getSnapshotKey,
        getLegacySnapshotKey,
        readSnapshot,
        writeSnapshot,
        previewSnapshot,
        getProfile,
        listProfiles,
        getActiveSlot,
        setActiveSlot,
        getContinueChoice,
        deleteProfile
    });
}

window.createCoreboundSaveProfileStore = createCoreboundSaveProfileStore;
window.coreboundSaveProfiles = createCoreboundSaveProfileStore();
