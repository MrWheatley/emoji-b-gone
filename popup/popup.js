document.addEventListener('DOMContentLoaded', () => {
    const enabledCheckbox = document.getElementById('enabled-checkbox');
    const allowedEmojisTextarea = document.getElementById('allowed-emojis');
    const blockListTextarea = document.getElementById('block-list-emojis'); // New element
    const saveButton = document.getElementById('save-button');
    const saveStatus = document.getElementById('save-status');

    // Load current settings from storage
    browser.storage.local.get(['isEnabled', 'allowedEmojis', 'blockList']).then(result => {
        enabledCheckbox.checked = !!result.isEnabled;
        allowedEmojisTextarea.value = result.allowedEmojis || '';
        blockListTextarea.value = result.blockList || ''; // Load block-list
    });

    // Handle toggle switch changes
    enabledCheckbox.addEventListener('change', () => {
        const isEnabled = enabledCheckbox.checked;
        browser.storage.local.set({ isEnabled }).then(() => {
            browser.runtime.sendMessage({
                action: 'updateState',
                isEnabled: isEnabled
            });
        });
    });

    // Handle save button click for all settings
    saveButton.addEventListener('click', () => {
        const allowedEmojis = allowedEmojisTextarea.value;
        const blockList = blockListTextarea.value; // Get block-list value

        browser.storage.local.set({ allowedEmojis, blockList }).then(() => { // Save both lists
            browser.runtime.sendMessage({
                action: 'updateState',
                allowedEmojis: allowedEmojis,
                blockList: blockList // Send block-list in message
            });
            saveStatus.textContent = 'Saved!';
            setTimeout(() => {
                saveStatus.textContent = '';
            }, 2000);
        });
    });
});
