/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */
 
var fs		= require('fs');
var uuid	= require('node-uuid');
var request	= require('request');

module.exports = {
	
	uploadModelfile: function(file, callback) {
		fs.readFile(file.path, function(err, data) {
			var hash = uuid.v4();
			var newPath = FormideOS.config.get('paths.modelfile') + '/' + hash;
			fs.writeFile(newPath, data, function(err) {
				if (err) {
					FormideOS.debug.log(err);
					return callback(err);
				}
				else {
					FormideOS.module('db').db.Modelfile.create({
						filename: file.name,
						filesize: file.size,
						hash: hash
					}, function(err, modelfile) {
						if (err) return callback(err)
						return callback(null, modelfile);
					});
				}
			});
		});
	},

	uploadGcode: function(file, callback) {
		fs.readFile(file.path, function( err, data ) {
			var hash = uuid.v4();
			var newPath = FormideOS.config.get('paths.gcode') + '/' + hash;
			fs.writeFile(newPath, data, function(err) {
				if(err) {
					FormideOS.debug.log( err );
					return callback(err);
				}
				else {
					FormideOS.module('db').db.Gcodefile.create({
						filename: file.name,
						filesize: file.size,
						hash: hash
					}, function(err, gcodefile) {
						if (err) return callback(err)
						return callback(null, gcodefile);
					});
				}
			});
		});
	},

	downloadModelfile: function(hash, encoding, callback) {
		var filename = FormideOS.config.get('paths.modelfile') + '/' + hash;
		fs.exists(filename, function(exists) {
			if(exists) {
				fs.readFile(filename, function(err, data) {
					if (err) {
						FormideOS.debug.log(err, true);
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
				return callback('file not found');
			}
		});
	},

	downloadGcode: function(hash, encoding, callback) {
		var filename = FormideOS.config.get('paths.gcode') + '/' + hash;
		fs.exists(filename, function(exists) {
			if (exists) {
				fs.readFile(filename, function(err, data) {
					if(err) {
						FormideOS.debug.log(err, true);
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
				return callback('file not found');
			}
		});
	},
	
	uploadFromUrl: function(url, filename, filetype, callback) {
		request({
			method: 'GET',
			url: url
		})
		.on('response', function(response) {
			var regexp = /filename=\"(.*)\"/gi;
			var hash = uuid.v4();
			var newPath = FormideOS.config.get('paths.modelfile') + '/' + hash;
			var fws = fs.createWriteStream(newPath);
			response.pipe(fws);
			response.on( 'end', function() {
				FormideOS.module('db').db.Modelfile.create({
					filename: filename,
					filesize: fws.bytesWritten,
					filetype: filetype,
					hash: hash
				}, function(err, modelfile) {
					if (err) return callback(err)
					return callback(null, modelfile);
				});
        	});
		});
	}
}