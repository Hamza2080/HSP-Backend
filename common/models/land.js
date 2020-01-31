'use strict';

module.exports = function (Land) {

  //validity of name field...
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


  // operation hook before save on land for checking information....
  Land.observe("before save", async function (ctx, next) {
    if (ctx.instance && ctx.isNewInstance) {
      if (ctx.instance.totalPayment < ctx.instance.downPayment + ctx.instance.discount) next("Total payment for land must be greater then or equal to downPayment + discount.");
      else if (ctx.instance.totalPayment <= ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment)
        next(`Error while creting new instance of Land, totalPayment of land is : ${ctx.instance.totalPayment}, while downPayment is : ${ctx.instance.downPayment} & discount is : ${ctx.instance.discount}, and land is not available on installment, please verify amount.`);
      else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment && !ctx.instance.plotPaymentPlanId)
        next("Please provide a valid payment plan for creating installment schedule.");
      else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment)
        createInstallments(ctx.instance, next);
      else if (ctx.instance.totalPayment == ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment) {
        ctx.instance.landPaymentStatus = "Done";
        ctx.instance.installments = [];
        next();
      };
    } else next("Error while creting new instance of Land.");
  });

  //create installments against payment plan...
  async function createInstallments(instance, next) {
    try {
      let paymentPlan = await Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
      if (!paymentPlan) next(`Please provide a valid PaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
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
            submissionDate: new Date(date.setMonth(date.getMonth() + installmentGap)),
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
              submissionDate: new Date(date.setMonth(date.getMonth() + (installmentGap * counter))),
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

  /**
   * submit installment api...
   */
  Land.remoteMethod('submitInstallment', {
    accepts: [{
        arg: 'submittedBy',
        type: 'string',
        required: true
      },
      {
        arg: 'submittedTo',
        type: 'string',
        required: true
      },
      {
        arg: 'contact',
        type: 'string',
        required: true
      },
      {
        arg: 'amount',
        type: 'number',
        required: true
      },
      {
        arg: 'landId',
        type: 'string',
        required: true
      }
    ],
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });
  Land.submitInstallment = async function (submittedBy, submittedTo, contact, amount, landId, cb) {
    try {
      let landInfo = await Land.findById(landId);
      if (landInfo.installments.length > 0 && landInfo.landPaymentStatus != "Done") {
        let length = landInfo.installments.length - 1;
        if (landInfo.installments[length].status == "pending") {
          let installments = landInfo.installments[length].installments;
          let iteration = 0;
          let pendingInstallment = true;
          while (iteration <= installments.length && pendingInstallment) {
            if (installments[iteration].status == "pending") {
              pendingInstallment = false;
              if (amount == installments[iteration].installmentAmount) {
                installments[iteration].status = "done";
                installments[iteration].submittedOn = new Date();
                installments[iteration].submittedBy = submittedBy;
                installments[iteration].submittedTo = submittedTo;
                installments[iteration].contact = contact;
                installments[iteration].amount = amount;

                if (landInfo.installments[length].installment[landInfo.installments[length].installment.length - 1].status == "done") {
                  landInfo.installments[length].status = "done";
                  landInfo.landPaymentStatus == "Done";
                } else landInfo.landPaymentStatus == "notDone";
                landInfo.installments[length].installments = installments;

                await saveInstallmentsInDB(landId, landInfo);
                cb(null, {
                  ...landInfo
                })
              } else cb(`Installment amount must be equal to ${installments[iteration].installmentAmount}.`)
            }
            iteration++;
          }
        } else cb(`Land with landId ${landId} installment status is not done, please contact support if you need any help.`)
      } else {
        cb(`Land with landId ${landId} payment status is already done, please verify.`)
      }
    } catch (err) {
      cb(err);
    }
  }
};
