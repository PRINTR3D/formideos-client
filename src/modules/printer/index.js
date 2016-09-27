/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

// dependencies
const AbstractPrinter = require('./abstractPrinter');

module.exports = {

	numberOfPorts: 0,
	driver: null,
	printers: {},
	config: {},

	init: function(config) {

		var self = this;
		this.config = config;

		// loaded via katana-slicer npm package and node-pre-gyp
		try {
			this.driver = require('formide-drivers');
		}
		catch (e) {
			FormideClient.log.warn('Cannot load drivers binary, try re-installing formide-drivers');
		}

		// check if any items were printing when a hard reboot was done (e.g. power loss) and set those back to queued
		FormideClient.db.QueueItem
			.update({ status: 'printing' }, { status: 'queued' })
			.exec(function(err) {
				if (err) FormideClient.log.warn(err);
			});

		// start drivers
		if (this.driver !== null)
			this.driver.start(function(err, started, event) {
				if (err) {
					FormideClient.log.error('formide-drivers err: ' + err.message);
				}
				else if (started) {
					FormideClient.log('formide-drivers started successfully');
				}

				else if (event) {
					// an event came back which we can use to do sometehing with!

					if (event.type === 'printerConnected') {
						self.printerConnected(event.port);
					}
					else if (event.type === 'printerDisconnected') {
						self.printerDisconnected(event.port);
					}
					else if (event.type === 'printerOnline') {
						self.printerOnline(event.port);
					}
					else if (event.type === 'printFinished') {
						self.printFinished(event.port, event.printjobID);
					}
					else if (event.type === 'printerWarning') {
						self.printerEvent('warning', event);
					}
					else if (event.type === 'printerError') {
						self.printerEvent('error', event);
					}
				}
			});
	},

	printerConnected: function(port) {
		if (this.numberOfPorts < 4) {
			var self = this;
			FormideClient.log('Printer connected: ' + port);
			FormideClient.events.emit('printer.connected', { port: port, notification: true, level: "success", title: "Printer connected", message: "A printer was connected" });
			self.printers[port.split("/")[2]] = new AbstractPrinter(port, self.driver);
		}
		else {
			FormideClient.events.emit('printer.maxExceeded', { port: port, notification: true, level: 'warning', title: 'Max exceeded', message: 'Maximum number of printers already connected'})
		}
	},

	printerDisconnected: function(port) {
		const self = this;
		this.numberOfPorts--;
		if (this.printers[port.split("/")[2]] !== undefined) {
			// any items that were 'printing' for this printer should be set back to 'queued'
			FormideClient.db.QueueItem
				.update({ port: port, status: 'printing' }, { status: 'queued' })
				.exec(function(err) {
					if (err) FormideClient.log.warn(err);
					FormideClient.log('Printer disconnected: ' + port);
					FormideClient.events.emit('printer.disconnected', { port: port, notification: true, level: "warning", title: "Printer disconnected", message: "A printer was disconnected" });
					clearInterval(self.printers[port.split("/")[2]].statusInterval);
					delete self.printers[port.split("/")[2]];
				});
		}
	},

	printerOnline: function(port) {
		this.numberOfPorts++;
		FormideClient.log('Printer online: ' + port);
		FormideClient.events.emit('printer.online', { port: port });
	},

	printFinished: function(port, printjobId) {
		if (this.printers[port.split("/")[2]] !== undefined) {
			this.printers[port.split("/")[2]].printFinished(printjobId);
		}
	},

	/**
	 * When an event from the driver is received, emit it to websockets and pass on the event
	 * @param level
	 * @param event
     */
	printerEvent: function(level, event) {
		FormideClient.events.emit('printer.' + level, event);
	},

	getPrinters: function() {
		var result = {};
		for(var i in this.printers) {
			result[i] = this.printers[i].getStatus();
		}
		return result;
	},

	getCommands: function(port, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		callback(this.printers[port].getCommands());
	},

	getStatus: function(port, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		callback(null, this.printers[port].getStatus());
	},

	printerControl: function (port, data, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].command(data.command, data.parameters, callback);
	},

	gcode: function(port, gcode, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].gcode(gcode, callback);
	},

	tuneGcode: function (port, tuneCode, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].tune(tuneCode, callback);
	},

	startPrint: function(port, id, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].startPrint(id, callback);
	},

	stopPrint: function(port, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].stopPrint(callback);
	},

	pausePrint: function(port, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].pausePrint(callback);
	},

	resumePrint: function(port, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].resumePrint(callback);
	},

	printFile: function(port, file, callback) {
		if (this.printers[port] == undefined) return callback(null, false);
		this.printers[port].printFile(file, callback)
	}
};