'use strict';

module.exports = function (Land) {

  //validity of plotNumber field...
  Land.validatesUniquenessOf('name');

  // add landlord and land measurement detail while getting land
  Land.afterRemote('**', async function (ctx, modelInstance, next) {
    let methodName = ctx.method.name;
    if ((methodName == "find" || methodName == "findOne" || methodName == "findById") && modelInstance && modelInstance.length > 0) {
      await Promise.all(modelInstance.map(async instance => {
        let landlord = await Land.app.models.landlord.findById(instance.landlordId);
        let landMeasurement = await Land.app.models.land_measuring_unit.findById(instance.landMeasuringUnitId);
        // instance["landlord"] = landlord;
        instance["landMeasurement"] = landMeasurement;
        instance["measuring_unit"] = landMeasurement.measuring_unit;
        instance["landLord"] = landlord;
      }))
      next();
    } else next();
  });
};
