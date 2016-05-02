'use strict';

/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const assert  = require('assert');
const os      = require('os');
const request = require('request');
const thenify = require('thenify');

// in seconds
const REGISTRATION_START_TIMEOUT  = 60;  // 1m
const REGISTRATION_FINISH_TIMEOUT = 900; // 15m

// in ms
const REGISTRATION_START_INTERVAL  = 5000;  // 5s
const REGISTRATION_FINISH_INTERVAL = 15000; // 15s

const get  = thenify(request.get);
const post = thenify(request.post);

module.exports = (routes, cloud) => {

	/**
	 * Check if device is found for setup.formide.com
	 */
	routes.get('/alive', (req, res) => {
		return res.ok('OK');
	});

	/**
	 * Get the current network connection status
	 */
	routes.get('/status', (req, res) => {
		cloud.getStatus((err, connected) => {
			if (err) return res.serverError(err);
			cloud.getInternalIp((err, internalIp) => {
				if (err) return res.serverError(err);
				connected = connected ? true : false;
				return res.ok({ connected, internalIp });
			});
		});
	});

	/**
	 * List nearby networks
	 */
	routes.get('/networks', (req, res) => {
		cloud.getNetworks((err, networks) => {
			if (err) return res.serverError(err);
			return res.ok(networks);
		});
	});

	/**
	 * Get currently connected to network
	 */
	routes.get('/network', (req, res) => {
		cloud.getNetwork((err, ssid) => {
			if (err) return res.serverError(err);
			return res.ok({ ssid })
		});
	});

	/**
	 * Go to setup mode (i.e. enable AP)
	 */
	routes.post('/setup', (req, res) => {
		cloud.setupMode(err => {
			if (err) return res.serverError(err);
			return res.ok({ message: 'Started access point' });
		});
	});

	/**
	 * Connect to Wi-Fi
	 */
	routes.post('/wifi', (req, res) => {
		if (req.body.ssid == null)
			return res.badRequest('ssid must be set');
		if (req.body.password == null)
			return res.badRequest('password must be set');

		cloud.connect(req.body.ssid, req.body.password, err => {
			if (err)
				return res.serverError(err);

			res.ok({ message: 'Device connected to network' });
		});
	});

	/**
	 * Connect to Wi-Fi and register to cloud
	 */
	routes.post('/connect', (req, res) => {
		if (req.body.ssid == null)
			return res.badRequest('essid must be set');
		if (req.body.password == null)
			return res.badRequest('password must be set');
		if (req.body.macAddress == null)
			return res.badRequest('macAddress must be set');
		if (req.body.registrationToken == null)
			return res.badRequest('registrationToken must be set');

		cloud.connect(req.body.ssid, req.body.password, err => {
			if (err)
				return res.serverError(err);

			res.ok({ message: 'Device connected to network' });

			const registrationStart = os.uptime();
			FormideOS.log('Waiting for device registration to start');
			return setTimeout(waitForRegistrationStart,
				REGISTRATION_START_INTERVAL,
				registrationStart,
				req.body.macAddress,
				req.body.registrationToken,
				cloud);
		});
	});
};

function waitForRegistrationStart(
	registrationStart, macAddress, registrationToken, cloud) {

	assert(registrationStart);
	assert(macAddress);
	assert(registrationToken);
	assert(cloud);

	const registrationEndpoint
		= `${FormideOS.config.get('cloud.url')}/devices/register`;

	FormideOS.log('Trying to create device registration token...');

	post(registrationEndpoint, { form: {
		mac_address:        macAddress,
		registration_token: registrationToken
	}}).then(args => {
		const response = args[0];
		const body     = args[1];

		// If registration token created, wait for registration to finish,
		// else go into setup mode

		const registrationEnd = os.uptime();

		// If MAC not found
		if (response.statusCode == 404) {
			let msg;
			try {
				msg = JSON.parse(body);
				if (msg && msg.message)
					msg = msg.message;

				if (msg)
					msg = `: ${msg}`;
			}
			catch (e) {
				msg = '';
			}

			FormideOS.log(`Failed to create device registration token${msg}`);
			return startSetup(cloud);
		}

		// If device already registered
		else if (response.statusCode == 409)
			// there's nothing else to do
			return FormideOS.log('Device already registered');

		// If timed out
		else if ((registrationEnd - registrationStart)
			>= REGISTRATION_START_TIMEOUT) {

			FormideOS.log('Device registration token creation timed out');

			return startSetup(cloud);
		}

		// If something else not OK
		else if (response.statusCode != 200)
			// retry registration
			return setTimeout(waitForRegistrationStart,
				REGISTRATION_START_INTERVAL,
				registrationStart,
				macAddress,
				registrationToken,
				cloud);

		// Else if everything went well
		FormideOS.log('Waiting for device registration to finish');
		setTimeout(waitForRegistrationFinish,
			REGISTRATION_FINISH_INTERVAL,
			os.uptime(),
			registrationToken,
			cloud);

	}, err => {
		const registrationEnd = os.uptime();
		if ((registrationEnd - registrationStart)
			>= REGISTRATION_START_TIMEOUT) {

			FormideOS.log(
				'Device registration token creation timed out:',
				err.message);

			return startSetup(cloud);
		}

		setTimeout(waitForRegistrationStart,
			REGISTRATION_START_INTERVAL,
			registrationStart,
			macAddress,
			registrationToken,
			cloud);

		return FormideOS.log(err.message);
	});
}

function waitForRegistrationFinish(
	registrationStart, registrationToken, cloud) {

	assert(registrationStart);
	assert(registrationToken);
	assert(cloud);

	const registrationEndpoint
		= `${FormideOS.config.get('cloud.url')}/devices/register`;
	const registrationTokenEndpoint
		= `${registrationEndpoint}/${registrationToken}`;

	FormideOS.log('Checking if device is registered...');

	// Check if if device is still in unregistered state after
	// some time and go into setup mode
	get(registrationTokenEndpoint).then(args => {
		const response        = args[0];
		const registrationEnd = os.uptime();

		// if registration token is not found, device is registered
		if (response.statusCode == 404) {
			return FormideOS.log('Device registered');
		}

		// If more that X time has passed and registration is still
		// not done, go into setup mode
		if ((registrationEnd - registrationStart)
			>= REGISTRATION_FINISH_TIMEOUT) {

			FormideOS.log('Device registration timed out');
			return startSetup(cloud);
		}

		// Else try again
		setTimeout(waitForRegistrationFinish,
			REGISTRATION_FINISH_INTERVAL,
			registrationStart,
			registrationToken,
			cloud);
	}, err => {
		// If more that X time has passed and registration is still
		// not done, go into setup mode
		const registrationEnd = os.uptime();
		if ((registrationEnd - registrationStart)
			>= REGISTRATION_FINISH_TIMEOUT) {

			FormideOS.log(
				'Device registration timed out:',
				err.message);

			return startSetup(cloud);
		}

		setTimeout(waitForRegistrationFinish,
			REGISTRATION_FINISH_INTERVAL,
			registrationStart,
			registrationToken,
			cloud);

		return FormideOS.log(err.message);
	});
}

function startSetup(cloud) {
	cloud.setupMode(err => {
		if (err)
			return FormideOS.log(err.message);
		return FormideOS.log('Switched device into setup mode');
	});
}
