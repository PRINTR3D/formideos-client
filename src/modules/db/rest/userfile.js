/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

'use strict';

const async  = require('async');
const path   = require('path');
const fs     = require('fs');
const co     = require('co');
const stream = require('stream');
const uuid   = require('uuid');
const base64 = require('base64-stream');
const assert = require('assert');

// image upload middleware
const multipart           = require('connect-multiparty');
const multipartMiddleware = multipart();

module.exports = (routes, db) => {

	/**
	 * List all userFiles
	 */
	routes.get('/files', (req, res) => {
		db.UserFile
			.find({ createdBy: req.user.id }, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
			.sort('createdAt DESC')
			.populate('printJobs')
			.then(res.ok)
			.error(res.serverError);
	});

	/**
	 * Get a single userFile with all it's sliced versions (printJobs)
	 */
	routes.get('/files/:id', (req, res) => {
		db.UserFile
			.findOne({ id: req.params.id })
			.populate('printJobs')
			.then(userFile => {
				if (!userFile) return res.notFound();
				async.map(userFile.printJobs, (printjob, callback) => {
					db.PrintJob
					.find({ id: printjob.id, createdBy: req.user.id })
					.populate('materials')
					.populate('printer')
					.populate('sliceProfile')
					.then(printers => {
						return callback(null, printers);
					})
					.error(callback);
				}, (asyncErr, results) => {
					if (asyncErr) return res.serverError(asyncErr);
					var response = [];
					for (var i in results) {
						for (var j in results[i]) {
							response.push(results[i][j]);
						}
					}
					userFile = userFile.toJSON();
					userFile.printJobs = response;
					return res.ok(userFile);
				});
			})
			.error(res.serverError);
	});

	/**
	 * Update a userFile
	 */
	routes.put('/files/:id', function(req, res) {
		db.UserFile
			.update({ id: req.params.id, createdBy: req.user.id }, {
				prettyname:	req.body.prettyname
			})
			.then((updated) => {
				return res.ok({ message: "File updated", file: updated[0] })
			})
			.error(res.serverError);
	});

	/**
	 * Delete a userFile
	 */
	routes.delete('/files/:id', function(req, res) {
		db.UserFile
			.findOne({ id: req.params.id, createdBy: req.user.id })
			.then(userFile => {
				// delete file from storage
				var filePath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.modelfiles'), userFile.hash);
				try {
					fs.unlinkSync(filePath);
				}
				catch (e) {
					FormideClient.log.warn('file could not be deleted from storage');
				}

				// TODO: remove attached images as well

				// delete from database
				userFile.destroy(function (err) {
					if (err) return res.serverError(err);
					return res.ok({ message: "File deleted" });
				});
			})
			.catch(res.serverError);
	});

	/**
	 * Add image to file as base 64 string
	 */
	routes.post('/files/:id/images/base64', function(req, res) { co(function*() {

		if (!req.body.file)
			return res.badRequest('file not found');

		if (!req.body.filename)
			return res.badRequest('filename not found');

		const userFile = yield db.UserFile.findOne({ id: req.params.id, createdBy: req.user.id });

		if (!userFile)
			return res.notFound('UserFile not found');

		// create a new read stream
		const readStream = new stream.PassThrough();

		// strip data:image meta data before converting to buffer
		const base64Data = req.body.file.replace(/^data:image\/png;base64,/, '');

		// store incoming data in read stream
		readStream.end(new Buffer(base64Data, 'base64'));

		// get the path to store the file and create a write stream to it
		const hash = uuid.v4();
		const imagePath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.images'), hash);
		const writeStream = fs.createWriteStream(imagePath);

		// store image on file system
		readStream.pipe(writeStream);

		// add hash to file images array
		if (!(userFile.images instanceof Array))
			userFile.images = [];
		userFile.images.push(hash);

		// save the file
		const saved = yield userFile.save();

		return res.ok({
			message: 'Added image from file',
			file:    saved
		});
	}).then(null, err => { res.serverError(err); }) });

	/**
	 * Download and image from disk to display
	 */
	routes.get('/files/:id/images/:hash', function(req, res) {
		// get image from disk
		const imagePath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.images'), req.params.hash);
		const readStream = fs.createReadStream(imagePath);
		const imageStats = fs.statSync(imagePath);

		// setup response headers
		res.set('Content-disposition', `attachment; filename=${req.params.hash}`);
		res.set('Content-type', 'image/png');
		res.set('Content-length', imageStats.size);

		// respond with file stream
		if (req.query.encoding === 'base64') return readStream.pipe(base64.encode()).pipe(res);
		return readStream.pipe(res);
	});

	/**
	 * Remove image from file
	 */
	routes.delete('/files/:id/images/:imageId', function(req, res) {
		db.UserFile
			.findOne({ id: req.params.id, createdBy: req.user.id })
			.exec((err, userFile) => {
				if (err) return res.serverError(err);

				userFile.images.splice(req.params.imageId);
				userFile.save((dbErr, savedUserFile) => {
					if (dbErr) return res.serverError(dbErr);

					const imagePath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.images'), hash);
					try {
						fs.unlinkSync(imagePath);
					}
					catch (e) {
						FormideClient.log.warn('image could not be deleted from storage');
					}

					return res.ok({ message: 'Removed image from file', file: savedUserFile });
				});
			});
	});
};
