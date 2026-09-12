const input = document.getElementById('terminal-input');
const history = document.getElementById('history');
const terminal = document.getElementById('terminal');

terminal.addEventListener('click', () => input.focus());

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const commandText = input.value.trim();
        if (commandText) {
            logCommand(commandText);
            processCommand(commandText);
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
    const parts = cmd.toLowerCase().split(' ');
    const coreCommand = parts[0];

    switch(coreCommand) {
        case 'help':
            logOutput('AfterOS');
            logOutput(' Shift+T to open a terminal')
            logOutput();
            logOutput('Available commands: help, clear, about, date');
            break;
        case 'about':
            logOutput('Terminal (terminal) v0.0.1-demo ');
            logOutput('This is a terminal based on Javascript');
            break;
        case 'date':
            logOutput(new Date().toString());
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