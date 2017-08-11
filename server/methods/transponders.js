/**
 * Created by thanatv on 8/10/17.
 */

import { Transponders } from '../../imports/api/transponders/transponders';

Meteor.methods({
    upsertTransponder(id, transponder) {
        check(id, String);
        check(transponder, Object);
        Transponders.upsert(id, { $set: transponder });
    },
    removeTransponder(id) {
        check(id, String);
        Transponders.remove(id);
    }
})