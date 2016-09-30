/**
 * Created by thana on 9/15/2016.
 */

Template.contours.viewmodel({
    onRendered() {
        GoogleMaps.load({
            key: 'AIzaSyDthuAAkP9IYaN7Cr8M32fYk6-O_adwD2k'
        });
    },
    onCreated() {
        // Handle map events and reactive updates here
        GoogleMaps.ready('contourMap', function(map) {

        });
    },
    mapOptions() {
        if (GoogleMaps.loaded()) {
            // Map initialization options
            return {
                center: {lat: -25, lng: 135},
                zoom: 4,
            };
        }
    },
    satellites: [
        { id: 'A', name: 'Thaicom 4' },
        { id: 'B', name: 'Thaicom 5' },
        { id: 'C', name: 'Thaicom 6' },
    ],
    selectedSatellite: '',
    selectedValueToDisplay: '',
    selectedValueType: '',
});