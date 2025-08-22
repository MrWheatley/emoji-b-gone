let isEnabled;
let allowedEmojis;
let blockList; // Variable for the block-list
let emojiRegex;

// This regex covers a wide range of Unicode emoji characters.
const BASE_EMOJI_REGEX_PATTERN = `[\\u{1F600}-\\u{1F64F}]|[\\u{1F300}-\\u{1F5FF}]|[\\u{1F680}-\\u{1F6FF}]|[\\u{1F1E6}-\\u{1F1FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]|[\\u{FE0F}]|[\\u{1F900}-\\u{1F9FF}]|[\\u{1F018}-\\u{1F270}]|[\\u{238C}]|[\\u{2B06}]|[\\u{2197}]`;

// Helper function to escape characters for use in a regex
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex() {
    let removePattern = BASE_EMOJI_REGEX_PATTERN;

    // Add block-listed characters to the removal pattern
    if (blockList && blockList.length > 0) {
        const blockPattern = [...blockList].map(escapeRegex).join('|');
        removePattern += `|${blockPattern}`;
    }

    let finalPattern = `(?:${removePattern})`;

    // Add a negative lookahead for allowed emojis, ensuring they are not removed
    if (allowedEmojis && allowedEmojis.length > 0) {
        const allowedPattern = [...allowedEmojis].map(e => `(?!${escapeRegex(e)})`).join('');
        finalPattern = `${allowedPattern}${finalPattern}`;
    }
    
    // 'u' flag for unicode, 'g' for global match
    emojiRegex = new RegExp(finalPattern, 'ug');
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
        removeEmojis(document.documentElement);
    }
}

const observer = new MutationObserver((mutationsList) => {
    if (!isEnabled) return;
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const newNode of mutation.addedNodes) {
                removeEmojis(newNode);
            }
        } else if (mutation.type === 'characterData') {
             removeEmojis(mutation.target);
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
            removeEmojis(mutation.target);
        }
    }
});

function startObserver() {
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title']
    });
}

function stopObserver() {
    observer.disconnect();
}

function initialize() {
    browser.storage.local.get(['isEnabled', 'allowedEmojis', 'blockList']).then(result => {
        isEnabled = !!result.isEnabled;
        allowedEmojis = result.allowedEmojis || '';
        blockList = result.blockList || ''; // Initialize block-list
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
        if (message.blockList !== undefined) {
            blockList = message.blockList; // Update block-list
        }
        
        stopObserver();
        window.location.reload();
    }
});

initialize();
