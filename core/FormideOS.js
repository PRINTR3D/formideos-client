'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

/*
 *	This is the core of formide-client. The global FormideOS variable is defined and all core
 *	utilities are added to it, including the http and ws servers, the moduleManager and the
 *	events manager.
 */

const path             = require('path');
const sailsDiskAdapter = require('sails-disk');
const initDb 		   = require('./utils/db');
const seed 			   = require('./utils/db/seed');

// FormideOS global object
global.FormideOS = {};

module.exports = dbConfig => {

	// Paths
	FormideOS.coreRoot = path.resolve(__dirname, './');
	FormideOS.appRoot = path.resolve(__dirname, '../');

	// Config
	FormideOS.config = require('./utils/config.js')();

	// Ensure needed files and dirs are available
    require('./utils/ensureNeeds');

	// Events
	FormideOS.events = require('./utils/events.js');

	// Debug
	FormideOS.log = require('./utils/log.js');

	// Global user settings
	FormideOS.settings = require('./utils/settings.js')();

	// HTTP server
	FormideOS.http = require('./utils/http').init();

	// WS server
	FormideOS.ws = require('./utils/websocket').init();

	// Module manager
	FormideOS.moduleManager = require('./utils/moduleManager.js')();

	// Array to keep track of installed modules
	FormideOS.modules = [];

	// Function to get registered module in a more elegant way than directly
	// accessing the modules object
	FormideOS.module =
		moduleName => FormideOS.moduleManager.getModule(moduleName);

	if (!dbConfig) {
		let storage = path.join(
			FormideOS.config.get('app.storageDir'), 'database_');

		dbConfig = {
			adapters: { disk: sailsDiskAdapter },
			connections: {
				// database for all user generated data
				default: {
					adapter:  'disk',
					filePath: storage
				}
			},
			defaults: { migrate: 'safe' }
		};
	}

	return initDb(dbConfig).then(
		db => {
			seed(db, path.join(FormideOS.config.get('app.storageDir'), 'formidePresets'));
			FormideOS.db = db;
		},
		err => {
			FormideOS.log.error(err);
			process.exit(1);
		});
}
