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

export default function install({ registerCommand, logOutput, terminalStyle }) {
    let session = null;

    function render() {
        if (!session) return;

        if (session.editing) {
            session.panel.textContent = [
                'bstyle — HEX color editor',
                `Enter a 3- or 6-digit HEX code for ${session.editing}.`,
                'Enter apply  •  Esc cancel',
                '',
                `${session.editing}: ${session.buffer || '#'}_`
            ].join('\n');
            return;
        }

        const rows = [
            `Font: ${fontOptions[session.fontIndex].label}`,
            `Background: ${session.style.background}`,
            `Text: ${session.style.text}`,
            `Prompt: ${session.style.prompt}`,
            'Save and exit',
            'Default'
        ];
        session.panel.textContent = [
            'bstyle — advanced terminal style',
            '↑/↓ select  •  ←/→ change font  •  Enter edit/save  •  Esc cancel',
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
                const color = normalizeHex(session.buffer);
                if (!color) {
                    logOutput('Invalid HEX. Use #RGB or #RRGGBB.');
                } else {
                    session.style[session.editing.toLowerCase()] = color;
                    session.editing = null;
                    session.buffer = '';
                }
            } else if (/^[#0-9a-f]$/i.test(event.key) && session.buffer.length < 7) {
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
            session.selected = (session.selected + step + 6) % 6;
        } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && session.selected === 0) {
            const step = event.key === 'ArrowLeft' ? -1 : 1;
            session.fontIndex = (session.fontIndex + step + fontOptions.length) % fontOptions.length;
            session.style.font = fontOptions[session.fontIndex].value;
        } else if (event.key === 'Enter') {
            if (session.selected >= 1 && session.selected <= 3) {
                session.editing = ['Background', 'Text', 'Prompt'][session.selected - 1];
                session.buffer = '';
            } else if (session.selected === 4) {
                terminalStyle.set(session.style);
                close('bstyle saved.');
                return;
            } else if (session.selected === 5) {
                terminalStyle.reset();
                close('Terminal style reset to default.');
                return;
            }
        }
        render();
    }

    document.addEventListener('keydown', handleKey, true);

    registerCommand('bstyle', () => {
        if (session) return;
        loadFonts();
        const panel = document.createElement('div');
        panel.className = 'terminal-style-panel';
        const style = terminalStyle.get();
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
