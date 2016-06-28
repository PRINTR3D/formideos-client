'use strict';

const fs      = require('fs');
const co      = require('co');
const path    = require('path');
const uuid    = require('node-uuid');
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

    // TODO: actually, the whole database needs to be replaced with something better

    // material seeds
    readdir(path.join(presetStorage, './materials')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './materials', file));
            preset.preset = true;
            yield db.Material.destroy({ preset: true });
            yield db.Material.create(preset);
        }).then(null, console.error); });
    });

    // sliceprofile seeds
    readdir(path.join(presetStorage, './sliceprofiles')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './sliceprofiles', file));
            preset.preset = true;
            yield db.Sliceprofile.destroy({ preset: true });
            yield db.Sliceprofile.create(preset);
        }).then(null, console.error); });
    });

    // printer seeds
    readdir(path.join(presetStorage, './printers')).then((files) => {
        files.forEach(file => { co(function*() {
            if (file.match(/\.json$/) == null) return;
            const preset = require(path.join(presetStorage, './printers', file));
            preset.preset = true;
            yield db.Printer.destroy({ preset: true });
            yield db.Printer.create(preset);
        }).then(null, console.error); });
    });

    // model seeds
    // readdir(path.join(presetStorage, './modelfiles')).then((files) => {
    //     files.forEach(file => { co(function*() {
    //         if (file.match(/\.stl/) == null && file.match(/\.gcode/) == null) return;
    //
    //         const filePath = path.join(presetStorage, './modelfiles', file);
    //         const ext = path.extname(filePath).toLowerCase();
    //         const hash = uuid.v4();
    //
    //         // insert in database
    //         const userFile = yield db.UserFile.findOrCreate({
    //             filename: file
    //         }, {
    //             prettyname: file,
    //             filename:   file,
    //             filesize:   0, // TODO
    //             filetype:   `text/${ext.replace('.', '')}`,
    //             hash:       hash
    //         });
    //
    //         // copy the file (or overwrite when already in DB)
    //         const newPath = path.join(FormideOS.config.get('app.storageDir'), FormideOS.config.get('paths.modelfiles'), userFile.hash);
    //         fs.createReadStream(filePath).pipe(fs.createWriteStream(newPath));
    //
    //     }).then(null, console.error); });
    // });

}).then(null, console.error); };
