/*
 *	    ____  ____  _____   ____________
 *	   / __ / __ /  _/ | / /_  __/ __
 *	  / /_/ / /_/ // //  |/ / / / / /_/ /
 *	 / ____/ _, _// // /|  / / / / _, _/
 *	/_/   /_/ |_/___/_/ |_/ /_/ /_/ |_|
 *
 *	Copyright Printr B.V. All rights reserved.
 *	This code is closed source and should under
 *	nu circumstances be copied or used in other
 *	applications than for Printr B.V.
 *
 */

var path 	= require('path');

// define global formideos object
module.exports = function() {
	var formideos = {};

	// global directories
	formideos.coreRoot = path.resolve(__dirname) + '/';
	formideos.appRoot = path.resolve(__dirname + '/../') + '/';

	// global object to hold managers and module info
	formideos.modules = {};
	formideos.modulesInfo = {};

	// global config
	formideos.config = require('./utils/config.js')();

	// register module
	formideos.register = require('./utils/register.js');
	
	// deregister module
	formideos.deregister = function(name) {
		delete formideos.modules[name];
		delete formideos.modulesInfo[name];
	}

	// register events
	formideos.modules['events'] = require('./utils/events.js');

	// register debug
	formideos.modules['debug'] = require('./utils/debug.js');

	// global user settings
	formideos.settings = require('./utils/settings.js')(formideos);

	// register util functions
	formideos.utils = require('./utils/functions.js');

	// init module
	formideos.init = require('./utils/init.js')(formideos.modulesInfo);
	
	// get registered manager
	formideos.module = function(name) {
		name = name.replace('.', '/');

		if(!(name in formideos.modules)) {
			formideos.module('debug').log('Manager with name ' + name + ' is not registered', true);
		}
		else {
			return formideos.modules[name];
		}
	};

	// return instance of formideos
	return formideos;
};