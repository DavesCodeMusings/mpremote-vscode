"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalRoot = exports.getLocalFilePath = exports.getDevicePort = exports.getRemoteDirEntries = exports.join = exports.getMPRemoteName = exports.SYNC_IGNORE = exports.STAT_MASK_ALL = exports.STAT_MASK_FILE = exports.STAT_MASK_DIR = void 0;
const vscode = require("vscode");
const path_1 = require("path");
const child_process_1 = require("child_process");
exports.STAT_MASK_DIR = 0x4000;
exports.STAT_MASK_FILE = 0x8000;
exports.STAT_MASK_ALL = 0xFFFF;
exports.SYNC_IGNORE = ['.git']; // prevent uploading source control dirs to flash
/**
 *  Use VS Code's knowledge of the underlying operating system to guess what
 *  name should be used to call the Python executable.
 */
function getMPRemoteName() {
    let mpremote = 'python3 -m mpremote';
    switch (process.platform) {
        case 'win32': // win32 is returned for 64-bit OS as well
            mpremote = 'py.exe -m mpremote';
            break;
        case 'linux':
        case 'darwin':
            mpremote = 'mpremote';
            break;
    }
    console.debug('Calling mpremote as:', mpremote);
    return mpremote;
}
exports.getMPRemoteName = getMPRemoteName;
/**
 * Join file path components using forward slash separator. Because the Windows
 * version of path.join() will try to use a backslash.
 */
function join(...args) {
    let path = '';
    for (let i = 0; i < args.length; i++) {
        if (path.endsWith('/') || args[i].startsWith('/')) {
            path += args[i];
        }
        else {
            path += '/' + args[i];
        }
    }
    return path;
}
exports.join = join;
/**
 * Return a JSON formatted list of entries in remote (device) directory. Can be
 * limited to just directories (STAT_MASK_DIR) or just files (STAT_MASK_FILES)
 */
async function getRemoteDirEntries(port, dir, mask = exports.STAT_MASK_ALL) {
    let mpremote = getMPRemoteName();
    let cwd = dir;
    console.debug('Gathering directory entries for', cwd, 'on device at', port);
    return new Promise((resolve, reject) => {
        let oneLiner = `from os import listdir, stat ; print([entry for entry in listdir('${cwd}') if stat('${cwd}' + '/' + entry)[0] & ${mask} != 0])`;
        let listDirCmd = `${mpremote} connect ${port} exec "${oneLiner}"`;
        console.debug(`Running ${listDirCmd}`);
        (0, child_process_1.exec)(listDirCmd, (err, output) => {
            if (err) {
                console.error(err);
            }
            else {
                console.debug('Files found:\n', output);
                try {
                    let dirEntries = JSON.parse(`${output.replace(/'/g, '"')}`); // Python uses single quote, JSON parser expects double quote.
                    resolve(dirEntries);
                }
                catch (ex) {
                    console.error('Parsing Python listdir() output failed.', ex);
                    reject('Parsing directory entries failed.');
                }
            }
        });
    });
}
exports.getRemoteDirEntries = getRemoteDirEntries;
/**
 * Determine the serial port used to communicate with the microcontroller. If
 * multiple ports are found, prompt the user to select one of them.
 */
async function getDevicePort(portList) {
    let options = {
        title: 'Select device',
        canSelectMany: false,
        matchOnDetail: true
    };
    return new Promise((resolve, reject) => {
        if (portList.length === 0) {
            console.debug('No device found on any port.');
            reject('No device detected.');
        }
        else if (portList.length === 1) {
            console.debug('Using device on port:', portList[0]);
            resolve(portList[0]);
        }
        else {
            vscode.window.showQuickPick(portList, options)
                .then(choice => {
                if (choice !== undefined) {
                    console.debug('Using device on port:', choice);
                    resolve(choice);
                }
                else {
                    reject(undefined);
                }
            });
        }
    });
}
exports.getDevicePort = getDevicePort;
/**
 *  Try to determine the local file path in one of two ways. First, by args
 *  passed if there was a right-click selection in the file explorer or an
 *  editor window. Second, by the properties of the active editor window if
 *  the command palette was used. Finally, return empty string if both of
 *  these methods fail.
 */
function getLocalFilePath(args) {
    let localPath = '';
    if (args !== undefined && args.fsPath !== undefined) { // user right-clicked upload on a file or editor window
        localPath = args.fsPath;
        console.debug('File path determined from context.', localPath);
    }
    else if (vscode.window.activeTextEditor) {
        localPath = vscode.window.activeTextEditor.document.fileName;
        console.debug('No context given. Defaulting to active editor window path.', localPath);
        if (vscode.window.activeTextEditor.document.isUntitled || vscode.window.activeTextEditor.document.isDirty) {
            vscode.window.showWarningMessage('Unsaved changes exist. Results may be inconsistent.');
        }
    }
    else {
        vscode.window.showErrorMessage('Cannot determine file path. Open file in active editor window first.');
    }
    return localPath;
}
exports.getLocalFilePath = getLocalFilePath;
/**
 *  Try to determine the project files root dirctory using the currently
 *  open folder in VS Code's Explorer. If there is no open folder, return
 *  an empty string.
 */
function getLocalRoot() {
    let localRoot = "";
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        localRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    if (vscode.workspace.getConfiguration('mpremote').srcSubdirectory) {
        console.debug("Appending srcSubdirectory:", vscode.workspace.getConfiguration('mpremote').srcSubdirectory);
        localRoot = (0, path_1.join)(localRoot, vscode.workspace.getConfiguration('mpremote').srcSubdirectory);
    }
    return localRoot;
}
exports.getLocalRoot = getLocalRoot;
//# sourceMappingURL=utility.js.map