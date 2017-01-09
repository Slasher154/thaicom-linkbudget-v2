/**
 * Created by thana on 1/4/2017.
 */

import { gxtConverter } from '/imports/api/gxt-converter/gxt-converter.js';

Template.polygonFiller.viewmodel({
    onCreated(){

    },
    onRendered(){

    },
    mapHeight: '700px',
    mapData(){
        return {
            geojsonData: {
                "type": "FeatureCollection",
                "features": [{
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [100.514112, 13.859462],
                    },
                }],
            }
        };
    },
    gxtFile: '',
    gxtSubmitted(event) {
        event.preventDefault();

        if(!this.gxtFile() || !this.gxtFile().name.endsWith('.gxt')) {
            Bert.alert('Please upload .gxt file only', 'danger', 'fixed-top');
        }
        else {

            //console.log(JSON.stringify(convertOptions));
            // Convert GXT file to GeoJson FeatureCollection object
            gxtConverter(this.gxtFile(), { valueType: 'eirp' }).then((results) => {

                console.log(JSON.stringify(results));

                // Add properties to this object
                // We use index 0 here because the returned results is an array of transponders
                // In this upload-gxt section, we upload only single transponder at a time
                let featureCollection = results[0];

                // Loop through each feature and give them properties as well
                $('.map-container').empty();
                Blaze.renderWithData(Template.geojsonPreview, {
                    mapData: {
                        geojsonData: featureCollection,
                    },
                    mapHeight: this.mapHeight(),
                } , $('.map-container')[0]);
            }).catch((error) => {
                Bert.alert(error, 'danger', 'fixed-top');
            });

        }

    },
})