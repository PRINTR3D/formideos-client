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

module.exports = function(routes, db)
{
	routes.get('/queue', FormideOS.manager('core.http').server.permissions.check('rest:queue'), function( req, res )
	{
		db.Queueitem
		.findAll({where: {status: 'queued'}, include: [{model: db.Printjob, include: [{model: db.Modelfile}]}]})
		.success(function(queue)
		{
			res.send(queue);
		});
	});

	routes.get('/queue/:id', FormideOS.manager('core.http').server.permissions.check('rest:queue'), function( req, res )
	{
		req.checkParams('id', 'id invalid').notEmpty().isInt();

		var inputErrors = req.validationErrors();
		if( inputErrors )
		{
			return res.status(400).json({
				status: 400,
				errors: inputErrors
			});
		}

		db.Queueitem
		.find({ where: {id: req.params.id } })
		.then(function(queueitem)
		{
			res.send(queueitem);
		});
	});

	routes.post('/queue', FormideOS.manager('core.http').server.permissions.check('rest:queue'), function( req, res )
	{
		req.checkBody('printjobID', 'printjobID invalid').notEmpty();

		var inputErrors = req.validationErrors();
		if( inputErrors )
		{
			return res.status(400).json({
				status: 400,
				errors: inputErrors
			});
		}

		db.Printjob.find({where: {id: req.body.printjobID}})
		.success(function(printjob)
		{
			if( printjob )
			{
				db.Queueitem
				.create({
					origin: 'local',
					status: 'queued',
					gcode: printjob.gcode,
					PrintjobId: printjob.id
				})
				.success(function(queueitem)
				{
					return res.send({
						status: 200,
						message: 'OK'
					});
				});
			}
			else
			{
				return res.status(400).json({
					status: 400,
					errors: 'printjob with this ID does not exist'
				});
			}
		});
	});

	routes.delete('/queue/:id', FormideOS.manager('core.http').server.permissions.check('rest:queue'), function( req, res )
	{
		req.checkParams('id', 'id invalid').notEmpty().isInt();

		var inputErrors = req.validationErrors();
		if( inputErrors )
		{
			return res.status(400).json({
				status: 400,
				errors: inputErrors
			});
		}

		db.Queueitem
		.find({ where: {id: req.params.id } })
		.on('success', function( queueitem )
		{
			if(queueitem)
			{
				queueitem
				.destroy()
				.success(function()
				{
					return res.send({
						status: 200,
						message: 'OK'
					});
				});
			}
		});
	});
};