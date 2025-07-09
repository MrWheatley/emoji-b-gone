let isEnabled;
let allowedEmojis;
let emojiRegex;

// This regex covers a wide range of Unicode emoji characters.
const BASE_EMOJI_REGEX_PATTERN = `[\\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\\u{1F6FF}]|[\\u{1F1E6}-\\u{1F1FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]|[\\u{FE0F}]|[\\u{1F900}-\\u{1F9FF}]|[\\u{1F018}-\\u{1F270}]|[\\u{238C}]|[\\u{2B06}]|[\\u{2197}]`;

function buildRegex() {
    let pattern = BASE_EMOJI_REGEX_PATTERN;
    if (allowedEmojis && allowedEmojis.length > 0) {
        // Create a negative lookahead for each allowed emoji.
        // This ensures the main pattern doesn't match the allowed ones.
        const allowedPattern = [...allowedEmojis].map(e => `(?!${e})`).join('');
        pattern = `${allowedPattern}(?:${pattern})`;
    }
    // 'u' flag for unicode, 'g' for global match
    emojiRegex = new RegExp(pattern, 'ug');
}

function removeEmojis(node) {
    // 1. Handle Text Nodes (for visible page text)
    if (node.nodeType === Node.TEXT_NODE) {
        // Avoid operating on nodes inside script/style/textarea tags
        const parentTag = node.parentElement?.tagName.toLowerCase();
        if (parentTag === 'script' || parentTag === 'style' || parentTag === 'textarea') {
            return;
        }

        const newText = node.textContent.replace(emojiRegex, '');
        if (newText !== node.textContent) {
            node.textContent = newText;
        }
    } 
    // 2. Handle Element Nodes (for tooltips and recursion)
    else if (node.nodeType === Node.ELEMENT_NODE) {
        // Clean the title attribute if it exists (for tooltips)
        if (node.hasAttribute('title')) {
            const newTitle = node.getAttribute('title').replace(emojiRegex, '');
            if (newTitle !== node.getAttribute('title')) {
                node.setAttribute('title', newTitle);
            }
        }
        
        // Recursively call on child nodes
        for (const child of node.childNodes) {
            removeEmojis(child);
        }
    }
}

function processPage() {
    if (isEnabled) {
        buildRegex();
        // Process the entire document, including <head> for the <title> tag
        removeEmojis(document.documentElement);
    }
}

// --- MutationObserver to handle dynamic content ---
const observer = new MutationObserver((mutationsList) => {
    if (!isEnabled) return;

    for (const mutation of mutationsList) {
        // Handles dynamically added elements
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const newNode of mutation.addedNodes) {
                removeEmojis(newNode);
            }
        } 
        // Handles changes to text content
        else if (mutation.type === 'characterData') {
             removeEmojis(mutation.target);
        }
        // Handles changes to tooltip text
        else if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
            removeEmojis(mutation.target);
        }
    }
});

function startObserver() {
    // Observe the entire document for changes
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true, // Watch for attribute changes
        attributeFilter: ['title'] // Specifically watch the 'title' attribute for tooltips
    });
}

function stopObserver() {
    observer.disconnect();
}

// --- Initialization and Message Handling ---
function initialize() {
    browser.storage.local.get(['isEnabled', 'allowedEmojis']).then(result => {
        isEnabled = !!result.isEnabled;
        allowedEmojis = result.allowedEmojis || '';
        if (isEnabled) {
            processPage();
            startObserver();
        }
    });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateState') {
        if (message.isEnabled !== undefined) {
            isEnabled = message.isEnabled;
        }
        if (message.allowedEmojis !== undefined) {
            allowedEmojis = message.allowedEmojis;
        }

        stopObserver(); 
        // Reloading the page is the most robust way to re-apply the filter
        // when it's turned back on/off or the allow-list changes.
        window.location.reload();
    }
});

initialize();
