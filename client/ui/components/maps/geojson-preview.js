/**
 * Created by thana on 10/6/2016.
 */
import { geocode, mapColors, sampleGeojsonData } from '/imports/api/maps/maps.js';
//import { TxtOverlay } from '/imports/api/maps/txtOverlay';
import { readJsonFromAssetFiles } from '/imports/api/utils/readJson';
import { Transponders } from '/imports/api/transponders/transponders';


Template.geojsonPreview.viewmodel({
    onCreated() {
        // Handle map events and reactive updates here

        //let showBeamLabel = this.showBeamLabel(), showContourValue = this.showContourValue();
        var self = this;
        GoogleMaps.ready(this.mapName(), function(map) {

            let thisMap = map.instance;

            // If geojson data of this template has value (from template arguments set by the parent template),
            // use that data. Otherwise, load the sample data.
            let data = self.mapData();

            // Sort the data from farthest to peak to closest to peak. This lets the smallest contour get added on the map last.
            // If the biggest contour get added last, user will not be able to click on the smaller contour
            // underneath
            //data.features.sort((a, b) => a.properties.relativeGain - b.properties.relativeGain);

            // Add event listeners
            /*
            thisMap.data.addListener('click', (event) => {
                console.log(event.feature.getProperty('relativeGain'));
            });
            */
            // Add an incoming Geojson Data from the parent template into the map
            thisMap.data.addGeoJson(data.geojsonData);

            // Add incoming Polylines data
            if (data.polylines) {
                addPolylines(thisMap, data.polylines);
            }

            // Set style on this map
            setStyle(thisMap);

            // Show the data from manual input if any
            // drawUserInputLabel(thisMap);

            // Draw marker label on this map (find contour mode = beam name)
            if (self.showLocationLabel()) drawLocationLabel(thisMap);

            // Draw contour value on this map
            if (self.showContourValue()) {
                drawContourValue(thisMap, self.contourValueFontSize());
            };

            // Draw beam label on this map
            if (self.showBeamLabel() && data.beamLabels) {
                drawBeamLabel(thisMap, data.beamLabels);
            }

            // Show EIRP or G/T on map click
            let showValueOnMapClick = (e) => {
                //console.log(JSON.stringify(e.latLng));
                // Check if any satellite is selected via jquery
                let satellite = $('#satellite-picker').val();
                let valueToDisplay = $('input[name="valueToDisplay"]:checked').val();
                let transponderId = $('#conventional-beam-picker').val();
                //console.log('Satellite is ' + satellite);
                //console.log('value to display is ' + valueToDisplay);
                //console.log('transponder is ' + transponderId);
                if (satellite && valueToDisplay && transponderId) {
                    let transponder = Transponders.findOne({ _id: transponderId });
                    // Construct option object
                    let options = {
                        satellite: satellite,
                        parameter: valueToDisplay,
                        path: transponder.path,
                        names: [transponder.name],
                        coordinates:[{
                            latitude: e.latLng.lat(),
                            longitude: e.latLng.lng(),
                        }]
                    };
                    Meteor.call('findContoursValueFromCoordinates', options, (error, result) => {
                        if (error) {
                            Bert.alert(error.reason, 'danger', 'fixed-top');
                        }
                        else {
                            // Create content string to put in Infowindow
                            let contentString = '';
                            result.resultContours.forEach((contour, index) => {
                                contentString += '<div>';
                                contentString += '<b>';
                                contentString += 'Transponder';
                                contentString += '</b>';
                                contentString += `: ${contour.bestBeam} `;
                                contentString += '</div>';
                                contentString += '<div>';
                                contentString += '<b>';
                                contentString += 'Latitude';
                                contentString += '</b>';
                                contentString += `: ${contour.latitude} `;
                                contentString += '</div>';
                                contentString += '<div>';
                                contentString += '<b>';
                                contentString += 'Longitude';
                                contentString += '</b>';
                                contentString += `: ${contour.longitude} `;
                                contentString += '</div>';
                                contentString += '<br>';
                                contentString += '<div>';
                                contentString += '<b>';
                                contentString += valueToDisplay == 'eirp' ? 'EIRP' : 'G/T';
                                contentString += '</b>';
                                contentString += ` = ${contour.value} `;
                                contentString += '</div>';
                            });
                            //console.log(contentString);
                            let infowindow = new google.maps.InfoWindow({
                                position: e.latLng,
                                content: contentString
                            }).open(thisMap);

                            // Add polygon on the map
                            thisMap.data.addGeoJson(result.resultPolygons);
                            setStyle(thisMap);
                        }
                    });
                }
            }

            // Add listener to listen to mouse click on the map
            thisMap.addListener('click', showValueOnMapClick);

            /*
            thisMap.data.addListener('click', (event) => {
                console.log(event.feature.getProperty('relativeGain'));
            });
            */
            // Auto center the map
            recenterMap(thisMap);
        });
    },
    onRendered() {
        geocode(this.centerAddress()).then((result) => {
            //console.log('Set map center coords = ' + JSON.stringify(result));
            this.mapCenterCoordinates(result);
        }).then(() => {
            // Load the map after all options has been set
            GoogleMaps.load({
                key: Meteor.settings.public.googleMaps.apiKey,
            });
        }).catch((error) => {
            Bert.alert(error, 'danger', 'fixed-top');
        });


    },
    showBeamLabel: true,
    beamLabels: [],
    showLocationLabel: true,
    showContourValue: true,
    contourValueFontSize: 12,
    mapCenterCoordinates: {},
    mapFeatures: [],
    mapHeight: '500px',
    mapName: 'contourMap',
    mapOptions() {
        if (GoogleMaps.loaded()) {
            return {
              center: {
                  lat: 5,
                  lng: 100
              },
              zoom: 4,
            };
        }
    },
    removeContours(event) {
        removeFeatures(GoogleMaps.maps.contourMap.instance, this.mapFeatures());
    },
    centerAddress: 'Thailand', // Default map center
    editable: false,
    mapData: null,

});

