/**
 * Created by thana on 10/7/2016.
 */

export const Transponders = new Mongo.Collection("transponders");

Transponders.before.insert((userId, doc) => {
    doc.createdAt = Date.now();
    doc.createdBy = userId;
});