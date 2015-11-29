/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = function(routes, module)
{
	/*
	 * Get list of connected printers and their status
	 */
	routes.get('/', function(req, res) {
		return res.send(module.getPrinters());
	});

	/**
	 * Get a list of printer commands
	 */
	routes.get('/:port/commands', function(req, res) {
		module.getCommands(req.params.port, function(commands) {
			return res.json(commands);
		});
	});

	/**
	 * Get the current status of the printer
	 */
	routes.get('/:port/status', function(req, res) {
		module.getStatus(req.params.port, function(status) {
			return res.json(status);
		});
	});

	/*
	 * Start printjob
	 */
	routes.get('/:port/start', function(req, res) {
		module.startPrint(req.params.port, req.query.id, req.query.gcode, function(err, result) {
			if (err) return res.send(err);
			return res.json({
				success: true,
				message: result
			});
		});
	});

	/*
	 * Stop printjob
	 */
	routes.get('/:port/stop', function(req, res) {
		module.stopPrint(req.params.port, function(err, result) {
			if (err) return res.send(err);
			return res.json({
				success: true,
				message: result
			});
		});
	});

	/*
	 * Pause printjob
	 */
	routes.get('/:port/pause', function(req, res) {
		module.pausePrint(req.params.port, function(err, result) {
			if (err) return res.send(err);
			return res.json({
				success: true,
				message: result
			});
		});
	});

	/*
	 * Resume printjob
	 */
	routes.get('/:port/resume', function(req, res) {
		module.resumePrint(req.params.port, function(err, result) {
			if (err) return res.send(err);
			return res.json({
				success: true,
				message: result
			});
		});
	});

	/*
	 * Send command to printer
	 */
	routes.get('/:port/:command', function(req, res) {
		module.printerControl(req.params.port, { command: req.params.command, parameters: req.query }, function(err, result) {
			if (err) return res.json(err);
			return res.json(result);
		});
	});
}
