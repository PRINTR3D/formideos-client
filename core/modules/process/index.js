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

var argv 		= require('minimist');

module.exports =
{
	name: "core.process",
	
	process: null,
	args: null,

	init: function()
	{
		this.process = process;
		this.args = argv(this.process.argv.slice(2));
		this.process.on('exit', this.processExit);
		this.process.on('uncaughtException', this.processError);
	},

	getProcess: function()
	{
		return this.process;
	},

	getVersion: function()
	{
		return this.process.version;
	},

	getEnvironment: function()
	{
		return this.process.env;
	},

	getId: function()
	{
		return this.process.pid;
	},

	getImpact: function()
	{
		return this.process.memoryUsage();
	},

	getUptime: function()
	{
		return this.process.uptime();
	},

	processExit: function(err)
	{
		FormideOS.manager('core.events').emit('process.exit');
	},

	processError: function(err)
	{
		FormideOS.manager('core.events').emit('log.error', {message: 'uncaught exception occured', data: err.stack});
		FormideOS.manager('debug').log(err.stack);
	}
};