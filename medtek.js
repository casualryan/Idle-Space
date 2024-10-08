// medtek.js

document.addEventListener('DOMContentLoaded', () => {
    const medtekScreen = document.getElementById('medtek-screen');
    const activitiesDiv = medtekScreen.querySelector('.activities');
    const progressBar = document.getElementById('medtek-progress-bar');
    const stopMedtekButton = document.getElementById('stop-medtek');

    let craftingInterval = null;
    let craftingStartTime = null;
    let craftingDuration = null;
    let currentInjector = null;    

    function updateActivities() {       
        activitiesDiv.innerHTML = '';
        injectors.forEach(injector => {
            const injectorDiv = document.createElement('div');
            injectorDiv.className = 'activity-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = injector.name;

            const craftButton = document.createElement('button');
            craftButton.textContent = 'Craft';
            craftButton.addEventListener('click', () => {
                startCrafting(injector);
            });

            injectorDiv.appendChild(nameSpan);
            injectorDiv.appendChild(craftButton);
            activitiesDiv.appendChild(injectorDiv);
        });
    }

    function startCrafting(injector) {
        if (craftingInterval) {
            logMessage('Already crafting an injector.');
            return;
        }

        // Check if player has required materials
        if (!hasRequiredMaterials(injector.requiredMaterials)) {
            logMessage('You do not have the required materials to craft this injector.');
            return;
        }

        // Remove required materials from inventory
        injector.requiredMaterials.forEach(material => {
            removeItemQuantityFromInventory(material.name, material.quantity);
        });

        currentInjector = injector;
        craftingStartTime = Date.now();
        craftingDuration = injector.craftingTime;
        progressBar.style.width = '0%';
        stopMedtekButton.style.display = 'block';

        craftingInterval = setInterval(() => {
            const elapsed = Date.now() - craftingStartTime;
            const progressPercent = Math.min((elapsed / craftingDuration) * 100, 100);
            progressBar.style.width = `${progressPercent}%`;

            if (elapsed >= craftingDuration) {
                completeCrafting();
            }
        }, 100);
    }

    function completeCrafting() {
        clearInterval(craftingInterval);
        craftingInterval = null;
        stopMedtekButton.style.display = 'none';
        progressBar.style.width = '0%';

        // Add crafted injector to inventory
        const injectorItem = createItemInstance(currentInjector);
        injectorItem.effect = currentInjector.effect;
        addItemToInventory(injectorItem);
        logMessage(`You crafted: ${injectorItem.name}`);
        updateInventoryDisplay();

        currentInjector = null;
    }

    function stopCrafting() {
        if (craftingInterval) {
            clearInterval(craftingInterval);
            craftingInterval = null;
            stopMedtekButton.style.display = 'none';
            progressBar.style.width = '0%';
            logMessage('Crafting stopped.');
            // Optionally, refund materials here
        }
    }

    stopMedtekButton.addEventListener('click', stopCrafting);

    updateActivities();
});
