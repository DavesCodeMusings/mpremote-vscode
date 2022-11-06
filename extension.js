const vscode = require('vscode')
const childProcess = require('child_process')
const path = require('path')

/**
 * Check for Python prerequisites and register commands.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Python and the esptool module must be installed for this to work.
	try {
		let pythonVersion = childProcess.execSync('py --version').toString().split('\r\n')[0].split(' ')[1]
		console.debug('Python version:', pythonVersion)
	}
	catch (ex) {
		vscode.window.showErrorMessage('Python is not installed or could not be run as py.exe', ex)
	}

	try {
		let mpremoteVersion = childProcess.execSync('py -m mpremote version').toString().split('\r\n')[0].split(' ')[1]
		console.debug('mpremote version:', mpremoteVersion)
	}
	catch (ex) {
		vscode.window.showErrorMessage('mpremote is not installed or could not be run as a Python module')
	}

	// All commands are run in the integrated terminal so output is visible.
	const term = vscode.window.createTerminal('mpremote')
	term.show(false)  // using false here lets the terminal take focus on startup

	/**
	 *  Return COM port of attached device. Prompt user to choose when multiple devices are found.
	 */
	async function getDevicePort() {
		return new Promise((resolve, reject) => {
			let port = ''
			let deviceList = childProcess.execSync('py -m mpremote devs').toString().split('\r\n')

			if (deviceList == null || deviceList.length == 0) {
				reject('')
			}

			if (deviceList[deviceList.length - 1] == '') {
				deviceList.pop()
			}
			console.debug('Attached devices:', deviceList)

			if (deviceList.length == 1) {
				port = deviceList[0].split(' ')[0]
				console.debug(`Only one device attached: ${port}`)
				resolve(port)
			}
			else {
				let options = {
					title: 'Device Selection',
					canSelectMany: false
				}
				vscode.window.showQuickPick(deviceList, options)
					.then(selection => {
						port = selection.split(' ')[0]
						console.debug(`User selection is: ${port}`)
						resolve(port)
					})
			}
		})
	}

	let devsCommand = vscode.commands.registerCommand('mpremote.devs', () => {
		term.sendText('py.exe -m mpremote devs')
	})

	context.subscriptions.push(devsCommand)

	let listFilesCommand = vscode.commands.registerCommand('mpremote.ls', async () => {
		let port = await getDevicePort()
		term.sendText(`py.exe -m mpremote connect ${port} fs ls`)
	})

	context.subscriptions.push(listFilesCommand)

	let uploadFileCommand = vscode.commands.registerCommand('mpremote.upload', async () => {
		let port = await getDevicePort()
		const options = {
			canSelectMany: false,
			title: 'Select File to Upload',
			filters: {
				'Python files': ['py'],
				'All files': ['*']
			}
		}
		vscode.window.showOpenDialog(options)
			.then(firmwareUri => {
				if (firmwareUri && firmwareUri[0]) {
					let localFile = firmwareUri[0].fsPath
					let remoteFile = ':' + path.basename(firmwareUri[0].fsPath)
					console.debug('Local file:', localFile)
					console.debug('Remote file:', remoteFile)
					term.sendText(`py.exe -m mpremote connect ${port} fs cp ${localFile} ${remoteFile}`)
				}
			})
	})

	context.subscriptions.push(uploadFileCommand)

	let replCommand = vscode.commands.registerCommand('mpremote.repl', async () => {
		let port = await getDevicePort()
		term.sendText(`py.exe -m mpremote connect ${port} repl`)
	})

	context.subscriptions.push(replCommand)

	let runEditorFileOnDevice = vscode.commands.registerCommand('mpremote.run', async () => {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.isDirty) {
				await vscode.window.activeTextEditor.document.save()
			}
			if (vscode.window.activeTextEditor.document.uri.fsPath) {
				let port = await getDevicePort()
				term.sendText(`py.exe -m mpremote connect ${port} run ${vscode.window.activeTextEditor.document.uri.fsPath}`)
			}
		}
		else {
			vscode.window.showErrorMessage('No active editor window. Nothing to run.')
		}
	})

	context.subscriptions.push(runEditorFileOnDevice)

	let mipInstallCommand = vscode.commands.registerCommand('mpremote.mipinstall', async () => {
		let port = await getDevicePort()
		let options = {
			title: "Package Name"
		}
		let pkg = await vscode.window.showInputBox(options)
		term.sendText(`py.exe -m mpremote connect ${port} mip install ${pkg}`)
	})

	context.subscriptions.push(mipInstallCommand)

	let disconnectCommand = vscode.commands.registerCommand('mpremote.disconnect', () => {
		term.sendText('py.exe -m mpremote disconnect')
	})

	context.subscriptions.push(disconnectCommand)
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
