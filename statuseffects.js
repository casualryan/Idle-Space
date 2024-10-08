// statusEffects.js

// Define the StatusEffect class
class StatusEffect {
    constructor(name, duration, target, onApply, onTick, onExpire) {
        this.name = name;
        this.duration = duration; // total duration in seconds
        this.remainingDuration = duration;
        this.target = target;
        this.onApply = onApply;   // Function called when effect is applied
        this.onTick = onTick;     // Function called every tick
        this.onExpire = onExpire; // Function called when effect expires

        // Apply the effect immediately upon creation if onApply is defined
        if (this.onApply) {
            this.onApply(this);
        }
    }
}

// Define specific status effects
const statusEffects = {
    Zapped: function(target) {
        return new StatusEffect(
            'Zapped',
            0, // No duration, effect lasts until the next attack
            target,
            function(effect) {
                logMessage(`${effect.target.name} is Zapped!`);
            },
            null, // No onTick
            null  // No onExpire
        );
    },
    // You can define other status effects here
};
