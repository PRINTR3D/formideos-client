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

var Config = require('nodejs-config');

module.exports = function()
{
	var config = Config(
		__dirname + '/..',
		{
			development: ['chris.local', 'bouke.local', 'bouke', 'wlan234089.mobiel.utwente.nl'],
			production: ['raspberrypi']
		}
	);

	return config;
}