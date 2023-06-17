"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevicePort = exports.getRemoteDirEntries = exports.join = exports.SYNC_IGNORE = exports.STAT_MASK_ALL = exports.STAT_MASK_FILE = exports.STAT_MASK_DIR = void 0;
const vscode = require("vscode");
const child_process_1 = require("child_process");
exports.STAT_MASK_DIR = 0x4000;
exports.STAT_MASK_FILE = 0x8000;
exports.STAT_MASK_ALL = 0xFFFF;
exports.SYNC_IGNORE = ['.git']; // prevent uploading source control dirs to flash
/**
 * Join file path components using forward slash separator. Because path.join() on Windows will
 * try to use a backslash.
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
    let cwd = dir;
    console.debug('Gathering directory entries for', cwd, 'on device at', port);
    return new Promise((resolve, reject) => {
        let oneLiner = `from os import listdir, stat ; print([entry for entry in listdir('${cwd}') if stat('${cwd}' + '/' + entry)[0] & ${mask} != 0])`;
        // TODO: fix hard-coded py.exe
        let listDirCmd = `py.exe -m mpremote connect ${port} exec "${oneLiner}"`;
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
//# sourceMappingURL=utility.js.map