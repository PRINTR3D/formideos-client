/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = {
	identity: 'userfile',

	connection: 'default',

	attributes: {

		createdBy: {
			model: 'User'
		},

		hash: {
			type: 'string',
			required: true
		},

		filename: {
			type: 'string',
			required: true
		},

		prettyname: {
			type: 'string',
			required: true
		},

		filetype: {
			type: 'string',
			required: true,
			enum: ['text/stl', 'text/gcode']
		},

		filesize: {
			type: 'int',
			required: true
		},

/*
		images: {
			collection: 'Image'
		},
*/

		tags: {
			type: 'array'
		},

		description: {
			type: 'string'
		},

		printJobs: {
			collection: 'printjob',
			via: 'files'
		}
	}
};
