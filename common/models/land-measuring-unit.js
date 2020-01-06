'use strict';

module.exports = function(Landmeasuringunit) {

    Landmeasuringunit.validatesUniquenessOf('measuring_unit', {message: 'measuring_unit already exist!'});

};
