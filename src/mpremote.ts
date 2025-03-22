import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { readdir } from 'fs';
import { getMPRemoteName, SYNC_IGNORE } from './utility';

export class MPRemote {
    terminal;
    mpremote = getMPRemoteName();

    constructor() {
        // Avoid creating multiple mpremote terminals when session restored.
        let existingTerminal = vscode.window.terminals.find(obj => {
            return obj.name === 'mpremote';
        });
        if (existingTerminal) {
            console.debug('Reusing existing mpremote terminal.');
            this.terminal = existingTerminal;
        }
        else {
            console.debug('Creating new mpremote terminal.');
            this.terminal = vscode.window.createTerminal('mpremote');
            this.terminal.show(false);  // false here lets the mpremote terminal take focus on startup
        }

        if (vscode.workspace.getConfiguration('mpremote').startupCheck.skip === false) {
            // Python and the mpremote module must be installed for this to work.
            try {
                let mpremoteVersion = childProcess.execSync(`${this.mpremote} version`).toString().split('\r\n')[0].split(' ')[1];
                console.debug('mpremote version:', mpremoteVersion);
            }
            catch (ex) {
                vscode.window.showErrorMessage('mpremote is not installed or could not be run as a Python module');
            }
        }
    }

    cat(port: string, filePath: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} cat '${filePath}'`);
        }
    }

    df(port: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} df`);
        }
    }

    download(port: string, remotePath: string, localPath: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} cp ':${remotePath}' '${localPath}'`);
        }
    }

    exec(port: string, codeString: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} exec '${codeString}'`);
        }
    }

    listDevs() {
        this.terminal.sendText(`${this.mpremote} devs`);
    }

    ls(port: string, dir: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} fs ls '${dir}'`);
        }
    }

    mipInstall(port: string, pkg: string) {
        if (port && pkg) {
            this.terminal.sendText(`${this.mpremote} connect ${port} mip install ${pkg}`);
        }
    }

    mkdir(port: string, dirPath: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} fs mkdir '${dirPath}'`);
        }
    }

    repl(port: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} repl`);
        }
    }

    reset(port: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} reset`);
        }
    }

    rm(port: string, filePath: string) {
        if (port && filePath) {
            this.terminal.sendText(`${this.mpremote} connect ${port} fs rm ':${filePath}'`);
        }
    }

    rmdir(port: string, dirPath: string) {
        if (port && dirPath) {
            this.terminal.sendText(`${this.mpremote} connect ${port} fs rmdir ':${dirPath}'`);
        }
    }

    run(port: string, filePath: string) {
        if (port && filePath) {
            this.terminal.sendText(`${this.mpremote} connect ${port} run '${filePath}'`);
        }
    }

    setrtc(port: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} rtc --set`);
        }
    }

    sync(port: string, localRoot: string) {
        if (port && localRoot) {
            console.debug("Sync it up, Kris! I'm about to.");
            this.terminal.sendText(`cd '${localRoot}'`);
            readdir(localRoot, { withFileTypes: true }, (err, entries) => {
                if (err) {
                    console.error(err);
                    vscode.window.showErrorMessage('Unable to read directory.');
                }
                else {
                    console.debug('Directory entries found:', entries.length);
                    this.terminal.sendText(`cd '${localRoot}'`);
                    entries.forEach(entry => {
                        console.debug('Examining directory entry:', entry);
                        if (entry.isDirectory()) {
                            if (SYNC_IGNORE.includes(entry.name)) {
                                console.debug('Skipping directory:', entry.name);
                            }
                            else {
                                console.debug(`${this.mpremote} connect ${port} fs cp -r '${entry.name}' :`);
                                this.terminal.sendText(`${this.mpremote} connect ${port} fs cp -r '${entry.name}' :`);
                            }
                        }
                        else {
                            console.debug(`${this.mpremote} connect ${port} fs cp '${entry.name}' :`);
                            this.terminal.sendText(`${this.mpremote} connect ${port} fs cp '${entry.name}' :`);                        }
                    });
                }
            });
        }
    }

    upload(port: string, localPath: string, remotePath: string) {
        if (port && localPath && remotePath) {
            this.terminal.sendText(`${this.mpremote} connect ${port} cp '${localPath}' ':${remotePath}'`);
        }
    }

    version(port: string) {
        if (port) {
            this.terminal.sendText(`${this.mpremote} connect ${port} exec 'from sys import version; print(version)'`);
        }
    }
}
