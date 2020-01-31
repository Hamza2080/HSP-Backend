"use strict";

module.exports = function (Plot) {
  //validity of plotNumber field...
  Plot.validatesUniquenessOf("plotNumber");

  // add landlord and land measurement detail while getting land
  Plot.afterRemote("**", async function (ctx, modelInstance, next) {
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
      }));
      next();
    } else next();
  });

  // operation hook before save on plot for checking information....
  Plot.observe("before save", async function (ctx, next) {
    if (ctx.instance && ctx.isNewInstance) {
      if (ctx.instance.totalPayment < ctx.instance.downPayment + ctx.instance.discount) next("Total payment for plot must be greater then or equal to downPayment + discount.");
      else if (ctx.instance.totalPayment <= ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment)
        next(`Error while creting new instance of Plot, totalPayment of plot is : ${ctx.instance.totalPayment}, while downPayment is : ${ctx.instance.downPayment} & discount is : ${ctx.instance.discount}, and plot is not available on installment, please verify amount.`);
      else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment && !ctx.instance.plotPaymentPlanId)
        next("Please provide a valid payment plan for creating installment schedule.");
      else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment)
        createInstallments(ctx.instance, next);
      else if (ctx.instance.totalPayment == ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment){ ctx.instance.plotPaymentStatus = "Done";ctx.instance.installments = [];next();};
    } else next("Error while creting new instance of Plot.");
  });

  //create installments against payment plan...
  async function createInstallments(instance, next) {
    try {
      let paymentPlan = await Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
      if (!paymentPlan) next(`Please provide a valid plotPaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
      else {
        let totalInstallments = paymentPlan.noOfInstallment;
        let remainingAmount = instance.totalPayment - instance.downPayment - instance.discount;
        let installmentAmount = paymentPlan.installmentAmount;
        let installmentGap = paymentPlan.installmentGap;
        let purchaseDate = instance.purchaseDate;
        let installments = [];

        if (remainingAmount <= installmentAmount) {
          let date = new Date(purchaseDate);
          installments.push({
            installmentAmount: remainingAmount,
            submittedOn: new Date(date.setMonth(date.getMonth() + installmentGap)),
            status: "pending"
          })
          instance["installments"] = installments;
          next();
        } else {
          let counter = 1;
          while (remainingAmount > 0) {
            let date = new Date(purchaseDate);
            let amount = remainingAmount >= installmentAmount ? remainingAmount - installmentAmount : remainingAmount;
            installments.push({
              installmentAmount: amount,
              submittedOn: new Date(date.setMonth(date.getMonth() + (installmentGap * counter))),
              status: "pending"
            })
            remainingAmount -= amount;
            counter += 1;
          }
          instance["installments"] = installments;
          next();
        }
      }
    } catch (error) {
      reject(error);
    }
  }
};