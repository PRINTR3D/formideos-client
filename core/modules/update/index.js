/*
 *	This code was created for Printr B.V. It is open source under the formideos-client package.
 *	Copyright (c) 2015, All rights reserved, http://printr.nl
 */

const fs            = require('fs');
const path          = require('path');
const request       = require('request');
const exec          = require('child_process').exec;
const ini           = require('ini');
const downloadRoot  = 'http://downloads.formide.com/releases/'
const assert        = require('assert');

module.exports = {

    updateScriptLocation: null,
    newVersionLocation: null,
    currentVersionLocation: null,
    updateStatusLocation: null,
    channel: null,

	init: function(config) {
        this.updateScriptLocation = config.updateScriptLocation;
        this.newVersionLocation = config.newVersionLocation;
        this.currentVersionLocation = config.currentVersionLocation;
        this.updateStatusLocation = config.updateStatusLocation;
        this.channel = config.channel;

        // this.checkForUpdate(function (err, response) {
        //     if (err)
        //         FormideOS.log.error('Checking for updates', err);
        //     else
        //         FormideOS.log.debug('Checking for updates', response);
        // });
        //
        // this.getUpdateStatus(function (err, response) {
        //     console.log(e, response);
        // });
	},

    getUpdateStatus: function (callback) {
        try {
            var updateStatus = ini.parse(fs.readFileSync(this.updateStatusLocation, 'utf-8'));

            if (updateStatus.UPDATE_STATUS === 'success') {
                return callback(null, {
                    success: true,
                    timestamp: updateStatus.TIME,
                    message: 'The device was successfully updated'
                });
            }
            else {
                return callback(null, {
                    success: false,
                    timestamp: updateStatus.TIME,
                    message: updateStatus.UPDATE_ERR
                });
            }
        }
        catch (e) {
            return callback(e);
        }
    },

    checkForUpdate: function(callback) {
        var self = this;
        if (!fs.existsSync(self.currentVersionLocation)) return callback(new Error('Current version file not found'));
        var currentVersion = ini.parse(fs.readFileSync(self.currentVersionLocation, 'utf-8'));

        request(
            FormideOS.config.get('cloud.url') + '/products/client/latest/' + self.channel,
            function(err, response, body) {
                if (err) return callback(err);
                if (response.statusCode !== 200) return callback(new Error('There was an issue fetching the latest version from the cloud'));

                body = JSON.parse(body);
                if(typeof body.releaseNumber === 'undefined') return callback(null, { message: 'no releaseNumber found when checking for updates' });

                if (parseInt(body.releaseNumber) > parseInt(currentVersion.RELEASE)) {
                    assert(body.version);
                    assert(body.url);
                    assert(body.signature);

                    var newVersionFile = ini.stringify({
                        RELEASE:        body.releaseNumber,
                        VERSION:        body.version,
                        IMAGE_LOCATION: downloadRoot + body.url,
                        SIGNATURE:      body.signature
                    });

                    body.message = 'update found';
                    body.needsUpdate = true;

                    fs.writeFileSync(self.newVersionLocation, newVersionFile);
                    return callback(null, body);
                }
                else {
                    return callback(null, { message: 'There is no update available at this moment', needsUpdate: false });
                }
            }
        );
    },

    doUpdate: function(callback) {
        // yup, that's all there is to it :P
        exec(this.updateScriptLocation, function(err, stdout, stderr) {
            if (err || stderr) return callback(err || stderr);
            return callback(null);
        });
    }
}
