var mongoose = require('mongoose')
var Schema = mongoose.Schema;

var schema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'users' },
	modelfiles: [{ type: Schema.Types.ObjectId, ref: 'modelfiles' }],
	printer: { type: Schema.Types.ObjectId, ref: 'printers' },
	sliceprofile: { type: Schema.Types.ObjectId, ref: 'sliceprofiles' },
	materials: [{ type: Schema.Types.ObjectId, ref: 'materials' }],
	gcode: { type: String },
	sliceSettings: { type: Schema.Types.Mixed },
	sliceResponse: { type: Schema.Types.Mixed },
	sliceFinished: { type: Boolean, required: true },
	sliceMethod: { type: String, required: true }
});

mongoose.model('printjobs', schema);
var model = mongoose.model('printjobs');
module.exports = model;