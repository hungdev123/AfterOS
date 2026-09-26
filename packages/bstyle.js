const fontOptions = [
    { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
    { label: 'Fira Code', value: "'Fira Code', monospace" },
    { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
    { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
    { label: 'Space Mono', value: "'Space Mono', monospace" },
    { label: 'Consolas', value: "Consolas, 'Liberation Mono', monospace" },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" }
];
const defaultStyle = {
    font: "'Courier New', Courier, monospace",
    background: '#000000',
    text: '#ffffff',
    prompt: '#87ceeb',
    backgroundImage: '',
    backgroundBlur: 0
};

function loadFonts() {
    if (document.getElementById('bstyle-fonts')) return;

    const link = document.createElement('link');
    link.id = 'bstyle-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fira+Code&family=IBM+Plex+Mono&family=JetBrains+Mono&family=Source+Code+Pro&family=Space+Mono&display=swap';
    document.head.appendChild(link);
}

function fontIndex(value) {
    const index = fontOptions.findIndex((font) => font.value === value);
    return index === -1 ? 0 : index;
}

function normalizeHex(value) {
    const hex = value.trim();
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
        return `#${hex.slice(1).split('').map((character) => character + character).join('')}`.toLowerCase();
    }
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null;
}

// Lets bstyle work with both the newest AfterOS host API and older deployments.
function createFallbackStyleApi() {
    const get = () => {
        const computed = getComputedStyle(document.body);
        return {
            font: document.body.style.fontFamily || defaultStyle.font,
            background: computed.getPropertyValue('--terminal-background').trim() || defaultStyle.background,
            text: computed.getPropertyValue('--terminal-text').trim() || defaultStyle.text,
            prompt: computed.getPropertyValue('--terminal-prompt').trim() || defaultStyle.prompt,
            backgroundImage: document.body.dataset.backgroundImage || '',
            backgroundBlur: Number(document.body.dataset.backgroundBlur) || 0
        };
    };
    const persist = (style) => {
        const serialized = JSON.stringify(style);
        if (serialized.length < 3500) {
            document.cookie = `afteros-terminal-style=${encodeURIComponent(serialized)}; max-age=31536000; path=/; samesite=lax`;
        } else {
            document.cookie = 'afteros-terminal-style=; max-age=0; path=/; samesite=lax';
        }
        try {
            localStorage.setItem('afteros-terminal-style-backup', serialized);
        } catch {
            // Cookie storage is still available.
        }
    };
    const apply = (style) => {
        const root = document.documentElement.style;
        root.setProperty('--terminal-background', style.background);
        root.setProperty('--terminal-text', style.text);
        root.setProperty('--terminal-prompt', style.prompt);
        root.setProperty('--terminal-background-image', style.backgroundImage ? `url(${JSON.stringify(style.backgroundImage)})` : 'none');
        root.setProperty('--terminal-background-blur', `${Math.max(0, Number(style.backgroundBlur) || 0)}px`);
        document.body.style.fontFamily = style.font;
        document.body.dataset.backgroundImage = style.backgroundImage || '';
        document.body.dataset.backgroundBlur = String(Math.max(0, Number(style.backgroundBlur) || 0));
    };

    return {
        get,
        set(style) {
            const nextStyle = { ...get(), ...style };
            apply(nextStyle);
            persist(nextStyle);
        },
        reset() {
            apply(defaultStyle);
            document.cookie = 'afteros-terminal-style=; max-age=0; path=/; samesite=lax';
            try {
                localStorage.removeItem('afteros-terminal-style-backup');
            } catch {
                // Nothing else is needed here.
            }
        }
    };
}

export default function install({ registerCommand, logOutput, terminalStyle }) {
    const styleApi = terminalStyle?.get && terminalStyle?.set && terminalStyle?.reset
        ? terminalStyle
        : createFallbackStyleApi();
    let session = null;

    function uploadImage() {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/*';
        picker.hidden = true;
        document.body.appendChild(picker);

        const removePicker = () => picker.remove();
        picker.addEventListener('change', () => {
            const file = picker.files?.[0];
            if (!file || !session) {
                removePicker();
                return;
            }
            if (!file.type.startsWith('image/')) {
                logOutput('Please choose an image file.');
                removePicker();
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                removePicker();
                if (!session) return;
                session.style.backgroundImage = reader.result;
                logOutput(`Image selected: ${file.name}. Choose Save and exit to apply it.`);
                render();
            });
            reader.addEventListener('error', () => {
                removePicker();
                logOutput('Could not read that image file.');
            });
            reader.readAsDataURL(file);
        });
        picker.click();
    }

    function render() {
        if (!session) return;

        if (session.editing) {
            const isHex = session.editing.type === 'hex';
            session.panel.textContent = [
                'bstyle — editor',
                session.editing.help,
                'Enter apply  •  Esc cancel',
                '',
                `${session.editing.label}: ${session.buffer || (isHex ? '#' : '')}_`
            ].join('\n');
            return;
        }

        const rows = [
            `Font: ${fontOptions[session.fontIndex].label}`,
            `Background: ${session.style.background}`,
            `Text: ${session.style.text}`,
            `Prompt: ${session.style.prompt}`,
            `Background image: ${session.style.backgroundImage ? 'set' : 'none'}`,
            'Upload background image',
            `Image blur: ${session.style.backgroundBlur}px`,
            'Save and exit',
            'Default'
        ];
        session.panel.textContent = [
            'bstyle — advanced terminal style',
            '↑/↓ select  •  ←/→ change font or blur  •  Enter edit/save  •  Esc cancel',
            '',
            ...rows.map((row, index) => `${index === session.selected ? '❯' : ' '} ${row}`)
        ].join('\n');
    }

    function close(message) {
        session.panel.remove();
        session = null;
        if (message) logOutput(message);
        document.getElementById('terminal-input').focus();
    }

    function handleKey(event) {
        if (!session) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (session.editing) {
            if (event.key === 'Escape') {
                session.editing = null;
                session.buffer = '';
            } else if (event.key === 'Backspace') {
                session.buffer = session.buffer.slice(0, -1);
            } else if (event.key === 'Enter') {
                let value = session.buffer.trim();
                if (session.editing.type === 'hex') {
                    value = normalizeHex(value);
                } else if (session.editing.type === 'blur') {
                    value = Number(value);
                    if (!Number.isFinite(value) || value < 0 || value > 50) value = null;
                } else if (session.editing.type === 'url' && !value) {
                    value = '';
                }
                if (value === null) {
                    logOutput(session.editing.type === 'hex'
                        ? 'Invalid HEX. Use #RGB or #RRGGBB.'
                        : 'Invalid blur. Use a number from 0 to 50.');
                } else {
                    session.style[session.editing.field] = value;
                    session.editing = null;
                    session.buffer = '';
                }
            } else if (
                (session.editing.type === 'hex' && /^[#0-9a-f]$/i.test(event.key) && session.buffer.length < 7)
                || (session.editing.type === 'blur' && /^[0-9]$/.test(event.key) && session.buffer.length < 2)
                || (session.editing.type === 'url' && event.key.length === 1 && session.buffer.length < 2048)
            ) {
                session.buffer += event.key;
            }
            render();
            return;
        }

        if (event.key === 'Escape') {
            close('bstyle cancelled.');
            return;
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const step = event.key === 'ArrowUp' ? -1 : 1;
            session.selected = (session.selected + step + 9) % 9;
        } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && session.selected === 0) {
            const step = event.key === 'ArrowLeft' ? -1 : 1;
            session.fontIndex = (session.fontIndex + step + fontOptions.length) % fontOptions.length;
            session.style.font = fontOptions[session.fontIndex].value;
        } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && session.selected === 6) {
            const step = event.key === 'ArrowLeft' ? -1 : 1;
            session.style.backgroundBlur = Math.max(0, Math.min(50, Number(session.style.backgroundBlur) + step));
        } else if (event.key === 'Enter') {
            if (session.selected >= 1 && session.selected <= 3) {
                session.editing = {
                    field: ['background', 'text', 'prompt'][session.selected - 1],
                    label: ['Background', 'Text', 'Prompt'][session.selected - 1],
                    type: 'hex',
                    help: 'Enter a 3- or 6-digit HEX code.'
                };
                session.buffer = '';
            } else if (session.selected === 4) {
                session.editing = {
                    field: 'backgroundImage',
                    label: 'Image URL',
                    type: 'url',
                    help: 'Enter an image URL. Leave blank to remove the image.'
                };
                session.buffer = '';
            } else if (session.selected === 5) {
                uploadImage();
            } else if (session.selected === 6) {
                session.editing = {
                    field: 'backgroundBlur',
                    label: 'Image blur',
                    type: 'blur',
                    help: 'Enter blur strength from 0 to 50 pixels.'
                };
                session.buffer = String(session.style.backgroundBlur);
            } else if (session.selected === 7) {
                styleApi.set(session.style);
                close('bstyle saved.');
                return;
            } else if (session.selected === 8) {
                styleApi.reset();
                close('Terminal style reset to default.');
                return;
            }
        }
        render();
    }

    function handlePaste(event) {
        if (!session?.editing) return;

        const pasted = event.clipboardData?.getData('text')?.trim() || '';
        if (!pasted) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        if (session.editing.type === 'url') {
            session.buffer = pasted.slice(0, 2048);
        } else if (session.editing.type === 'hex') {
            session.buffer = pasted.slice(0, 7);
        } else if (session.editing.type === 'blur') {
            session.buffer = pasted.replace(/\D/g, '').slice(0, 2);
        }
        render();
    }

    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('paste', handlePaste, true);

    registerCommand('bstyle', () => {
        if (session) return;
        loadFonts();
        const panel = document.createElement('div');
        panel.className = 'terminal-style-panel';
        const style = styleApi.get();
        session = {
            panel,
            selected: 0,
            fontIndex: fontIndex(style.font),
            style: { ...style },
            editing: null,
            buffer: ''
        };
        document.getElementById('history').appendChild(panel);
        render();
    }, 'Advanced terminal style editor with HEX colors');
}
