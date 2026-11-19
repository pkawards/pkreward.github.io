export function escapeAttribute(value) {
    return String(value ?? '').replace(/[&"<>']/g, character => ({
        '&': '&amp;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;'
    })[character]);
}

export function bindActions(root, actions) {
    const attributes = { click: 'data-action', change: 'data-change', input: 'data-input' };
    for (const [type, attribute] of Object.entries(attributes)) {
        root.addEventListener(type, event => {
            const selector = '[' + attribute + ']';
            let element = event.target.closest?.(selector);
            while (element) {
                const action = element.getAttribute(attribute);
                if (Object.hasOwn(actions, action)) actions[action](element, event);
                if (event.cancelBubble) break;
                element = element.parentElement?.closest(selector);
            }
        });
    }
}
