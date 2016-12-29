/**
 * Created by thana on 12/9/2016.
 */

import { Satellites } from '/imports/api/satellites/satellites';
import { Transponders } from '/imports/api/transponders/transponders';
import { Contours } from '/imports/api/contours/contours';
import { beamPeaks } from '/imports/api/transponders/beam-peak';
import { gxtConverter } from '/imports/api/gxt-converter/gxt-converter.js';

Template.uploadGxt.viewmodel({
    onCreated(){
        Meteor.subscribe('allThaicomSatellites');
        Meteor.subscribe('allTranspondersWithBasicInfo');
        Meteor.subscribe('allContoursWithBasicInfo');
    },
    satellites() {
        return Satellites.find().fetch().map((satellite) => {
            return satellite.name;
        });
    },
    selectedSatellite: 'Thaicom 5',
    transponders() {
        return Transponders.find({
            satellite: this.selectedSatellite()
        }).fetch().sort().map((tp) => {
            return {
                id: tp._id,
                name: `${tp.name} (${tp.path})`
            };
        });
    },
    selectedTransponder: '',
    selectedContourToUpload: '',
    peakLatitude() {
        if(this.selectedTransponder()) {
            console.log('TP has a value of ' + this.selectedTransponder());
            let transponder = Transponders.findOne({_id: this.selectedTransponder()});
            let lat = _.findWhere(beamPeaks, {
                name: transponder.name,
                path: transponder.path,
                valueType: this.selectedContourToUpload(),
            }).latitude;
            return +lat;
        }
    },
    peakLongitude() {
        if(this.selectedTransponder()) {
            let transponder = Transponders.findOne({_id: this.selectedTransponder()});
            let lng = _.findWhere(beamPeaks, {
                name: transponder.name,
                path: transponder.path,
                valueType: this.selectedContourToUpload(),
            }).longitude;
            return +lng;
        }
    },
    contours: '',
    gxtFile: '',
    gxtSubmitted(event) {
        event.preventDefault();

        if(!this.gxtFile() || !this.gxtFile().name.endsWith('.gxt')) {
            Bert.alert('Please upload .gxt file only', 'danger', 'fixed-top');
        }
        else {
            let transponder = Transponders.findOne({ _id: this.selectedTransponder() });
            let properties = {
                satellite: this.selectedSatellite(),
                name: transponder.name,
                path: transponder.path,
                parameter: this.selectedContourToUpload(),
                peakLatitude: this.peakLatitude(),
                peakLongitude: this.peakLongitude(),
            };
            //console.log(JSON.stringify(properties));
            let convertOptions = {};

            /*
            if (this.selectedValueType === 'absolute') {
                convertOptions.isAbsoluteValue = true;
                if (properties.parameter === 'eirp') {
                    convertOptions.peakValue = transponder.saturatedEirpPeak;
                } else {
                    convertOptions.peakValue = transponder.gtPeak;
                }
            }
            */
            // Set the value type to be either 'relativeGain', 'eirp' or 'gt'
            // For HTS (Thaicom 4), the default is 'relativeGain' i.e. stores the relative number in the database
            // For conventional satellite, the default value is either 'eirp' or 'gt'
            let satelliteType = Satellites.findOne({name: properties.satellite}).type;

            if (satelliteType.toLowerCase() === 'hts') {
                convertOptions.valueType = 'relativeGain';
            }
            else {
                convertOptions.valueType = properties.parameter;
            }
            //console.log(JSON.stringify(convertOptions));
            // Convert GXT file to GeoJson FeatureCollection object
            gxtConverter(this.gxtFile(), convertOptions).then((results) => {

                // console.log(JSON.stringify(results));

                // Add properties to this object
                // We use index 0 here because the returned results is an array of transponders
                // In this upload-gxt section, we upload only single transponder at a time
                let featureCollection = results[0];

                // Add minimum contour and maximum contour from the return FeatureCollection to the properties
                let contourValues = featureCollection.features.map((feature) => {
                    return feature.properties[convertOptions.valueType];
                });

                if (contourValues) {
                    properties.minimumContour = _.min(contourValues);
                    properties.maximumContour = _.max(contourValues);
                    console.log(JSON.stringify(properties));
                }

                featureCollection.properties = properties;

                // Loop through each feature and give them properties as well
                featureCollection.features.forEach((feature) => {
                    _.extend(feature.properties, properties);
                })
                Meteor.call('uploadContour', featureCollection, (error, result) => {
                    if (error) {
                        Bert.alert(error, 'danger', 'fixed-top');                    } else {

                        Bert.alert(`The ${properties.parameter} contour of transponder ${transponder.name} is successfully inserted/updated`, 'success', 'fixed-top');
                    }
                });
            }).catch((error) => {
                Bert.alert(error, 'danger', 'fixed-top');
            });

        }

    },
    uploadedContours() {
        // Sort by modified time - latest goes first
        let contours = _.sortBy(Contours.find().fetch(), (c) => {
            return c.modifiedAt
        }).reverse();
        return contours.map((contour) => {
            return {
                name: contour.properties.name,
                value: contour.properties.parameter,
                created: moment(contour.modifiedAt).fromNow()
            }
        });
    }
});