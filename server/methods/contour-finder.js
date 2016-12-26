/**
 * Created by thana on 11/30/2016.
 */

import { Contours, TempContours } from '/imports/api/contours/contours';
import { mapColors } from '/imports/api/maps/maps.js';

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

            // Return a feature collection along with single feature (query from projection query) that matches the relative gain
            // If there is no feature for that relative gain (such as number lower than -15dB for spot beams), the return document
            // will have only the properties attribute but not features (undefined)
            let featureCollection = Contours.findOne(searchQuery, projectionQuery);
            //console.log(JSON.stringify(featureCollection));
            let contourLogMessage = `Transponder ${contour.name} - ${contour.path} - ${options.parameter} | ${contour.value} dB : `;
            if (featureCollection.features) {

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

                featureCollection.features[0].properties.category = 'Category ' + categoryNumber;
                resultContour.features.push(featureCollection.features[0]);
                console.log(contourLogMessage + `Feature found`);

                // Add beam peak to beam labels array
                if (!_.findWhere(beamLabels, { text: featureCollection.properties.name })) {
                    beamLabels.push({
                        text: featureCollection.properties.name,
                        latitude: featureCollection.properties.peakLatitude,
                        longitude: featureCollection.properties.peakLongitude,
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
        let beamLabels = [];

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

            let propertiesQuery = {
                "properties.satellite": options.satellite,
                "properties.parameter": options.parameter,
            };

            // If the options include name and path (user specifies transponder, include it in the query)
            if (options.name && options.path) {
                console.log('User specifies transponder as name = ' + options.name + ' and path = ' + options.path);
                _.extend(propertiesQuery, {
                    "properties.name": options.name,
                    "properties.path": options.path
                })
            }

            let searchQuery = {
                features: {
                    $elemMatch: _.extend(propertiesQuery, {
                        geometry: {
                            $geoIntersects: {
                                $geometry: {
                                    type: 'Point',
                                        coordinates: [coordinate.longitude, coordinate.latitude],
                                }
                            }
                        }
                    }),
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

            // If the query provides no result = no beam that covers this location at all or the given beam does not cover that location
            if (coveredBeams.length == 0) {

                // Push the 'no coverage' result to show in the table
                let noCoverageMessage = {
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    bestBeam: options.name ? options.name : 'N/A',
                    value: 'No coverage',
                };

                // Add the widest contour in the database of that transponder to show why it is not covered if user specifies the transponder
                if (options.name && options.path) {
                    console.log(JSON.stringify(propertiesQuery));
                    let featureCollection = Contours.findOne({
                        "properties.name": options.name,
                        "properties.path": options.path,
                        "properties.satellite": options.satellite,
                        "properties.parameter": options.parameter,
                    });
                    if (featureCollection) {

                        let lowestContourFeature = _.min(featureCollection.features, (feature) => {
                            return feature.properties.relativeGain;
                        });
                        resultFeatureCollection.features.push(lowestContourFeature);

                        // Add the contour value at the end of no coverage message to let user knows that the coverage shown is at which dB
                        noCoverageMessage.value = noCoverageMessage.value + ' within ' + lowestContourFeature.properties.relativeGain + ' dB';

                        // Push the beam labels
                        // Add beam peak to beam labels array
                        if (!_.findWhere(beamLabels, { text: featureCollection.properties.name })) {
                            beamLabels.push({
                                text: featureCollection.properties.name,
                                latitude: featureCollection.properties.peakLatitude,
                                longitude: featureCollection.properties.peakLongitude,
                                fontSize: 12,
                                visible: true,
                            });
                        }

                    }
                }

                resultContours.push(noCoverageMessage);
            }

            else {
                // Find the contour with least minimum value that still cover this beam
                coveredBeams.forEach((beam, index) => {

                    /*
                     let sortedContours = _.sortBy(beam.features, (feature) => {
                     return feature.properties.relativeGain;
                     });

                     sortedContours.reverse().forEach((contour) => {
                     TempContours.insert(contour);
                     });
                     */

                    // Insert all polygons in this beam to the temporary contours MongoDB collection to perform mongodb json search against
                    // all contours, not as a whole feature collection
                    beam.features.forEach((contour) => {
                        TempContours.insert(contour);
                    });

                    let contourSearchQuery = {
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

                    // Returns only features which contains the lat/lon
                    let filteredContour = TempContours.find(contourSearchQuery).fetch();

                    console.log('Number of filtered contours is ' + filteredContour.length);

                    // Get the element which has the lowest relative gain value = best contour
                    let bestContour = _.max(filteredContour, (contour) => {
                        return contour.properties.relativeGain;
                    });
                    console.log('Best contour is at ' + bestContour.properties.relativeGain + ' dB');

                    // Add color property to the line
                    bestContour.properties.color = mapColors[index];

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

                    // Push the beam labels
                    // Add beam peak to beam labels array
                    if (!_.findWhere(beamLabels, { text: bestContour.properties.name })) {
                        beamLabels.push({
                            text: bestContour.properties.name,
                            latitude: bestContour.properties.peakLatitude,
                            longitude: bestContour.properties.peakLongitude,
                            fontSize: 12,
                            visible: true,
                        });
                    }

                    // Remove all document from temp contours
                    TempContours.remove({});
                });
            }

        });

        return {
            resultContours: resultContours,
            resultPolygons: resultFeatureCollection,
            beamLabels: beamLabels,
        };

    }
});