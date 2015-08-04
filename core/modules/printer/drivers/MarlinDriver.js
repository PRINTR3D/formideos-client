/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */
 
/*
 *	This is the printer driver for Marlin and Repetier firmware. Tested with Felix, Ultimaker, Builder and 
 *	Cyrus 3D printers. Feel free to add more functionality like SD card support. Also, we want some extra
 *	drivers for other firmwares. For that, an abstract driver function needs to be made that we can use to
 *	implement other drivers with the same functions.
 */

var SerialPort 	= require("serialport");
var fs			= require("fs");
var readline 	= require('readline');
var async		= require('async');

function PrinterDriver(port, baudrate, onCloseCallback) {
	
	this.open = false;
	this.onCloseCallback = onCloseCallback;
	this.baudrate = 0; //baudrate;
	
	this.port = port;
	this.matrix = null;
	
	this.status = 'connecting';
	this.statusInterval = null;
	
	this.extruders = [];
	this.bed = {};
	
	this.time = 0;
	this.queueID = null;
	
	this.messageBuffer = [];
	
	this.gcodeBuffer = [];
	this.currentLine = 0;
	
	this.timeStarted = null;

	this.connect();
	
	return this;
}


PrinterDriver.prototype.tryBaudrate = function(baudRate, callback) {
	var self = this;
	if (self.baudrate == 0) {
		var sPort = SerialPort.SerialPort;
		
		self.sp = new sPort(self.port, {
			baudrate: baudRate,
			parser: SerialPort.parsers.readline("\n")
		});
		
		self.sp.on('open', function() {
			
			//self.sendRaw("M105", function() {});
			
			setTimeout(function() {
				if (self.baudrate === 0) {
					self.sp.close();
					return callback(null, {success: false, baudrate: baudRate});
				}
			}, 3000);
			
			console.log('baudrate test with M105 for ' + baudRate);
			
			self.sp.on('data', function(data) {
				console.log(data);
				self.baudrate = baudRate;
				self.sp.close();
				return callback(null, {success: true, baudrate: baudRate});
			});
		});
	}
	else {
		return callback(null, {success: false, baudrate: baudRate});
	}
}

PrinterDriver.prototype.connectWithBaudrate = function(baudRate) {
	var self = this;
	var sPort = SerialPort.SerialPort;
	
	self.sp = new sPort(self.port, {
		baudrate: baudRate,
		parser: SerialPort.parsers.readline("\n")
	});
	
	self.sp.on('open', function() {
		self.status = 'online';
		self.open = true;
		
		self.sp.on('data', self.received.bind(self));
		self.statusInterval = setInterval(self.askStatus.bind(self), 2000);
		
		self.sp.on('error', function(err) {
			console.log(err);
		});
		
		self.sp.on('close', function() {
			clearInterval(self.statusInterval);
			self.open = false;
			self.onCloseCallback(self.port);
		});
	});
}

PrinterDriver.prototype.connect = function() {
	
	var self = this;
	
	FormideOS.events.emit('printer.connected', { port: self.port });
	FormideOS.debug.log('Printer connected: ' + self.port);
	
	async.series([
		function(callback) {
			// weird marlin specific baudrate that's not default: http://digital.ni.com/public.nsf/allkb/D37754FFA24F7C3F86256706005B9BE7
			self.tryBaudrate(250000, callback);
		},
		function(callback) {
			self.tryBaudrate(115200, callback);
		}
	], function(err, results) {
		console.log(results);
		for (var i in results) {
			var baudrateTest = results[i];
			if (baudrateTest.success) {
				self.connectWithBaudrate(baudrateTest.baudrate);
				break;
			}
		}
	});
};

