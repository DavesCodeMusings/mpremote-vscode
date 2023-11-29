"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MPRemote = void 0;
const vscode = require("vscode");
const childProcess = require("child_process");
const fs_1 = require("fs");
const utility_1 = require("./utility");
class MPRemote {
    constructor() {
        this.pythonBinary = (0, utility_1.getPythonExecutableName)();
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
            this.terminal.show(false); // false here lets the mpremote terminal take focus on startup
        }
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
    cat(port, filePath) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cat '${filePath}'`);
        }
    }
    download(port, remotePath, localPath) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp ':${remotePath}' '${localPath}'`);
        }
    }
    exec(port, codeString) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} exec '${codeString}'`);
        }
    }
    listDevs() {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote devs`);
    }
    ls(port, dir) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs ls '${dir}'`);
        }
    }
    mipInstall(port, pkg) {
        if (port && pkg) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} mip install ${pkg}`);
        }
    }
    mkdir(port, dirPath) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs mkdir '${dirPath}'`);
        }
    }
    repl(port) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} repl`);
        }
    }
    reset(port) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} reset`);
        }
    }
    rm(port, filePath) {
        if (port && filePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rm ':${filePath}'`);
        }
    }
    rmdir(port, dirPath) {
        if (port && dirPath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rmdir ':${dirPath}'`);
        }
    }
    run(port, filePath) {
        if (port && filePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} run '${filePath}'`);
        }
    }
    setrtc(port) {
        if (port) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} rtc --set`);
        }
    }
    sync(port, localRoot) {
        if (port && localRoot) {
            console.debug("Sync it up, Kris! I'm about to.");
            this.terminal.sendText(`cd '${localRoot}'`);
            (0, fs_1.readdir)(localRoot, { withFileTypes: true }, (err, entries) => {
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
                            if (utility_1.SYNC_IGNORE.includes(entry.name)) {
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
    upload(port, localPath, remotePath) {
        if (port && localPath && remotePath) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp '${localPath}' ':${remotePath}'`);
        }
    }
}
exports.MPRemote = MPRemote;
//# sourceMappingURL=mpremote.js.map