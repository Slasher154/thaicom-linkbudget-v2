/**
 * Created by thana on 9/13/2016.
 */

import '/imports/api/users/users.js';

Template.mainLayout.helpers({
   fullName(){
       Meteor.subscribe('user.profile');
       const user = Meteor.user();
       if (user) {
           return user.fullName();
       }
       return '';
   }
});