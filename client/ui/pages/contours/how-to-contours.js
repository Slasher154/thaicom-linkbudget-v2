/**
 * Created by thana on 1/9/2017.
 */

import { Transponders } from '/imports/api/transponders/transponders';

Template.howToContours.viewmodel({
    onCreated(){
        Meteor.subscribe('allTranspondersWithBasicInfo');
    },
    thaicom4Augment() {
        let transponder = Transponders.find({satellite: 'Thaicom 4', type: 'augment'}).fetch();
        return _.uniq(_.pluck(transponder, 'name'));
    },
    thaicom4Broadcast() {
        let transponder = Transponders.find({satellite: 'Thaicom 4', type: 'broadcast'}).fetch();
        return _.uniq(_.pluck(transponder, 'name'));
    }

});