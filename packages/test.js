// Install with: import test
export default function install({ registerCommand, logOutput }) {
    registerCommand('test', () => {
        logOutput('The test package is installed and working.');
    }, 'Verify package imports');
}
