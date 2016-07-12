/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const TYPE_CARTESIAN = 'CARTESIAN';
const TYPE_DELTA     = 'DELTA';
const ORIGIN_CORNER  = 'CORNER';
const ORIGIN_CENTER  = 'CENTER';

module.exports = {
	identity: 'printer',

	connection: 'default',

	attributes: {

		// name of printer
		name: {
			type: 'string',
			required: true
		},

		// printer type
		type: {
			type: 'string',
			enum: ['fdm', 'fff', 'sla', 'sls', 'dlp'],
			defaultsTo: 'fdm' // for now
		},

		// printer manufacturer
		manufacturer: {
			type: 'string'
		},

		// object with bed information (like size and heated)
		bed: {
			type: 'object',
			is_valid_bed: true,
			required: true
		},

		// object with axis directions
		axis: {
			type: 'object',
			is_valid_axis: true,
			required: true
		},

		// array with extruder objects
		extruders: {
			type: 'array',
			is_valid_extruders: true,
			required: true
		},

		// usb port that printer is connected to
		port: {
			type: 'string'
		},

		// baudrate of the printer, also autodetected by driver
		baudrate: {
			type: 'integer'
		},

		// custom gcode commands for this printer that will appear as a set of buttons in the interface
		customCommands: {
			type: 'array',
			is_valid_custom_commands: true
		},

		// user that created printer entry
		createdBy: {
			model: 'user'
		},

		// user that updated printer liast
		updatedBy: {
			model: 'user'
		},

		// custom start gcode (put in front of gcode file)
		startGcode: {
			type: 'array',
			defaultsTo: []
		},

		// custom end gcode (put at end of gcode file)
		endGcode: {
			type: 'array',
			defaultsTo: []
		},

		// gcode type to use when slicing for this printer
		gcodeFlavour: {
			type: 'string',
			defaultsTo: "GCODE_FLAVOR_REPRAP"
		},

		printJobs: {
			collection: 'printjob',
			via: 'printer'
		},

		// abilities for post-processing in Katana
		abilities: {
			type:       'array',
			defaultsTo: []
		},

		preset: {
			type: 'boolean',
			defaultsTo: false
		},

		presetOrder: {
			type: 'integer',
			defaultsTo: 9999
		},

		maxTemperature: {
			type: 'integer',
			defaultsTo: 250
		},

		maxBedTemperature: {
			type: 'integer',
			defaultsTo: 60
		}
	},

	types: {
		// custom validation for bed object
		is_valid_bed: function (val) {
			if (!val.hasOwnProperty('printerType'))
				return false;

			if (val.printerType === TYPE_CARTESIAN)
				return (typeof val.x === 'number') && (typeof val.y === 'number') && (typeof val.z === 'number') && (typeof val.heated === 'boolean');

			if (val.printerType === TYPE_DELTA)
				return (typeof val.diameter === 'number') && (typeof val.z === 'number') && (typeof val.heated === 'boolean');

			// printerType not valid
			return false;
		},

		// custom validation for axis object
		is_valid_axis: function (val) {
			return (val.x === 1 || val.x === -1) && (val.y === 1 || val.y === -1) && (val.z === 1 || val.z === -1);
		},

		// custom validation for extruder objects
		is_valid_extruders: function (val) {
			for (var i in val) {
				if (typeof val[i] !== "object") return false;
				if (typeof val[i].id !== "number") return false;
				if (typeof val[i].name !== "string") return false;
				if (typeof val[i].nozzleSize !== "number") return false;
				if (typeof val[i].filamentDiameter !== "number") return false;
			}
			return true;
		},

		// custom validation for custom commands
		is_valid_custom_commands: function (val) {
			for (var i in val) {
				if (typeof val[i] !== "object") return false;
				if (typeof val[i].label !== "string") return false;
				if (typeof val[i].command !== "string") return false;
			}
			return true;
		}
	},

	// custom validation for nested object like bed
	afterValidate(values, next) {
		if (values.hasOwnProperty('bed')) {
			if (values.bed.hasOwnProperty('placeOfOrigin'))
				if (values.bed.placeOfOrigin !== ORIGIN_CORNER && values.bed.placeOfOrigin !== ORIGIN_CENTER)
					return next(new Error('bed.placeOfOrigin has an invalid value'));

			// when cartesian and no origin, default to cornet
			if (values.bed.printerType === TYPE_CARTESIAN)
				if (!values.bed.hasOwnProperty('placeOfOrigin')) values.bed.placeOfOrigin = ORIGIN_CORNER;

			// when delta an no origin, default to center
			if (values.bed.printerType === TYPE_DELTA)
				if (!values.bed.hasOwnProperty('placeOfOrigin')) values.bed.placeOfOrigin = ORIGIN_CENTER;
		}

		return next();
	}
};
