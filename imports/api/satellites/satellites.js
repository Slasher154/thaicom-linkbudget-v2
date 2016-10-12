/**
 * Created by thana on 10/7/2016.
 */

export const Satellites = new Mongo.Collection('satellites');

Satellites.before.insert((userId, doc) => {
   doc.createdAt = Date.now();
   doc.createdBy = userId;
});