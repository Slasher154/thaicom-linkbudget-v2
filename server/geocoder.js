/**
 * Created by thana on 10/6/2016.
 */

Meteor.methods({
    'geocode'(address) {
        check(address, String);
        let geo = new GeoCoder();
        let result = geo.geocode(address);
        return {
            lat: result[0].latitude,
            lng: result[0].longitude,
        }
    },
});