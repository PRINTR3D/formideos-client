/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = {
    identity: 'presetprinter',

    connection: 'presets',

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

        // baudrate of the printer, also autodetected by driver
        baudrate: {
            type: 'integer'
        },

        // custom gcode commands for this printer that will appear as a set of buttons in the interface
        customCommands: {
            type: 'array',
            is_valid_custom_commands: true
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
        }
    },

    types: {
        // custom validation for bed object
        is_valid_bed: function (val) {
            return (typeof val.x === "number") && (typeof val.y === "number") && (typeof val.z === "number") && (typeof val.heated === "boolean");
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
    }
};
