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
 
var reversePopulate = require('mongoose-reverse-populate');
var fs				= require('fs');

module.exports = function(routes, db)
{
	/*
	 * Returns a json list of all uploaded modelfiles (their properties, not the actual files)
	 * We use the reversePopulate plugin to also attach a list of printjobs where each modelfile is referenced
	 */
	routes.get('/gcodefiles', function(req, res) {
		db.Gcodefile.find().lean().exec(function(err, gcodefiles) {
			if (err) return res.send(err);
			reversePopulate(gcodefiles, "printjobs", true, db.Printjob, "gcodefiles", function(err, popGcodefiles) {
				if (err) return res.send(err);
				return res.send(popGcodefiles);
    		});
		});
	});

	/*
	 * Returns a json object with info about a single modelfile
	 * We use the reversePopulate plugin to also attach a list of printjobs where the modelfile is referenced
	 */
	routes.get('/gcodefiles/:id', function(req, res) {
		db.Gcodefile.find({ _id: req.params.id }).lean().exec(function(err, gcodefile) {
			if (err) return res.send(err);
			reversePopulate(gcodefile, "printjobs", true, db.Printjob, "gcodfiles", function(err, popGcodefile) {
				if (err) return res.send(err);
				return res.send(popGcodefile[0]);
    		});
		});
	});

	/*
	 * Delete a modelfile entry by ID.
	 */
	routes.delete('/gcodefiles/:id', function(req, res) {
		db.Gcodefile.remove({ _id: req.params.id }, function(err, gcodefile) {
			if (err) return res.status(400).send(err);
			var filePath = FormideOS.config.get('paths.gcode') + '/' + gcodefile.hash;
			fs.unlink(filePath, function() {
				return res.send({
					success: true
				});
			});
		});
	});
};