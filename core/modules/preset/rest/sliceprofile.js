/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = (routes, db) => {

    /**
     * Get a list of preset sliceprofiles
     */
    routes.get('/sliceprofiles', (req, res) => {
        db.Sliceprofile
            .find({ preset: true }, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
            .sort('presetOrder ASC')
            .then(res.ok)
            .error(res.serverError);
    });

    /**
     * Search through sliceprofile presets
     */
    routes.get('/sliceprofiles/search', (req, res) => {
        const searchArray = req.query.s.split(',');
        var searchObject = {
            preset: true,
            or: []
        };

        for (var el of searchArray) {
            searchObject.or.push({
                like: { name: `%${el}%` }
            });
        }

        db.Sliceprofile
            .find(searchObject, { select: ((req.query.fields) ? req.query.fields.split(',') : '') })
            .then(res.ok)
            .catch(res.serverError);
    });

    /**
     * Get a single preset sliceprofile
     */
    routes.get('/sliceprofiles/:id', (req, res) => {
        db.Sliceprofile
            .findOne({ id: req.params.id, preset: true })
            .then((sliceprofile) => {
                if (!sliceprofile) return res.notFound();
                return res.ok(sliceprofile);
            })
            .error(res.serverError);
    });
};
