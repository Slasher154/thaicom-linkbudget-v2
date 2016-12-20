/**
 * Created by thana on 12/20/2016.
 */

import { Contours } from '/imports/api/contours/contours';

Meteor.publish('allContoursWithBasicInfo', function() {
    /*
    return Contours.find({}, {
        fields: {
           properties: 1,
            createdAt: 1,
        },
    }).sort({
        createdAt: -1
    });
    */
    return Contours.find({}, {
        fields: {
            properties: 1,
            modifiedAt: 1,
        },
        sort: {modifiedAt: -1}
    });
});