/**
 * Created by thana on 11/30/2016.
 */

import { Contours, TempContours } from '/imports/api/contours/contours';

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

        let notFoundMessages = [];
        let beamLabels = []; // Text and coordinates of beam peak to show labels on the map

        // Sort array of contours by field name then value, name descending and value ascending (beam peak first)
        options.contours.sort(function (a, b) {
            return a.name - b.name || b.value - a.value;
        });

        let currentContourName = '';
        let contourNameCount = 1;

        // Loop input contours
        options.contours.forEach((contour) => {
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
                    properties: 1,
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
            let contourLogMessage = `Transponder ${contour.name} - ${contour.path} - ${options.parameter} | ${contour.value} dB : `;
            if (feature) {

                // Assign category
                let categoryNumber = 0;
                // if beam name is different to the previous one, reset the category count
                // this means the first, second, third, etc. contour of every beam belongs to the same category
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
                console.log(contourLogMessage + `Feature found`);

                // Add beam peak to beam labels array
                if (!_.findWhere(beamLabels, { text: feature.properties.name })) {
                    beamLabels.push({
                        text: feature.properties.name,
                        latitude: feature.properties.peakLatitude,
                        longitude: feature.properties.peakLongitude,
                        visible: true,
                    });
                }

            }
            else {
                console.log(contourLogMessage + `Feature NOT found`);
                notFoundMessages.push(contourLogMessage + `Contour NOT found in the database`);
            }
        });
        console.log('beam labels = ' + JSON.stringify(beamLabels));
        console.log('unique beam labels = ' + JSON.stringify(_.uniq(beamLabels)));
        return {
            resultContour: resultContour,
            notFoundMessages: notFoundMessages,
            beamLabels: _.uniq(beamLabels), // remove duplicates
        };
    },
    'findContoursValueFromCoordinates' (options) {
        console.log('Finding contour values for ' + JSON.stringify(options));
        check(options, Object);
        check(options.coordinates, [Object]);
        check(options.satellite, String); // "Thaicom 4", "Thaicom 5", "Thaicom 6", etc.
        check(options.parameter, String); // "eirp" or "gt"
        check(options.valueType, String); // "absolute" or "relative"

        let resultFeatureCollection = {
            "type": "FeatureCollection",
            "features": []
        };

        let resultContours = [];

        options.coordinates.forEach((coordinate) => {

            // Add the marker feature to our result to be displayed with label on the client
            resultFeatureCollection.features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [coordinate.longitude, coordinate.latitude],
                },
                properties: {
                    pointType: 'location',
                }
            });

            let searchQuery = {
                features: {
                    $elemMatch: {
                        "properties.satellite": options.satellite,
                        "properties.parameter": options.parameter,
                        geometry: {
                            $geoIntersects: {
                                $geometry: {
                                    type: 'Point',
                                    coordinates: [coordinate.longitude, coordinate.latitude],
                                }
                            }
                        },
                    },
                },
            };
            let projectionQuery = {
                fields: {
                    $elemMatch: {
                        geometry: {
                            $geoIntersects: {
                                $geometry: {
                                    type: 'Point',
                                    coordinates: [coordinate.longitude, coordinate.latitude],
                                }
                            }
                        },
                    }
                }
            };

            // Get the array of beams that covered this point
            let coveredBeams = Contours.find(searchQuery).fetch();
            console.log('Number of covered beams is ' + coveredBeams.length);
            // Find the contour with least minimum value that still cover this beam
            coveredBeams.forEach((beam) => {
                let sortedContours = _.sortBy(beam.features, (feature) => {
                    return feature.properties.relativeGain;
                });

                sortedContours.reverse().forEach((contour) => {
                    TempContours.insert(contour);
                });
                let anotherSearchQuery = {
                    "properties.satellite": options.satellite,
                    "properties.parameter": options.parameter,
                    geometry: {
                        $geoIntersects: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [coordinate.longitude, coordinate.latitude],
                            }
                        }
                    },
                };
                let filteredContour = TempContours.find(anotherSearchQuery).fetch();

                console.log('Number of filtered contours is ' + filteredContour.length);
                // Get the last element of sorted array which is the maximum contour value
                let bestContour = _.first(filteredContour);
                console.log('Best contour is at ' + bestContour.properties.relativeGain + ' dB');

                // Push data into result polygon array
                resultFeatureCollection.features.push(bestContour);

                // Push data to result table
                console.log('Best contour of ' + coordinate.longitude + ',' + coordinate.latitude + ' is beam ' + bestContour.properties.name + ' at ' + bestContour.properties.relativeGain + ' dB');
                resultContours.push({
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    bestBeam: bestContour.properties.name,
                    value: bestContour.properties.relativeGain,
                });

                // Remove all document from temp contours
                TempContours.remove({});
            });
        });

        return {
            resultContours: resultContours,
            resultPolygons: resultFeatureCollection,
        };

    }
});