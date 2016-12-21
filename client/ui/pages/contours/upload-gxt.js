/**
 * Created by thana on 12/9/2016.
 */

import { Transponders } from '/imports/api/transponders/transponders';
import { Contours } from '/imports/api/contours/contours';
import { gxtConverter } from '/imports/api/gxt-converter/gxt-converter.js';


Template.uploadGxt.viewmodel({
    onCreated(){
        Meteor.subscribe('allTranspondersWithBasicInfo');
        Meteor.subscribe('allContoursWithBasicInfo');
    },
    satellites: ['Thaicom 4', 'Thaicom 5', 'Thaicom 6'],
    selectedSatellite: 'Thaicom 4',
    transponders() {
        return Transponders.find({
            satellite: this.selectedSatellite()
        }).fetch().map((tp) => {
            return {
                id: tp._id,
                name: `${tp.name} (${tp.path})`
            };
        });
    },
    selectedTransponder: '',
    selectedContourToUpload: '',
    selectedValueType: '',
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
            };

            let convertOptions = {};

            if (this.selectedValueType === 'absolute') {
                convertOptions.isAbsoluteValue = true;
                if (properties.parameter === 'eirp') {
                    convertOptions.peakValue = transponder.saturatedEirpPeak;
                } else {
                    convertOptions.peakValue = transponder.gtPeak;
                }
            }

            // Convert GXT file to GeoJson FeatureCollection object
            gxtConverter(this.gxtFile(), convertOptions).then((results) => {

                // Add properties to this object
                let featureCollection = results[0];
                featureCollection.properties = properties;

                // Loop through each feature and give them properties as well
                featureCollection.features.forEach((feature) => {
                    _.extend(feature.properties, properties);
                })
                console.log(JSON.stringify(results));
                Meteor.call('uploadContour', featureCollection, (error, result) => {
                    if (error) {
                        Bert.alert(error, 'danger', 'fixed-top');
                    } else {
                        Bert.alert(`The ${properties.parameter} contour of transponder ${transponder.name} is successfully inserted/updated`, 'success', 'fixed-top');
                    }
                });
            }).catch((error) => {
                Bert.alert(error, 'danger', 'fixed-top');
            });

        }

    },
    uploadedContours() {
        return Contours.find().fetch().map((contour) => {
            return {
                name: contour.properties.name,
                value: contour.properties.parameter,
                created: moment(contour.modifiedAt).fromNow()
            }
        });
    }
});