/**
 * Created by thanatv on 8/4/17.
 */

import { Satellites } from '../../imports/api/satellites/satellites';

Meteor.methods({
    upsertSatellite(id, satellite) {
        check(id, String);
        check(satellite, Object);
        Satellites.upsert(id, { $set: satellite });
    },
    removeSatellite(id) {
        check(id, String);
        Satellites.remove(id);
    }
})