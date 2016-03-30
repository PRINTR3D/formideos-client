'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

var fs			= require('fs');
var path		= require('path');
var uuid		= require('node-uuid');
var diskspace	= require('diskspace');

module.exports = {

	tools: null,

	init() {
		try {
			self.tools = require('element-tools').usb;
		}
		catch (e) {
			FormideOS.log.warn(
				'element-tools not found for files, probably not running on The Element');
		}
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
				FormideOS.log.error(err.message);
				return callback(err);
			}

			var hash = uuid.v4();
			var newPath = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.modelfiles'), hash);

			fs.writeFile(newPath, data, function(err) {
				if (err) {
					FormideOS.log.error(err.message);
					return callback(err);
				}
				else {
					FormideOS.db.UserFile.create({
						prettyname: file.name,
						filename: file.name,
						filesize: file.size,
						filetype: filetype,
						hash: hash,
						createdBy: userId
					}, function(err, userFile) {
						if (err) return callback(err)
						return callback(null, userFile);
					});
				}
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
		var filename = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.modelfiles'), hash);
		fs.exists(filename, function(exists) {
			if(exists) {
				fs.readFile(filename, function(err, data) {
					if (err) {
						FormideOS.log.error(err.message);
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
		diskspace.check('/data', function (err, total, free, status) {
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
			this.tools.drives(callback);
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
	 * @param path
	 * @param callback
	 */
	readDrive(drive, path, callback) {
		if (this.tools)
			this.tools.read(drive, path, function(err, files) {
				if (err)
					return callback(err);

				files = files.split('\n');
				var output = [];

				// get name, size and type from file list
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					file = file.replace(/ +(?= )/g,'').split(' ');

					if (file.length === 9)
						output.push({
							name: file[8],
							size: file[4],
							type: (file[8].charAt(file[8].length - 1) === '/') ? 'dir' : 'file' // check if file or dir (with -F)
						});
				}

				return callback(null, output);
			});
		else
			callback(new Error('element-tools not installed'));
	},

	/**
	 * Copy file from drive to embedded storage and DB
	 * @param drive
	 * @param path
	 * @param userId
	 * @param callback
	 */
	copyFile(drive, path, userId, callback) {
		if (this.tools) {
			const hash = uuid.v4();
			const target = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.modelfiles'), hash);

			this.tools.copy(drive, path, target, hash, (err, success) => {
				if (err)
					return callback(err);

				const ext = path.extname(path).toLowerCase();

				if (ext === '.stl' || ext === '.gcode') {
					FormideOS.db.UserFile.create({
						prettyname: path,
						filename:   path,
						filesize:   '', // TODO
						filetype:   `text/${ext.replace('.', '')}`,
						hash:       hash,
						createdBy:  userId
					}, function (err, userFile) {
						if (err) return callback(err)
						return callback(null, userFile);
					});
				}
				else {
					return res.badRequest("Invalid filetype. Should be STL or Gcode");
				}
			});
		}
		else
			return callback(new Error('element-tools not installed'));
	}
};
