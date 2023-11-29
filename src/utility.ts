import * as vscode from 'vscode';
import { join as pathJoin } from 'path';
import { exec } from 'child_process';

export const STAT_MASK_DIR = 0x4000;
export const STAT_MASK_FILE = 0x8000;
export const STAT_MASK_ALL = 0xFFFF;

export const SYNC_IGNORE = ['.git'];  // prevent uploading source control dirs to flash

/**
 *  Use VS Code's knowledge of the underlying operating system to guess what
 *  name should be used to call the Python executable.
 */
export function getPythonExecutableName() {
    let pythonBinary = 'py.exe';  // Assume this is a Windows system for now.
    if (process.platform !== 'win32') {  // win32 is returned for 64-bit OS as well
        pythonBinary = 'python3';
    }
    console.debug('Using Python executable:', pythonBinary);
    return pythonBinary;
}

/**
 * Join file path components using forward slash separator. Because the Windows
 * version of path.join() will try to use a backslash.
 */
export function join(...args: string[]) {
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

/**
 * Return a JSON formatted list of entries in remote (device) directory. Can be
 * limited to just directories (STAT_MASK_DIR) or just files (STAT_MASK_FILES)
 */
export async function getRemoteDirEntries(port: string, dir: string, mask = STAT_MASK_ALL): Promise<string[]> {
    let pythonBinary = getPythonExecutableName();
    let cwd = dir;
    console.debug('Gathering directory entries for', cwd, 'on device at', port);
    return new Promise((resolve, reject) => {
        let oneLiner = `from os import listdir, stat ; print([entry for entry in listdir('${cwd}') if stat('${cwd}' + '/' + entry)[0] & ${mask} != 0])`;
        let listDirCmd = `${pythonBinary} -m mpremote connect ${port} exec "${oneLiner}"`;
        console.debug(`Running ${listDirCmd}`);
        exec(listDirCmd, (err, output) => {
            if (err) {
                console.error(err);
            }
            else {
                console.debug('Files found:\n', output);
                try {
                    let dirEntries = JSON.parse(`${output.replace(/'/g, '"')}`);  // Python uses single quote, JSON parser expects double quote.
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

/**
 * Determine the serial port used to communicate with the microcontroller. If
 * multiple ports are found, prompt the user to select one of them.
 */
export async function getDevicePort(portList: string[]): Promise<string> {
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

/**
 *  Try to determine the local file path in one of two ways. First, by args
 *  passed if there was a right-click selection in the file explorer or an
 *  editor window. Second, by the properties of the active editor window if
 *  the command palette was used. Finally, return empty string if both of
 *  these methods fail.
 */
export function getLocalFilePath(args: any) {
    let localPath = '';
    if (args !== undefined && args.fsPath !== undefined) {  // user right-clicked upload on a file or editor window
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

/**
 *  Try to determine the project files root dirctory using the currently
 *  open folder in VS Code's Explorer. If there is no open folder, return
 *  an empty string.
 */
export function getProjectRoot() {
    let projectRoot: string = "";
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    if (vscode.workspace.getConfiguration('mpremote').srcSubdirectory) {
        console.debug("Appending srcSubdirectory:", vscode.workspace.getConfiguration('mpremote').srcSubdirectory);
        projectRoot = pathJoin(projectRoot, vscode.workspace.getConfiguration('mpremote').srcSubdirectory);
    }
    return projectRoot;
}
