/*
 *	    ____  ____  _____   ____________
 *	   / __ / __ /  _/ | / /_  __/ __
 *	  / /_/ / /_/ // //  |/ / / / / /_/ /
 *	 / ____/ _, _// // /|  / / / / _, _/
 *	/_/   /_/ |_/___/_/ |_/ /_/ /_/ |_|
 *
 *	Copyright Printr B.V. All rights reserved.
 *	This code is closed source and should under
 *	nu circumstances be copied or used in other
 *	applications than for Printr B.V.
 *
 */

var Sequelize 	= require('sequelize');
var sequelize 	= new Sequelize('printspot', 'root', null, {
	dialect: "sqlite",
	storage: 'server/printspot.sqlite',
	define: {
		charset: 'utf8'
	}
});

User = sequelize.define('User', {
    "username": "STRING",
    "password": "STRING"
});

Printjob = sequelize.define('Printjob', {
	"modelfileID": "INTEGER",
	"userID": "INTEGER",
	"printerID": "INTEGER",
	"sliceprofileID": "INTEGER",
	"materials": "TEXT",
	"gcode": "STRING",
	"sliceParams": "TEXT",
	"sliceResponse": "TEXT",
	"sliceMethod": "STRING",
	//"ModelfileId": "INTEGER"
});

Queueitem = sequelize.define('Queueitem', {
	"origin": "STRING",
	"gcode": "STRING",
	"status": "STRING",
	"PrintjobId": "INTEGER"
});

Modelfile = sequelize.define('Modelfile', {
	"filename": "STRING",
	"filesize": "INTEGER",
	"hash": "STRING",
	"userID": "INTEGER"
});

Printer = sequelize.define('Printer', {
	"name": "STRING",
	"buildVolumeX": "INTEGER",
	"buildVolumeY": "INTEGER",
	"buildVolumeZ": "INTEGER",
	"bed": "BOOLEAN",
	"extruders": "TEXT"
});

Material = sequelize.define('Material', {
	"name": "STRING",
	"type": "STRING",
	"filamentDiameter": "FLOAT",
	"temperature": "INTEGER",
	"firstLayersTemperature": "INTEGER",
	"bedTemperature": "INTEGER",
	"firstLayersBedTemperature": "INTEGER",
	"feedrate": "INTEGER"
});

Sliceprofile = sequelize.define('Sliceprofile', {
	"name": "STRING",
	"settings": "TEXT"
});

sequelize
	.sync({
		force: true
	})
	.complete(function(err)
	{
		if(err)
		{
			console.log('An error occurred while creating the table: ', err)
		}
		else
		{
			Modelfile.hasMany(Printjob);
			Printjob.belongsTo(Modelfile);

			Printjob.hasMany(Queueitem);
			Queueitem.belongsTo(Printjob);

			User.create({
				"username": "login@printspot.local",
				"password": "password"
			});

			Modelfile.create({
				"filename": "cube40mm.stl",
				"filesize": 1423,
				"hash": "epsnhgnyoxahbursor"
			});

			Printer.create({
				"name": "Big Builder",
				"buildVolumeX": 200,
				"buildVolumeY": 200,
				"buildVolumeZ": 600,
				"bed": true,
				"extruders": JSON.stringify([
				{
					"id":0,
					"name":"extruder1",
					"nozzleSize":30
				},
				{
					"id":1,
					"name":"extruder2",
					"nozzleSize":30
				}])
			});

			Printer.create({
				"name": "Mini Builder",
				"buildVolumeX": 200,
				"buildVolumeY": 200,
				"buildVolumeZ": 200,
				"bed": false,
				"extruders": JSON.stringify([
				{
					"id":0,
					"name":"extruder1",
					"nozzleSize": 300
				}])
			});

			Material.create({
				"name": "PLA",
				"type": "PLA",
				"temperature": 193,
				"firstLayersTemperature": 200,
				"bedTemperature": 50,
				"firstLayersBedTemperature": 60,
				"filamentDiameter": 1750,
				"feedrate": 100
			});

			Sliceprofile.create({
				"name": "Nectar Default",
				"settings": JSON.stringify(
				{
					"slicerConfig": "marlinDualExtrusion",
					"fan": {
						"fullspeedLayer": 10,
						"min": 25,
						"max": 90
					},
					"raft": {
						"baseThickness": 0,
						"baseSpeed": 20,
						"lineSpacing":3000,
						"interfaceThickness": 0,
						"interfaceLineWidth":400,
						"interfaceLineSpacing": 800,
						"airGap": 0,
						"baseLineWidth": 1000,
						"extraMargin": 5000,
						"surfaceLayers": 2,
						"surfaceThickness": 270,
						"surfaceSpeed": 0,
						"surfaceLineWidth": 400,
						"surfaceLineSpacing": 400,
						"firstLayerAirGap": 200,
						"fanSpeed": 25
					},
					"infill": {
						"sparseInfillLineDistance": 2000,
						"amount": 59,
						"pattern": "grid",
						"overlap": 15
					},
					"support": {
						"angle": 45,
						"supportModel": 1,
						"supportPlatform": 1,
						"extruder": -1,
						"XYDistance": 700,
						"lineDistance": 2000
					},
					"skirt": {
						"lineCount": 1,
						"distance": 3000,
						"minLenght": 150000
					},
					"dualExtrude": {
						"dualOverlap": 1500
					},
					"movement": {
						"combing": 0,
						"oozeShield": 0,
						"printSpeed": 15,
						"travelSpeed": 20,
						"insetXSpeed": 15,
						"inset0Speed": 15,
						"infillSpeed": 20,
						"speedupLayers": 10,
						"extrusionWidth": 200,
						"firstLayersExtrusionWidth": 300,
						"wipeTowerSize": 0
					},
					"bottom": {
						"thickness": 480,
						"speed": 50,
						"solid": 1,
						"layerDelay": 5,
						"cutOff": 0,
						"layerHeight": 240
					},
					"top": {
						"thickness": 480,
						"solid": 1,
						"layerHeight": 240
					},
					"retraction": {
						"minimalDistance": 100
           			},
					"layers": {
						"spiralize": 0,
						"simpleMode": 0,
						"layerHeight": 200,
						"layerCoolingTime": 2,
						"firstLayersCount": 1,
						"firstLayersAmount": 100,
						"thickness": 200,
						"wallThickness": 200
					},
					"extra": {
						"brimLines": 0
					},
					"gcode": {
						"startGcode":"",
						"endGcode":"",
						"gcodeflavour":"MACH3"
					},
					"plugins": []
				})
			});
		}
	});