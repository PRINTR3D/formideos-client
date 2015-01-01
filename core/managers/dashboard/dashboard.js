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

module.exports = function(macAddress)
{
	var dashboard = require('socket.io').listen(Printspot.server);

	dashboard.on('connection', function(socket)
	{
		socket.emit('handshake', {
			id:socket.id
		});

		socket.on('typeof', function(data)
		{
			if(data.type == 'dashboard')
			{
				Printspot.eventbus.emit('internalSuccess', {
					type: 'dashboard',
					data: {
						port: Printspot.config.get('dashboard.port')
					}
				});

				socket.emit('auth', {message: 'OK', id: socket.id});
			}
		});

		// Socket disconnect
		socket.on('disconnect', function()
		{
			Printspot.eventbus.emit('internalMessage', {
				type: 'dashboard',
				data: {
					message: 'Dashboard disconnected'
				}
			});
		});

		// load channels from config
		Printspot.config.get('channels.dashboard').forEach(function(method)
		{
			(function(realMethod)
			{
				socket.on(realMethod, function(data)
				{
					var json = {
						"type": realMethod,
						"data": data
					};

					Printspot.eventbus.emit('dashboardPush', json);
				});
			})(method);
		});

		// push print start
		socket.on('dashboard_push_printer_start', function(data)
		{
			data.hash = __dirname + '/../../uploads/gcode/' + data.hash;

			var json = {
				"type": "dashboard_push_printer_start",
				"data": data
			};

			Printspot.eventbus.emit('dashboardPush', json);
		});

		Printspot.eventbus.on('printerStatus', function(status)
		{
			socket.emit(status.type, status.data);
		});

		Printspot.eventbus.on('notification', function(notification)
		{
			socket.emit('client_push_notification', notification.message);
		});

		// todo: add listener for other client commands
	});

	return dashboard;
}