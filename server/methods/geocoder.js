/**
 * Created by thana on 10/6/2016.
 */

Meteor.methods({
    'geocode'(address) {
        check(address, String);
        console.log('Address = ' + address);
        let geo = new GeoCoder();
        let result = geo.geocode(address);
        console.log(JSON.stringify(result));
        //let result = geo.geocode('29 champs elysée paris');
        return {
            lat: result[0].latitude,
            lng: result[0].longitude,
        }
    },
});