"use strict";

module.exports = function (Plot) {
  //validity of plotNumber field...
  Plot.validatesUniquenessOf("plotNumber");

  // operation hook before save on plot for checking information....
   // operation hook before save on land for checking information....
   Plot.observe("before save", async function (ctx, next) {
    try {
      if (ctx.isNewInstance) {
        let instance = ctx.instance;
        instance.installments = [];
        await putPlotInfoWhileCreate(instance);
        next();
      } else if (ctx.data && ctx.data.installments.length > 0){
        next();
      }else throw ("updating plot instance is prohibited, please contact support.");
    } catch (error) {
      next(error)
    }
  });

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
        arg: 'customerId',
        type: 'string',
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

  Plot.salePlot = async function (plotId, customerId, cb) {
    try {
      let ploInfo = await Plot.findById(plotId);
      if (ploInfo){
        if (ploInfo.isOnInstallment && ploInfo.plotStatus == 'open') {
          let instance = await createInstallments(plotId, ploInfo, customerId, cb);
          cb(null, {...instance});
        } else if (ploInfo.plotStatus == 'open' && !ploInfo.isOnInstallment){
          ploInfo.plotStatus = "sold";
          plotInfo.customerId = customerId;
          plotInfo["customerData"] = await Plot.app.models.Customer.findById(customerId) || {};
          ploInfo.installments = [];
          let isUpsertSuccess = await Plot.upsert(ploInfo);
          if (isUpsertSuccess)
            cb(null, {
              ...landInfo
            })
          else throw(`error while sale plot, update in database.`);
        } else throw(`Plot status is not open.`);
      } else cb(`Plot with id ${plotId} not found.`);
    } catch (err) {
      cb(err);
    }
  }

  //create installments against payment plan...
  function createInstallments(plotId, instance, customerId, cb) {
    return new Promise(async (resolve, reject) => {
      try {
        let paymentPlan = await Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
        if (!paymentPlan) reject(`Please provide a valid plotPaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
        else {
          let totalInstallments = paymentPlan.no_of_installment;
          let discount = instance.discount || 0;
          let remainingAmount = paymentPlan.totalAmount - paymentPlan.downPayment - discount;
          let installmentAmount = paymentPlan.installmentAmount;
          let installmentGap = paymentPlan.installmentGap;
          let purchaseDate = new Date();
          let installments = [];
          for (let i = 0; i < totalInstallments; i++) {
            let date = new Date(purchaseDate);
            let amount = remainingAmount >= installmentAmount ? installmentAmount : remainingAmount;
            installments.push({
              installmentAmount: amount,
              submissionDate: new Date(date.setMonth(date.getMonth() + (installmentGap * i))),
              status: "pending"
            })
          }
          instance["installments"] = installments;
          instance["totalPayment"] = paymentPlan.total_amount;
          instance["downPayment"] = paymentPlan.downPayment;
          instance["plotStatus"] = "onInstallment";
          instance["customerData"] = await Plot.app.models.Customer.findById(customerId);
          // instance["meauringUnitData"] = await Plot.app.models.land_measuring_unit.findById(instance.landMeasuringUnitId);
          // instance["landlordData"] = await Plot.app.models.landlord.findById(instance.landlordId);
          // instance["paymentPlanData"] = await Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);

          let isUpserTrue = await Plot.upsert(instance);
          if (isUpserTrue) resolve(instance)
          else  reject(`Plot installments not created, please contact support.`)
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
            if (installments[iteration].status == "pending") {
              pendingInstallment = false;
              if (amount == installments[iteration].installmentAmount) {
                installments[iteration].status = "done";
                installments[iteration].submittedOn = new Date();
                installments[iteration].submittedBy = submittedBy;
                installments[iteration].submittedTo = submittedTo;
                installments[iteration].contact = contact;
                installments[iteration].amount = amount;

                if (plotInfo.installments[length].installment[plotInfo.installments[length].installment.length - 1].status == "done") {
                  plotInfo.installments[length].status = "done";
                  plotInfo.plotStatus == "sold";
                }
                plotInfo.installments[length].installments = installments;

                await saveInstallmentsInDB(plotId, plotInfo);
                cb(null, {
                  ...plotInfo
                })
              } else cb(`Installment amount must be equal to ${installments[iteration].installmentAmount}.`)
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

  function putPlotInfoWhileCreate(instance) {   
    return new Promise(async (resolve, reject) => {
      try {
        Promise.all([
          getLandMeasuringData(instance.landMeasuringUnitId),
          getCustomerById(instance.customerId),
          getPaymentPlan(instance),
          getPlotCategoryById(instance.plotcategoriesId)
        ]).then(result => {
          let landMeasuringData = result[0];
          let customerData = result[1];
          let plotPaymentPlanData = result[2] || instance["plotPaymentPlanId"];
          let plotcategoriesData = result[3];
          if (instance.totalPayment == instance.downPayment + instance.discount && !instance.isOnInstallment)
            instance.plotPaymentStatus = "Done";
          instance.installments = [];
          if (landMeasuringData) instance["measuring_unitData"] = landMeasuringData;
          if (customerData) instance["customerData"] = customerData;
          if (plotPaymentPlanData) instance["plotPaymentPlanData"] = plotPaymentPlanData;
          if (plotcategoriesData) instance["plotcategoriesData"] = plotcategoriesData;
          resolve();
        })
      } catch(error) {
        reject(error);
      }
    })   
  }

  function getPlotCategoryById(plotcategoryId) {
    return new Promise((resolve, reject) => {
      if (plotcategoryId) {
        Plot.app.models.plotcategory.findById(plotcategoryId, function (error, data) {
          if (error) reject(error);
          else {
            resolve(data)
          }
        })
      } else resolve()
    })
  }

  function getPaymentPlan(instance) {
    return new Promise((resolve, reject) => {
      if (instance.plotPaymentPlanId && instance.isOnInstallment) {
        Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId, function (error, data) {
          if (error) reject(error);
          else {
            resolve(data)
          }
        })
      } else resolve();
    })
  }

  function getLandMeasuringData(landMeasuringId) {
    return new Promise((resolve, reject) => {
      Plot.app.models.land_measuring_unit.findById(landMeasuringId, function (error, data) {
        if (error) reject(error);
        else {
          resolve(data)
        }
      })
    })
  }

  function getCustomerById(customerId) {
    return new Promise((resolve, reject) => {
      Plot.app.models.Customer.findById(customerId, function (error, data) {
        if (error) reject(error);
        else {
          resolve(data)
        }
      })
    })
  }
};
