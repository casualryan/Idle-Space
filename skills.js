// Combat Styles: automatic attack patterns with three exclusive mastery choices.

const COMBAT_STYLE_VERSION = 2;
const STYLE_TIER_THRESHOLDS = Object.freeze([11, 26, 41]);
const DEFAULT_COMBAT_STYLE_ID = 'balancedStyle';
const LEGACY_SKILL_IDS = Object.freeze([
    'standardStrike', 'doubleStrike', 'heavyBlow', 'flurry', 'channelBeam', 'riposteStance'
]);

const DEFAULT_COMBAT_STYLE_PROFILE = Object.freeze({
    attackTimeMultiplier: 1,
    damageMultiplier: 1,
    hitCount: 1,
    hitDamageMultipliers: null,
    procOnHit: 'allHits',
    procOnCritical: 'allHits',
    procCoefficient: 1,
    comboAfterSkill: true,
    comboFromAggregate: false,
    comboProcStrength: 0,
    critChanceMultiplier: 1,
    critChanceBonus: 0,
    criticalDamageBonus: 0,
    debuffApplyBonus: 0,
    damageRollFloorBonus: 0,
    mechanics: []
});

function makeStyleChoice(id, name, description, icon, modifiers = {}, mechanics = []) {
    return Object.freeze({ id, name, description, icon, modifiers, mechanics: Object.freeze([...mechanics]) });
}

function makeMasteryTier(tier, name, purpose, choices) {
    return Object.freeze({
        tier,
        name,
        purpose,
        unlockLevel: STYLE_TIER_THRESHOLDS[tier - 1],
        choices: Object.freeze(choices)
    });
}

function makeCombatStyle(id, name, shortName, description, icon, preview, base, masteries) {
    const flattenedChoices = masteries.flatMap(mastery => mastery.choices.map(choice => ({
        ...choice,
        tier: mastery.tier,
        tierName: mastery.name,
        unlockLevel: mastery.unlockLevel,
        maxPoints: 1,
        cost: 1
    })));
    return Object.freeze({
        id,
        name,
        shortName,
        icon,
        description,
        attackPreview: preview,
        base: Object.freeze({ ...DEFAULT_COMBAT_STYLE_PROFILE, ...base }),
        masteries: Object.freeze(masteries),
        // Compatibility boundary for older UI/content helpers that enumerate tree nodes.
        tree: Object.freeze({ id, name, description, nodes: Object.freeze(flattenedChoices) })
    });
}

const balancedStyle = makeCombatStyle(
    'balancedStyle',
    'Balanced Style',
    'Balanced',
    'A measured single-hit rhythm built around consistency, adaptation, and clean execution.',
    'balance',
    '1.00x interval · 1 hit · 100% damage · raised roll floor',
    { damageRollFloorBonus: 0.03 },
    [
        makeMasteryTier(1, 'Technique', 'Choose how Balanced attacks create dependable value.', [
            makeStyleChoice('balanced-patient-measure', 'Patient Measure', 'Raise the minimum damage roll by an additional 12%.', 'target', { add: { damageRollFloorBonus: 0.12 } }),
            makeStyleChoice('balanced-open-circuit', 'Open Circuit', 'Gain +8% status application chance.', 'debuff', { add: { debuffApplyBonus: 0.08 } }),
            makeStyleChoice('balanced-decisive-line', 'Decisive Line', 'Gain +6% critical strike chance.', 'crit', { add: { critChanceBonus: 0.06 } })
        ]),
        makeMasteryTier(2, 'Rhythm', 'Choose what Balanced attacks learn from the developing fight.', [
            makeStyleChoice('balanced-adaptive-tempo', 'Adaptive Tempo', 'A noncritical attack grants +12% critical chance to the next attack.', 'cycle', {}, ['adaptiveCrit']),
            makeStyleChoice('balanced-guarded-cadence', 'Guarded Cadence', 'Every second attack restores 3% of maximum Energy Shield.', 'shield', {}, ['alternatingShield']),
            makeStyleChoice('balanced-threaded-follow-through', 'Threaded Follow-Through', 'Combo hits may trigger on-hit effects at 40% strength.', 'chain', { set: { comboProcStrength: 0.4 } })
        ]),
        makeMasteryTier(3, 'Doctrine', 'Choose the rule that defines a mastered Balanced rhythm.', [
            makeStyleChoice('balanced-perfect-form', 'Perfect Form', 'Every third attack rolls maximum damage and gains +10% critical chance.', 'star', {}, ['perfectThird']),
            makeStyleChoice('balanced-counterbalance', 'Counterbalance', 'Attacks alternate between +18% damage and +15% status application chance.', 'balance', {}, ['alternatingPurpose']),
            makeStyleChoice('balanced-continuous-motion', 'Continuous Motion', 'A critical attack makes the next attack 20% faster.', 'speed', {}, ['critHaste20'])
        ])
    ]
);

