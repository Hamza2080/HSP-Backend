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
  //   Plot.observe("before save", async function (ctx, next) {
  //     if (ctx.instance) {
  //       if (ctx.instance.totalPayment < ctx.instance.downPayment + ctx.instance.discount) next("Total payment for plot must be greater then or equal to downPayment + discount.");
  //       else if (ctx.instance.totalPayment <= ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment)
  //         next(`Error while creting new instance of Plot, totalPayment of plot is : ${ctx.instance.totalPayment}, while downPayment is : ${ctx.instance.downPayment} & discount is : ${ctx.instance.discount}, and plot is not available on installment, please verify amount.`);
  //       else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment && !ctx.instance.plotPaymentPlanId)
  //         next("Please provide a valid payment plan for creating installment schedule.");
  //       else if (ctx.instance.totalPayment > ctx.instance.downPayment + ctx.instance.discount && ctx.instance.isOnInstallment)
  //         createInstallments(ctx.instance, next);
  //       else if (ctx.instance.totalPayment == ctx.instance.downPayment + ctx.instance.discount && !ctx.instance.isOnInstallment) {
  //         ctx.instance.plotPaymentStatus = "Done";
  //         ctx.instance.installments = [];
  //         next();
  //       };
  //     } else next("Error while creting new instance of Plot.");
  //   });

  /**
   * sale plot api...
   */
  Plot.remoteMethod('salePlot', {
    accepts: [{
        arg: 'plotId',
        type: 'string',
        required: true
      },
      {
        arg: 'purchaseDate',
        type: 'date',
        required: true
      },
      {
        arg: 'downPayment',
        type: 'number',
        required: true
      },
      {
        arg: 'discount',
        type: 'number',
        required: true
      },
      {
        arg: 'purchaserName',
        type: 'string',
        required: true
      },
      {
        arg: 'soldBy',
        type: 'number',
        required: true
      }
    ],
    http: {
      path: '/salePlot',
      verb: 'post'
    },
    description: "Sale plot",
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });
  Plot.salePlot = async function (plotId, purchaseDate, downPayment, discount, purchaserName, soldBy, cb) {
    try {
      let ploInfo = await Plot.findById(plotId);
      if (ploInfo.plotStatus == "open") {
        if (ploInfo.totalPayment < downPayment + discount) cb("Total payment for plot must be greater then or equal to downPayment + discount.");
        else if (ploInfo.totalPayment <= downPayment + discount && !ploInfo.isOnInstallment)
          cb(`Error while creting new instance of Plot, totalPayment of plot is : ${ploInfo.totalPayment}, while downPayment is : ${downPayment} & discount is : ${discount}, and plot is not available on installment, please verify amount.`);
        else if (ploInfo.totalPayment > downPayment + discount && ploInfo.isOnInstallment && !ploInfo.plotPaymentPlanId)
          cb("Please provide a valid payment plan for creating installment schedule.");
        else if (ploInfo.totalPayment > downPayment + discount && ploInfo.isOnInstallment) {
          await createInstallments(plotId, ploInfo, purchaseDate, downPayment, discount, purchaserName, soldBy);
          cb(null, {
            ...ploInfo
          })
        } else if (ploInfo.totalPayment == downPayment + discount && !ploInfo.isOnInstallment) {
          ploInfo.plotStatus = "sold";
          await saveInstallmentsInDB(plotId, plotInfo);
          cb(null, {
            ...ploInfo
          })
        };
      } else {}
    } catch (err) {
      cb(err);
    }
  }

  //create installments against payment plan...
  function createInstallments(plotId, plotInfo, purchaseDate, downPayment, discount, purchaserName) {
    return new Promise(async (resolve, reject) => {
      try {
        let paymentPlan = await Plot.app.models.plot_payment_plan.findById(plotInfo.plotPaymentPlanId);
        if (!paymentPlan) reject(`Please provide a valid plotPaymentPlan Id, ${plotInfo.plotPaymentPlanId} is not a valid paymentPlan Id.`);
        else {
          let totalInstallments = paymentPlan.noOfInstallment;
          let remainingAmount = plotInfo.totalPayment - downPayment - discount;
          let installmentAmount = paymentPlan.installmentAmount;
          let installmentGap = paymentPlan.installmentGap;
          let installment = plotInfo.installments || [];

          installment.push({
            purchaseDate: purchaseDate,
            discount: discount,
            downPayment: downPayment,
            purchaserName: purchaserName,
            remainingAmount: remainingAmount,
            status: "pending",
            installments: []
          });

          if (remainingAmount <= installmentAmount) {
            let date = new Date(purchaseDate);
            installment.installments.push({
              installmentAmount: remainingAmount,
              submissionDate: new Date(date.setMonth(date.getMonth() + installmentGap)),
              status: "pending"
            })

            plotInfo.installments = installment;
            ploInfo.plotStatus = "sold";
            resolve(await saveInstallmentsInDB(plotId, plotInfo));
          } else {
            let counter = 1;
            while (remainingAmount > 0) {
              let date = new Date(purchaseDate);
              let amount = remainingAmount >= installmentAmount ? remainingAmount - installmentAmount : remainingAmount;
              installment.installments.push({
                installmentAmount: amount,
                submissionDate: new Date(date.setMonth(date.getMonth() + (installmentGap * counter))),
                status: "pending"
              })
              remainingAmount -= amount;
              counter += 1;
            }
            plotInfo.installments = installment;
            ploInfo.plotStatus = "sold";
            resolve(await tsaveInstallmentsInDB(plotId, plotInfo));
          }
        }
      } catch (error) {
        reject(error);
      }
    })
  }

  // save plot info after creating installment array...
  function saveInstallmentsInDB(plotId, plotInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        await Plot.replaceById(plotId, plotInfo, {
          validate: true
        });
      } catch (err) {
        reject(err);
      }
    })
  }


  /**
   * submit installment api...
   */
  Plot.remoteMethod('submitInstallment', {
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
        arg: 'plotId',
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
  Plot.submitInstallment = async function (submittedBy, submittedTo, contact, amount, plotId, cb) {
    try {
      let plotInfo = await Plot.findById(plotId);
      if (plotInfo.installments.length > 0 && plotInfo.plotStatus == "sold") {
          let length = plotInfo.installments.length - 1;
          if (plotInfo.installments[length].status == "pending") {
              let installments = plotInfo.installments[length].installments;
              let iteration = 0;
              let pendingInstallment = true;
              while (iteration <= installments.length && pendingInstallment) {
                  if (installments[iteration].status == "pending"){
                       pendingInstallment = false;
                       if (amount == installments[iteration].installmentAmount){
                        installments[iteration].status = "done";
                        installments[iteration].submittedOn = new Date();
                        installments[iteration].submittedBy = submittedBy;
                        installments[iteration].submittedTo = submittedTo;
                        installments[iteration].contact = contact;
                        installments[iteration].amount = amount;

                        if (plotInfo.installments[length].installment[plotInfo.installments[length].installment.length -1].status == "done") {
                            plotInfo.installments[length].status = "done";
                            plotInfo.plotStatus == "sold";
                        }
                        plotInfo.installments[length].installments = installments;

                        await saveInstallmentsInDB(plotId, plotInfo);
                        cb (null, {...plotInfo})
                      } else  cb(`Installment amount must be equal to ${installments[iteration].installmentAmount}.`)
                    }
                  iteration++;
              }
          } else cb(`Plot with plotId ${plotId} installment status is not done, please contact support if you need any help.`)
      } else {
          cb(`Plot with plotId ${plotId} status is not sold, please verify.`)
      }
    } catch (err) {
      cb(err);
    }
  }
};
