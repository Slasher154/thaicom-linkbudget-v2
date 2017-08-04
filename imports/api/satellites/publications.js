/**
 * Created by thana on 12/27/2016.
 */

import { Satellites } from '/imports/api/satellites/satellites';

Meteor.publish('allThaicomSatellites', function () {
    return Satellites.find({ isThaicom: true, isActive: true }, { sort: { name: 1 }});
});

Meteor.publish('allSatellites', function () {
    return Satellites.find({}, { sort: { name: 1, isThaicom: 1 }});
});

