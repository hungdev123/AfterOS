const input = document.getElementById('terminal-input');
const history = document.getElementById('history');
const terminal = document.getElementById('terminal');

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

const commands = new Map();

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
        commands: () => [...commands.keys()]
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

async function processCommand(cmd) {
    const [rawCommand, ...args] = cmd.trim().split(/\s+/);
    const coreCommand = rawCommand.toLowerCase();

    if (coreCommand === 'import') {
        const packageNameOrUrl = args.join(' ');
        if (!packageNameOrUrl) {
            logOutput('Usage: import <package-name> or import <javascript-url>');
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

registerCommand('exit', () => logOutput("'exit' does not support in this version."), 'Close the terminal');
