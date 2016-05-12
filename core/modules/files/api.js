/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

var multipart 			= require('connect-multiparty');
var multipartMiddleware = multipart();
var path                = require('path');

module.exports = function(routes, module) {

	/*
	 * Download a modelfile by hash in url query
	 */
	routes.get('/download', function(req, res) {
		module.downloadFile(req.query.hash, req.query.encoding, req.user.id, function(err, filecontents) {
			if(err) return res.serverError(err);
			if (!filecontents) return res.notFound();
			return res.send(filecontents); // don't use res.ok here!
		});
	});

	/*
	 * Upload a file, can be stl or gcode for now
	 */
	routes.post('/upload', multipartMiddleware, function(req, res) {
		if (!req.files && !req.files.file) {
			return res.badRequest("No file found in request");
		}

		var ext = path.extname(req.files.file.originalFilename).toLowerCase();
		if (ext === '.stl' || ext === '.gcode') {
			module.uploadFile(req.files.file, "text/" + ext.replace('.', ''), req.user.id, function(err, uploadedFile) {
				if (err)
					return res.serverError(err);

				return res.ok({ message: "Uploaded file", uploadedFile });
			});
		}
        else {
	        return res.badRequest("Invalid filetype. Should be STL or Gcode")
		}
	});

	routes.get('/diskspace', function(req, res) {
		module.getDiskSpace(function(err, result) {
			if (err) return res.serverError(err);
			return res.ok(result);
		});
	});
	
	routes.get('/drives', (req, res) => {
		module.getDrives((err, drives) => {
			if (err) return res.serverError(err);
			return res.ok(drives);
		});
	});
	
	routes.post('/mount/:drive', (req, res) => {
		module.mountDrive(req.params.drive, (err) => {
			if (err) return res.serverError(err);
			return res.ok({ message: 'drive mounted' });
		});
	});
	
	routes.post('/unmount/:drive', (req, res) => {
		module.unmountDrive(req.params.drive, (err) => {
			if (err) return res.serverError(err);
			return res.ok({ message: 'drive unmounted' });
		});
	});
	
	routes.get('/read/:drive', (req, res) => {
		module.readDrive(req.params.drive, req.query.path, (err, files) => {
			if (err) return res.serverError(err);
			return res.ok(files);
		});
	});
	
	routes.post('/copy/:drive', (req, res) => {
		module.copyFile(req.params.drive, req.body.path, req.user.id, (err, uploadedFile) => {
			if (err) return res.serverError(err);
			return res.ok({ message: 'file copied', uploadedFile });
		});
	});
};