function drawUserInputLabel(map) {
    // Loop each polygon (contour) to draw the user input label
    import { TxtOverlay } from '/imports/api/maps/txtOverlay';
    let userInputLabels = [];
    map.data.forEach((feature) => {

        let geometry = feature.getGeometry();
        let fontSize = 14;
        let offset = 0.05
        let color = feature.getProperty('color');
        let text = feature.getProperty('text');

        if(geometry.getType() === 'Polygon' && text) {

                console.log('text = ' + text);
                geometry.getArray().forEach((path) => {

                    let topmost = _.max(path.getArray(), (latLng) => {
                        return latLng.lat();
                    });
                    console.log('topmost is ' + JSON.stringify(topmost));

                    // offset the label position a bit
                    let offSetTopmost = new google.maps.LatLng(topmost.lat() + offset, topmost.lng());

                    let customTxt = `<div style="font-size: ${fontSize + 'px'};background-color: ${color}">${text}</div>`;
                    userInputLabels.push(new TxtOverlay(offSetTopmost, customTxt, "userInputLabel", map));

                });
        }

    });
}

function drawLocationLabel(map) {
    /*
    map.data.forEach((feature) => {
        let geometry = feature.getGeometry();

        if(geometry.getType()==='Point') {

            //http://stackoverflow.com/questions/30128882/how-to-get-latlng-coordinates-of-a-point-feature
            let infowindow = new google.maps.InfoWindow({
                content: geometry.get().lat() + ', ' + geometry.get().lng(),
                position: geometry.get()
            });
            infowindow.open(map);

            //http://stackoverflow.com/questions/5634991/styling-google-maps-infowindow
            import '/imports/api/utils/infobubble-compiled';
            let contentText = geometry.get().lat() + ', ' + geometry.get().lng();
            let infoBubble = new InfoBubble({
                map: map,
                content: '<div class="mylabel">' + contentText + '</div>',
                position:  geometry.get(),
                padding: 10,
                borderRadius: 5,
                maxHeight: 100,
                maxWidth: 300,
                borderWidth: 1,
                borderColor: '#2c2c2c',
                //disableAutoPan: true,
                hideCloseButton: true,
            });

            infoBubble.open();
        }
        else {}
    });
    */
}

function drawBeamLabel(map, labels) {
    labels.forEach((label) => {
        //console.log(JSON.stringify(label));
        let beamLabels = [];
        import { TxtOverlay } from '/imports/api/maps/txtOverlay';
        if (label.visible) {
            let contentText = label.text;
            let latlng = new google.maps.LatLng(label.latitude, label.longitude);
            let fontSize = label.fontSize ? label.fontSize + 'px' : '12px';
            let customTxt = `<div style="font-size: ${fontSize}">${contentText}</div>`;
            beamLabels.push(new TxtOverlay(latlng, customTxt, "beamLabel", map));
        }
    });

}

