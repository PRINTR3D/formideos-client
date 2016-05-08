/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = (routes, db) => {

    /**
     * Get a list of preset sliceprofiles
     */
    routes.get('/sliceprofiles', (req, res) => {
        db.PresetSliceprofile
            .find({}, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
            .then(res.ok)
            .error(res.serverError);
    });

    /**
     * Get a single preset sliceprofile
     */
    routes.get('/sliceprofiles/:id', (req, res) => {
        db.PresetSliceprofile
            .findOne({ id: req.params.id })
            .then((sliceprofile) => {
                if (!sliceprofile) return res.notFound();
                return res.ok(sliceprofile);
            })
            .error(res.serverError);
    });
};
