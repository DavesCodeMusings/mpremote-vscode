# mpremote-vscode
Command palette access to mpremote Python module.  Learn how to use it
in the [wiki](https://github.com/DavesCodeMusings/mpremote-vscode/wiki)

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
1. In VS Code, open the folder containing your MicroPython project's files.
2. Plug in your microcontroller and find it under Serial Ports in VS Code's Explorer pane.
3. Right-click the microcotroller's serial port to access a menu of MPRemote commands.

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
MAJOR = mpremote major,
MINOR = mpremote minor,
PATCH = extension version

## Release Notes

### 1.21.13
Fixes path separator problem when uploading (issue #32).

### 1.21.12
Reverting 1.21.11 changes due to bugs.

### 1.21.11
Add feature for uploading into a directory other than / (issue #24).

### 1.21.10
Fix serial port skip bug (issue #22). Thanks SteveKerle!

### 1.21.9
Allow .mpy files to be uploaded/downloaded with context menu.

### 1.21.8
Change how mpremote is called on non-Windows systems.

### 1.21.7
Configuration option for specific local subdir for MicroPython files (e.g. src)

### 1.21.6
Uploading individual files in subdirectories takes local subdirectories into account.

### 1.21.5
Use python3 as the binary for non-Windows systems.

### 1.21.4
Bug fix for multiple terminals. Consolidate Python executable O.S. detection.

### 1.21.3
Bug fix for remote file/dir selection prompts not working on non-Windows systems.

### 1.21.2
Bug fix for unknown local path when run and upload commands are chosen from the palette.

### 1.21.1
Bug fixes for sync and setrtc from command palette and sync files with spaces.

### 1.21.0
Change made to realtime clock set command.

### 1.20.19
Bug fixes to quote file and dir names containing spaces.

### 1.20.18
Bug fix for serial port skip configuration.

### 1.20.17
Provide configuration option to skip start-up checks for python binary
and mpremote module.

### 1.20.16
Add refresh button to serial port welcome view.

### 1.20.15
Fix to rmdir command. Welcome view for empty Serial Ports.

### 1.20.14
Fixes to run and upload commands. Menu cleanup.

### 1.20.13
The "Born under a bad sign" release, with apologies to Albert King. Fixed
missing code in the 'sync' command. Cleaned up string checking.

### 1.20.12 
Added exec command. Organized context menu.

### 1.20.11
Skipping the dot ten release, because there are so many changes. This one...
wait for it... this one goes up to eleven!

Converted code to TypeScript. Updated user interface with serial port explorer
view and many more context menu options. Removed welcome view and snake icon.

### 1.20.9
Closes Python virtual env bug (issue #4). Also minor UI tweak.

### 1.20.8 
Closes mip bug (issue #3) and serial port skip enhancement (issue #5)

### 1.20.7 
Add welcome view to activity bar.

### 1.20.6 
Add some commands to context menus.

### 1.20.5 
Code improvements, fixes, and new `setrtc` command.

### 1.20.4 
Added sync command for mass upload.

### 1.20.3 
New commands and UI consistency improvements.

### 1.20.2 
New commands. Better handling of remote subdirectories.

### 1.20.1 
Fix problems when there are unsaved changes in editor.

### 1.20.0 
Fix to use quotes around file paths so spaces don't cause problems.
Bump version to match compatible mpremote version.

### 0.4.4 
Fix to use py.exe only on Windows and python on all other OS.

### 0.4.3  
Logo change.

### 0.4.2 
Fixed upload file bug.

### 0.4.1 
Detect COM ports as part of the extension's code rather than parsing
output from mpremote's devs command.

Auto-save current editor locally before calling mpremote run.

Use active editor path for file uploads rather than an Open dialog.
