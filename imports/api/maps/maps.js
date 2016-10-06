/**
 * Created by thana on 10/6/2016.
 */

export const geocode = (address) => {
    return new Promise((resolve, reject) => {
        Meteor.call('geocode',address, (error, result) => {
            if(error) {
                reject(error.reason);
            }
            //console.log('lat lon = ' + JSON.stringify(result));
            resolve(result);
        });
    });
}