PrinterDriver.prototype.map = {
	"home":					["G28"],
	"home_x": 				["G28 X"],
	"home_y": 				["G28 Y"],
	"home_z": 				["G28 Z"],
	"jog":					["G91", "G21", "G1 _axis_ _dist_"],
	"jog_abs":				["G90", "G21", "X_x_ Y_y_ Z_z_"],
	"extrude":				["G91", "G21", "G1 E _dist_"],
	"retract":				["G91", "G21", "G1 E _dist_"],
	"lcd_message":			["M117                     _msg_"],
	"temp_bed":				["M140 S_temp_"],
	"temp_extruder":		["M104 S_temp_"],
	"power_on":				["M80"],
	"power_off":			["M81"],
	"power_on_steppers":	["M17"],
	"power_off_steppers":	["M18"],
	"stop_all":				["M112"]
};

// M20: 	List SD card
// M21: 	Initialize SD card
// M22: 	Release SD card
// M23: 	Select SD file
// M24: 	Start/resume SD print
// M25:		pause SD print
// M27:		Report SD print status
// M28: 	Begin write to SD card
// M29: 	Stop writing to SD card
// M30: 	Delete a file on the SD card

// M106: 	Fan On
// M107: 	Fan Off

// M119: 	Get Endstop Status

// M600:	Pause for filament change

PrinterDriver.prototype.askStatus = function() {	
	this.sendRaw("M105", function() {});
	FormideOS.events.emit('printer.status', { type: 'status', data: this.getStatus() });
};

PrinterDriver.prototype.getCommands = function() {
	return this.map;
}

PrinterDriver.prototype.getStatus = function() {
	return {
		status: this.status,
		bed: this.bed,
		extruders: this.extruders,
		timeStarted: this.timeStarted,
		timeNow: new Date(),
		totalLines: this.gcodeBuffer.length,
		currentLine: this.currentLine,
		progress: (this.currentLine / this.gcodeBuffer.length) * 100,
		port: this.port,
		queueitemID: this.queueID
	};
};

PrinterDriver.prototype.command = function(command, parameters, callback) {
	console.log(command);
	if (this.status === 'online') {
		var command = Object.create(this.map[command]);
		for(var i in command) {
			for(var j in parameters) {
				if (typeof parameters[j] === 'string') {
					// make sure that values like X, Y, Z and G are in upper case. some printers don't understand the lower case versions.
					parameters[j] = parameters[j].toUpperCase();
				}
				command[i] = command[i].replace("_" + j + "_", parameters[j]);
			}
			this.sendRaw(command[i], callback);
		}
	}
};

PrinterDriver.prototype.sendRaw = function(data, callback) {
	console.log('sendRaw', data);
	if(this.open) {
		this.sp.write(data + "\n", callback);
	}
};

PrinterDriver.prototype.sendLineToPrint = function() {
	setTimeout(function() {
        if (this.status === 'printing') {
	        this.sendRaw(this.gcodeBuffer[this.currentLine]);
	        if(this.currentLine < this.gcodeBuffer.length) {
	        	this.currentLine++;
	        }
	        else {
		        this.stopPrint(function(err, result) {
			    	FormideOS.events.emit('printer.finished', { port: this.port });
		        }, true);
	        }
        }
    }.bind(this), 50);
};

PrinterDriver.prototype.parseGcode = function(fileContents, callback) {
	gcodeData = fileContents.split('\n');
	var parsedGcodeData = [];
	var lineCount = 0;
	while(lineCount < gcodeData.length) {
		var parsedLine = gcodeData[lineCount].split(";")[0];
		if (parsedLine.length > 1) {
			parsedGcodeData.push(parsedLine);
		}
		lineCount++;
	}
	this.gcodeBuffer = parsedGcodeData;
	callback();
};

PrinterDriver.prototype.startPrint = function(id, gcode, callback) {
	var self = this;
	if (self.status === 'online') {
		FormideOS.module('db').db.Queueitem.findOne({ _id: id, gcode: gcode }, function(err, queueitem) {
			if (err) FormideOS.debug.log(err);
			if (queueitem) {
				queueitem.status = 'printing';
				queueitem.save();
				fs.readFile(FormideOS.appRoot + FormideOS.config.get('paths.gcode') + '/' + gcode, 'utf8', function(err, gcodeData) {
					if (err) return callback(err);
					self.parseGcode(gcodeData, function() {
						self.status = 'printing';
						self.queueID = id;
						self.timeStarted = new Date();
						return callback(null, "started printing " + gcode);
					});
				});
			}
			else {
				return callback('queue item not found');
			}
		});
	}
};