function drawContourValue(map, fontSize) {
    // Loop each polygon (contour) to draw the label
    import { TxtOverlay } from '/imports/api/maps/txtOverlay';
    let contourValueLabels = [];
    map.data.forEach((feature) => {
        let geometry = feature.getGeometry();
        if(geometry.getType() === 'Polygon') {
            let contourValue = 0;
            let possibleAttributes = ['relativeGain', 'eirp', 'gt'];
            // If strokeweight = 0, hide the contour value by default (such as when the page just reloaded the dummy contour
            let strokeWeight = feature.getProperty('strokeWeight');
            if (strokeWeight != 0) {
                // The feature must have property either 'relativeGain', 'eirp' or 'gt'
                possibleAttributes.forEach((a) => {
                    let value = feature.getProperty(a);
                    if (value) {
                        contourValue = value;
                    }
                });
                //console.log('Contour value = ' + contourValue);
                geometry.getArray().forEach((path) => {
                    //Iterate over the points in the path to find the rightmost point (highest longitude)
                    /*
                     let rightmost = {
                     lat: -100,
                     lng: -200
                     };
                     path.getArray().forEach(function(latLng){
                     if (latLng.lng() > rightmost.lng) {
                     rightmost = latLng;
                     }
                     });
                     */
                    let rightmost = _.max(path.getArray(), (latLng) => {
                        return latLng.lng();
                    });

                    //console.log('rightmost is ' + JSON.stringify(rightmost));
                    let customTxt = `<div style="font-size: ${fontSize + 'px'}">${contourValue}</div>`;
                    contourValueLabels.push(new TxtOverlay(rightmost, customTxt, "contourValueLabel", map));

                })
            }


        }
    });
}

function setStyle(map) {
    /*
    // Color contour lines differently for each category specified in feature properties
    var distinctCategories = [];
    map.data.setStyle((feature) => {
        let category = feature.getProperty('category');

        // if this category did not appear in the previous contour lines (new one), push it into array
        if (distinctCategories.indexOf(category) < 0) {
            distinctCategories.push(category);
        }

        // Select the color based on the index of category. For example, if there is category "A" and "B",
        // Contours in category "A" will get the first color in the mapColors array and all lines in category "B"
        // will get the 2nd color in the array.
        let color = mapColors[distinctCategories.indexOf(category)];
        return {
            strokeColor: color,
            fillOpacity: 0,
        }
    });
    */
    // Color contour lines based on color properties
    map.data.setStyle((feature) => {
       //console.log('Feature type = ' + feature.getGeometry().getType());
       let lineSymbol = {
           path: 'M 0, -1 0, 1',
           strokeOpacity: 1,
           scale: 4
       };
       let geometry = feature.getGeometry();
        // Only set color on Polygon and Polyline objects
        if(geometry.getType() === 'Polygon') {
            let strokeColor = feature.getProperty('color');
            let strokeWeight = feature.getProperty('strokeWeight');
            let visible = feature.getProperty('visible');
            return {
                strokeColor: strokeColor,
                strokeWeight: strokeWeight,
                fillOpacity: 0,
                visible: visible,
                clickable: false, // to prevent polygon handling mouse event so we still can click the map underneath to get EIRP or G/T value
            };
        } else {
            return {
                fillOpacity: 0,
            };
        }
    });
}

function recenterMap(map) {

    // Loop through all elements in a featurecollection
    let bounds = new google.maps.LatLngBounds();

    // Source: http://stackoverflow.com/questions/24401240/how-to-get-latlngbounds-of-feature-polygon-geometry-in-google-maps-v3
    map.data.forEach((feature) => {
        let geometry = feature.getGeometry();
        if(geometry.getType() === 'Polygon') {
            geometry.getArray().forEach((path) => {
                //iterate over the points in the path
                path.getArray().forEach(function(latLng){
                    //extend the bounds
                    bounds.extend(latLng);
                });
            })
        }
        else if(geometry.getType()==='Point') {
            bounds.extend(geometry.get());
        }
        else {}
    });
    map.fitBounds(bounds);
}

function addPolylines(map, polylines) {
    polylines.forEach((line) => {

        console.log('Inconming polyline = ' + JSON.stringify(line));

        // Construct Google Map Path
        let path = [];
        line.geometry.coordinates[0].forEach((coords) => {
            path.push(new google.maps.LatLng(coords[1], coords[0]));
        });

        var lineSymbol = {
            path: google.maps.SymbolPath.CIRCLE,
            fillOpacity: 1,
            //scale: 2
        };

        var polylineDotted = new google.maps.Polyline({
            strokeColor: line.properties.color,
            stokeWeight: line.properties.strokeWeight,
            strokeOpacity: 0,
            fillOpacity: 0,
            icons: [{
                icon: lineSymbol,
                offset: '0',
                repeat: '10px'
            }],
            path: path,
            map: map
        })

    });
    // Test add polyline on map
   /* var path = [
        new google.maps.LatLng(39, 4),
        new google.maps.LatLng(34, 20),
        new google.maps.LatLng(44, 20),
        new google.maps.LatLng(39, 4)
    ];
    var lineSymbol = {
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 1,
        scale: 2
    };
    var polylineDotted = new google.maps.Polyline({
        strokeColor: '#000000',
        strokeOpacity: 0,
        fillOpacity: 0,
        icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '10px'
        }],
        path: path,
        map: thisMap
    });*/
}

function removeFeatures(map, featuresToRemove) {
    featuresToRemove.forEach((feature) => {
       map.data.remove(feature);
    });
}

