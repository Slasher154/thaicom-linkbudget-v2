/**
 * Created by thanatv on 8/4/17.
 */

import { Satellites } from '/imports/api/satellites/satellites';
import { Transponders } from '/imports/api/transponders/transponders';
import { Contours } from '/imports/api/contours/contours';
import { mapColors, polygonClockwiseValidator } from '/imports/api/maps/maps.js';


let json = {
    "name": "1V",
    "satellite": "Thaicom 5",
    "uplinkCenterFrequency": 5.945,
    "downlinkCenterFrequency": 3.72,
    "bandwidth": 36,
    "path": "forward",
    "type": "broadcast",
    "gtPeak": 1.6,
    "uplinkPolarization": "H",
    "saturatedEirpPeak": 40.53,
    "downlinkPolarization": "V",
    "twta": "1V",
    "operatingMode": "fgm",
    "saturatedFluxDensity": -80,
    "attenuationRange": 16,
    "defaultAttenuation": 9,
    "defaultNumberOfCarriers": "multi",
    "backoffSettings": [
        {
            "numberOfCarriers": "single",
            "inputBackoff": 0,
            "outputBackoff": 0,
            "intermod": 25
        },
        {
            "numberOfCarriers": "two",
            "inputBackoff": -1.8,
            "outputBackoff": -2.2,
            "intermod": 18.78
        },
        {
            "numberOfCarriers": "multi",
            "inputBackoff": -5.2,
            "outputBackoff": -4.2,
            "intermod": 17.12
        }
    ],
    "uplinkFrequencyBand": "c-band",
    "downlinkFrequencyBand": "c-band",
    "defaultGateway": "Thaicom 5 C-Band Main Gateway",
    "operatingModeOptions": [
        "fgm"
    ],
    "beam": "Standard C"
};

