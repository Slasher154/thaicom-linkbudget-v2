/**
 * Created by thanatv on 8/4/17.
 */

import { Satellites } from '/imports/api/satellites/satellites';
import { Transponders } from '/imports/api/transponders/transponders';

let json = {
        "name": "1V",
        "satellite": "Thaicom 5",
        "uplinkCenterFrequency": 5.945,
        "downlinkCenterFrequency": 3.72,
        "bandwidth": 36,
        "path": "forward",
        "type": "broadcast",
        "gtPeak": 1.6,
        "uplinkPolarization": "H",
        "saturatedEirpPeak": 40.53,
        "downlinkPolarization": "V",
        "twta": "1V",
        "operatingMode": "fgm",
        "saturatedFluxDensity": -80,
        "attenuationRange": 16,
        "defaultAttenuation": 9,
        "defaultNumberOfCarriers": "multi",
        "backoffSettings": [
            {
                "numberOfCarriers": "single",
                "inputBackoff": 0,
                "outputBackoff": 0,
                "intermod": 25
            },
            {
                "numberOfCarriers": "two",
                "inputBackoff": -1.8,
                "outputBackoff": -2.2,
                "intermod": 18.78
            },
            {
                "numberOfCarriers": "multi",
                "inputBackoff": -5.2,
                "outputBackoff": -4.2,
                "intermod": 17.12
            }
        ],
        "uplinkFrequencyBand": "c-band",
        "downlinkFrequencyBand": "c-band",
        "defaultGateway": "Thaicom 5 C-Band Main Gateway",
        "operatingModeOptions": [
            "fgm"
        ],
        "beam": "Standard C"
    };

Template.addTransponder.viewmodel({
    onCreated() {
        Meteor.subscribe('allSatellites');
        Meteor.subscribe('allTranspondersWithBasicInfo');
    },
    satelliteId: '',
    satelliteName() {
      if (this.satelliteId()) {
          return Satellites.findOne({ _id: this.satelliteId() }).name;
      }
      return '';
    },
    transponderId: '',
    newTransponder: {
        name: '',
        path: 'forward',
    },
    deleteTransponder(event) {
        event.preventDefault();
        let result = confirm(`Delete ${this.newTransponder().name} from database?`);
        if (result) {
            Meteor.call('removeTransponder', this.transponderId(), (error, res) => {
                if (error) {
                    Bert.alert(error, 'danger', 'fixed-top');
                } else {
                    Bert.alert(`${this.newTransponder().name} is successfully deleted to database.`, 'success', 'fixed-top');
                }
            })
        }
    },
    transponderSubmitted(event) {
        event.preventDefault();
        // If this is new satellite but name is same as the current satellite, prevent the insert.
        if (Transponders.findOne({ name: this.newTransponder().name, satellite: this.satelliteName() }) && !this.transponderId()) {
            Bert.alert(`There is already transponder with name: ${this.newTransponder().name} on satellite ${this.satelliteName()}` , 'danger', 'fixed-top');
        } else if (this.newTransponder().name === '') {
            Bert.alert(`Transponder name can't be empty.` , 'danger', 'fixed-top');
        } else {
            // Add satellite name to the new transponder object
            _.extend(this.newTransponder(), { satellite: this.satelliteName() });
            console.log(JSON.stringify(this.newTransponder(), undefined, 2));
            Meteor.call('upsertTransponder', this.transponderId(), this.newTransponder(), (error, res) => {
                if (error) {
                    Bert.alert(error, 'danger', 'fixed-top');
                } else {
                    Bert.alert(`${this.newTransponder().name} is successfully inserted/updated to database.`, 'success', 'fixed-top');
                }
            })
        }
    },
    transponderChanged() {
        if (this.transponderId()) {
            let transponder = Transponders.findOne({ _id: this.transponderId() });
            console.log(JSON.stringify(transponder, undefined, 2));
            this.newTransponder(transponder);
        }
    },
    uploadedSatellites() {
        // Sort by modified time - latest goes first
        let satellites = _.sortBy(Satellites.find({ isThaicom: false }).fetch(), (c) => {
            return c.createdAt;
        }).reverse();
        return satellites.map((satellite) => {
            return {
                id: satellite._id,
                name: satellite.name,
                orbitalSlot: satellite.orbitalSlot,
                created: moment(satellite.createdAt).fromNow()
            }
        });
    },
    uploadedTransponders() {
        if (!this.satelliteId()) {
            return [];
        } else {
            let transponders = _.sortBy(Transponders.find({ satellite: this.satelliteName() }).fetch(), (tp) => {
                return tp.createdAt;
            }).reverse();
            return transponders.map((tp) => {
                return {
                    id: tp._id,
                    name: tp.name,
                    satellite: tp.satellite,
                    created: moment(tp.createdAt).fromNow()
                };
            });
        }
    }



})

