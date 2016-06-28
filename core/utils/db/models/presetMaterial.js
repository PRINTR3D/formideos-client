/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = {
    identity: 'presetmaterial',

    connection: 'presets',

    attributes: {

        name: {
            type: 'string',
            required: true
        },

        type: {
            type: 'string',
            required: true
        },

        temperature: {
            type: 'integer',
            required: true
        },

        firstLayersTemperature: {
            type: 'integer',
            required: true
        },

        bedTemperature: {
            type: 'integer',
            required: true
        },

        firstLayersBedTemperature: {
            type: 'integer',
            required: true
        },

        feedRate: {
            type: 'integer',
            defaultsTo: 100
        }
    }
};