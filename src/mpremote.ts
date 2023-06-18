import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { readdir } from 'fs';
import { SYNC_IGNORE } from './utility';

export class MPRemote {
    terminal;
    pythonBinary = 'py.exe';  // Assume this is a Windows system for now.

    constructor() {
        this.terminal = vscode.window.createTerminal('mpremote');
        this.terminal.show(false);  // false here lets the mpremote terminal take focus on startup

        console.debug('Operating System:', process.platform);
        if (process.platform !== 'win32') {  // win32 is returned for 64-bit OS as well
            this.pythonBinary = 'python';
        }

        // Python and the mpremote module must be installed for this to work.
        console.debug('Using Python executable:', this.pythonBinary);
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

    cat(port: string | undefined, filepath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cat ${filepath}`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote exec ${filepath}`);
        }
    }

    download(port: string, remotePath: string, localPath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp :${remotePath} ${localPath}`);
        }
    }

    exec(port: string, codeString: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} exec '${codeString}'`);
        }
    }

    listDevs() {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote devs`);
    }

    ls(port: string, dir: string) {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs ls ${dir}`);
    }

    mipInstall(port: string | undefined, pkg: string) {
        if (port !== undefined) {
            if (pkg) {
                this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} mip install ${pkg}`);
            }
        }
        else {
            if (pkg) {
                this.terminal.sendText(`${this.pythonBinary} -m mpremote mip install ${pkg}`);
            }
        }
    }

    mkdir(port: string | undefined, dirpath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs mkdir ${dirpath}`);
        }
    }

    repl(port: string | undefined) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} repl`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote repl`);
        }
    }

    reset(port: string | undefined) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} reset`);
        }
    }

    rm(port: string, filepath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rm :${filepath}`);
        }
    }

    rmdir(port: string, dirpath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rmdir :${dirpath}`);
        }
    }

    run(port: string, filepath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} run '${filepath}'`);
        }
    }

    setrtc(port: string | undefined) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} setrtc`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote setrtc`);
        }
    }

    sync(port: string, projectRoot: string) {
        if (port !== undefined) {
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
                                console.debug(`${this.pythonBinary} -m mpremote connect ${port} fs cp -r ${entry.name} :`);
                                this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs cp -r ${entry.name} :`);
                            }
                        }
                        else {
                            console.debug(`${this.pythonBinary} -m mpremote connect ${port} fs cp ${entry.name} :`);
                            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs cp ${entry.name} :`);
                        }
                    });
                }
            });
        }
    }

    upload(port: string, localPath: string, remotePath: string) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp ${localPath} :${remotePath}`);
        }
    }
}
