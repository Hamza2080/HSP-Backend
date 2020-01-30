'use strict';

module.exports = function (Plotpaymentplan) {

  //validity of plotNumber field...
  Plotpaymentplan.validatesUniquenessOf('payment_plan_name');
};
