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

	tools: null,
    	channel: null,
    	updateCheckURL: null,
    	availableUpdate: null,

	init: function (config) {
	        try {
			this.tools = require('element-tools');
		}
		catch (e) {
			FormideOS.log.warn('element-tools not found for update, probably not running on The Element');
			FormideOS.log.warn(e);
		}
	
	        this.channel = config.channel;
	        this.updateCheckURL = FormideOS.config.get('cloud.url') + '/products/client/latest/' + self.channel;
	
	        this.checkForUpdate(function (err, update) {
	            FormideOS.log.error(err);
	        });
	},

    getUpdateStatus: function (callback) {
    	if (this.tools === null) return callback(new Error('element-tools not found'));
        this.tools.getUpdateStatus(this.updateCheckURL, callback);
    },

    checkForUpdate: function (callback) {
    	if (this.tools === null) return callback(new Error('element-tools not found'));
        this.tools.checkForUpdate(callback);
    },

    update: function (callback) {
    	if (this.tools === null) return callback(new Error('element-tools not found'));
        const self = this;
        this.checkForUpdate(function (err, update) {
            self.tools.update(update.releaseNumber, update.version, downloadRoot + update.url, update.signature, callback);
        });
    }
}
