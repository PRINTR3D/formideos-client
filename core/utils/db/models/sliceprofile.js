/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports ={
	identity: 'sliceprofile',

	connection: 'default',

	attributes: {

		// name of sliceprofile, presets should use something descriptive like "Felix Pro Medium Quality"
		name: {
			type: 'string',
			required: true
		},

		createdBy: {
			model: 'User'
		},

		settings: {
			type: 'object',
			required: true
		},

		// we keep track of sliceprofiles versions to deal with slicer updates
		version: {
			type: 'string'
		},

		printJobs: {
			collection: 'printjob',
			via: 'sliceProfile'
		},

		preset: {
			type: 'boolean',
			defaultsTo: false
		},

		presetOrder: {
			type: 'integer',
			defaultsTo: 9999
		}
	}
};
