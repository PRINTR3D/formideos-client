/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const fs       				= require('fs');
const thenify  				= require('thenify');
const readFile 				= thenify(fs.readFile);
const formideTools			= require('formide-tools');
const multipart 			= require('connect-multiparty');
const multipartMiddleware	= multipart();
const parseIni				= require('ini').parse;

module.exports = (routes, db) => {

	/**
	 * Get a list of sliceProfiles
	 */
	routes.get('/sliceprofiles', (req, res) => {
		db.SliceProfile
		.find({ or: [ { createdBy: req.user.id }, { preset: true } ] }, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
		.sort('presetOrder ASC')
		.then(res.ok)
		.error(res.serverError);
	});

	/**
	 * Get a single sliceProfile
	 */
	routes.get('/sliceprofiles/:id', (req, res) => {
		db.SliceProfile
		.findOne({ or: [ { createdBy: req.user.id }, { preset: true } ], id: req.params.id })
		.then((sliceProfile) => {
			if (!sliceProfile) return res.notFound();
			return res.ok(sliceProfile);
		});
	});

	/**
	 * Create a new sliceProfile
	 */
	routes.post('/sliceprofiles', (req, res) => {
		db.SliceProfile
		.create({
			createdBy:	req.user.id,
			name:		req.body.name,
			settings:	req.body.settings // TODO: check with formide-tools
		})
		.then((sliceProfile) => {
			return res.ok({ message: 'Sliceprofile created', sliceProfile });
		})
		.error(res.serverError);
	});

	/**
	 * Update a sliceProfile
	 */
	routes.put('/sliceprofiles/:id', (req, res) => {
		db.SliceProfile
		.update({ id: req.params.id, or: [ { createdBy: req.user.id }, { preset: true } ] }, {
			user:		req.user.id,
			name:		req.body.name,
			settings:	req.body.settings
		})
		.then((updated) => {
			return res.ok({ message: "Sliceprofile updated", sliceProfile: updated[0] });
		})
		.error(res.serverError);
	});

	/**
	 * Delete a sliceProfile
	 */
	routes.delete('/sliceprofiles/:id', (req, res) => {
		db.SliceProfile
		.destroy({ id: req.params.id, createdBy: req.user.id, preset: false })
		.then(() => {
			return res.ok({ message: "Sliceprofile deleted" });
		})
		.error(res.serverError);
	});

	/**
	 * Import slice settings from Cura
	 */
	routes.post('/sliceprofiles/cura', multipartMiddleware, (req, res) => {
		if (!req.files || !req.files.file) return res.badRequest('Cura file must be attached');

		const reference = require('katana-slicer/reference.json');
		const content = fs.readFileSync(req.files.file.path, 'utf-8');

		var curaProfile = null;
		try {
			curaProfile = parseIni(content);
		}
		catch (e) {
			FormideOS.log.error('Failed to parse Cura profile\n', e);
			return res.badRequest('Failed to parse Cura profile');
		}

		formideTools.createSliceprofileFromCura(curaProfile, reference, function(err, katanaSettings) {
			db.SliceProfile
			.create({
				createdBy:	req.user.id,
				name:		req.files.file.name,
				settings:	katanaSettings
			})
			.then((sliceProfile) => {
				return res.ok({ message: 'SliceProfile imported from Cura', sliceProfile: sliceProfile });
			})
			.error(res.serverError);
		});
	});
};