Template.addContours.viewmodel({
    onCreated() {
        Meteor.subscribe('allSatellites');
        Meteor.subscribe('allTranspondersWithBasicInfo');
        Meteor.subscribe('allContoursWithBasicInfo');
    },
    satelliteId: '',
    satelliteName() {
        if (this.satelliteId()) {
            return Satellites.findOne({ _id: this.satelliteId() }).name;
        }
        return '';
    },
    transponderId: '',
    selectedTransponder() {
        return Transponders.findOne({ _id: this.transponderId() });
    },
    valueToBeStored: 'eirp',
    contourValue: 0,
    valuePlaceholderText() {
      if (this.valueToBeStored() === 'eirp') {
          return 'EIRP in dBW';
      }
      return 'G/T in dB/K';
    },
    peakLatitude: 0,
    peakLongitude: 0,
    coordinates: '',
    contours: [],
    loadingText: '',
    mapData:{
        geojsonData: { "type": "FeatureCollection",
            "features": [
                { "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[77.08, 5.09],[118.78, 4.47], [116.72, 24.52], [76.81, 24.24],[77.08, 5.09]]
                        ]
                    },
                    "properties": {
                        "strokeWeight": 0,
                    }
                }
            ]
        },
    },
    featureCollections: {
        type: "FeatureCollection",
        features: [],
    },
    mapHeight: '1800px',
    addContour(event) {
        event.preventDefault();
        this.contours().push({
            value: this.contourValue(),
        });
        this.transformDigitizedContours();

    },
    removeContour(event) {
        event.preventDefault();

        // Get the selected table row and transform to jQuery
        let $selectedTableRow = $(event.target.parentElement.parentElement);

        // Get the contour value
        let contourValue = $selectedTableRow.find('td.contourValue').text();

        // console.log(`removing contour with ${this.valueToBeStored()} = ${contourValue}`);

        // Remove the feature with contour value from the feature collections
        console.log(this.featureCollections());
        this.featureCollections().features = this.featureCollections().features.filter((c) => {
            return c.properties[this.valueToBeStored()] !== +contourValue;
        });

        // Re-render map
        this.renderMap();

        // Remove from table row
        $selectedTableRow.remove();
    },
    contourSubmitted(event) {
        event.preventDefault();

        // Upload this contour to our database

        // Find minimum and maxiumum contour of all contours we are going to add
        // Add minimum contour and maximum contour from the return FeatureCollection to the properties
        let contourValues = this.featureCollections().features.map((feature) => {
            return feature.properties[this.valueToBeStored()];
        });

        let minimumContour, maximumContour = 0;
        if (contourValues) {
            minimumContour = _.min(contourValues);
            maximumContour = _.max(contourValues);
        }

        // Add properties to this object
        let properties = {
            satellite: this.satelliteName(),
            name: this.selectedTransponder().name,
            path: this.selectedTransponder().path,
            parameter: this.valueToBeStored(),
            peakLatitude: this.peakLatitude(),
            peakLongitude: this.peakLongitude(),
            availableContours: contourValues, // Store all contour values in this property in order to generate the value selection in find contour page without accessing the goejson contour propery
            minimumContour,
            maximumContour
        }
        this.featureCollections().properties = properties;

        // Omit the _id field (if any), before sending to server. Mongo dB do not allow the updated value to have an ID
        this.featureCollections(_.omit(this.featureCollections(), '_id'));

        Meteor.call('uploadContour', this.featureCollections(), (error, result) => {
            if (error) {
                Bert.alert(error, 'danger', 'fixed-top');
            } else {
                Bert.alert(`The ${properties.parameter} contour of transponder ${this.selectedTransponder().name} is successfully inserted/updated`, 'success', 'fixed-top');
            }
        });

    },
    transponderChanged() {
        // console.log('Triggering change in Transponder ID = ' + this.transponderId());
        if (this.transponderId()) {
            let transponder = Transponders.findOne({ _id: this.transponderId() });

            // Check whether this transponder already has the contour data
            let contour = Contours.findOne({
                'properties.satellite': this.satelliteName(),
                'properties.name': transponder.name,
                'properties.path': transponder.path,
                'properties.parameter': this.valueToBeStored()
            });

            // If contour is found, fetch the contour data from the server
            if (contour) {
                this.loadingText('Fetching contours from the server, please wait...');
                Meteor.call('findContourFromId', contour._id, (error, result) => {

                    // Load the data into feature collection
                    this.featureCollections(result);

                    // Reassign this new FeatureCollection to the Geojson data so the map updates
                    this.mapData().geojsonData = this.featureCollections();

                    // Re-render map
                    this.renderMap();

                    // Add the retrieved data into the table by assigning it to this.contours()
                    this.contours(result.properties.availableContours.map((v) => {
                        return {
                            value: v
                        };
                    }));

                    // Remove loading text
                    this.loadingText('');
                })
            }

        }
    },
    uploadedSatellites() {
        // Sort by modified time - latest goes first
        let satellites = _.sortBy(Satellites.find({ isThaicom: false }).fetch(), (c) => {
            return c.createdAt;
        }).reverse();
        return satellites.map((satellite) => {
            return {
                id: satellite._id,
                name: satellite.name,
                orbitalSlot: satellite.orbitalSlot,
                created: moment(satellite.createdAt).fromNow()
            }
        });
    },
    uploadedTransponders() {
        if (!this.satelliteId()) {
            return [];
        } else {
            let transponders = _.sortBy(Transponders.find({ satellite: this.satelliteName() }).fetch(), (tp) => {
                return tp.createdAt;
            }).reverse();
            return transponders.map((tp) => {
                return {
                    id: tp._id,
                    name: tp.name,
                    satellite: tp.satellite,
                    created: moment(tp.createdAt).fromNow()
                };
            });
        }
    },
    transformDigitizedContours() { // Transform the digitized contours from http://arohatgi.info/WebPlotDigitizer/app/ into the geojson format
        let text = this.coordinates();
        let rows = text.trim().split('\n');
        let currentAmountOfContours = this.featureCollections().features.length;
        let color = mapColors[currentAmountOfContours % mapColors.length];
        let feature = {
            type: "Feature",
            properties: {
                satellite: this.satelliteName(),
                name: this.selectedTransponder().name,
                path: this.selectedTransponder().path,
                parameter: this.valueToBeStored(),
                peakLatitude: this.peakLatitude(),
                peakLongitude: this.peakLongitude(),
                color: color,
            },
            geometry: {
                type: "Polygon",
                coordinates: [[]],
            }
        }

        // The property name of the value will be either 'eirp' or 'gt'. Set that property to the value o finput contour value.
        feature.properties[this.valueToBeStored()] = +this.contourValue();

        rows.forEach(row => {
            let coordsPair = row.split(',');
            let lng = +coordsPair[0].trim();
            let lat = +coordsPair[1].trim();
            feature.geometry.coordinates[0].push([lng, lat]);
        });


        // Push the first point to complete the polygon
        feature.geometry.coordinates[0].push(feature.geometry.coordinates[0][0]);

        // Check whether polygon points are in clockwise order, if not, reverse the array to change the order back to clockwise
        // Geojson is picky about the format (polygon points must be in clockwise order)
        if (!polygonClockwiseValidator(feature.geometry.coordinates[0])) {
            feature.geometry.coordinates[0].reverse();
        }

        // Push the new feature to the geojson data so we can display on the map
        this.featureCollections().features.push(feature);

        // Reassign this new FeatureCollection to the Geojson data so the map updates
        this.mapData().geojsonData = this.featureCollections();

        // Render the map
        this.renderMap();

        // console.log(JSON.stringify(this.mapData(), undefined, 2));
    },
    renderMap() {
        $('.map-container').empty();
        Blaze.renderWithData(Template.geojsonPreview, {
            mapData: this.mapData(),
            mapHeight: this.mapHeight(),
            showContourValue: true,
            contourValueFontSize: 20,
        } , $('.map-container')[0]);
    }

})

/**
 * Created by thanatv on 8/10/17.
 */
