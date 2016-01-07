'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const net		 = require('net');
const request	 = require('request');
const socket	 = require('socket.io-client');
const publicIp	 = require('public-ip');
const internalIp = require('internal-ip');
const fs	     = require('fs');
const path		 = require('path');
const uuid		 = require('node-uuid');
const getMac	 = require('getmac');

module.exports = {

	// socket connections
	cloud: null,
	local: null,

	// element-tools for WiFi
	tools: null,

	// store cloud accessToken
	cloudToken: '',

	/**
	 * Init for cloud module
	 */
	init: function(config) {

		// use self to prevent bind(this) waterfall
		var self = this;

		try {
			self.tools = require('element-tools');
		}
		catch (e) {
			console.log('element-tools not found, probably not running on The Element');
		}

		function forwardEvents(data) {
			self.cloud.emit(this.event, data);
		}

		// init cloud with new socket io client to online cloud url
		this.cloud = socket(config.url);
		this.local = socket('ws://127.0.0.1:' + FormideOS.http.server.address().port);

		// handle cloud connection error
		this.cloud.on('error', function (err) {
			FormideOS.log.error("Error connecting to cloud: " + err);
		});

		/**
		 * Connect to the cloud socket server
		 */
		this.cloud.on('connect', function () {

			// authenticate formideos based on mac address and api token, also sends permissions for faster blocking via cloud
			publicIp(function (err, ip) {
				getMac.getMac(function(err, macAddress) {
					var pkg = fs.readFileSync(path.join(FormideOS.appRoot, 'package.json'), 'utf8');
					pkg = JSON.parse(pkg); // no try needed, since package.json needs to be valid for the app to boot at all
					self.cloud.emit('authenticate', {
						type: 'client',
						mac: macAddress,
						ip: ip,
						ip_internal: internalIp(),
						version: pkg.version,
						environment: FormideOS.config.environment,
						port: FormideOS.config.get('app.port')
					}, function(response) {
						if (response.success) {
							FormideOS.log('Cloud connected');

							// forward all events to the cloud
							FormideOS.events.onAny(forwardEvents);
						}
						else {
							// something went wrong when connecting to the cloud
							FormideOS.log.error('Cloud connection error: ' + response.message);
						}
					});
				});
			});
		});

		/**
		 * See if client is online
		 */
		this.cloud.on('ping', data => {
			self.cloud.emit('pong', data);
		});

		/**
		 * This event is triggered when a user logs into the cloud and want to access one of his clients
		 */
		// this.cloud.on('authenticateUser', data => {
		// 	FormideOS.log("Cloud authenticate user:" + data.id);
		// 	this.authenticate(data, (err, accessToken) => {
		// 		FormideOS.log('Cloud user authorized with access_token ' + accessToken.token);
		// 		self.cloud.emit(
		// 			'authenticateUser',
		// 			getCallbackData(data._callbackId, err, accessToken.token));
		// 	});
		// });

		/**
		 * HTTP proxy request from cloud
		 */
		this.cloud.on('http', data => {
			FormideOS.log('Cloud http call: ' + data.url);
			// call http function
			this.http(data, (err, response) => {
				self.cloud.emit(
					'http',
					getCallbackData(data._callbackId, err, response));
			});
		});

		/**
		 * Send a gcode file to a client to print a cloud sliced printjob
		 */
		this.cloud.on('addToQueue', data => {
			FormideOS.log('Cloud addToQueue: ' + data.gcode);
			self.addToQueue(data, (err, response) => {
				self.cloud.emit(
					'addToQueue',
					getCallbackData(data._callbackId, err, response));
			});
		});

		/**
		 * Handle disconnect
		 */
		this.cloud.on('disconnect', () => {
			// turn off event forwarding
			FormideOS.events.offAny(forwardEvents);
			FormideOS.log('Cloud disconnected');
		});
	},

	/**
	 * Handles cloud authentication based on cloudConnectionToken, returns session access_token that cloud uses to perform http calls from then on
	 */
	authenticate: function(data, callback) {
		var self = this;
		FormideOS.db.AccessToken
		.findOne({ token: self.cloudToken })
		.then(accessToken => {
			if (!accessToken) {
				var permissions = [];
				if (data.isOwner) permissions.push("owner");
				if (data.isAdmin) permissions.push("admin");

				FormideOS.db.AccessToken
				.create({
					permissions:   permissions,
					sessionOrigin: 'cloud'
				})
				.then(accessToken => {
					self.cloudToken = accessToken.token;
					return callback(null, accessToken);
				})
				.catch(callback);
			}
			else {
				return callback(null, accessToken);
			}
		})
		.catch(callback);
	},

	/**
	 * Handles HTTP proxy function calls from cloud connection, calls own local http api after reconstructing HTTP request
	 */
	http: function(data, callback) {
		this.authenticate({
			isOwner: true,
			isAdmin: true
		}, function(err, accessToken) {
			if (err) return callback(err);
			if (data.method === 'GET') {
				request({
					method: 'GET',
					uri: 'http://127.0.0.1:' + FormideOS.http.server.address().port + '/' + data.url,
					auth: {
						bearer: accessToken.token // add cloud api key to authorise to local HTTP api
					},
					qs: data.data
				}, function (error, response, body) {
					if (error) return callback(error);
					return callback(null, body);
				});
			}
			else {
				request({
					method: data.method,
					uri: 'http://127.0.0.1:' + FormideOS.http.server.address().port + '/' + data.url,
					auth: {
						bearer: accessToken.token // add cloud api key to authorise to local HTTP api
					},
					form: data.data
				}, function (error, response, body) {
					if (error) return callback(error);
					return callback(null, body);
				});
			}
		});
	},

	/*
	 * Handles addToQueue from cloud
	 */
	addToQueue: function(data, callback) {
		var self = this;
		var hash = uuid.v4();

		FormideOS.db.QueueItem.create({
			origin: 'cloud',
			status: 'queued',
			gcode: hash, // create a new hash for local file storage!
			printJob: data.printJob,
			port: data.port
		}, function(err, queueItem) {
			if (err) return callback(err);
			callback(null, {
				success: true,
				queueItem: queueItem
			});

			// TODO: better way of fetching gcode files from cloud
			request({
				method: 'GET',
				url: FormideOS.config.get('cloud.url') + '/files/download/gcode',
				qs: {
					hash: data.gcode
				},
				strictSSL: false
			})
			.on('response', function(response) {
				var newPath = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.gcode'), hash);
				var fws = fs.createWriteStream(newPath);
				response.pipe(fws);
				response.on( 'end', function() {
					FormideOS.log('finished downloading gcode. Recieved ' + fws.bytesWritten + ' bytes');
				});
			});
		});
	},

	/**
	 * Get a list of nearby networks to connect to
	 */
	getNetworks: function(cb) {
		if (this.tools)
			this.tools.networks(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Enable access point to be able to switch networks or redo setup
	 */
	setupMode: function(cb) {
		if (this.tools)
			this.tools.startAp(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Connect device to selected network
	 */
	connect: function (essid, password, cb) {
		if (this.tools)
			this.tools.connect(essid, password, cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Register device in cloud using accessToken
	 */
	registerDevice: function (accessToken, cb) {
		var self = this;

		getMac.getMac(function (err, macAddress) {
			if (err) return cb(err);
			self.cloud.emit("register", {
				mac:		 macAddress,
				accessToken: accessToken // accessToken from setup.formide.com to identify user
			}, function (response) {
				if (response.success === false || !response.deviceToken) {
					FormideOS.log.error(response.message);
					return cb(new Error("Error registering device: " + response.reason));
				}
				return cb(null, response);
			});
		});
	}
};

function getCallbackData(callbackId, err, result) {
	const data = { _callbackId: callbackId };

	if (err)
		data.error = { message: err.message };
	else
		data.result = result;

	return data;
}
