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

// dependencies
var net 		= require('net');
var request 	= require('request');
var socket 		= require('socket.io-client');

module.exports =
{	
	cloud: {},
	local: [],

	/*
	 * Init for cloud manager
	 */
	init: function(config) {
		// init cloud with new socket io client to online cloud url
		this.cloud = socket( config.url );

		// when connecting to cloud
		this.cloud.on('connect', function() {
			// authenticate formideos based on mac address and api token, also sends permissions for faster blocking via cloud
			this.cloud.emit('authenticate', {
				type: 'client',
				mac: FormideOS.macAddress,
				token: FormideOS.manager('settings').getSetting('cloud', 'accesstoken'),
				permissions: FormideOS.manager('settings').getSetting('cloud', 'permissions'),
			});
			FormideOS.manager('debug').log('Cloud connected');
		}.bind(this));

		// on http proxy request
		this.cloud.on('http', function(data, callback) {
			FormideOS.manager('debug').log('Cloud http call: ' + data.manager + '/' + data.function);
			// call http function
			this.http(data, function(response) {
				callback(response);
			});
		}.bind(this));

		// on ws proxy request
		this.cloud.on('listen', function(data, callback) {
			FormideOS.manager('debug').log('Cloud ws listen: ' + data.manager + '.' + data.channel);
			// call listen function
			this.listen(data, function(response) {
				callback(response);
			});
		}.bind(this));

		// emit ws to cloud
		this.cloud.on('emit', function(data, callback) {
			FormideOS.manager('debug').log('Cloud ws emit: ' + data.manager + '.' + data.channel);
			// call emit function
			this.emit(data);
		}.bind(this));

		// when disconnecting
		this.cloud.on('disconnect', function() {
			FormideOS.manager('debug').log('Cloud diconnected');
		});
	},

	/*
	 * Handles HTTP proxy function calls from cloud connection, calls own local http api after reconstructing HTTP request
	 */
	http: function(data, callback) {
		request({
			method: data.method,
			uri: 'http://127.0.0.1:' + FormideOS.manager('http').server.server.address().port + '/api/' + data.manager + '/' + data.function,
			auth: {
				bearer: data.token // add cloud api key to authorise to local HTTP api
			},
			form: data.data || {}
		}, function( error, response, body ) {
			callback( body );
		});
	},

	/*
	 * Handles WS proxy call from cloud connection, calls own local ws server and relays calls 
	 */
	listen: function(data, callback) {
		var self = this;
		if(!this.local[data.manager]) {
			this.local[data.manager] = socket( 'ws://127.0.0.1:' + FormideOS.manager('http').server.server.address().port + '/' + data.manager);
		}
		this.local[data.manager].on(data.channel, function(response) {
			self.cloud.emit(data.manager + "." + data.channel, response);
		});
	},

	/*
	 * Handles WS emits to proxy (printer status/logs/slicer status), relays local emits to cloud
	 */
	emit: function(data) {
		var self = this;
		if(!this.local[data.manager]) {
			this.local[data.manager] = socket( 'ws://127.0.0.1:' + FormideOS.manager('http').server.server.address().port + '/' + data.manager);
		}
		this.local[data.manager].emit(data.channel, data.data);
	}
}