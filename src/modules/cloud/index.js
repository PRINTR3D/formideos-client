'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const fs	     = require('fs');
const getmac	 = require('getmac');
const internalIp = require('internal-ip');
const net		 = require('net');
const path		 = require('path');
const publicIp	 = require('public-ip');
const request	 = require('request');
const socket	 = require('socket.io-client');
const uuid		 = require('uuid');
const Throttle   = require('throttle');

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

		if (FormideClient.ci && FormideClient.ci.wifi) {
			self.tools = FormideClient.ci.wifi;
		}

		function forwardEvents(event, data) {;
			self.cloud.emit(event, data);
		}

		// init cloud with new socket io client to online cloud url
		this.cloud = socket(config.url, {
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 1000,
			reconnectionDelayMax: 5000,
			transports: ['websocket'],
			// timeout: 5000
		});

		this.local = socket('ws://127.0.0.1:' + FormideClient.http.server.address().port, {
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 1000,
			reconnectionDelayMax: 5000,
			transports: ['websocket', 'polling'],
			// timeout: 5000
		});

		// handle local connection errors
		this.local.on('error', function (err) {
			FormideClient.log.error('Error with local connection', err);
		});

		// handle cloud connection errors
		this.cloud.on('error', function (err) {
			FormideClient.log.error('Error with cloud connection', err);
		});

		this.cloud.on('connect_error', function (err) {
			FormideClient.log.warn('Connecting to cloud');
		});

		this.cloud.on('connect_timeout', function (err) {
			FormideClient.log.error('Timeout when connecting to cloud');
		});

		this.cloud.on('reconnect_failed', function (err) {
			FormideClient.log.error('Failed reconnecting to cloud');
		});

		/**
		 * Connect to the cloud socket server
		 */
		this.cloud.on('connect', () => {
			let getMac = getmac.getMac;
			if (self.tools && self.tools.mac instanceof Function)
				getMac = self.tools.mac;

			let getIp = callback => {
				setImmediate(() => callback(null, internalIp()));
			};
			if (self.tools && self.tools.ip instanceof Function)
				getIp = self.tools.ip;

			// authenticate formideos based on mac address and api token, also
			// sends permissions for faster blocking via cloud
			publicIp.v4().then((publicIpAddress) => {
				getIp((err, internalIpAddress) => {
					getMac((err, macAddress) => {
						self.cloud.emit('authenticate', {
							type: 		 'client',
							ip: 		 publicIpAddress,
							ip_internal: internalIpAddress,
							version:     require('../../../package.json').version,
							environment: FormideClient.config.environment,
							mac: 		 macAddress,
							port:        FormideClient.config.get('app.port')
						}, response => {
							if (response.success) {
								FormideClient.log('Cloud connected');

								// forward all events to the cloud
								FormideClient.events.onAny(forwardEvents);
							}
							else {
								// something went wrong when connecting to the cloud
								FormideClient.log.error(
									'Cloud connection error:', response.message);
							}
						});
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
		 * HTTP proxy request from cloud
		 */
		this.cloud.on('http', data => {
			FormideClient.log('Cloud http call: ' + data.url);
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
			FormideClient.log('Cloud addToQueue: ' + data.gcode);
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
			if (FormideClient.events.listenersAny().length > 0)
				FormideClient.events.offAny(forwardEvents);
			FormideClient.log('Cloud disconnected, reconnecting...');

			// try reconnecting
			this.cloud.io.reconnect();
		});
	},

	/**
	 * Handles cloud authentication based on cloudConnectionToken, returns session access_token that cloud uses to perform http calls from then on
	 */
	authenticate: function(data, callback) {
		var self = this;
		FormideClient.db.AccessToken
		.findOne({ token: self.cloudToken })
		.then((accessToken) => {
			if (!accessToken) {
				var permissions = [];
				if (data.isOwner) permissions.push("owner");
				if (data.isAdmin) permissions.push("admin");

				FormideClient.db.AccessToken
				.create({
					permissions:   permissions,
					sessionOrigin: 'cloud'
				})
				.then((accessToken) => {
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
					uri: 'http://127.0.0.1:' + FormideClient.http.server.address().port + '/' + data.url,
					auth: {
						bearer: accessToken.token // add cloud api key to authorise to local HTTP api
					},
					qs: data.data
				}, function (error, response, body) {
					if (error) return callback(error);
					return callback(null, body);
				}).on('error', (err) => {
					FormideClient.log.error('http GET proxy error:', err);
				});
			}
			else {
				request({
					method: data.method,
					uri: 'http://127.0.0.1:' + FormideClient.http.server.address().port + '/' + data.url,
					auth: {
						bearer: accessToken.token // add cloud api key to authorise to local HTTP api
					},
					form: data.data
				}, function (error, response, body) {
					if (error) return callback(error);
					return callback(null, body);
				}).on('error', (err) => {
					FormideClient.log.error(`http ${data.method} proxy error:`, err);
				});
			}
		});
	},

	/*
	 * Handles addToQueue from cloud
	 */
	addToQueue: function(data, callback) {
		var hash = uuid.v4();

		FormideClient.db.QueueItem.create({
			origin:   'cloud',
			status:   'downloading',
			gcode:    hash, // create a new hash for local file storage!
			printJob: data.printJob,
			port:     data.port
		}, function(err, queueItem) {
			if (err) return callback(err);

			callback(null, {
				success:   true,
				queueItem: queueItem
			});

			const newPath = path.join(FormideClient.config.get('app.storageDir'), FormideClient.config.get('paths.gcode'), hash);
			const fws = fs.createWriteStream(newPath);

			// create a throttle of 10Mbps for downloading gcode
			const throttle = new Throttle(10000000);

            request
				.get(`${FormideClient.config.get('cloud.url')}/files/download/gcode?hash=${data.gcode}`, {
					strictSSL: false
				})
				.on('error', (err) => {
					FormideClient.log.error('error downloading gcode:', err.message);
					FormideClient.events.emit('queueItem.downloadError', { title: `${data.printJob.name} has failed to download`, message: err.message });
				})
				.pipe(throttle)
				.pipe(fws)
				.on('error', (err) => {
					FormideClient.log.error('error downloading gcode:', err.message);
					FormideClient.events.emit('queueItem.downloadError', { title: `${data.printJob.name} has failed to download`, message: err.message });
				})
				.on('finish', () => {
					FormideClient.log('finished downloading gcode. Received ' + fws.bytesWritten + ' bytes');

					// set status to queued to indicate it's ready to print
					queueItem.status = 'queued';
					queueItem.save(() => {
						FormideClient.events.emit('queueItem.downloaded', { title: `${data.printJob.name} is ready to print`, message: 'The gcode was downloaded and is now ready to be printed' });
					});
				});
		});
	},

	/**
	 * Get network connection status
	 */
	getStatus: function(cb) {
		if (this.tools)
			this.tools.status(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Get a list of nearby networks to connect to
	 */
	getNetworks: function(cb) {
		if (this.tools)
			this.tools.list(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Get internal IP address to show in UI
	 * @param cb
     */
	getInternalIp: function(cb) {
		let getIp = callback => {
			setImmediate(() => callback(null, internalIp()));
		};

		if (this.tools && this.tools.ip instanceof Function)
			getIp = this.tools.ip;

		getIp((err, internalIpAddress) => {
			return cb(err, internalIpAddress);
		});
	},

	/**
	 * Get currently connected network
	 * @param cb
	 */
	getNetwork: function(cb) {
		if (this.tools)
			this.tools.network(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Enable access point to be able to switch networks or redo setup
	 */
	setupMode: function(cb) {
		if (this.tools)
			this.tools.reset(cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Connect device to selected network
	 */
	connect: function (config, cb) {
		if (this.tools)
			this.tools.connect(config, cb);
		else
			cb(new Error('element-tools not installed'));
	},

	/**
	 * Generate a setup code for the cloud
	 */
	generateCode: function(cb) {
		let getMac = getmac.getMac;
		if (this.tools && this.tools.mac instanceof Function)
			getMac = this.tools.mac;

		// get MAC address, then ask API for setup code
		getMac((err, macAddress) => {
			request
				.get(`${FormideClient.config.get('cloud.url')}/devices/register/code?mac_address=${macAddress}`, {
					strictSSL: false
				}, function (err, response, body) {
					if (err) return cb(err);

					try {
						body = JSON.parse(body);
						if (response.statusCode !== 200) return cb(new Error(`Could not get code: ${body.message}`));
						return cb(null, body.code);
					}
					catch (e) {
						return cb(e);
					}
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
