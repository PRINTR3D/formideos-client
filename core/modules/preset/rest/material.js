/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

'use strict';

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
     * Search through material presets
     */
    routes.get('/materials/search', (req, res) => {
        const searchArray = req.query.s.split(',');
        var searchObject = {
            or: []
        };

        for (var el of searchArray) {
            searchObject.or.push({
                like: { name: `%${el}%` }
            });
            searchObject.or.push({
                like: { type: `%${el}%` }
            });
        }

        db.PresetMaterial
            .find(searchObject, { select: ((req.query.fields) ? req.query.fields.split(',') : '') })
            .then(res.ok)
            .catch(res.serverError);
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