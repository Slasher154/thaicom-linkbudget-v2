/**
 * Created by thana on 11/30/2016.
 */

import { Contours } from 'imports/api/contours/contours';

Meteor.methods({
    'findContoursToPlot'(options) {
        console.log('Finding contour to plot for ' + JSON.stringify(options));
        check(options, Object);
        check(options.contours, [Object]);
        check(options.satellite, String); // "Thaicom 4", "Thaicom 5", "Thaicom 6", etc.
        check(options.parameter, String); // "eirp" or "gt"
        check(options.valueType, String); // "absolute" or "relative"

        let resultContour = {
            "type": "FeatureCollection",
            "features": []
        };
        return resultContour;
    },
});