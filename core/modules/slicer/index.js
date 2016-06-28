/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

// dependencies
const fs 			= require('fs');
const uuid 			= require('node-uuid');
const formideTools	= require('formide-tools');
const assert		= require('assert');

module.exports = {

	katana: null,
	config: {},

	init: function(config) {
		this.config = config;

		// loaded via katana-slicer npm package and node-pre-gyp
		try {
			this.katana = require('katana-slicer');
		}
		catch (e) {
			FormideOS.log.error('error loading katana-slicer bin', e);
		}
	},

	// custom functions
	slicerError: function(error) {
		if (error.code == 'ECONNREFUSED' || error == false) {
			this.open = false;
			this.slicer.setTimeout(2000, function() {
				this.connect();
			}.bind(this));
		}
	},

	// custom functions
	slice: function(userId, files, sliceProfile, materials, printer, settings, callback) {
		if (this.katana === null) return callback(new Error('slicer not loaded'));

		const self = this;
		const hash = uuid.v4();
		const responseId = uuid.v4();

		assert(userId);
		assert(files);
		assert(sliceProfile);
		assert(materials);
		assert(printer);
		assert(settings);
		assert(callback);

		FormideOS.db.UserFile
		.find({ id: files })
		.then(function(userFiles) {
			const fileNames = [];
			for (var i in userFiles) {
				fileNames.push(userFiles[i].filename);
			}
			const printJobName = fileNames.join(' + ');

			FormideOS.db.PrintJob
			.create({
				name: 		   printJobName,
				files: 		   files,
				printer: 	   printer,
				sliceProfile:  sliceProfile,
				materials: 	   materials,
				sliceFinished: false,
				sliceSettings: settings,
				sliceMethod:   'local',
				createdBy: 	   userId,
				responseId:    responseId
			})
			.then(function(printJob) {
				self.createSliceRequest(printJob.id, function(err, sliceRequest) {
					if (err) return callback(err);

					// already return response
					callback(null, printJob);

					var sliceData = {
						type: 'slice',
						data: sliceRequest
					};
					sliceData.data.mode = 'gcode'; //THIS IS NOT ADDED ANYWHERE!!
					
					// write slicerequest to local Katana instance
					FormideOS.events.emit('slicer.started', {
						title:   'Slicer started',
						message: 'Started slicing ' + printJob.name,
						data:    sliceRequest
					});

					const reference = require('katana-slicer/reference.json');

					// self.katana.slice(JSON.stringify(sliceData), JSON.stringify(reference), function(response) {
					self.katana.slice(JSON.stringify(sliceData), function(response) {
						try {
							var response = JSON.parse(response);

							if (response.status == 200 && response.data.responseId != null) {
								FormideOS.db.PrintJob
								.update({ responseId: response.data.responseId }, {
									gcode: 		   response.data.hash,
									sliceResponse: response.data,
									sliceFinished: true
								})
								.then(function(updated) {
									return FormideOS.events.emit('slicer.finished', {
										title:   	  'Slicer finished',
										message: 	  'Finished slicing ' + updated[0].name,
										data:         response.data
									});
								})
								.catch(FormideOS.log.error);
							}
							else if (response.status === 120) {
								// note: not implemented  yet
								FormideOS.events.emit('slicer.progress', response.data);
							}
							else {
								FormideOS.db.PrintJob
								.update({ responseId: response.data.responseId }, {
									sliceResponse: response.data,
									sliceFinished: false
								})
								.then(function(updated) {
									return FormideOS.events.emit('slicer.failed', {
										title:   'Slicer error',
										status:  response.status,
										message: 'Failed slicing ' + updated[0].name + ', ' + response.data.msg,//Added error msg of katana,
										data:    response.data
									});
								})
								.catch(FormideOS.log.error);
							}
						}
						catch(e) {
							FormideOS.log.error(e);
						}
					});
				});
			})
			.catch(callback);
		})
		.catch(callback);
	},

	createSliceRequest: function(printJobId, callback) {

		var self = this;

		// creates a slice request from a PrintJob database entry
		FormideOS.db.PrintJob
		.findOne({ id: printJobId })
		.populate('files')
		.populate('materials')
		.populate('printer')
		.populate('sliceProfile')
		.exec((err, printJob) => {
			if (err) return callback(err);
			assert(printJob.printer, 'no printer found');
			assert(printJob.files, 'no files found');
			//assert(printJob.files.length < 1, 'files should be 1 or larger');
			assert(printJob.materials, 'no materials found');
			//assert(printJob.materials.length < 1, 'materials should be 1 or larger');
			assert(printJob.sliceProfile, 'no sliceprofile found');

			var reference = require('katana-slicer/reference.json');
			var version = printJob.sliceProfile.version || reference.version;
			assert(reference,'no reference found');
			assert(version,'no version found');

			formideTools.updateSliceprofile(reference, version, printJob.sliceProfile.settings, function(err, fixedSettings, version) {
				if (err) return callback(err);

				FormideOS.db.SliceProfile.update({ id: printJob.sliceProfile.id }, { settings: fixedSettings, version: version }, function(err, update) {
					if (err) return callback(err);

					FormideOS.db.PrintJob
					.findOne({ id: printJobId })
					.populate('files')
					.populate('materials')
					.populate('printer')
					.populate('sliceProfile')
					.exec((err, printJob) => {
						if (err) return callback(err);

						//Add updated sliceProfile to printJob
						var updatedPrintJob = printJob.toObject();
						updatedPrintJob.sliceProfile.settings = fixedSettings;

						formideTools.generateSlicerequestFromPrintjob(updatedPrintJob,{
									version: version,
									bucketIn: FormideOS.config.get('app.storageDir') + FormideOS.config.get("paths.modelfiles"),
									bucketOut: FormideOS.config.get('app.storageDir') + FormideOS.config.get("paths.gcode"),
									responseId: printJob.responseId
								},reference, function(err,sliceRequest){
									return callback(err,sliceRequest);
						});
					});
				});
			});
		});
	},

	getReferenceFile: function(callback) {
		var reference = require('katana-slicer/reference.json');
		return callback(null, reference);
	}
}