PrinterDriver.prototype.pausePrint = function(callback) {
	if (this.status === 'printing') {
		this.status = 'paused';
		return callback(null, "paused printing");
	}
};

PrinterDriver.prototype.resumePrint = function(callback) {
	if (this.status === 'paused') {
		this.status = 'printing';
		return callback(null, "resume printing");
	}
};

PrinterDriver.prototype.stopPrint = function(callback, done) {
	var self = this;
	if (self.status === 'printing' || self.status === 'paused') {
		if (done) {
			FormideOS.module('db').db.Queueitem.findOne({ _id: self.queueID }, function(err, queueitem) {
				queueitem.status = 'finished';
				queueitem.save();
				self.status = 'online';
				self.currentLine = 0;
				self.queueID = null;
				self.gcodeBuffer = [];
				self.timeStarted = null;
				return callback(err, "stopped printing");
			});
		}
		else {
			FormideOS.module('db').db.Queueitem.findOne({ _id: self.queueID }, function(err, queueitem) {
				queueitem.status = 'queued';
				queueitem.save();
				self.status = 'online';
				self.currentLine = 0;
				self.queueID = null;
				self.gcodeBuffer = [];
				self.timeStarted = null;
				return callback(err, "stopped printing");
			});
		}
	}
};

PrinterDriver.prototype.gcode = function(callback) {
	if (this.status === 'online') {
		this.sendRaw(gcode, callback);
	}
};

PrinterDriver.prototype.received = function(data) {
	
	console.log('Received', data);
	
	if (data.indexOf("Transformation matrix") > -1) {
		// handle Transformation matrix info
	}
	
	if (data.indexOf("start") > -1) {
		this.sendLineToPrint();
	}
	
	if (data.indexOf("ok") > -1 || data.indexOf("OK") > -1) {
		this.sendLineToPrint();
	}
	
	if (data.indexOf("wait") > -1) {
		
	}
	
	if (data.indexOf("SD card inserted") > -1) {
		FormideOS.events.emit('printer.status', { type: 'sdcard_inserted', data: {port: this.port} });
	}
	
	if (data.indexOf("SD card removed") > -1) {
		FormideOS.events.emit('printer.status', { type: 'sdcard_removed', data: {port: this.port} });
	}
	
	if (data.indexOf("T:") > -1 || data.indexOf("T0:") > -1) {
		var re = /.T*:([\d\.]+) \/([\d\.]+)/g; 
		var m;
		
		var extruders = [];
		var bed = {
			temp: 0,
			targetTemp: 0
		};
		 
		while ((m = re.exec(data)) !== null) {
		    if (m.index === re.lastIndex) {
		        re.lastIndex++;
		    }
		    
		    var t = m[0].charAt(0);
		    
		    if (t === 'B') {
			    bed = {
				    temp: parseFloat(m[1]),
					targetTemp: parseFloat(m[2])
			    }
		    }
		    else {
			    extruders.push({
				    id: 'T' + t,
				    temp: parseFloat(m[1]),
					targetTemp: parseFloat(m[2])
			    });
		    }
		}
		
		this.extruders = extruders;
		this.bed = bed;
	}
	
	if (data.indexOf("Fanspeed") > -1) {
		FormideOS.events.emit('printer.status', { type: 'fanspeed_changed', data: {port: this.port, speed: ''} });
	}
	
	if (data.indexOf("Info") > -1) {
		FormideOS.events.emit('printer.status', { type: 'info', data: {port: this.port, message: ''} });
	}
	
	if (data.indexOf("Target") > -1) {
		// handle target temp info
	}
	
	// this.messageBuffer.push(data); // clogs memory!
};

PrinterDriver.prototype.getMessageBuffer = function() {
	return this.messageBuffer;	
};

module.exports = PrinterDriver;