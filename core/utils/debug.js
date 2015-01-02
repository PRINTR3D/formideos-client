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

var callerId = require('caller-id');

module.exports = function(config)
{
	var debug = function(debug)
	{
		if(config.get('app.debug') == true)
		{
			var caller = callerId.getData();
			var callerString = caller.evalOrigin.split('/');

			var date = new Date();

			var timestampString = date.toLocaleTimeString() + '\t';
			var outputString = '[' + callerString[callerString.length - 2] + '/' + callerString[callerString.length - 1] + ']\t';
			outputString += JSON.stringify(debug);

			if(caller.evalOrigin.indexOf('/managers') > -1)
			{
				console.log(timestampString.grey + ' ' + outputString.yellow);
			}
			else
			{
				console.log(timestampString.grey + ' ' + outputString.cyan);
			}
		}
	}

	return debug;
}