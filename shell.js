const input = document.getElementById('terminal-input');
const history = document.getElementById('history');
const terminal = document.getElementById('terminal');

terminal.addEventListener('click', () => input.focus());

input.addEventListener('keydown', function (e) {
    if (styleSession && handleStyleKey(e)) {
        return;
    }

    if (e.key === 'Enter') {
        const commandText = input.value.trim();
        if (commandText) {
            logCommand(commandText);
            processCommand(commandText);
        } else {
            logCommand('');
        }
        input.value = '';
        terminal.scrollTop = terminal.scrollHeight;
    }
});

function logCommand(cmd) {
    const line = document.createElement('div');
    line.innerHTML = `<span class="prompt">user@afteros:~$</span> ${cmd}`;
    history.appendChild(line);
}

function logOutput(text) {
    const output = document.createElement('div');
    output.textContent = text;
    history.appendChild(output);
}

const commands = new Map();
const packageManifestUrl = new URL('./packages/index.json', window.location.href);
const terminalStyleCookieName = 'afteros-terminal-style';
const terminalStyleStorageKey = 'afteros-terminal-style-backup';
const defaultTerminalStyle = {
    font: "'Courier New', Courier, monospace",
    background: '#000000',
    text: '#ffffff',
    prompt: '#87ceeb',
    backgroundImage: '',
    backgroundBlur: 0
};
const fontOptions = [
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
    { label: 'System Monospace', value: 'monospace' },
    { label: 'Consolas', value: "Consolas, 'Liberation Mono', monospace" },
    { label: 'Fira Code', value: "'Fira Code', monospace" },
    { label: 'Arial', value: 'Arial, sans-serif' }
];
const colorOptions = [
    { label: 'Black', value: '#000000' },
    { label: 'White', value: '#ffffff' },
    { label: 'Red', value: '#ff5555' },
    { label: 'Green', value: '#50fa7b' },
    { label: 'Yellow', value: '#f1fa8c' },
    { label: 'Blue', value: '#6272a4' },
    { label: 'Sky blue', value: '#87ceeb' },
    { label: 'Cyan', value: '#8be9fd' },
    { label: 'Magenta', value: '#ff79c6' },
    { label: 'Gray', value: '#888888' }
];
let styleSession = null;

function applyTerminalStyle(style) {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--terminal-background', style.background);
    rootStyle.setProperty('--terminal-text', style.text);
    rootStyle.setProperty('--terminal-prompt', style.prompt || defaultTerminalStyle.prompt);
    const imageUrl = style.backgroundImage || '';
    const blur = Math.max(0, Number(style.backgroundBlur) || 0);
    rootStyle.setProperty('--terminal-background-image', imageUrl ? `url(${JSON.stringify(imageUrl)})` : 'none');
    rootStyle.setProperty('--terminal-background-blur', `${blur}px`);
    document.body.dataset.backgroundImage = imageUrl;
    document.body.dataset.backgroundBlur = String(blur);
    document.body.style.fontFamily = style.font;
}

function getCookie(name) {
    const encodedName = `${encodeURIComponent(name)}=`;
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(encodedName));
    return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
}

function saveTerminalStyle(style) {
    const serializedStyle = JSON.stringify(style);
    // Cookie is the primary store; localStorage keeps the setting in previews
    // or browsers that disable site cookies.
    try {
        if (serializedStyle.length < 3500) {
            document.cookie = `${encodeURIComponent(terminalStyleCookieName)}=${encodeURIComponent(serializedStyle)}; max-age=31536000; path=/; samesite=lax`;
        } else {
            // Uploaded images exceed a cookie's size limit; use localStorage only.
            document.cookie = `${encodeURIComponent(terminalStyleCookieName)}=; max-age=0; path=/; samesite=lax`;
        }
    } catch {
        // The local backup below still lets the terminal retain its style.
    }
    try {
        localStorage.setItem(terminalStyleStorageKey, serializedStyle);
    } catch {
        // Cookie storage remains available when localStorage is unavailable.
    }
}

function clearTerminalStyle() {
    try {
        document.cookie = `${encodeURIComponent(terminalStyleCookieName)}=; max-age=0; path=/; samesite=lax`;
    } catch {
        // Nothing else is needed here.
    }
    try {
        localStorage.removeItem(terminalStyleStorageKey);
    } catch {
        // Nothing else is needed here.
    }
}

function isDefaultTerminalStyle(style) {
    return style.font === defaultTerminalStyle.font
        && style.background === defaultTerminalStyle.background
        && style.text === defaultTerminalStyle.text
        && style.prompt === defaultTerminalStyle.prompt
        && !style.backgroundImage
        && Number(style.backgroundBlur) === 0;
}

