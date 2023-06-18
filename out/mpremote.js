"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MPRemote = void 0;
const vscode = require("vscode");
const childProcess = require("child_process");
class MPRemote {
    constructor() {
        this.pythonBinary = 'py.exe'; // Assume this is a Windows system for now.
        this.terminal = vscode.window.createTerminal('mpremote');
        this.terminal.show(false); // false here lets the mpremote terminal take focus on startup
        console.debug('Operating System:', process.platform);
        if (process.platform !== 'win32') { // win32 is returned for 64-bit OS as well
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
    cat(port, filepath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cat ${filepath}`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote exec ${filepath}`);
        }
    }
    download(port, remotePath, localPath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp :${remotePath} ${localPath}`);
        }
    }
    exec(port, codeString) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} exec '${codeString}'`);
        }
    }
    listDevs() {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote devs`);
    }
    ls(port, dir) {
        this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs ls ${dir}`);
    }
    mipInstall(port, pkg) {
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
    mkdir(port, dirpath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs mkdir ${dirpath}`);
        }
    }
    repl(port) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} repl`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote repl`);
        }
    }
    reset(port) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} reset`);
        }
    }
    rm(port, filepath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rm :${filepath}`);
        }
    }
    rmdir(port, dirpath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} fs rmdir :${dirpath}`);
        }
    }
    run(port, filepath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} run '${filepath}'`);
        }
    }
    setrtc(port) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} setrtc`);
        }
        else {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote setrtc`);
        }
    }
    sync(port, projectRoot) {
        console.debug("Sync it up, Kris! I'm about to.");
        this.terminal.sendText(`cd '${projectRoot}'`);
    }
    upload(port, localPath, remotePath) {
        if (port !== undefined) {
            this.terminal.sendText(`${this.pythonBinary} -m mpremote connect ${port} cp ${localPath} :${remotePath}`);
        }
    }
}
exports.MPRemote = MPRemote;
//# sourceMappingURL=mpremote.js.map