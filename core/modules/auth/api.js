/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

var request = require('request');

module.exports = function(routes, module) {

	/*
	 * Login. Post an email address and password as body, get a AccessToken object back
	 */
	routes.post('/login', FormideOS.http.auth.authenticate('local-login'), (req, res) => {
		if (req.user.id === null) {
			return res.notFound();
		}
		var permissions = [];
		if (req.user.isOwner) permissions.push("owner");
		if (req.user.isAdmin) permissions.push("admin");
		FormideOS.db.AccessToken
		.create({
			createdBy:		req.user.id,
			sessionOrigin:	"local",
			permissions:	permissions
		})
		.then((accessToken) => {
			return res.ok({ access_token: accessToken.token });
		})
		.error(res.serverError);
	});

	/*
	 * Get current session. Used permissions.isUser to check AccessToken (req.token), returns success and AccessToken object
	 */
	routes.get('/session', FormideOS.http.permissions.isUser, (req, res) => {
		FormideOS.db.AccessToken
		.findOne({ token: req.token })
		.populate('createdBy')
		.exec(function (err, accessToken) {
			if (err) return res.serverError(err);
			return res.ok(accessToken);
		});
	});

	/*
	 * Get all AccessToken objects from the database
	 */
	routes.get('/tokens', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.AccessToken
		.find()
		.populate('createdBy')
		.then(res.ok)
		.error(res.serverError);
	});

	/*
	 * Generate an AccessToken manually with the given permissions (only permission available right now is 'admin')
	 */
	routes.post('/tokens', FormideOS.http.permissions.isUser, FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.AccessToken
		.create({
			permissions:	req.body.permissions,
			createdBy:		req.user.id,
			sessionOrigin:	'local'
		})
		.then((accessToken) => {
			return res.ok({ message: 'Access token created', accessToken });
		})
		.error(res.serverError);
	});

	/*
	 * Delete AccessToken from database. Basically forces user to login again
	 */
	routes.delete('/tokens/:token', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.AccessToken
		.destroy({ token: req.params.token })
		.then(() => {
			return res.ok({ message: 'Access token deleted' })
		})
		.error(res.serverError);
	});

	/*
	 * Get list of all users
	 */
	routes.get('/users', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.User
		.find()
		.then(res.ok)
		.error(res.serverError);
	});

	/*
	 * Get a single user object
	 */
	routes.get('/users/:id', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.User
		.findOne({ id: req.params.id })
		.then((user) => {
			if (!user) return res.notFound();
			return res.ok(user);
		})
		.error(res.serverError);
	});

	/**
	 * Create a user
	 */
	routes.post('/users', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.User
		.create({
			email:	 req.body.email,
			isAdmin: req.body.isAdmin
		})
		.then((user) => {
			return res.ok({ message: "User created", user });
		})
		.error(res.serverError);
	});

	/**
	 * Update a user
	 */
	routes.put('/users/:id', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.User
		.update({ id: req.params.id }, {
			email:	 req.body.email,
			isAdmin: req.body.isAdmin
		})
		.then((updated) => {
			return res.ok({ message: "User updated", user: updated[0] });
		})
		.error(res.serverError);
	});

	/*
	 * Delete a user
	 */
	routes.delete('/users/:id', FormideOS.http.permissions.isAdmin, (req, res) => {
		FormideOS.db.User
		.destroy({ id: req.params.id })
		.then(() => {
			return res.ok({ message: "User deleted" });
		})
		.error(res.serverError);
	});
};