const heavyStyle = makeCombatStyle(
    'heavyStyle',
    'Heavy Style',
    'Heavy',
    'A slow, committed strike that concentrates damage, critical force, and powerful ailments.',
    'impact',
    '1.55x interval · 1 hit · 185% damage · stronger procs',
    { attackTimeMultiplier: 1.55, damageMultiplier: 1.85, procCoefficient: 1.15, debuffApplyBonus: 0.05 },
    [
        makeMasteryTier(1, 'Technique', 'Choose what makes each Heavy impact dangerous.', [
            makeStyleChoice('heavy-patient-aim', 'Patient Aim', 'Raise the minimum damage roll by 12%.', 'target', { add: { damageRollFloorBonus: 0.12 } }),
            makeStyleChoice('heavy-sundering-impact', 'Sundering Impact', 'Gain +12% status application chance.', 'debuff', { add: { debuffApplyBonus: 0.12 } }),
            makeStyleChoice('heavy-overpower', 'Overpower', 'Critical hits gain +0.35x critical damage.', 'crit', { add: { criticalDamageBonus: 0.35 } })
        ]),
        makeMasteryTier(2, 'Rhythm', 'Choose how Heavy attacks build or release momentum.', [
            makeStyleChoice('heavy-aftershock', 'Aftershock', 'Each Heavy strike produces a second 25%-strength hit. Only the first hit triggers item effects.', 'split', {}, ['aftershock']),
            makeStyleChoice('heavy-gathering-force', 'Gathering Force', 'Each noncritical attack grants +5% critical chance, stacking up to +20%; a critical resets it.', 'momentum', {}, ['gatheringForce']),
            makeStyleChoice('heavy-recoil-recovery', 'Recoil Recovery', 'A critical attack makes the next attack 25% faster.', 'speed', {}, ['critHaste25'])
        ]),
        makeMasteryTier(3, 'Doctrine', 'Choose the final commitment behind Heavy Style.', [
            makeStyleChoice('heavy-singular-force', 'Singular Force', 'Deal 30% more direct damage, but Heavy attacks cannot trigger combos.', 'focus', { multiply: { damageMultiplier: 1.3 }, set: { comboAfterSkill: false } }),
            makeStyleChoice('heavy-siege-rhythm', 'Siege Rhythm', 'Repeated attacks against the same target become 6% faster each, up to 24%.', 'cycle', {}, ['siegeRhythm']),
            makeStyleChoice('heavy-execution-stroke', 'Execution Stroke', 'Deal 40% more damage while the target is below 30% maximum health.', 'blade', {}, ['executionStroke'])
        ])
    ]
);

const twinStyle = makeCombatStyle(
    'twinStyle',
    'Twin Style',
    'Twin',
    'Two linked strikes that trade individual force for critical, status, and combo opportunities.',
    'split',
    '1.12x interval · 2 hits · 60% damage each · reduced proc coefficient',
    { attackTimeMultiplier: 1.12, damageMultiplier: 0.6, hitCount: 2, procCoefficient: 0.55 },
    [
        makeMasteryTier(1, 'Technique', 'Choose how the two attacks divide their purpose.', [
            makeStyleChoice('twin-opening-feint', 'Opening Feint', 'The first hit cannot critically strike; the second gains +25% critical chance.', 'weakspot', {}, ['openingFeint']),
            makeStyleChoice('twin-split-affliction', 'Split Affliction', 'Gain +8% status application chance and raise each hit’s proc coefficient to 70%.', 'debuff', { add: { debuffApplyBonus: 0.08 }, set: { procCoefficient: 0.7 } }),
            makeStyleChoice('twin-paired-precision', 'Paired Precision', 'The second hit gains a 12% higher minimum damage roll.', 'target', {}, ['secondHitFloor'])
        ]),
        makeMasteryTier(2, 'Rhythm', 'Choose how the paired hits share their opportunities.', [
            makeStyleChoice('twin-double-trigger', 'Double Trigger', 'Raise each hit’s item-effect proc coefficient to 85%.', 'chainplus', { set: { procCoefficient: 0.85 } }),
            makeStyleChoice('twin-linked-combo', 'Linked Combo', 'Combos use the combined damage of both hits and may trigger on-hit effects at 25% strength.', 'chain', { set: { comboFromAggregate: true, comboProcStrength: 0.25 } }),
            makeStyleChoice('twin-cross-cut', 'Cross-Cut', 'Shift force into the second strike: the hits deal 50% and 75% damage.', 'blade', { set: { hitDamageMultipliers: [0.5, 0.75] } })
        ]),
        makeMasteryTier(3, 'Doctrine', 'Choose what completes the Twin sequence.', [
            makeStyleChoice('twin-threefold-pattern', 'Threefold Pattern', 'Attack three times for 46% damage each; each hit uses a 45% proc coefficient.', 'motion', { set: { hitCount: 3, hitDamageMultipliers: [0.46, 0.46, 0.46], procCoefficient: 0.45 } }),
            makeStyleChoice('twin-mirror-finish', 'Mirror Finish', 'If exactly one hit critically strikes, the second hit of the next attack is guaranteed to critically strike.', 'crit', {}, ['mirrorFinish']),
            makeStyleChoice('twin-converging-blows', 'Converging Blows', 'If the first hit crits, the second deals 35% more damage; otherwise it gains +20% critical chance.', 'impact', {}, ['convergingBlows'])
        ])
    ]
);

