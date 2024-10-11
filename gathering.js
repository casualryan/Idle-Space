let isGathering = false;
let gatheringInterval;
let currentActivity;
let gatheringProgress = 0;
let gatheringTimer = 0;
let inventoryItem = inventory.find(item => item.name === activity.item.name);
let totalQuantity = inventory
    .filter(item => item.name === activity.item.name)
    .reduce((sum, item) => sum + item.quantity, 0);

if (typeof updateInventoryDisplay === 'undefined') {
    // Import or define updateInventoryDisplay function
}

// Start a gathering activity
function startGatheringActivity(skillName, activity) {
    if (isGathering) {
        stopGatheringActivity();
    }

    // Stop combat if active
    if (isCombatActive) {
        stopCombat();
    }

    isGathering = true;
    currentActivity = { skillName, activity };

    // Show stop button based on skill
    const stopButton = document.getElementById(`stop-${skillName.toLowerCase()}`);
    if (stopButton) {
        stopButton.style.display = 'block';
    }

    // Reset progress
    gatheringProgress = 0;
    gatheringTimer = 0;

    // Update progress bar every 100ms
    gatheringInterval = setInterval(() => {
        gatheringLoop(skillName);
    }, 100);

}

// Gathering loop to handle progress and completion
function gatheringLoop(skillName) {
    if (!isGathering) return;

    const deltaTime = 0.1; // 100ms in seconds
    gatheringTimer += deltaTime;

    // Get the correct progress bar element for the skill
    const progressElement = document.getElementById(`${skillName.toLowerCase()}-progress-bar`);
    const activityTime = currentActivity.activity.time;

    gatheringProgress = Math.min((gatheringTimer / activityTime) * 100, 100);
    if (progressElement) {
        progressElement.style.width = gatheringProgress + '%';
    }

    if (gatheringTimer >= activityTime) {
        // Perform the gathering action
        performGatheringAction(currentActivity.skillName, currentActivity.activity);

        // Reset timer and progress
        gatheringTimer = 0;
        gatheringProgress = 0;
    }
    updateInventoryDisplay();
}

// Stop the current gathering activity
function stopGatheringActivity() {
    if (isGathering) {
        clearInterval(gatheringInterval);
        isGathering = false;

        // Hide stop button and reset progress bar for the current skill
        const stopButton = document.getElementById(`stop-${currentActivity.skillName.toLowerCase()}`);
        if (stopButton) {
            stopButton.style.display = 'none';
        }

        const progressElement = document.getElementById(`${currentActivity.skillName.toLowerCase()}-progress-bar`);
        if (progressElement) {
            progressElement.style.width = '0%';
        }

        logMessage(`You stop ${currentActivity.activity.name}.`);
        currentActivity = null;
    }
}

function displayLootPopup(message) {
    const container = document.getElementById('loot-popups-container');
    if (!container) {
        console.error('Loot popups container not found in the DOM.');
        return;
    }

    const popup = document.createElement('div');
    popup.classList.add('loot-popup');
    popup.textContent = message;

    // Add the popup to the container
    container.appendChild(popup);

    // Remove the popup after 3 seconds
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.5s';
        // Remove the popup from the DOM after the transition
        setTimeout(() => {
            container.removeChild(popup);
        }, 500);
    }, 3000);
}



// Perform the gathering action upon completion
// Perform the gathering action upon completion
function performGatheringAction(skillName, activity) {
    // Get the item template from items.js
    const itemTemplate = items.find(i => i.name === activity.item.name);
    if (itemTemplate) {
        // Create an item instance
        const gatheredItem = createItemInstance(itemTemplate);
        gatheredItem.quantity = activity.item.quantity || 1;
        // Add to inventory
        addItemToInventory(gatheredItem);

        // Calculate total quantity after adding the item
        let totalQuantity = inventory
            .filter(item => item.name === activity.item.name)
            .reduce((sum, item) => sum + item.quantity, 0);

        // Display the popup with the total quantity
        displayLootPopup(`You gathered ${activity.item.name}. (${totalQuantity})`);
    } else {
        console.error(`Item template not found for ${activity.item.name}`);
    }

    // Gain experience
    gainGatheringExperience(skillName, activity.experience);

    console.log(`You have gathered ${activity.item.name}.`);

    // Update gathering skill stats
    updateGatheringSkillStats();
}


