const vscode = require('vscode')
const serialport = require('serialport')
const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')
const url = require('url')

const STAT_MASK_DIR = 0x4000
const STAT_MASK_FILE = 0x8000
const STAT_MASK_ALL = 0xFFFF

const SYNC_IGNORE = ['.git']  // prevent uploading source control dirs to flash

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

	// Track the remote device's working directory for devices. Used by commands like cp, ls, and rm.
  let remoteWorkingDir = {}
	remoteWorkingDir['default'] = '/'

	/* Utility functions */

	/**
	 * Join file path components using forward slash separator. Because path.join() on Windows will
	 * try to use a backslash.
	 */
  function join() {
		let path = ''
		for (let i=0; i<arguments.length; i++) {
			if (path.endsWith('/') || arguments[i].startsWith('/')) {
        path += arguments[i]        
			}
			else {
				path += '/' + arguments[i]
			}
		}
		return path
	}

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
					title: 'Choose a device',
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

	/**
	 * Return a JSON formatted list of entries in remote (device) directory. Can be
	 * limited to just directories (STAT_MASK_DIR) or just files (STAT_MASK_FILES)
	 */
	async function getRemoteDirEntries(port, dir, mask=STAT_MASK_ALL) {
		let cwd = dir || remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('Gathering directory entries for', cwd, 'on device at', port)
		return new Promise((resolve, reject) => {
			let oneLiner = `from os import listdir, stat ; print([entry for entry in listdir('${cwd}') if stat('${cwd}' + '/' + entry)[0] & ${mask} != 0])`
			let listDirCmd = `${PYTHON_BIN} -m mpremote connect ${port} exec "${oneLiner}"`
			console.debug(`Running ${listDirCmd}`)
			childProcess.exec(listDirCmd, (err, output) => {
				if (err) {
					console.error(err)
				}
				else {
					console.debug('Files found:\n', output)
					try {
						let dirEntries = JSON.parse(`${output.replace(/'/g, '"')}`)  // Python uses single quote, JSON parser expects double quote.
						resolve(dirEntries)
					}
					catch (ex) {
						console.error('Parsing Python listdir() output failed.', ex)
						reject('Parsing directory entries failed.')
					}
				}
			})
		})
  }

  /* Command Palette definitions follow... */

	/*
	 *  Gather file names from the current remote working directory, present the choices
	 *  via a selection list. Display the contents of the chosen file in the terminal
	 *  window using MPRemote's cat command.
	 */
	let catFileCommand = vscode.commands.registerCommand('mpremote.cat', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('cwd:', cwd)
		let dirEntries = await getRemoteDirEntries(port, cwd, STAT_MASK_FILE)
		let options = {
			title: `Choose a file to display from ${port}:${cwd}`,
			canSelectMany: false,
			matchOnDetail: true
		}
		vscode.window.showQuickPick(dirEntries, options)
		.then(filename => {
			console.debug('User selection:', filename)
			if (filename !== undefined) {  // undefined when user aborts or selection times out
				let filepath = join(cwd, filename)
				term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cat ${filepath}`)
			}
		})
	})

	context.subscriptions.push(catFileCommand)

	/*
	 *  Change the remote parent path used for file operations like cp, ls, rm, etc.
	 *  The parent path is stored per serial port in case there are multiple devices.
	 */
  let chdirCommand = vscode.commands.registerCommand('mpremote.chdir', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('cwd:', cwd)
		let subdirs = await getRemoteDirEntries(port, cwd, STAT_MASK_DIR)
		if (cwd != '/') {
  		subdirs.unshift('..')
		}
		let options = {
			title: `Choose the working directory for ${port}:${cwd}`,
			canSelectMany: false,
			matchOnDetail: true
		}
		vscode.window.showQuickPick(subdirs, options)
		.then(choice => {
			console.debug('User selection:', choice)
			if (choice !== undefined) {  // undefined when user aborts or selection times out
				if (choice == '..') {
					remoteWorkingDir[port] = cwd.substring(0, cwd.lastIndexOf('/'))
				}
				else {
				  remoteWorkingDir[port] = join(cwd, choice)
				}
				console.debug('New remote working directory:', remoteWorkingDir[port])
				term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs ls ${remoteWorkingDir[port]}`)
			}
		})
	})

	context.subscriptions.push(chdirCommand)

	/*
	 *  Tell MPRemote to scan the available serial ports and identify the devices attached.
	 */
	let devsCommand = vscode.commands.registerCommand('mpremote.devs', () => {
		term.sendText(`${PYTHON_BIN} -m mpremote devs`)
	})

	context.subscriptions.push(devsCommand)

	let listFilesCommand = vscode.commands.registerCommand('mpremote.ls', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs ls ${cwd}`)
	})

	context.subscriptions.push(listFilesCommand)


	/*
	 *  Gather directory names from the current remote working directory, present the choices via
	 *  a selection list and delete the chosen file via MPRemote's rmdir command after confirmation.
	 */
	let removeDirCommand = vscode.commands.registerCommand('mpremote.rmdir', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('cwd:', cwd)
		let dirEntries = await getRemoteDirEntries(port, cwd, STAT_MASK_DIR)
		let options = {
			title: `Choose directory to remove from ${port}:${cwd}`,
			canSelectMany: false,
			matchOnDetail: true
		}
		vscode.window.showQuickPick(dirEntries, options)
		.then(dirname => {
			console.debug('User selection:', dirname)
			if (dirname !== undefined) {  // undefined when user aborts or selection times out
				let dirpath = join(cwd, dirname)
				vscode.window.showInformationMessage(`Delete ${dirpath}?`, "OK", "Cancel")
				.then(confirmation => {
					if (confirmation === "OK") {
						term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs rm ${dirpath}`)
					}
				})
			}
		})
	})

	context.subscriptions.push(removeDirCommand)

	/*
	 *  Gather file names from the current remote working directory, present the choices via
	 *  a selection list and delete the chosen file via MPRemote's rm command after confirmation.
	 */
	let removeFilesCommand = vscode.commands.registerCommand('mpremote.rm', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('cwd:', cwd)
		let dirEntries = await getRemoteDirEntries(port, cwd, STAT_MASK_FILE)
		let options = {
			title: `Choose file to remove from ${port}:${cwd}`,
			canSelectMany: false,
			matchOnDetail: true
		}
		vscode.window.showQuickPick(dirEntries, options)
		.then(filename => {
			console.debug('User selection:', filename)
			if (filename !== undefined) {  // undefined when user aborts or selection times out
				let filepath = join(cwd, filename)
				vscode.window.showInformationMessage(`Delete ${filepath}?`, "OK", "Cancel")
				.then(confirmation => {
					if (confirmation === "OK") {
						term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs rm ${filepath}`)
					}
				})
			}
		})
	})

	context.subscriptions.push(removeFilesCommand)

	/*
	 *  Gather file names from the current remote working directory, present the choices via
	 *  a selection list. Present a directory choser dialog to get the local destination.
	 *  Use MPRemote's cp command to copy the selected file. 
	 */
	let downloadFileCommand = vscode.commands.registerCommand('mpremote.download', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		console.debug('cwd:', cwd)

		let dirEntries = await getRemoteDirEntries(port, cwd, STAT_MASK_FILE)
		const options = {
			title: `Choose file to download from ${port}:${cwd}`,
			canSelectMany: false,
			matchOnDetail: true
		}
		vscode.window.showQuickPick(dirEntries, options)
		.then(choice => {
			console.debug('User selection:', choice)
			if (choice !== undefined) {
				const options = {
					title: 'Choose local destination',
					canSelectMany: false,
					openLabel: 'Select Folder',
					canSelectFiles: false,
					canSelectFolders: true
				}
				vscode.window.showOpenDialog(options)
				.then(fileUri => {
					if (fileUri && fileUri[0]) {
						let localDir = fileUri[0].fsPath
						let localFile = path.join(localDir, choice)
						let remoteFile = join(cwd, choice)
						term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cp ':${remoteFile}' '${localFile}'`)
					}
				})
			}
		})
	})

	context.subscriptions.push(downloadFileCommand)

	/*
	 *  Present a file chooser dialog to get the local file. Use MPRemote's cp command
	 *  to copy the local file to the current working directory of the microcontroller. 
	 */
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
				console.debug('Local file:', localFile)
				let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
				if (cwd.endsWith('/') == false) {
					cwd += '/'
				}
				let remoteFile = cwd + path.basename(localFile)
				console.debug('Remote file:', remoteFile)
				term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cp '${localFile}' ':${remoteFile}'`)
			}
		}
	})

	context.subscriptions.push(uploadFileCommand)

	/*
	 *  Prompt for a directory name. Use MPRemote's mkdir to create the new directory
	 *  under the the present working directory on the microcontroller.
	 */
	let mkdirCommand = vscode.commands.registerCommand('mpremote.mkdir', async () => {
		let port = await getDevicePort()
		let cwd = remoteWorkingDir[port] || remoteWorkingDir['default']
		let options = {
			title: "Directory to create under ${port}:${cwd}"
		}
		let dir = await vscode.window.showInputBox(options)
		let dirpath = join(cwd, dir)
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs mkdir ${dirpath}`)
	})

	context.subscriptions.push(mkdirCommand)

	/*
	 *  Start a REPL prompt inside the terminal window.
	 */
	let replCommand = vscode.commands.registerCommand('mpremote.repl', async () => {
		let port = await getDevicePort()
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} repl`)
	})

	context.subscriptions.push(replCommand)

	/*
	 *  Use MPRemote's run command to execute the file whose path is determined by the
	 *  active editor window, giving the appearance of running the code on the screen.
	 */
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

	/*
	 *  Prompt for a package name and pass it to MPRemote's mip command to install.
	 *  I think the mip acronym should be "magically install packages,"" but sadly
	 *  they didn't ask me.
	 */
	let mipInstallCommand = vscode.commands.registerCommand('mpremote.mipinstall', async () => {
		let port = await getDevicePort()
		let options = {
			title: "Enter a package name"
		}
		let pkg = await vscode.window.showInputBox(options)
		term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} mip install ${pkg}`)
	})

	context.subscriptions.push(mipInstallCommand)

	/*
	 *  Disconnect from the device. Mostly included for completeness.
	 */
	let disconnectCommand = vscode.commands.registerCommand('mpremote.disconnect', () => {
		term.sendText(`${PYTHON_BIN} -m mpremote disconnect`)
	})

	context.subscriptions.push(disconnectCommand)

	/*
	 *  Copy entire project directory to remote flash file system. 
	 */
	let syncCommand = vscode.commands.registerCommand('mpremote.sync', async () => {
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length != 1) {
			vscode.window.showErrorMessage('Unable to sync. Open a folder first.')
		}
		else {
			console.debug('vscode.workspace.workspaceFolders[0]', vscode.workspace.workspaceFolders[0])
			let projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath
			console.debug('Project folder path:', projectRoot)
			let port = await getDevicePort()
			term.sendText(`cd '${projectRoot}'`)
			fs.readdir(projectRoot, { withFileTypes: true }, (err, entries) => {
				if (err) {
					console.error(err)
					vscode.window.showErrorMessage('Unable to read directory.')
				}
				else {
					console.debug('Directory entries found:', entries.length)
					entries.forEach(entry => {
						console.debug('Examining directory entry:', entry)
						if (entry.isDirectory()) {
							if (SYNC_IGNORE.includes(entry.name)) {
								console.debug('Skipping directory:', entry.name)
							}
							else {
  							console.debug(`${PYTHON_BIN} -m mpremote connect ${port} fs cp -r ${entry.name} :`)
	  						term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cp -r ${entry.name} :`)
							}
						}
						else {
							console.debug(`${PYTHON_BIN} -m mpremote connect ${port} fs cp ${entry.name} :`)
						  term.sendText(`${PYTHON_BIN} -m mpremote connect ${port} fs cp ${entry.name} :`)
						}
					})
				}
			})
		}	
	})

	context.subscriptions.push(syncCommand)
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