function loadTerminalStyle() {
    try {
        const savedStyle = JSON.parse(
            getCookie(terminalStyleCookieName) || localStorage.getItem(terminalStyleStorageKey)
        );
        if (savedStyle?.font && savedStyle?.background && savedStyle?.text) {
            applyTerminalStyle(savedStyle);
        }
    } catch {
        clearTerminalStyle();
    }
}

function getTerminalStyle() {
    const currentStyle = getComputedStyle(document.body);
    return {
        font: document.body.style.fontFamily || defaultTerminalStyle.font,
        background: currentStyle.getPropertyValue('--terminal-background').trim() || defaultTerminalStyle.background,
        text: currentStyle.getPropertyValue('--terminal-text').trim() || defaultTerminalStyle.text,
        prompt: currentStyle.getPropertyValue('--terminal-prompt').trim() || defaultTerminalStyle.prompt,
        backgroundImage: document.body.dataset.backgroundImage || '',
        backgroundBlur: Number(document.body.dataset.backgroundBlur) || 0
    };
}

function setTerminalStyle(style) {
    const nextStyle = { ...getTerminalStyle(), ...style };
    applyTerminalStyle(nextStyle);
    if (isDefaultTerminalStyle(nextStyle)) {
        clearTerminalStyle();
    } else {
        saveTerminalStyle(nextStyle);
    }
    return nextStyle;
}

function resetTerminalStyle() {
    applyTerminalStyle(defaultTerminalStyle);
    clearTerminalStyle();
}

function optionIndex(options, value) {
    const index = options.findIndex((option) => option.value === value);
    return index === -1 ? 0 : index;
}

function currentSessionStyle() {
    return {
        font: fontOptions[styleSession.fontIndex].value,
        background: colorOptions[styleSession.backgroundIndex].value,
        text: colorOptions[styleSession.textIndex].value,
        prompt: colorOptions[styleSession.promptIndex].value
    };
}

function renderStyleSession() {
    const rows = [
        `Font: ${fontOptions[styleSession.fontIndex].label}`,
        `Background: ${colorOptions[styleSession.backgroundIndex].label}`,
        `Text: ${colorOptions[styleSession.textIndex].label}`,
        `Prompt: ${colorOptions[styleSession.promptIndex].label}`,
        'Save and exit',
        'Default'
    ];
    const content = [
        'Terminal style editor',
        '↑/↓ select  •  ←/→ change  •  Enter choose  •  Esc cancel',
        '',
        ...rows.map((row, index) => `${index === styleSession.selected ? '❯' : ' '} ${row}`)
    ];
    styleSession.panel.textContent = content.join('\n');
    terminal.scrollTop = terminal.scrollHeight;
}

function finishStyleSession(style, message) {
    setTerminalStyle(style);
    styleSession.panel.remove();
    styleSession = null;
    logOutput(message);
    input.focus();
}

function handleStyleKey(event) {
    const propertyKeys = ['fontIndex', 'backgroundIndex', 'textIndex', 'promptIndex'];
    if (event.key === 'Escape') {
        event.preventDefault();
        styleSession.panel.remove();
        styleSession = null;
        logOutput('Style editor cancelled.');
        return true;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const step = event.key === 'ArrowUp' ? -1 : 1;
        styleSession.selected = (styleSession.selected + step + 6) % 6;
        renderStyleSession();
        return true;
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && styleSession.selected < 4) {
        event.preventDefault();
        const key = propertyKeys[styleSession.selected];
        const options = styleSession.selected === 0 ? fontOptions : colorOptions;
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        styleSession[key] = (styleSession[key] + step + options.length) % options.length;
        renderStyleSession();
        return true;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        if (styleSession.selected === 4) {
            finishStyleSession(currentSessionStyle(), 'Terminal style saved.');
        } else if (styleSession.selected === 5) {
            resetTerminalStyle();
            styleSession.panel.remove();
            styleSession = null;
            logOutput('Terminal style reset to default.');
            input.focus();
        }
        return true;
    }
    return true;
}

function openStyleDialog() {
    if (styleSession) return;

    const currentStyle = getComputedStyle(document.body);
    const panel = document.createElement('div');
    panel.className = 'terminal-style-panel';
    styleSession = {
        panel,
        selected: 0,
        fontIndex: optionIndex(fontOptions, document.body.style.fontFamily || defaultTerminalStyle.font),
        backgroundIndex: optionIndex(colorOptions, currentStyle.getPropertyValue('--terminal-background').trim()),
        textIndex: optionIndex(colorOptions, currentStyle.getPropertyValue('--terminal-text').trim()),
        promptIndex: optionIndex(colorOptions, currentStyle.getPropertyValue('--terminal-prompt').trim())
    };
    history.appendChild(panel);
    renderStyleSession();
}

loadTerminalStyle();

