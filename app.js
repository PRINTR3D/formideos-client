/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

/*
 *	This is the bootstrapper of formide-client. It basically kicks off the formide-client core
 *	and loads the core modules. After that, all user installed modules are loaded. Finally,
 *	all loaded modules are activated via the moduleManager.activateLoadedModules function.
 */

// Dependencies
var pkg 	= require('./package.json');
var path 	= require('path');

// Load formide-client core file
const initFormide = require('./core/FormideOS');

initFormide().then(() => {

	// Log awesome app starter logo
	require('./core/utils/logLogo');

	// Log app header
	FormideOS.log.info('==============================================');
	FormideOS.log.info('Starting formide-client v' + pkg.version + ' as ' + process.env.NODE_ENV);
	FormideOS.log.info('==============================================');

	// Load core modules
	FormideOS.moduleManager.loadModule('/core/modules/db',		'db',       true);
	FormideOS.moduleManager.loadModule('/core/modules/preset',  'preset',   true);
	FormideOS.moduleManager.loadModule('/core/modules/auth',	'auth',     true);
	FormideOS.moduleManager.loadModule('/core/modules/files', 	'files',    true);
	// FormideOS.moduleManager.loadModule('/core/modules/printer', 'printer',  true);
	// FormideOS.moduleManager.loadModule('/core/modules/slicer',	'slicer',	true);
	FormideOS.moduleManager.loadModule('/core/modules/update',	'update',	true);
	FormideOS.moduleManager.loadModule('/core/modules/cloud',   'cloud',	true);

	// Load all via npm installed formide-client modules
	for(var i in pkg.dependencies) {
		if (i.indexOf("formide-client-") > -1) {
			FormideOS.modules.push(i);
			FormideOS.moduleManager.loadModule("/node_modules/" + i, i);
		}
	}

	// Activate all loaded modules
	FormideOS.moduleManager.activateLoadedModules();
});
