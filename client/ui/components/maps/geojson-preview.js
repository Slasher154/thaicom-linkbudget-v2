/**
 * Created by thana on 10/6/2016.
 */
import { geocode } from '/imports/api/maps/maps.js';

Template.geojsonPreview.viewmodel({
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
    onCreated() {
        // Handle map events and reactive updates here
        let data = this.geojsonData();
        GoogleMaps.ready('contourMap', function(map) {

            // Sort the data from farthest to peak to closest to peak. This lets the smallest contour get added on the map last.
            // If the biggest contour get added last, user will not be able to click on the smaller contour
            // underneath
            data.features.sort((a, b) => a.properties.relativeGain - b.properties.relativeGain);

            // Add an incoming Geojson Data from the parent template into the map
            map.instance.data.addGeoJson(data);

            // Add event listeners
            map.instance.data.addListener('click', (event) => {
                console.log(event.feature.getProperty('relativeGain'));
            });

            // Auto center the map
            recenterMap();
        });
    },
    mapCenterCoordinates: {},
    mapHeight: '550px',
    mapOptions() {
        if (GoogleMaps.loaded()) {
            return {
              center: this.mapCenterCoordinates(),
              zoom: 4,
            };
        }

    },
    centerAddress: 'Thailand', // Default map center
    editable: false,
    geojsonData: {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [125.6, 10.1]
        },
        "properties": {
            "name": "Dinagat Islands"
        }
    },

});

function recenterMap() {
    let map = GoogleMaps.maps.contourMap.instance;

    // Loop through all elements in a featurecollection
    let bounds = new google.maps.LatLngBounds();

    // Source: http://stackoverflow.com/questions/24401240/how-to-get-latlngbounds-of-feature-polygon-geometry-in-google-maps-v3
    map.data.forEach((feature) => {
        let geometry = feature.getGeometry();
        if(geometry.getType()==='Polygon') {
            geometry.getArray().forEach((path) => {
                //iterate over the points in the path
                path.getArray().forEach(function(latLng){

                    //extend the bounds
                    bounds.extend(latLng);
                });
            })
        }
    });
    map.fitBounds(bounds);
}

