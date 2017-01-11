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

// ---------------------------------------------------- Contour Routes ----------------------------------------------
loggedIn.route('/contours', {
    name: 'contours',
    action() {
        BlazeLayout.render('mainLayout', { content: 'contours' });
    },
});

loggedIn.route('/find-contours', {
    name: 'find-contours',
    action() {
        BlazeLayout.render('mainLayout', { content: 'findContours' });
    },
});

loggedIn.route('/contours/upload', {
    name: 'upload-contours',
    action() {
        BlazeLayout.render('mainLayout', { content: 'uploadContours' });
    },
});

loggedIn.route('/contours/upload-gxt', {
    name: 'upload-gxt',
    action() {
        BlazeLayout.render('mainLayout', { content: 'uploadGxt' });
    },
});

loggedIn.route('/polygon-filler', {
    name: 'polygon-filler',
    action() {
        BlazeLayout.render('mainLayout', { content: 'polygonFiller' });
    },
});

loggedIn.route('/education', {
    name: 'education',
    action() {
        BlazeLayout.render('mainLayout', { content: 'education' });
    },
});

loggedIn.route('/how-to-contours', {
    name: 'how-to-contours',
    action() {
        BlazeLayout.render('mainLayout', { content: 'howToContours' });
    },
});

loggedIn.route('/how-to-latlon-input', {
    name: 'how-to-latlon-input',
    action() {
        BlazeLayout.render('mainLayout', { content: 'howToLatlonInput' });
    },
});

loggedIn.route('/faqs', {
    name: 'faqs',
    action() {
        BlazeLayout.render('mainLayout', { content: 'faqs' });
    },
});

loggedIn.route('/video', {
    name: 'video',
    action() {
        BlazeLayout.render('mainLayout', { content: 'video' });
    },
});

loggedIn.route('/quiz-upload', {
    name: 'quiz-upload',
    action() {
        BlazeLayout.render('mainLayout', { content: 'quiz-upload' });
    },
});

loggedIn.route('/quiz-rating', {
    name: 'quiz-rating',
    action() {
        BlazeLayout.render('mainLayout', { content: 'quiz-rating' });
    },
});

loggedIn.route('/channel-rating', {
    name: 'channel-rating',
    action() {
        BlazeLayout.render('mainLayout', { content: 'channel-rating' });
    },
});