/**
 * Created by thana on 10/5/2016.
 */

// Return a promise containing array of transponders for data in gxt file

export const gxtConverter = (gxtFile, convertOptions) => {
    if (gxtFile) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function(e) {

                // Initialize transponder array to hold our contours
                let transponders = [];

                // Split the whole text into contours by regular expression capturing [Cxx] text
                // which represents the starting point of each contour line in GXT file
                let contours = e.target.result.split(/\[C[0-9]+\]/);

                // If there is no contour inside the file, stop the operation
                if (contours.length < 2) {
                    reject('There is no contour inside this file.')
                } else {

                    let previousValue = 0;
                    let features = [];
                    let feature = {};

                    // Get the value type from convert options
                    let valueType = convertOptions.valueType;

                    // Omit the first array element because it is not contour data (start at index 1 not 0)
                    for (var i = 1; i < contours.length; i++) {

                        //console.log('');
                        console.log('Start Processing contour no ' + i);

                        // Split contour data into coordinates (each element would be in the form of lat;lon
                        let contourData = contours[i].split(/[pP][0-9]+\=/);

                        // Retrieve the relative gain value from the first element of the coords array
                        // Returned gain text would be a string 'gain=xx.xx'
                        let gainText = ExtractGainText(contourData[0]);
                        console.log('Gain Text = ' + gainText);

                        // Extract the number behind gain=xx.xx and convert to float
                        let currentValue = ReadGainValue(gainText);
                        console.log(valueType + ' = ' + currentValue);


                        // If the options say this is absolute value, convert it into relative
                        // relativeGain = convertOptions.isAbsoluteValue ? convertOptions.peakValue - gainValue : gainValue;

                        // Remove the contour data section to leave only lon;lat texts and convert into array of lon,lat
                        // The return value will be the same as coordinates property of Geojson polygon object
                        // console.log(JSON.stringify(contourData));
                        let polygon = ConvertCoordinatesTextLinesToPolygon(contourData.splice(1));
                        //console.log('Before Transform Polygon = ' + polygon);
                        polygon = transformPolygon(polygon);
                        //console.log('After Transform Polygon = ' + polygon);

                        // if the value of this contour line is higher than the previous one,
                        // this contour line is belonging to the next transponder (gain value of subsequent
                        // contour lines are always lower than the previous line except it is data of the next
                        // transponder that reset the contour line sequences by starting from closest to peak again)
                        // Except if this is first contour line (no previous value to compare)
                        if (currentValue > previousValue && i > 1) {

                            console.log('This contour is for the next transponder.');

                            // Push the current feature into feature collection
                            features.push(Object.assign({}, feature));

                            transponders.push(CreateFeatureCollection(features.splice(0)));

                            // Reset the features
                            features = [];

                            // Create the first feature for this line                            )
                            feature = InitializeFeature(polygon, valueType, currentValue);
                        }

                        // if the relative gain of this contour line is equal to the previous one,
                        // it is another polygon of the same contour line
                        /*
                        else if (currentValue === previousValue && i > 1) {
                            //console.log('This contour has the same relative gain as previous one');
                            feature.geometry.coordinates.push(polygon);
                            console.log('The new feature is ' + JSON.stringify(feature));
                        }
                        */
                        // This contour line is a new contour (different gain value from the previous one),
                        // Push the current feature to the array of features first, then
                        // initialize the feature object with the new relative gain value and polygon
                        else {
                            // Push the current feature except if this contour is the first line
                            if (i!=1) {
                                console.log('Push contour ' + previousValue + ' into the features array');
                                features.push(Object.assign({}, feature));
                            }
                            feature = InitializeFeature(polygon, valueType, currentValue);
                        }

                        // If this contour line is the last one, create a FeatureCollection with features and push to
                        // the transponder array
                        if (i === contours.length -1) {

                            // Push the remaining feature into feature collection
                            features.push(Object.assign({}, feature));

                            //console.log('Push this featurecollection into transponder array');
                            transponders.push(CreateFeatureCollection(features.splice(0)));
                        }
                        console.log('Features Length: ' + features.length);
                        previousValue = currentValue;

                    }

                    resolve(transponders);
                }

                // Return the text 'gain=xx.xx' from the given data
                function ExtractGainText(contourData) {
                    let data = contourData.split('\n');
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].startsWith('gain=')){
                            return data[i];
                        }
                    }
                }

                // Return xx.xx from 'gain=xx.xx'
                function ReadGainValue(text) {
                    return parseFloat(text.substring(5));
                }

                // Convert lines of lon;lat from .gxt file into Geojson polygon coordinates format
                // Ex. convert:
                // ['22.250;6.928',
                // '22.468;6.784']
                // into [[22.250, 6.928], [22.468, 6.784]];
                function ConvertCoordinatesTextLinesToPolygon(coordinatesTextLines) {
                    let polygon = [];
                    for (var j = 0; j < coordinatesTextLines.length; j++) {
                        var latLon = coordinatesTextLines[j].split(';');
                        var lon = parseFloat(latLon[0]);
                        var lat = parseFloat(latLon[1]);
                        //console.log('Point ' + j + ': Lat = ' + lat + ' Lon = ' + lon);

                        // Create an array of coordinates
                        polygon.push([lon, lat]);
                    }
                    return polygon;
                }

                /*
                function InitializeFeature(relativeGain, polygon) {
                    return {
                        type: "Feature",
                        properties: {
                            relativeGain: relativeGain,
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: [polygon],
                        },
                    };
                }
                */

                // Value type is either 'relativeGain (for HTS), eirp (conventional) or gt (conventional)
                function InitializeFeature(polygon, valueType, value) {

                    let feature = {
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "Polygon",
                            coordinates: [polygon]
                        }
                    }
                    feature.properties[valueType] = value;
                    return feature;
                }

                function CreateFeatureCollection(features) {
                    return {
                        type: 'FeatureCollection',
                        features: features,
                    }
                }

                function transformPolygon(polygon) {
                    // Check if first and last element is the same point
                    //console.log('First element of polygon = ' + polygon[0]);
                    //console.log('Last element of polygon = ' + polygon[polygon.length-1]);
                    if (polygon[0][0] != polygon[polygon.length-1][0] && polygon[0][1] != polygon[polygon.length-1][1]) {
                        return false;
                    }

                    // Find the leftmost point (least longitude) of this polygon
                    let leftmost = _.min(polygon, (latLng) => {
                        return latLng[0];
                    });
                    console.log('Left most point is ' + leftmost);
                    let leftmostIndex = polygon.indexOf(leftmost);
                    //console.log('Left most index is ' + leftmostIndex);
                    let nextPointIndex = leftmostIndex == polygon.length - 1 ? 0 : leftmostIndex + 1;
                    let nextPoint = polygon[nextPointIndex];
                    //console.log('Next point is ' + nextPoint);
                    // Compare the latitude between left most point to the next point. If latitude goes up, polygon is rotating clockwise
                    // Otherwise, polygon is rotating counterclockwise
                    if (leftmost[1] > nextPoint[1]) {
                        //console.log('Polygon is rotating counterclockwise');
                        return polygon;
                    }
                    else {
                        //console.log('Polygon is rotating clockwise, will reverse it');
                        // Reverse the polygon to transform it into counterclockwise direction
                        return polygon.reverse();
                    }


                }
            };
            reader.readAsText(gxtFile);
        });


    }
}