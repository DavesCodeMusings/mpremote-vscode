import * as vscode from 'vscode';
import { SerialPort } from 'serialport';

class TreeItem extends vscode.TreeItem {
  children: TreeItem[] | undefined;
}

export class PortListDataProvider implements vscode.TreeDataProvider<TreeItem> {
    portList: TreeItem[];

    constructor() {
        this.portList = [];
    }

    // Enable updates to tree view whenever items change (e.g. rescanning after plugging in a new microcontroller)
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    // Always call refresh() immediately after creating an instance of PortListDataProvider to populate the list of available ports.
    async refresh() {
        let comPortList = await SerialPort.list();
        let comPortSkipList = vscode.workspace.getConfiguration('mpremote').serialPort.skip.replace(/\s/g, '').split(',');
        console.debug('Detected serial ports:', comPortList);
        console.debug('Serial port skip list:', comPortSkipList);

        this.portList = [];
        for (let i=0; i<comPortList.length; i++) {
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

    getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(): vscode.ProviderResult<TreeItem[]> {
        return this.portList;
    }

    getPortNames(): string[] {
        let ports: string[] = [];
        this.portList.forEach(port => {
            ports.push(port.label as string);
        });
        return ports;
    }
}
