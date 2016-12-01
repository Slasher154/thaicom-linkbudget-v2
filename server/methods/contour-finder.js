/**
 * Created by thana on 11/30/2016.
 */

import { Contours } from '/imports/api/contours/contours';

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

        // Sort array of contours by field name then value, name descending and value ascending (beam peak first)
        options.contours.sort(function (a, b) {
            return a.name - b.name || b.value - a.value;
        });

        let currentContourName = '';
        let contourNameCount = 1;

        // Loop input contours
        options.contours.forEach((contour, index) => {
            let searchQuery = {
                features: {
                    $elemMatch: {
                        "properties.name": contour.name,
                        "properties.path": contour.path,
                        "properties.satellite": options.satellite,
                        "properties.parameter": options.parameter,
                    }
                }
            };
            let projectionQuery = {
                fields: {
                    features: {
                        $elemMatch: {
                            "properties.relativeGain": contour.value,
                        }
                    }
                }
            };
            //console.log('Search query is ' + JSON.stringify(searchQuery));
            //console.log('---------------');
            //console.log('Projection query is ' + JSON.stringify(projectionQuery));

            let feature = Contours.findOne(searchQuery, projectionQuery);
            if (feature) {

                // Assign category
                let categoryNumber = 0;
                // if beam name is different to the previous one, reset the category count
                // this means the first, second, third, etc. countour of every beam belongs to the same category
                if (contour.name !== currentContourName) {
                    categoryNumber = 1;
                    contourNameCount = 1;
                } else {
                    categoryNumber = ++contourNameCount;
                }
                currentContourName = contour.name;

                //console.log('Assign category ' + categoryNumber + ' to beam ' + contour.name);

                feature.features[0].properties.category = 'Category ' + categoryNumber;
                resultContour.features.push(feature.features[0]);
                console.log('Found feature = ' + JSON.stringify(feature));
            }
            else {
                console.log('Contour is not found');
            }



        });

        //meteor:PRIMARY> db.contours.find({ "features": { "$elemMatch": { "properties.name": "207", "properties.path": "forward" } }}, { "features": { "$elemMatch": { "properties.relativeGain": -
        //5, "properties.parameter": "eirp" }}});


        return resultContour;
    },
});