// Display activities for a given skill
function displaySkillActivities(skillName) {
    if (skillName === 'Fabrication') {
        console.warn('Fabrication is not a gathering skill.');
        return;
    }

    const activitiesDiv = document.querySelector(`#${skillName.toLowerCase()}-screen .activities`);
    if (!activitiesDiv) {
        console.error(`Activities div not found for skill ${skillName}`);
        return;
    }
    activitiesDiv.innerHTML = ''; // Clear existing content

    const skill = gatheringSkills.find(skill => skill.name === skillName);

    if (skill) {
        skill.activities.forEach(activity => {
            const activityButton = document.createElement('button');
            activityButton.textContent = `${activity.name} (Level ${activity.levelRequired})`;
            const playerSkillLevel = player.gatheringSkills[skill.name]?.level || 1;
            activityButton.disabled = playerSkillLevel < activity.levelRequired;
            activityButton.addEventListener('click', () => {
                startGatheringActivity(skill.name, activity);
            });
            activitiesDiv.appendChild(activityButton);
        });
    } else {
        console.error(`${skillName} skill not found in gatheringSkills.`);
    }
}

// Gain experience for a gathering skill
function gainGatheringExperience(skillName, experience) {
    if (!player.gatheringSkills[skillName]) {
        // Initialize the skill if it doesn't exist
        player.gatheringSkills[skillName] = { level: 1, experience: 0 };
    }

    let skill = player.gatheringSkills[skillName];
    skill.experience += experience;

    // Check for level up
    let xpForNextLevel = getGatheringXPForNextLevel(skill.level);
    while (skill.experience >= xpForNextLevel) {
        skill.experience -= xpForNextLevel;
        skill.level += 1;
        logMessage(`Your ${skillName} skill has reached level ${skill.level}!`);
        xpForNextLevel = getGatheringXPForNextLevel(skill.level);
    }
}

// Calculate the experience needed for the next level
function getGatheringXPForNextLevel(level) {
    // Simple exponential formula
    return 50 * Math.pow(1.5, level - 1); // Level 2 = 50, Level 3 = 75, etc.
}

// Update the display of gathering skill stats
function updateGatheringSkillStats() {
    const statsDiv = document.getElementById('gathering-skill-stats');
    if (!statsDiv) {
        console.error('Element with ID "gathering-skill-stats" not found.');
        return;
    }
    statsDiv.innerHTML = '';

    for (let skillName in player.gatheringSkills) {
        const skill = player.gatheringSkills[skillName];
        const skillInfo = document.createElement('p');
        skillInfo.textContent = `${skillName} Level: ${skill.level}, Experience: ${skill.experience.toFixed(0)}`;
        statsDiv.appendChild(skillInfo);
    }
}

// Gathering skills data
const gatheringSkills = [
    {
        name: 'Mining',
        activities: [
            {
                name: 'Chip at Fallen Ships',
                levelRequired: 1,
                experience: 10,        // Experience gained per action
                time: 4,              // Time in seconds per action
                item: { name: 'Scrap Metal', quantity: 1 },
            },
            {
                name: 'Titanium Harvesting',
                levelRequired: 10,
                experience: 25,
                time: 6,
                item: { name: 'Titanium', quantity: 1 },
            },
            // Add more activities as needed
        ],
    },
    // Add other skills like Fabricating, Fishing, etc.
];

// Initialize gathering skill stats and display
document.addEventListener('DOMContentLoaded', () => {
    updateGatheringSkillStats();

    // Add event listeners for stop buttons
    gatheringSkills.forEach(skill => {
        const stopButton = document.getElementById(`stop-${skill.name.toLowerCase()}`);
        if (stopButton) {
            stopButton.addEventListener('click', stopGatheringActivity);
        }

        // Display activities for each skill
        displaySkillActivities(skill.name);
    });
});
