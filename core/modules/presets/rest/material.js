/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = (routes, db) => {

    /**
     * Get a list of preset materials
     */
    routes.get('/materials', (req, res) => {
        db.PresetMaterial
            .find({}, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
            .then(res.ok)
            .error(res.serverError);
    });

    /**
     * Get a single preset material
     */
    routes.get('/materials/:id', (req, res) => {
        db.PresetMaterial
            .findOne({ id: req.params.id })
            .then((material) => {
                if (!material) return res.notFound();
                return res.ok(material);
            })
            .error(res.serverError);
    });
};
