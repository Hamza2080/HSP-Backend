'use strict';

module.exports = function (Plot) {

  //validity of plotNumber field...
  Plot.validatesUniquenessOf('plotNumber');


  // add landlord and land measurement detail while getting land
  Plot.afterRemote('**', async function (ctx, modelInstance, next) {
    let methodName = ctx.method.name;
    if ((methodName == "find" || methodName == "findOne" || methodName == "findById") && modelInstance && modelInstance.length > 0) {
      await Promise.all(modelInstance.map(async instance => {
        let landMeasurement = await Plot.app.models.land_measuring_unit.findById(instance.landMeasuringUnitId);
        let customer = await Plot.app.models.Customer.findById(instance.customerId);
        let town = await Plot.app.models.town.findById(instance.townId);

        instance["landMeasurement"] = landMeasurement;
        instance["measuring_unit"] = landMeasurement.measuring_unit;
        instance["landLord"] = landlord;
        instance["townInfo"] = town;
        instance["customerInfo"] = customer;
      }))
      next();
    } else next();
  });



  //after save hook that will create installments in plot...
  Plot.observe('after save', async function (ctx, next) {
    console.log('supports isNewInstance?', ctx.isNewInstance !== undefined);

    try {
        if (ctx.isNewInstance) {
            let instance = ctx.instance;
            let paymentPlan = await Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
            if (paymentPlan) {
                let installments = await createInstallments(paymentPlan);
            } else {
                await Plot.deleteById(instance.id);
                next("Please insert plot payment plan first and then add plot.");
            }
        } else {}
    } catch(error) {
        next(error);
    }
    // next();
  });


  //create installments against payment plan...
  function createInstallments (paymentPlan) {
      return new Promise(async (resolve, reject) => {
          try{
              if (paymentPlan.payment_plan_duration > 0) {
                  let firstPayment = paymentPlan.first_payment;
                  let totalAmount = paymentPlan.total_amount;
              } else {
                  let installmentObj = {
                      installmentSubmissionDate : instance.first_payment,
                      installmentAmount : paymentPlan.total_amount
                  }
                  let installment = [];
                  installment.push(installmentObj);
                  resolve(installment);
              }
          } catch(error) {
              reject (error);
          }
      })
  }
};