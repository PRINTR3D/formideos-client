/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

var mongoose 		= require('mongoose');
var timestamps  = require('mongoose-timestamp');
var Schema 			= mongoose.Schema;
var deepPopulate 	= require('mongoose-deep-populate');

var schema = new Schema({
	user: { type: String, ref: 'users' },
	origin: { type: String, required: true },
	gcode: { type: String, required: true },
	status: { type: String, required: true },
	printjob: { type: Schema.Types.Mixed },
	printer: { type: Schema.Types.Mixed }
});
schema.plugin(timestamps);

schema.plugin(deepPopulate);
mongoose.model('queueitems', schema);
var model = mongoose.model('queueitems');
module.exports = model;