'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const fs		   = require('fs');
const path		   = require('path');
const uuid		   = require('uuid');
const diskspace	   = require('diskspace');
const SPACE_BUFFER = 1000000; // 1MB
const MAX_STL_SIZE = 20000000; // 20MB, to prevent slicer crashing

module.exports = {

	tools: null,

	init() {
		if (FormideClient.ci)
			this.tools = FormideClient.ci.usb;
	},

	/**
	 * Upload a file to embedded storage and DB
	 * @param file
	 * @param filetype
	 * @param userId
	 * @param callback
	 */
	uploadFile: function(file, filetype, userId, callback) {
		fs.readFile(file.path, function(err, data) {
			if (err) {
				FormideClient.log.error(err.message);
				return callback(err);
			}

			diskspace.check(FormideClient.config.get('app.storageDir'), function (err, total, free) {
				if (err) return callback(err);

				// check if file will fit on filesystem
				if (((free - SPACE_BUFFER) < file.size))
					return callback(null, {
						message: 'There is not enough free space left on this device',
						reason: 'DISK_FULL'
					});

				// check if file can be sliced when STL
				if ((file.size > MAX_STL_SIZE) && (filetype === 'text/stl'))
					return callback(null, {
						message: 'This STL file is too large to be sliced, so uploading is not allowed',
						reason: 'FILE_TOO_LARGE'
					});

				const hash = uuid.v4();
				const newPath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.modelfiles'), hash);

				fs.writeFile(newPath, data, function (err) {
					if (err) {
						FormideClient.log.error(err.message);
						return callback(err);
					}
					else {
						FormideClient.db.UserFile.create({
							prettyname: file.name,
							filename: file.name,
							filesize: file.size,
							filetype: filetype,
							hash: hash,
							createdBy: userId
						}, function (err, userFile) {
							if (err) return callback(err)
							return callback(null, {data: userFile});
						});
					}
				});
			});
		});
	},

	/**
	 * Download a file from embedded storage
	 * @param hash
	 * @param encoding
	 * @param userId
	 * @param callback
	 */
	downloadFile: function(hash, encoding, userId, callback) {
		// TODO: check user ID
		var filename = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.modelfiles'), hash);
		fs.exists(filename, function(exists) {
			if(exists) {
				fs.readFile(filename, function(err, data) {
					if (err) {
						FormideClient.log.error(err.message);
						return callback(err);
					}
					else {
						if(encoding == 'base64') {
							var base64File = new Buffer(data, 'binary').toString('base64');
							return callback(null, base64File);
						}
						else {
							return callback(null, data);
						}
					}
				});
			}
			else {
				return callback(null, null);
			}
		});
	},

	/**
	 * Get embedded storage usage info
	 * @param callback
	 */
	getDiskSpace(callback) {
		diskspace.check(FormideClient.config.get('app.storageDir'), function (err, total, free, status) {
			if (err) return callback(err);
			return callback(null, { total, free, status });
		});
	},

	/**
	 * Get a list of all attached storage drives
	 * @param callback
	 */
	getDrives(callback) {
		if (this.tools)
			this.tools.drives((err, drives) => {
				if (err)
					return callback(err);

				callback(null, drives.split('\n'));
			});
		else
			callback(new Error('element-tools not installed'));
	},

	/**
	 * Mount an external drive to start using it
	 * @param drive
	 * @param callback
	 */
	mountDrive(drive, callback) {
		if (this.tools)
			this.tools.mount(drive, callback);
		else
			callback(new Error('element-tools not installed'));
	},

	/**
	 * Unmount an external drive before unplugging it
	 * @param drive
	 * @param callback
	 */
	unmountDrive(drive, callback) {
		if (this.tools)
			this.tools.unmount(drive, callback);
		else
			callback(new Error('element-tools not installed'));
	},

	/**
	 * List files in drive (or subpath)
	 * @param drive
	 * @param filePath
	 * @param callback
	 */
	readDrive(drive, filePath, callback) {
		if (this.tools)
			this.tools.read(drive, filePath, (err, files) => {
				if (err)
					return callback(err);

				files = files.split('\n');
				var output = [];

				// get name, size and type from file list
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					file = file.replace(/ +(?= )/g, '').split(' ');

					var name = file[8];

					if (file.length > 9)
						name = file.splice(8, file.length - 1).join(' ');

					if (file.length >= 8)
						output.push({
							name: name,
							size: file[4],
							type: (name.charAt(name.length - 1) === '/') ? 'dir' : 'file' // check if file or dir (with -F)
						});
				}

				callback(null, output);
			});
		else
			callback(new Error('element-tools not installed'));
	},

	/**
	 * Copy file from drive to embedded storage and DB
	 * @param drive
	 * @param filePath
	 * @param userId
	 * @param callback
	 */
	copyFile(drive, filePath, userId, callback) {
		const self = this;

		if (this.tools) {
			const hash = uuid.v4();
			const target = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.modelfiles'));
			const filePathArray = filePath.split('/');
			const fileName = filePathArray[filePathArray.length - 1];
			const fileStats = fs.statSync(path.join('/run/media', drive, filePath));

			diskspace.check(FormideClient.config.get('app.storageDir'), function (err, total, free) {
				if (err) return callback(err);

				// check if file will fit on filesystem
				if (((free - SPACE_BUFFER) < fileStats.size))
					return callback(null, {
						message: 'There is not enough free space left on this device',
						reason: 'DISK_FULL'
					});

				const ext = path.extname(filePath).toLowerCase();

				if (ext !== '.stl' && ext !== '.gcode')
					return callback(null, {
						message: 'This is not a valid filetype, you can only copy .gcode and .stl files',
						reason: 'INVALID_FILETYPE'
					});

				// check if file can be sliced when STL
				if ((fileStats.size > MAX_STL_SIZE) && (ext === '.stl'))
					return callback(null, {
						message: 'This STL file is too large to be sliced, so uploading is not allowed',
						reason: 'FILE_TOO_LARGE'
					});

				// escape spaces in file path
				filePath = '\'' + filePath.replace(/'/g, "'\\''") + '\'';

				self.tools.copy(drive, filePath, target, hash, (err, success) => {
					if (err) return callback(err);

					FormideClient.db.UserFile.create({
						prettyname: fileName,
						filename: fileName,
						filesize: fileStats.size,
						filetype: `text/${ext.replace('.', '')}`,
						hash: hash,
						createdBy: userId
					}, function (err, userFile) {
						if (err)
							return callback(err);

						return callback(null, { data: userFile });
					});
				});
			});
		}
		else
			return callback(new Error('element-tools not installed'));
	}
};
