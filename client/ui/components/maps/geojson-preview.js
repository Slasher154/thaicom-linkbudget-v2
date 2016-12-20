/**
 * Created by thana on 10/6/2016.
 */
import { geocode, mapColors, sampleGeojsonData } from '/imports/api/maps/maps.js';
import { readJsonFromAssetFiles } from '/imports/api/utils/readJson';


Template.geojsonPreview.viewmodel({
    onCreated() {
        // Handle map events and reactive updates here

        //let showBeamLabel = this.showBeamLabel(), showContourValue = this.showContourValue();
        var self = this;
        GoogleMaps.ready(this.mapName(), function(map) {

            let thisMap = map.instance;

            // If geojson data of this template has value (from template arguments set by the parent template),
            // use that data. Otherwise, load the sample data.
            let data = self.geojsonData() ? self.geojsonData() : sampleGeojsonData;

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
            thisMap.data.addGeoJson(data);

            // Set style on this map
            setStyle(thisMap);

            // Draw marker label on this map (find contour mode = beam name)
            if (self.showLocationLabel()) drawLocationLabel(thisMap);

            // Draw contour line on this map
            if (self.showContourValue()) drawContourValue(thisMap);


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
    showLocationLabel: true,
    showContourValue: true,
    mapCenterCoordinates: {},
    mapFeatures: [],
    mapHeight: '550px',
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
    geojsonData: null,

});

function addListners(map) {

}

function drawLocationLabel(map) {
    map.data.forEach((feature) => {
        let geometry = feature.getGeometry();

        if(geometry.getType()==='Point') {
            /*
            //http://stackoverflow.com/questions/30128882/how-to-get-latlng-coordinates-of-a-point-feature
            let infowindow = new google.maps.InfoWindow({
                content: geometry.get().lat() + ', ' + geometry.get().lng(),
                position: geometry.get()
            });
            infowindow.open(map);
            */
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
}

function drawContourValue(map) {

}

function setStyle(map) {

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
}

function recenterMap(map) {

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
        else if(geometry.getType()==='Point') {
            bounds.extend(geometry.get());
        }
        else {}
    });
    map.fitBounds(bounds);
}

function removeFeatures(map, featuresToRemove) {
    featuresToRemove.forEach((feature) => {
       map.data.remove(feature);
    });
}

