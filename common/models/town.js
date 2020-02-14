"use strict";
let _ = require("lodash");
module.exports = function (Town) {
  /**
   * getTotalLand api...
   */
  Town.remoteMethod("getTotalLand", {
    accepts: [{
        arg: "townId",
        type: "string",
        required: true
      }
    ],
    http: {
      path: "/getTotalLand",
      verb: "get"
    },
    description: "Get total acquired land detail.",
    returns: {
      arg: "data",
      type: "object",
      root: true
    }
  });

  Town.getTotalLand = async function (townId, cb) {
    try {
        let town = await Town.findById(townId);
        if (town) {
            let myMap = new Map();
            let land = await Town.app.models.land.find();
            await Promise.all(land.map(async landObj => {
                let measuringUnit = await Town.app.models.land_measuring_unit.findById(landObj.landMeasuringUnitId);
                land["unit"] = measuringUnit.measuring_unit || "NOT_Found";
                if (myMap.has(measuringUnit.measuring_unit)) {
                    let total_land_size = myMap.get(measuringUnit.measuring_unit) + landObj.total_land;
                    myMap.set(measuringUnit.measuring_unit, total_land_size);
                }
                else {
                    myMap.set(measuringUnit.measuring_unit, landObj.total_land);}
            }))
            let retLandObj = {land};
            await Promise.all([ ...myMap.keys() ].map(key => {
                retLandObj[key] = myMap.get(key);
            }))
            cb (null, {...retLandObj});
        } else cb(`Town id is not correct.`);
    } catch (err) {
      cb(err);
    }
  };
};