const counterStyle = makeCombatStyle(
    'counterStyle',
    'Counter Style',
    'Counter',
    'A restrained attack pattern that turns incoming hits into empowered retaliatory strikes.',
    'shield',
    '1.05x interval · 85% normal hit · 165% counterattack',
    { attackTimeMultiplier: 1.05, damageMultiplier: 0.85, damageRollFloorBonus: 0.03 },
    [
        makeMasteryTier(1, 'Technique', 'Choose what an armed counter emphasizes.', [
            makeStyleChoice('counter-retaliatory-aim', 'Retaliatory Aim', 'Counterattacks gain +18% critical chance.', 'target', {}, ['counterCrit']),
            makeStyleChoice('counter-punishing-reply', 'Punishing Reply', 'Counterattacks gain +15% status application chance.', 'debuff', {}, ['counterDebuff']),
            makeStyleChoice('counter-braced-guard', 'Braced Guard', 'The hit that first readies a counter deals 10% less damage.', 'barrier', {}, ['bracedGuard'])
        ]),
        makeMasteryTier(2, 'Rhythm', 'Choose how Counter Style stores and releases retaliation.', [
            makeStyleChoice('counter-stored-force', 'Stored Force', 'Additional hits received before retaliating add 20% counterattack damage, up to 60%.', 'momentum', {}, ['storedForce']),
            makeStyleChoice('counter-quick-riposte', 'Quick Riposte', 'While a counterattack is ready, the next attack is 25% faster.', 'speed', {}, ['quickRiposte']),
            makeStyleChoice('counter-shield-reprisal', 'Shield Reprisal', 'Counterattacking restores 6% of maximum Energy Shield.', 'shield', {}, ['shieldReprisal'])
        ]),
        makeMasteryTier(3, 'Doctrine', 'Choose the defensive rule that defines Counter Style.', [
            makeStyleChoice('counter-perfect-parry', 'Perfect Parry', 'Every third incoming hit deals 40% less damage and primes a maximum-roll counterattack.', 'star', {}, ['perfectParry']),
            makeStyleChoice('counter-vengeful-loop', 'Vengeful Loop', 'A critical counterattack primes one 125%-damage follow-up attack.', 'cycle', {}, ['vengefulLoop']),
            makeStyleChoice('counter-unbroken-form', 'Unbroken Form', 'While a counter is already ready, additional incoming hits deal 20% less damage.', 'fortress', {}, ['unbrokenForm'])
        ])
    ]
);

const combatStyles = Object.freeze([balancedStyle, heavyStyle, twinStyle, counterStyle]);

window.combatStyles = combatStyles;
window.combatSkills = combatStyles; // Backward alias for legacy call-sites.
window.DEFAULT_SKILL_PROFILE = DEFAULT_COMBAT_STYLE_PROFILE; // Backward alias.
window.DEFAULT_COMBAT_STYLE_PROFILE = DEFAULT_COMBAT_STYLE_PROFILE;
window.DEFAULT_COMBAT_STYLE_ID = DEFAULT_COMBAT_STYLE_ID;
window.COMBAT_STYLE_VERSION = COMBAT_STYLE_VERSION;
window.STYLE_TIER_THRESHOLDS = STYLE_TIER_THRESHOLDS;
window.LEGACY_SKILL_IDS = LEGACY_SKILL_IDS;
