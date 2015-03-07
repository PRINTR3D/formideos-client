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

var path = require('path');

// define global formideos object
module.exports = function()
{
	var formideos = {};

	// global app root directory
	formideos.appRoot = path.resolve(__dirname) + '/';

	// global object to hold managers
	formideos.managers = {};

	// global config
	formideos.config = require('./utils/config.js')();

	// global events
	formideos.events = require('./utils/events.js')();

	// global debug
	formideos.debug = require('./utils/debug.js')(formideos.config);

	// global http app
	formideos.http = require('./utils/http.js')(formideos.config, formideos.debug);

	// global websocket connection
	formideos.websocket = require('./utils/websocket.js')(formideos.http, formideos.debug);

	// global database
	formideos.db = require('./utils/db.js')(formideos.config, formideos.appRoot);

	// register manager
	formideos.register = require('./utils/register.js');

	// get registered manager
	formideos.manager = function(name)
	{
		if(!(name in formideos.managers))
		{
			formideos.debug('Manager with name ' + name + ' is not registered', true);
		}
		else
		{
			return formideos.managers[name];
		}
	}

	// return instance of formideos
	return formideos;
};