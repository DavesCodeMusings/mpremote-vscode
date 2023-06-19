"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const serialportExplorer_1 = require("./serialportExplorer");
const mpremote_1 = require("./mpremote");
const utility_1 = require("./utility");
const path_1 = require("path");
// Track the remote device's working directory for devices. Used by commands like cp, ls, and rm.
let remoteWorkingDir = new Map();
remoteWorkingDir.set('default', '/');
async function activate(context) {
    let mpremote = new mpremote_1.MPRemote();
    let serialPortDataProvider = new serialportExplorer_1.PortListDataProvider();
    await serialPortDataProvider.refresh();
    vscode.window.registerTreeDataProvider('serialPortView', serialPortDataProvider);
    /*
     *  Gather file names from the current remote working directory, present the choices
     *  via a selection list. Display the contents of the chosen file in the terminal
     *  window using MPRemote's cat command.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.cat', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) { // picked from command palette instead of context menu
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label; // context menu selections send the source of the right-click as a function argument
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        (0, utility_1.getRemoteDirEntries)(port, cwd, utility_1.STAT_MASK_FILE)
            .then((dirEntries) => {
            let options = {
                title: `Choose a file to display from ${port}:${cwd}`,
                canSelectMany: false,
                matchOnDetail: true
            };
            vscode.window.showQuickPick(dirEntries, options)
                .then(filename => {
                console.debug('User selection:', filename);
                if (filename !== undefined) { // undefined when user aborts or selection times out
                    let filepath = (0, utility_1.join)(cwd, filename);
                    mpremote.cat(port, filepath);
                }
            });
        })
            .catch((err) => {
            vscode.window.showErrorMessage(err);
        });
    }));
    /*
     *  Change the remote parent path used for file operations like cp, ls, rm, etc.
     *  The parent path is stored per serial port in case there are multiple devices.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.chdir', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) { // picked from command palette instead of context menu
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label; // context menu selections send the source of the right-click as a function argument
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        console.debug('cwd:', cwd);
        (0, utility_1.getRemoteDirEntries)(port, cwd, utility_1.STAT_MASK_DIR)
            .then((subdirs) => {
            if (cwd !== '/') {
                subdirs.unshift('..');
            }
            let options = {
                title: `Choose the working directory for ${port}:${cwd}`,
                canSelectMany: false,
                matchOnDetail: true
            };
            vscode.window.showQuickPick(subdirs, options)
                .then(choice => {
                console.debug('User selection:', choice);
                if (choice !== undefined) { // undefined when user aborts or selection times out
                    if (choice === '..') {
                        remoteWorkingDir.set(port, cwd.substring(0, cwd.lastIndexOf('/')));
                    }
                    else {
                        remoteWorkingDir.set(port, (0, utility_1.join)(cwd, choice));
                    }
                    console.debug('New remote working directory:', remoteWorkingDir.get(port));
                    mpremote.ls(port, remoteWorkingDir.get(port));
                }
            });
        })
            .catch((err) => {
            vscode.window.showErrorMessage(err);
        });
    }));
    /*
     *  Trigger a refresh of serial port list that appears in the explorer view.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.refreshSerialPorts', async () => {
        await serialPortDataProvider.refresh();
    }));
    /*
     *  Run 'mpremote devs' to show detail about what's attached to the serial ports.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.devs', () => {
        mpremote.listDevs();
    }));
    /*
     * Download a file from the microcontroller using 'mpremote cp'.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.download', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        (0, utility_1.getRemoteDirEntries)(port, cwd, utility_1.STAT_MASK_FILE)
            .then((dirEntries) => {
            const options = {
                title: `Choose file to download from ${port}:${cwd}`,
                canSelectMany: false,
                matchOnDetail: true
            };
            vscode.window.showQuickPick(dirEntries, options)
                .then(choice => {
                console.debug('User selection:', choice);
                if (choice !== undefined) {
                    const options = {
                        title: 'Choose local destination',
                        canSelectMany: false,
                        openLabel: 'Select Folder',
                        canSelectFiles: false,
                        canSelectFolders: true
                    };
                    vscode.window.showOpenDialog(options)
                        .then(fileUri => {
                        if (fileUri && fileUri[0]) {
                            let localDir = fileUri[0].fsPath;
                            let localPath = (0, path_1.join)(localDir, choice);
                            let remotePath = (0, utility_1.join)(cwd, choice);
                            mpremote.download(port, remotePath, localPath);
                        }
                    });
                }
            });
        })
            .catch((err) => {
            vscode.window.showErrorMessage(err);
        });
    }));
    /*
     *  Run 'mpremote exec to run a python statement on the device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.exec', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let options = {
            title: `Python code to run on ${port}`
        };
        vscode.window.showInputBox(options)
            .then((codeString) => {
            if (codeString) {
                mpremote.exec(port, codeString);
            }
        });
    }));
    /*
     *  Run 'mpremote ls' for the device detected from the right-click of the serial port list.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.ls', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let dir = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        mpremote.ls(port, dir);
    }));
    /*
     * Prompt for a package name and run 'mpremote mip install' to install it.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.mipInstall', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let options = {
            title: "Enter a package name"
        };
        vscode.window.showInputBox(options)
            .then((pkg) => {
            if (!pkg) {
                vscode.window.showErrorMessage('You must specify a package name. See: https://docs.micropython.org/en/latest/reference/packages.html#installing-packages-with-mpremote');
            }
            else {
                mpremote.mipInstall(port, pkg);
            }
        });
    }));
    /*
     *  Create a new directory under the current working directory on the device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.mkdir', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        let options = {
            title: `Directory to create under ${port}:${cwd}`
        };
        vscode.window.showInputBox(options)
            .then((newdir) => {
            if (newdir) {
                let dirpath = (0, utility_1.join)(cwd, newdir);
                mpremote.mkdir(port, dirpath);
            }
        });
    }));
    /*
     *  Start a REPL prompt in the terminal window for the requested device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.repl', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        mpremote.repl(port);
    }));
    /*
     * Reset the device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.reset', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        mpremote.reset(port);
    }));
    /*
     * Prompt for a file to remove with respect to the device's current working dir.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.rm', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        (0, utility_1.getRemoteDirEntries)(port, cwd, utility_1.STAT_MASK_FILE)
            .then((subdirs) => {
            let options = {
                title: `Choose file to remove from ${port}:${cwd}`,
                canSelectMany: false,
                matchOnDetail: true
            };
            vscode.window.showQuickPick(subdirs, options)
                .then(choice => {
                if (choice !== undefined) { // undefined when user aborts or selection times out
                    let doomedFile = (0, utility_1.join)(cwd, choice);
                    mpremote.rm(port, doomedFile);
                }
            });
        });
    }));
    /*
     * Prompt for a directory to remove with respect to the device's current working dir.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.rmdir', async (args) => {
        let port = '';
        if (args === undefined || args.label === undefined) {
            port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
        }
        else {
            port = args.label;
        }
        let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
        (0, utility_1.getRemoteDirEntries)(port, cwd, utility_1.STAT_MASK_DIR)
            .then((subdirs) => {
            let options = {
                title: `Choose directory to remove from ${port}:${cwd}`,
                canSelectMany: false,
                matchOnDetail: true
            };
            vscode.window.showQuickPick(subdirs, options)
                .then(choice => {
                if (choice !== undefined) { // undefined when user aborts or selection times out
                    let doomedDirectory = (0, utility_1.join)(cwd, choice);
                    mpremote.rmdir(port, doomedDirectory);
                }
            });
        });
    }));
    /*
     *  Run a file from the local filesystem on the remote device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.run', async (args) => {
        if (args === undefined || args.fsPath === undefined) {
            vscode.window.showErrorMessage('Nothing to run.');
        }
        else {
            if (vscode.window.activeTextEditor && (vscode.window.activeTextEditor.document.isUntitled || vscode.window.activeTextEditor.document.isDirty)) {
                vscode.window.showWarningMessage('Unsaved changes exist. Results may not be inconsistent.');
            }
            let port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
            mpremote.run(port, args.fsPath);
        }
    }));
    /*
     *  Set the time and date on the device's realtime clock to match the host system.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.setrtc', (args) => {
        if (args !== undefined && args.label !== undefined) {
            let port = args.label;
            mpremote.setrtc(port);
        }
    }));
    /*
     *  Recursively upload all files from the local project directory to the flash filesystem on the device.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.sync', async (args) => {
        if (args === undefined || args.label === undefined) {
            vscode.window.showWarningMessage('Cowardly refusing to overwrite files on autodetected microcontroller.');
        }
        else {
            let port = args.label;
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length !== 1) {
                vscode.window.showErrorMessage('Unable to sync. Open the project folder in the Explorer first.');
            }
            else {
                let projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                vscode.window.showInformationMessage(`Overwrite all files on ${port}:/ with local copies from ${projectRoot}?`, "OK", "Cancel")
                    .then(confirmation => {
                    if (confirmation === "OK") {
                        mpremote.sync(port, projectRoot);
                    }
                });
            }
        }
    }));
    /*
     *  Upload a local file into the microcontroller's current working dir.
     */
    context.subscriptions.push(vscode.commands.registerCommand('mpremote.upload', async (args) => {
        if (args === undefined || args.fsPath === undefined) {
            vscode.window.showErrorMessage('Nothing to upload.');
        }
        else {
            if (vscode.window.activeTextEditor && (vscode.window.activeTextEditor.document.isUntitled || vscode.window.activeTextEditor.document.isDirty)) {
                vscode.window.showWarningMessage('Unsaved changes exist. Results may not be inconsistent.');
            }
            let port = await (0, utility_1.getDevicePort)(serialPortDataProvider.getPortNames());
            let localPath = args.fsPath;
            console.debug('Local file:', localPath);
            let cwd = remoteWorkingDir.get(port) || remoteWorkingDir.get('default');
            if (cwd.endsWith('/') === false) {
                cwd += '/';
            }
            let remotePath = cwd + (0, path_1.basename)(localPath);
            console.debug('Remote file:', remotePath);
            mpremote.upload(port, localPath, remotePath);
        }
    }));
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map