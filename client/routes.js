/**
 * Created by thana on 9/6/2016.
 */

import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Roles } from 'meteor/alanning:roles';

// Public Routes

let exposed = FlowRouter.group({});

// Configure route for login page
exposed.route('/login', {
    name: 'login',
    action() {
        BlazeLayout.render('login');
    },
});

// Logged in Routes

let loggedIn = FlowRouter.group({
    triggersEnter: [function () {
        if (!Meteor.loggingIn() && !Meteor.userId()) {
            //console.log('User is not logged in');
            let route = FlowRouter.current();
            if (route.route.name !== 'login') {
                Session.set('redirectAfterLogin', route.path);
            }
            return FlowRouter.go('login');
        }
    }]
});

loggedIn.route('/', {
    name: 'index',
    action() {
        BlazeLayout.render('mainLayout', { content: 'index' });
        //BlazeLayout.render('mainLayout');
    },
});

// Logout Route => '/logout'
loggedIn.route('/logout', {
    name: 'logout',
    action(){
        Meteor.logout(function(){
            FlowRouter.go('login');
            Bert.alert('Successfully Logout', 'success', 'fixed-top');
        })
    }
});