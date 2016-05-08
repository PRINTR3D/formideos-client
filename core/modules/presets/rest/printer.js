/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = (routes, db) => {

    /**
     * Get a list of preset printers
     */
    routes.get('/printers', (req, res) => {
        db.PresetPrinter
            .find({}, { select: ((req.query.fields) ? req.query.fields.split(',') : "") })
            .then(res.ok)
            .error(res.serverError);
    });

    /**
     * Get a single preset printer
     */
    routes.get('/printers/:id', (req, res) => {
        db.PresetPrinter
            .findOne({ id: req.params.id })
            .then((printer) => {
                if (!printer) return res.notFound();
                return res.ok(printer);
            })
            .error(res.serverError);
    });
};
