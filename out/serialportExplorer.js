"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortListDataProvider = void 0;
const vscode = require("vscode");
const serialport_1 = require("serialport");
class TreeItem extends vscode.TreeItem {
}
class PortListDataProvider {
    constructor() {
        // Enable updates to tree view whenever items change (e.g. rescanning after plugging in a new microcontroller)
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.portList = [];
    }
    // Always call refresh() immediately after creating an instance of PortListDataProvider to populate the list of available ports.
    async refresh() {
        let comPortList = await serialport_1.SerialPort.list();
        let comPortSkipList = vscode.workspace.getConfiguration('mpremote').serialPort.skip.replace(/\s/g, '').split(',');
        console.debug('Detected serial ports:', comPortList);
        console.debug('Serial port skip list:', comPortSkipList);
        this.portList = [];
        for (let i = 0; i < comPortList.length; i++) {
            if (comPortSkipList.includes(comPortList[i].path)) {
                comPortList.splice(i, 1);
            }
        }
        comPortList.forEach(port => {
            this.portList.push(new TreeItem(port.path));
        });
        console.debug('Avaiable serial ports:', this.portList);
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return this.portList;
    }
    getPortNames() {
        let ports = [];
        this.portList.forEach(port => {
            ports.push(port.label);
        });
        return ports;
    }
}
exports.PortListDataProvider = PortListDataProvider;
//# sourceMappingURL=serialportExplorer.js.map