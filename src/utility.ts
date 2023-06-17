import * as vscode from 'vscode';
import { exec } from 'child_process';

export const STAT_MASK_DIR = 0x4000;
export const STAT_MASK_FILE = 0x8000;
export const STAT_MASK_ALL = 0xFFFF;

export const SYNC_IGNORE = ['.git'];  // prevent uploading source control dirs to flash

/**
 * Join file path components using forward slash separator. Because path.join() on Windows will
 * try to use a backslash.
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
    let cwd = dir;
    console.debug('Gathering directory entries for', cwd, 'on device at', port);
    return new Promise((resolve, reject) => {
        let oneLiner = `from os import listdir, stat ; print([entry for entry in listdir('${cwd}') if stat('${cwd}' + '/' + entry)[0] & ${mask} != 0])`;

        // TODO: fix hard-coded py.exe
        let listDirCmd = `py.exe -m mpremote connect ${port} exec "${oneLiner}"`;
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
