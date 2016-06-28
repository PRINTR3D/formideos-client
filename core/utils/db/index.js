'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const fs        = require('fs');
const thenify   = require('thenify');
const Waterline = require('waterline');
const path		= require('path');
const readdir   = thenify(fs.readdir);

function initializeDb(config) {
	const waterline = new Waterline();

	// load all models
	return readdir(path.join(__dirname, './models')).then(files => {
		files.forEach(file => {
			if (file.match(/\.js$/) == null || file === 'index.js')
				return;

			const modelName = file.replace('.js', '');
			const model     = require(`./models/${modelName}`);
			waterline.loadCollection(Waterline.Collection.extend(model));
		});
	})
	.then(() => thenify((cb) => waterline.initialize(config, cb))())
	.then((models) => ({
		AccessToken:        models.collections.accesstoken,
		Log:                models.collections.log,
		Material:           models.collections.material,
		Printer:            models.collections.printer,
		PrintJob:           models.collections.printjob,
		QueueItem:          models.collections.queueitem,
		SliceProfile:       models.collections.sliceprofile,
		User:               models.collections.user,
		UserFile:           models.collections.userfile
	}));
}

module.exports = initializeDb;
