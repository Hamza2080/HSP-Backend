'use strict';

module.exports = function (Street) {
    /**
   * get street against town...
   */
    Street.remoteMethod("getStreetByTownId", {
        accepts: [{
            arg: "townId",
            type: "string",
            required: true
        }
        ],
        http: {
            path: "/getStreetByTownId",
            verb: "get"
        },
        description: "Get streets against townId.",
        returns: {
            arg: "data",
            type: "object",
            root: true
        }
    });

    Street.getStreetByTownId = async function (townId) {
        try {
            let streets = await Street.find({"townId": townId});
            return (streets || []);
        } catch (err) {
            return(err);
        }
    };
};
