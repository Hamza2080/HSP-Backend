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

  Town.getTotalLand = async function (townId) {
    try {
        let town = await Town.findById(townId);
        if (town) {
          let totalLand = {
            kanal: 0,
            marla: 0,
            sarsai: 0,
            feet: 0
          }
            let land = await Town.app.models.land.find();
            await Promise.all(land.map(async landObj => {
              totalLand.kanal += landObj.kanal || 0;
              totalLand.marla += landObj.marla || 0;
              totalLand.sarsai += landObj.sarsai || 0;
              totalLand.feet += landObj.feet || 0;
            }));
            return totalLand;
        } else return(`Town id is not correct.`);
    } catch (err) {
      return(err);
    }
  };
};
