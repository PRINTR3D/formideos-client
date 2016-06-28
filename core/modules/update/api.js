/*
 *	This code was created for Printr B.V. It is open source under the formide-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

module.exports = function(routes, module) {

    routes.get('/status', function (req, res) {
        module.getUpdateStatus(function (err, success) {
            if (err) return res.serverError(err);
            return res.ok(success);
        });
    });

    routes.get('/check', function (req, res) {
        module.checkForUpdate(function (err, update) {
            if (err) return res.serverError(err);
            return res.ok(update);
        });
    });

    routes.post('/do', function (req, res) {
        module.update(function (err) {
            if (err) return res.serverError(err);
            return res.ok({ message: 'Starting update' });
        });
    });
};
