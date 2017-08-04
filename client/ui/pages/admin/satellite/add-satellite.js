/**
 * Created by thanatv on 8/4/17.
 */

import { Satellites } from '/imports/api/satellites/satellites';

Template.addSatellite.viewmodel({
    onCreated() {
        Meteor.subscribe('allSatellites');
    },
    satelliteId: '',
    newSatellite: {
        name: '',
        orbitalSlot: 78.5,
        isThaicom: false,
        isActive: true,
        stationKeepingBox: 0.05,
        type: 'Conventional',
    },
    typeOptions: ['Conventional', 'HTS'],
    deleteSatellite(event) {
        event.preventDefault();
        let result = confirm(`Delete ${this.newSatellite().name} from database?`);
        if (result) {
            Meteor.call('removeSatellite', this.satelliteId(), (error, res) => {
                if (error) {
                    Bert.alert(error, 'danger', 'fixed-top');
                } else {
                    Bert.alert(`${this.newSatellite().name} is successfully deleted to database.`, 'success', 'fixed-top');
                }
            })
        }
    },
    satelliteSubmitted(event) {
        event.preventDefault();
        // If this is new satellite but name is same as the current satellite, prevent the insert.
        if (Satellites.find().fetch().filter((s) => s.name === this.newSatellite().name).length > 0 && !this.satelliteId()) {
            Bert.alert(`There is already satellite with name: ${this.newSatellite().name}` , 'danger', 'fixed-top');
        } else if (this.newSatellite().name === '') {
            Bert.alert(`Satellite name can't be empty.` , 'danger', 'fixed-top');
        } else {
                Meteor.call('upsertSatellite', this.satelliteId(), this.newSatellite(), (error, res) => {
                if (error) {
                    Bert.alert(error, 'danger', 'fixed-top');
                } else {
                    Bert.alert(`${this.newSatellite().name} is successfully inserted/updated to database.`, 'success', 'fixed-top');
                }
            })
        }
    },
    satelliteChanged() {
       // Update the fields by setting new satellite object to the satellite of selected ID
        console.log(this.satelliteId());
       if (this.satelliteId()) {
           let sat = Satellites.find().fetch().find((s) => s._id === this.satelliteId());
           this.newSatellite(sat);
       }
    },
    uploadedSatellites() {
        // Sort by modified time - latest goes first
        let satellites = _.sortBy(Satellites.find().fetch(), (c) => {
            return c.createdAt
        }).reverse();
        return satellites.map((satellite) => {
            return {
                id: satellite._id,
                name: satellite.name,
                orbitalSlot: satellite.orbitalSlot,
                created: moment(satellite.createdAt).fromNow()
            }
        });
    }



})

