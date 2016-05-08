'use strict';

const fs      = require('fs');
const co      = require('co');
const path    = require('path');
const thenify = require('thenify');
const readdir = thenify(fs.readdir);

module.exports = (db, presetStorage) => { co(function*() {

    // static seeds
    yield db.User.findOrCreate({
        email:    "admin@local",
        isAdmin:  true
    }, {
        email:    "admin@local",
        password: "admin",
        isAdmin:  true
    });

    // TODO: make this nicer
    // TODO: actually, the whole database needs to be replaced with something better

    // material seeds
    readdir(path.join(presetStorage, './materials')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './materials', file));
            yield db.PresetMaterial.findOrCreate({
                name: preset.name
            }, preset);
        }).then(null, console.error); });
    });

    // sliceprofile seeds
    readdir(path.join(presetStorage, './sliceprofiles')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './sliceprofiles', file));
            yield db.PresetSliceprofile.findOrCreate({
                name: preset.name
            }, preset);
        }).then(null, console.error); });
    });

    // printer seeds
    readdir(path.join(presetStorage, './printers')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './printers', file));
            yield db.PresetPrinter.findOrCreate({
                name: preset.name
            }, preset);
        }).then(null, console.error); });
    });

    // model seeds
    // readdir(path.join(presetStorage, './printers')).then((files) => {
    //     files.forEach(file => { co(function*() {
    //         if (file.match(/\.stl/) == null || file.match(/\.gcode/) == null) return;
    //         // TODO: copy stl/gcode file to user storage and insert in database
    //     }).then(null, console.error); });
    // });

}).then(null, console.error); };
