const vscode = require('vscode')
const serialport = require('serialport')
const childProcess = require('child_process')
const path = require('path')

/**
 * Check for Python prerequisites and register commands.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Assume this is a Windows system, but adjust if not.
	let PYTHON_BIN = 'py.exe'
	console.debug('Operating System:', process.platform)
	if (process.platform != 'win32') {  // win32 is returned for 64-bit OS as well
		PYTHON_BIN = 'python'
	}
	console.debug('Using Python executable:', PYTHON_BIN)
		
	// Python and the mpremote module must be installed for this to work.
	try {
		let pythonVersion = childProcess.execSync(`${PYTHON_BIN} --version`).toString().split('\r\n')[0].split(' ')[1]
		console.debug('Python version:', pythonVersion)
	}
	catch (ex) {
		vscode.window.showErrorMessage(`Python is not installed or could not be run as ${PYTHON_BIN}`, ex)
	}

	try {
		let mpremoteVersion = childProcess.execSync(`${PYTHON_BIN} -m mpremote version`).toString().split('\r\n')[0].split(' ')[1]
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
		let comPortList = await serialport.SerialPort.list()

		return new Promise((resolve, reject) => {
			if (comPortList == null || comPortList.length == 0) {
				resolve('auto')  // detection failed but maybe esptool can still figure it out
			}
			else if (comPortList.length == 1) {
				resolve(comPortList[0].path)
			}
			else {
  			let portSelectionList = comPortList.map(port => {
					return {
            label: port.path,
						detail: port.friendlyName
					}
			  })
				console.debug('Attached devices:', comPortList)
				let options = {
					title: 'Device Selection',
					canSelectMany: false,
					matchOnDetail: true
				}
				vscode.window.showQuickPick(portSelectionList, options)
				.then(choice => {
  				resolve(choice.label)
			  })
			}	
		})
	}

	let devsCommand = vscode.commands.registerCommand('mpremote.devs', () => {
		term.sendText(`${PYTHON_BIN} -m mpremote devs`)
	})

	context.subscriptions.push(devsCommand)

	let listFilesCommand = vscode.commands.registerCommand('mpremote.ls', async () => {
		let port = await getDevicePort()
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs ls`)
	})

	context.subscriptions.push(listFilesCommand)

	let removeFilesCommand = vscode.commands.registerCommand('mpremote.rm', async () => {
		let port = await getDevicePort()
		let files = []
		console.debug('Scanning for files for device on', port)
		let listDirCmd = `${PYTHON_BIN} -m mpremote connect ${port} exec "from os import listdir ; print(listdir())"`
		console.debug(`Running ${listDirCmd}`)
		childProcess.exec(listDirCmd, (err, output) => {
			if (err) {
				console.error(err)
			}
			else {
        console.debug('Files found:\n', output)
				try {
   				files = JSON.parse(`${output.replace(/'/g, '"')}`)  // Python uses single quote, JSON parser expects double quote.
				}
				catch (ex) {
					console.error('Parsing filenames failed', ex)
				}
				console.debug('Parsed:', files)
				let options = {
					title: `Choose file to remove from device at ${port}`,
					canSelectMany: false,
					matchOnDetail: true
				}
				vscode.window.showQuickPick(files, options)
				.then(choice => {
  				console.debug(choice)
					vscode.window.showInformationMessage(`Delete ${choice}?`, "OK", "Cancel")
          .then(confirmation => {
            if (confirmation === "OK") {
							term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs rm ${choice}`)
            }
          })
				})
			}
		})
	})

	context.subscriptions.push(removeFilesCommand)

	let uploadFileCommand = vscode.commands.registerCommand('mpremote.upload', async () => {
		if (!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage('No active editor window. Nothing to upload.')
		}
		else {
			if (vscode.window.activeTextEditor.document.isUntitled || vscode.window.activeTextEditor.document.isDirty) {
				vscode.window.showErrorMessage('You must save changes locally before uploading.')
			}
			else {
				let port = await getDevicePort()
				let localFile = vscode.window.activeTextEditor.document.uri.fsPath
				let remoteFile = path.basename(localFile) 
				console.debug('Local file:', localFile)
				console.debug('Remote file:', remoteFile)
				term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cp '${localFile}' ':${remoteFile}'`)
			}
		}
	})

	context.subscriptions.push(uploadFileCommand)

	let replCommand = vscode.commands.registerCommand('mpremote.repl', async () => {
		let port = await getDevicePort()
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} repl`)
	})

	context.subscriptions.push(replCommand)

	let runEditorFileOnDevice = vscode.commands.registerCommand('mpremote.run', async () => {
		if (!vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage('No active editor window. Nothing to run.')
		}
		else {
			if (vscode.window.activeTextEditor.document.isUntitled || vscode.window.activeTextEditor.document.isDirty) {
				vscode.window.showErrorMessage('You must save changes locally before running.')
			}
			else {
				let port = await getDevicePort()
				term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} run '${vscode.window.activeTextEditor.document.uri.fsPath}'`)
			}
		}
	})

	context.subscriptions.push(runEditorFileOnDevice)

	let mipInstallCommand = vscode.commands.registerCommand('mpremote.mipinstall', async () => {
		let port = await getDevicePort()
		let options = {
			title: "Package Name"
		}
		let pkg = await vscode.window.showInputBox(options)
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} mip install ${pkg}`)
	})

	context.subscriptions.push(mipInstallCommand)

	let disconnectCommand = vscode.commands.registerCommand('mpremote.disconnect', () => {
		term.sendText(`${PYTHON_BIN} -m mpremote disconnect`)
	})

	context.subscriptions.push(disconnectCommand)
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
