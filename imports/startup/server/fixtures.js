/**
 * Created by thana on 10/7/2016.
 */

import { readJsonFromAssetFiles } from '/imports/api/utils/readJson';

// Insert satellites from the json file into database

import { Satellites } from '/imports/api/satellites/satellites';
if (Satellites.find().count() === 0) {
    let satelliteDataToInsert = readJsonFromAssetFiles('fixtures/satellites.json');
    satelliteDataToInsert.forEach((satellite) => {
        Satellites.insert(satellite);
    });
}

// Insert transponders from the json file into database

import { Transponders } from '/imports/api/transponders/transponders';
if (Transponders.find().count() === 0) {
    let transponderDataToInsert = readJsonFromAssetFiles('fixtures/transponders.json');
    transponderDataToInsert.forEach((transponder) => {
        Transponders.insert(transponder);
    });
}