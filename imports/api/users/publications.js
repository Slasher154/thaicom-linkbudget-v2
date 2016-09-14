/**
 * Created by thana on 9/13/2016.
 */

Meteor.publish('user.profile', function () {
    return Meteor.users.find({
        _id: this.userId
    }, {
        fields: {
            firstName: 1,
            lastName: 1,
            bu: 1,
            dp: 1,
            position: 1,
        },
    });
});