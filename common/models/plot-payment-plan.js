'use strict';

module.exports = function (Plotpaymentplan) {

  //validity of plotNumber field...
  Plotpaymentplan.validatesUniquenessOf('payment_plan_name');

  // before save operation hook...
  Plotpaymentplan.observe('before save', function (ctx, next) {
    if (ctx.instance && ctx.instance.installmentGap <= 0 ) next("Please add valid installment gap, its value must be ineger and greater than zero,(it represent gap b/w installments in months).");
    else if (ctx.instance) {
      let discount = 0;
      if (ctx.instance && ctx.instance.totalAmount && ctx.instance.installmentAmount) {
        let remainingAmount = ctx.instance.totalAmount - ctx.instance.downPayment - discount;

        let installmentAmount = ctx.instance.installmentAmount;
        let no_of_installment = Math.ceil(remainingAmount/installmentAmount);

        ctx.instance["no_of_installment"] = no_of_installment;
        
        next();
      }
    }
  });
};
