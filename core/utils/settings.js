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

var fs = require('fs');
var observed = require('observed');
var path = require('path');

module.exports = function() {

	// environment
	this.env = process.env.NODE_ENV || 'production';
	
	// settings object
	this.cfg = JSON.parse(fs.readFileSync(path.join(FormideOS.appRoot, FormideOS.config.get('settings.path'), '/settings.json'), {encoding: 'utf8'}));
	
	// settings target object
	this.fullCfg = {};

	// watch settings object
	var ee = observed(this.cfg);

	// write settings to storage when changed
	ee.on('change', function() {
		fs.writeFileSync(path.join(FormideOS.appRoot, FormideOS.config.get('settings.path'), 'settings.json'), JSON.stringify(cfg));
	});

	// get all settings (for a module)
	this.getSettings = function(module) {
		if (module) return this.cfg[module];
		return this.cfg;
	}
	
	// set settings of a module
	this.getSetting = function(module, key) {
		return this.cfg[module][key];
	}
	
	// save settings of a module
	this.saveSetting = function(module, key, value) {
		this.cfg[module][key] = value;
		return this;
	}
	
	// adds settings for a module
	this.addModuleSettings = function(moduleName, moduleSettings) {
		this.fullCfg[moduleName] = moduleSettings;
		this.checkSettings(moduleName);
	}
	
	// loop over all settings to see if required ones are there
	this.checkSettings = function(i) {
		//for(var i in this.fullCfg) {
			// create module in settings
			if(this.cfg[i] === undefined || Object.keys(this.cfg[i]).length === 0) {
				this.cfg[i] = {};
			}
			// add subsettings for module
			var moduleSettings = this.fullCfg[i];
			for(var j in moduleSettings) {
				var moduleSetting = moduleSettings[j];
				if(this.cfg[i][moduleSetting.name] == undefined) {
					if(moduleSetting.required == true) {
						if(moduleSetting.default != undefined) {
							this.cfg[i][moduleSetting.name] = moduleSetting.default;
						}
						else {
							FormideOS.debug.log("module setting was required but no default given: " + i + " " + moduleSetting.name)
						}
					}
				}
			}
		//}
	}
	
	return this;
}