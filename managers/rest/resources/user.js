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

module.exports = function(db, server)
{
	server.route([
		{
			method: 'GET',
			path: '/api/users',
			config: {
	            auth: 'session'
	        },
			handler: function(req, res)
			{
				db.User
				.findAll()
				.then(function(users)
				{
					res(users);
				});
			}
		},
		{
			method: 'GET',
			path: '/api/users/{id}',
			config: {
	            auth: 'session'
	        },
			handler: function(req, res)
			{
				db.User
				.find({ where: {id: req.params.id } })
				.then(function(user)
				{
					res(user);
				});
			}
		},
		{
			method: 'POST',
			path: '/api/users',
			config: {
	            auth: 'session'
	        },
			handler: function(req, res)
			{
				db.User
				.create(req.payload)
				.success(function()
				{
					res('OK')
				});
			}
		},
		{
			method: 'PUT',
			path: '/api/users/{id}',
			config: {
	            auth: 'session'
	        },
			handler: function(req, res)
			{
				db.User
				.find({ where: {id: req.params.id } })
				.on('success', function( user )
				{
					if(user)
					{
						user
						.updateAttributes(req.payload)
						.success(function()
						{
							res('OK');
						});
					}
				});
			}
		},
		{
			method: 'DELETE',
			path: '/api/users/{id}',
			config: {
	            auth: 'session'
	        },
			handler: function(req, res)
			{
				db.User
				.find({ where: {id: req.params.id } })
				.on('success', function( user )
				{
					if(user)
					{
						user
						.destroy()
						.success(function()
						{
							res('OK');
						});
					}
				});
			}
		}
	]);
};