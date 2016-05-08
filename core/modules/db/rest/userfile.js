/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const async = require('async');
const path  = require('path');
const fs    = require('fs');

module.exports = (routes, db) => {

	/**
	 * List all userFiles
	 */
	routes.get('/files', (req, res) => {
		db.UserFile
		.find({}, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
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
	routes.post('/files/:id', function(req, res) {
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
			var filePath = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.modelfiles'), userFile.hash);
			try {
				fs.unlinkSync(filePath);
			}
			catch (e) {
				FormideOS.log.warn('file could not be deleted from storage');
			}

			// delete from database
			userFile.destroy(function (err) {
				if (err) return res.serverError(err);
				return res.ok({ message: "File deleted" });
			});
		})
		.catch(res.serverError);
	});
};
