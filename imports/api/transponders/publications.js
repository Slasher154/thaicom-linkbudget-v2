/**
 * Created by thana on 12/13/2016.
 */

import { Transponders } from '/imports/api/transponders/transponders';

Meteor.publish('allTranspondersWithBasicInfo', function () {
    return Transponders.find({}, {
        fields: {
            name: 1,
            beam: 1,
            satellite: 1,
            path: 1,
            type: 1,
            gtPeak: 1,
            saturatedEirpPeak: 1,
        },
    });
});