// Set initial state on installation
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['isEnabled', 'allowedEmojis']).then(result => {
    if (result.isEnabled === undefined) {
      browser.storage.local.set({ isEnabled: true });
    }
    if (result.allowedEmojis === undefined) {
      browser.storage.local.set({ allowedEmojis: '' });
    }
  });
});

// Listen for messages from the popup and forward them to the content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateState') {
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, {
            action: 'updateState',
            ...message
          }).catch(error => {
            // This will catch errors if the content script isn't injected, which is fine.
            // console.log(`Could not send message to tab ${tab.id}: ${error.message}`);
          });
        }
      });
    });
  }
});