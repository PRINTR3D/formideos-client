/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = (routes, db) => {

	/**
	 * Get a list of printers
	 */
	routes.get('/printers', (req, res) => {
		db.Printer
		.find({ preset: false })
		.populate('createdBy')
		.then(res.ok)
		.error(res.serverError);
	});

	/**
	 * Get a single printer
	 */
	routes.get('/printers/:id', (req, res) => {
		db.Printer
		.findOne({ id: req.params.id, preset: false })
		.populate('createdBy')
		.then((printer) => {
			if (!printer) return res.notFound();
			return res.ok(printer);
		})
		.error(res.serverError);
	});

	/**
	 * Create a new printer
	 */
	routes.post('/printers', (req, res) => {
		db.Printer
		.create({
			name:				req.body.name,
			bed:				req.body.bed,
			axis:				req.body.axis,
			extruders:			req.body.extruders,
			port:				req.body.port,
			baudrate:			req.body.baudrate,
			gcodeFlavour:		req.body.gcodeFlavour,
			startGcode:			req.body.startGcode,
			endGcode:			req.body.endGcode,
			abilities:			req.body.abilities,
			createdBy:			req.user.id,
		})
		.then((printer) => {
			return res.ok({ message: "Printer created", printer });
		})
		.error(res.serverError);
	});

	/**
	 * Update a printer
	 */
	routes.put('/printers/:id', (req, res) => {
		db.Printer
		.update({ id: req.params.id }, {
			name:				req.body.name,
			bed:				req.body.bed,
			axis:				req.body.axis,
			extruders:			req.body.extruders,
			port:				req.body.port,
			baudrate:			req.body.baudrate,
			gcodeFlavour:		req.body.gcodeFlavour,
			startGcode:			req.body.startGcode,
			endGcode:			req.body.endGcode,
			abilities:			req.body.abilities,
			updatedBy:			req.user.id
		})
		.then((updated) => {
			return res.ok({ message: "Printer updated", printer: updated[0] });
		})
		.error(res.serverError);
	});

	/**
	 * Delete a printer
	 */
	routes.delete('/printers/:id', (req, res) => {
		db.Printer
		.destroy({ id: req.params.id, preset: false })
		.then(() => {
			return res.ok({ message: "Printer deleted" });
		})
		.error(res.serverError);
	});
};
