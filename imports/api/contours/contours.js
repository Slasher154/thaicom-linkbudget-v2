/**
 * Created by thana on 11/30/2016.
 */

export const Contours = new Mongo.Collection('contours');
export const TempContours = new Mongo.Collection('tempContours');

Contours.before.insert((userId, doc) => {
    doc.createdAt = Date.now();
    doc.createdBy = userId;
});

Contours.before.upsert((userId, selector, modifier, options) => {
    modifier.$set = modifier.$set || {};
    modifier.$set.modifiedAt = Date.now();
    modifier.$set.modifiedBy = userId;
});