function registerCommand(name, handler, description = '') {
    const commandName = String(name).trim().toLowerCase();

    if (!/^[a-z0-9_-]+$/.test(commandName)) {
        throw new Error('Command name may only contain letters, numbers, "_", and "-".');
    }
    if (typeof handler !== 'function') {
        throw new Error(`Handler for "${commandName}" must be a function.`);
    }
    if (commands.has(commandName)) {
        throw new Error(`The command "${commandName}" already exists.`);
    }

    commands.set(commandName, { handler, description });
}

async function installApp(url) {
    let appUrl;
    try {
        appUrl = new URL(url, window.location.href);
    } catch {
        throw new Error('Please provide a valid JavaScript URL.');
    }

    // Dynamic imports execute the downloaded module. Never install code you do not trust.
    const appModule = await import(appUrl.href);
    const install = appModule.default || appModule.install;

    if (typeof install !== 'function') {
        throw new Error('The app must export a default function or an install function.');
    }

    await install({
        registerCommand,
        logOutput,
        commands: () => [...commands.keys()],
        terminalStyle: {
            get: getTerminalStyle,
            set: setTerminalStyle,
            reset: resetTerminalStyle
        }
    });
}

function resolveAppUrl(packageNameOrUrl) {
    // A simple name is always loaded from this site's packages directory.
    if (/^[a-z0-9][a-z0-9_-]*$/i.test(packageNameOrUrl)) {
        return new URL(`./packages/${packageNameOrUrl}.js`, window.location.href).href;
    }

    // Keep supporting explicit URLs and relative paths for development.
    return packageNameOrUrl;
}

async function getVerifiedPackages() {
    const response = await fetch(packageManifestUrl, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Could not load package list (${response.status}).`);
    }

    const packages = await response.json();
    if (!Array.isArray(packages)) {
        throw new Error('Invalid packages/index.json format.');
    }
    return packages.filter((pkg) =>
        pkg && typeof pkg.name === 'string' && /^[a-z0-9][a-z0-9_-]*$/i.test(pkg.name)
    );
}

function showPackages(packages) {
    if (packages.length === 0) {
        logOutput('No verified packages found.');
        return;
    }

    packages.forEach((pkg) => {
        logOutput(`${pkg.name}${pkg.description ? ` — ${pkg.description}` : ''}`);
    });
}

async function processCommand(cmd) {
    const [rawCommand, ...args] = cmd.trim().split(/\s+/);
    const coreCommand = rawCommand.toLowerCase();

    if (coreCommand === 'import') {
        const packageNameOrUrl = args.join(' ');
        if (!packageNameOrUrl) {
            logOutput('Usage: import <package-name> | import -l | import -s <search>');
            return;
        }

        if (args[0] === '-l') {
            try {
                logOutput('Verified packages:');
                showPackages(await getVerifiedPackages());
            } catch (error) {
                logOutput(`Package list failed: ${error.message}`);
            }
            return;
        }

        if (args[0] === '-s') {
            const search = args.slice(1).join(' ').trim().toLowerCase();
            if (!search) {
                logOutput('Usage: import -s <package-name>');
                return;
            }
            try {
                const matches = (await getVerifiedPackages()).filter((pkg) =>
                    pkg.name.toLowerCase().includes(search)
                );
                showPackages(matches);
            } catch (error) {
                logOutput(`Package search failed: ${error.message}`);
            }
            return;
        }

        const url = resolveAppUrl(packageNameOrUrl);
        logOutput(`Installing app from ${url}...`);
        try {
            await installApp(url);
            logOutput('App installed. Type help to see its commands.');
        } catch (error) {
            logOutput(`Import failed: ${error.message}`);
        }
        return;
    }

    const command = commands.get(coreCommand);
    if (!command) {
        logOutput(`command not found: ${coreCommand}`);
        return;
    }

    try {
        await command.handler(args, { logOutput, registerCommand });
    } catch (error) {
        logOutput(`${coreCommand}: ${error.message}`);
    }
}

registerCommand('help', () => {
    logOutput('AfterOS');
    logOutput(' Shift+T to open a terminal');
    logOutput('');
    logOutput(`Available commands: ${[...commands.keys()].join(', ')}`);
}, 'Show available commands');

registerCommand('about', () => {
    logOutput('Terminal (terminal) v0.0.1-demo');
    logOutput('This is a terminal based on Javascript');
}, 'About AfterOS');

registerCommand('date', () => logOutput(new Date().toString()), 'Show the current date');

registerCommand('clear', () => { history.innerHTML = ''; }, 'Clear the terminal');

registerCommand('exit', () => {
    logOutput('Closing tab...');
    window.close();

    // Browsers block scripts from closing tabs the user opened themselves.
    window.setTimeout(() => {
        if (!window.closed) {
            logOutput('Your browser blocked this tab from closing. Use Ctrl+W (or Cmd+W on Mac).');
        }
    }, 250);
}, 'Close this browser tab');

registerCommand('style', () => openStyleDialog(), 'Customize the terminal appearance');
