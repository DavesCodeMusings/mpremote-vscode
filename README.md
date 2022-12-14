# mpremote-vscode
Command palette access to mpremote Python module.

## Features
The goal of this extension is giving easy access to some of mpremote's
functionality from within VS Code.

The most notable features are the the ability to access a REPL prompt,
upload files from the development host to the microcontroller, and
install packages using MicroPython's MIP tool.

If more than one MicroPython device is plugged in when a command is run,
you will be given a selection list of COM ports to choose from.

## Installing and Using the Extension
The extension can be installed from the VS Code Marketplace:
https://marketplace.visualstudio.com/publishers/DavesCodeMusings

To use the extension:
1. Open the VS Code command palette (CTRL+SHIFT+P)
2. Search for MPRemote to find available commands
3. Profit!

## Requirements
The host running this extension must have Python 3 installed as well
as the mpremote module.

You can get Python from: https://www.python.org/downloads/

The mpremote module can be installed with pip, like this:
`py -m pip install mpremote`

## About Version Numbers
This extension's version numbers are tied to the major and minor version
of mpremote. The first two numbers indicate the version of mpremote this
extension was devloped and tested with. The final number is used to track
enhancements and bug fixes to this extension.

For example:
* 0.4.0 of the extension was developed for mpremote 0.4.0
* 0.4.1 is an enhancement to the extension developed for mpremote 0.4.0

So, given MAJOR.MINOR.PATCH ...
MAJOR = mpremote major
MINOR = mpremote minor
PATCH = extension version

## 0.4.3  Release Notes
Logo change.

## 0.4.2 Release Notes
Fixed upload file bug.

## 0.4.1 Release Notes
Detect COM ports as part of the extension's code rather than parsing
output from mpremote's devs command.

Auto-save current editor locally before calling mpremote run.

Use active editor path for file uploads rather than an Open dialog.
