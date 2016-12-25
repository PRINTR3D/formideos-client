'use strict';

const fs      = require('fs');
const co      = require('co');
const path    = require('path');
const uuid    = require('uuid');
const thenify = require('thenify');
const readdir = thenify(fs.readdir);

module.exports = (db, presetStorage) => {
    co(function*() {

        // static seeds
        yield db.User.findOrCreate({
            email:    "admin@local",
            isAdmin:  true
        }, {
            email:    "admin@local",
            password: "admin",
            isAdmin:  true
        });

        // TODO: actually, the whole database needs to be replaced with something better

        // material seeds
        readdir(path.join(presetStorage, './materials'))
            .then(function (files) {
                files.forEach(function(file) {
                    co(function*() {
                        if (file.match(/\.json$/) == null) return;
                        const preset = require(path.join(presetStorage, './materials', file));
                        preset.preset = true;
                        yield db.Material.destroy({ preset: true });
                        yield db.Material.create(preset);
                    }).then(null, console.error);
                });
            });

        // sliceprofile seeds
        readdir(path.join(presetStorage, './sliceprofiles'))
            .then(function (files) {
                return files.forEach(function(file) {
                    co(function*() {
                        if (file.match(/\.json$/) == null) return;
                        const preset = require(path.join(presetStorage, './sliceprofiles', file));
                        preset.preset = true;
                        yield db.SliceProfile.destroy({ preset: true });
                        yield db.SliceProfile.create(preset);
                    }).then(null, console.error);
                });
            });

        // printer seeds
        readdir(path.join(presetStorage, './printers'))
            .then(function (files) {
                files.forEach(function (file) {
                    co(function*() {
                        if (file.match(/\.json$/) == null) return;
                        const preset = require(path.join(presetStorage, './printers', file));
                        preset.preset = true;
                        yield db.Printer.destroy({ preset: true });
                        yield db.Printer.create(preset);
                    }).then(null, console.error);
                });
            });

    }).then(null, console.error);
};
