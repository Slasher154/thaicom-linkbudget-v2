/**
 * Created by thana on 10/7/2016.
 */

export const Transponders = new Mongo.Collection("transponders");

Transponders.before.insert((userId, doc) => {
    doc.createdAt = Date.now();
    doc.createdBy = userId;
});

Transponders.before.upsert((userId, selector, modifier, options) => {
    modifier.$set = modifier.$set || {};
    modifier.$set.modifiedAt = Date.now();
    modifier.$set.modifiedBy = userId;
});