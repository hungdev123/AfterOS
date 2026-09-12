const input = document.getElementById('terminal-input');
const history = document.getElementById('history');
const terminal = document.getElementById('terminal');
const installedApps = new Set();
const loadingApps = new Set();
const customCommands = new Map();

window.AfterOS = {
    registerCommand(name, handler) {
        const commandName = String(name).trim().toLowerCase();
        if (!commandName || typeof handler !== 'function') {
            throw new Error('registerCommand requires a command name and function');
        }

        customCommands.set(commandName, handler);
    },
    print: logOutput
};

terminal.addEventListener('click', () => input.focus());

input.addEventListener('keydown', function (e) {
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

function processCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const coreCommand = parts[0].toLowerCase();

    if (customCommands.has(coreCommand)) {
        customCommands.get(coreCommand)(parts.slice(1), logOutput);
        return;
    }

    switch (coreCommand) {
        case 'help':
            logOutput('AfterOS');
            logOutput(' Shift+T to open a terminal')
            logOutput();
            logOutput('Available commands: help, clear, about, date, import');
            if (customCommands.size) {
                logOutput(`Installed commands: ${[...customCommands.keys()].join(', ')}`);
            }
            break;
        case 'about':
            logOutput('Terminal (terminal) v0.0.1-demo ');
            logOutput('This is a terminal based on Javascript');
            break;
        case 'date':
            logOutput(new Date().toString());
            break;
        case 'import':
            importApp(parts[1]);
            break;
        case 'clear':
            history.innerHTML = '';
            break;
        case 'exit':
            logOutput('\'exit\' does not support in this version.');
            break;
        default:
            logOutput(`command not found: ${coreCommand}`);
    }
}

async function importApp(link) {
    if (!link) {
        logOutput('Usage: import <link-to-javascript-file>');
        return;
    }

    let appUrl;
    try {
        appUrl = new URL(link, document.baseURI);
    } catch (error) {
        logOutput('import: invalid link');
        return;
    }

    if (!['http:', 'https:', 'file:'].includes(appUrl.protocol)) {
        logOutput('import: only http, https, or file links are supported');
        return;
    }

    if (installedApps.has(appUrl.href)) {
        logOutput(`app already imported: ${appUrl.href}`);
        return;
    }

    if (loadingApps.has(appUrl.href)) {
        logOutput(`app is already importing: ${appUrl.href}`);
        return;
    }

    loadingApps.add(appUrl.href);
    logOutput(`importing app: ${appUrl.href}`);

    try {
        const response = await fetch(appUrl.href);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const source = await response.text();
        const blobUrl = URL.createObjectURL(new Blob([source], {
            type: 'application/javascript'
        }));
        const app = document.createElement('script');
        app.src = blobUrl;
        app.async = true;
        app.onload = () => {
            URL.revokeObjectURL(blobUrl);
            loadingApps.delete(appUrl.href);
            installedApps.add(appUrl.href);
            logOutput(`app imported: ${appUrl.href}`);
            terminal.scrollTop = terminal.scrollHeight;
        };
        app.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            loadingApps.delete(appUrl.href);
            logOutput(`import failed: ${appUrl.href}`);
            terminal.scrollTop = terminal.scrollHeight;
        };
        document.head.appendChild(app);
    } catch (error) {
        loadingApps.delete(appUrl.href);
        logOutput(`import failed: ${appUrl.href}`);
        terminal.scrollTop = terminal.scrollHeight;
    }
}
