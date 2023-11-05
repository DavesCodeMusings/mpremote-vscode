import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { readdir } from 'fs';
import { getPythonExecutableName, SYNC_IGNORE } from './utility';

export class MPRemote {
    terminal;
    pythonBinary = getPythonExecutableName();

    constructor() {
        this.terminal = vscode.window.createTerminal('mpremote');
        this.terminal.show(false);  // false here lets the mpremote terminal take focus on startup

        if (vscode.workspace.getConfiguration('mpremote').startupCheck.skip === false) {
            // Python and the mpremote module must be installed for this to work.
            try {
                let pythonVersion = childProcess.execSync(`${this.pythonBinary} --version`).toString().split('\r\n')[0].split(' ')[1];
                console.debug('Python version:', pythonVersion);
            }
            catch (ex) {
                vscode.window.showErrorMessage(`Python is not installed or could not be run as ${this.pythonBinary}`);
            }

            try {
                let mpremoteVersion = childProcess.execSync(`${this.pythonBinary} -m mpremote version`).toString().split('\r\n')[0].split(' ')[1];
                console.debug('mpremote version:', mpremoteVersion);
            }
            catch (ex) {
                vscode.window.showErrorMessage('mpremote is not installed or could not be run as a Python module');
            }
        }
    }

    cat(port: string, filePath: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cat '${filePath}'`);
        }
    }

    download(port: string, remotePath: string, localPath: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp ':${remotePath}' '${localPath}'`);
        }
    }

    exec(port: string, codeString: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} exec '${codeString}'`);
        }
    }

    listDevs() {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote devs`);
    }

    ls(port: string, dir: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs ls '${dir}'`);
        }
    }

    mipInstall(port: string, pkg: string) {
        if (port && pkg) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} mip install ${pkg}`);
        }
    }

    mkdir(port: string, dirPath: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs mkdir '${dirPath}'`);
        }
    }

    repl(port: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} repl`);
        }
    }

    reset(port: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} reset`);
        }
    }

    rm(port: string, filePath: string) {
        if (port && filePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rm ':${filePath}'`);
        }
    }

    rmdir(port: string, dirPath: string) {
        if (port && dirPath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rmdir ':${dirPath}'`);
        }
    }

    run(port: string, filePath: string) {
        if (port && filePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} run '${filePath}'`);
        }
    }

    setrtc(port: string) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} rtc --set`);
        }
    }

    sync(port: string, projectRoot: string) {
        if (port && projectRoot) {
            console.debug("Sync it up, Kris! I'm about to.");
            this.terminal.sendText(`cd '${projectRoot}'`);
            readdir(projectRoot, { withFileTypes: true }, (err, entries) => {
                if (err) {
                    console.error(err);
                    vscode.window.showErrorMessage('Unable to read directory.');
                }
                else {
                    console.debug('Directory entries found:', entries.length);
                    this.terminal.sendText(`cd '${projectRoot}'`);
                    entries.forEach(entry => {
                        console.debug('Examining directory entry:', entry);
                        if (entry.isDirectory()) {
                            if (SYNC_IGNORE.includes(entry.name)) {
                                console.debug('Skipping directory:', entry.name);
                            }
                            else {
                                console.debug(`${this.pythonBinary} -m mpremote connect ${port} fs cp -r '${entry.name}' :`);
                                this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs cp -r '${entry.name}' :`);
                            }
                        }
                        else {
                            console.debug(`${this.pythonBinary} -m mpremote connect ${port} fs cp '${entry.name}' :`);
                            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs cp '${entry.name}' :`);
                        }
                    });
                }
            });
        }
    }

    upload(port: string, localPath: string, remotePath: string) {
        if (port && localPath && remotePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp '${localPath}' ':${remotePath}'`);
        }
    }
}
