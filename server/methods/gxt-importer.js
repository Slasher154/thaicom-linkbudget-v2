/**
 * Created by thana on 12/13/2016.
 */

import { Contours } from '/imports/api/contours/contours';

Meteor.methods({
    uploadContour: function (featureCollection) {
        check(featureCollection, Object);
        Contours.upsert({
            'properties.name': featureCollection.properties.name,
            'properties.path': featureCollection.properties.path,
            'properties.satellite': featureCollection.properties.satellite,
            'properties.parameter': featureCollection.properties.parameter,
        }, {
            $set: featureCollection
    });
        return true;
    },
});