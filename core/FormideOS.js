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

// define global FormideOS object
FormideOS = {};

// global directories
FormideOS.coreRoot = path.resolve(__dirname) + path.sep;
FormideOS.appRoot = path.resolve(__dirname, '..') + path.sep;

// global config
FormideOS.config = require('./utils/config.js')();

// register events
FormideOS.events = require('./utils/events.js');

// register debug
FormideOS.debug = require('./utils/debug.js');

// global user settings
FormideOS.settings = require('./utils/settings.js')();

// global http server
FormideOS.http = require('./utils/http').init();

// global ws server
FormideOS.ws = require('./utils/websocket').init();

// register util functions
FormideOS.utils = require('./utils/functions.js');

// module manager
FormideOS.moduleManager = require('./utils/moduleManager.js')();

// get registered module
FormideOS.module = function(moduleName) {
	return FormideOS.moduleManager.getModule(moduleName)
};