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
          let instance = await createInstallments(plotId, ploInfo, customerId);
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
  function createInstallments(plotId, instance, customerId) {
    return new Promise(async (resolve, reject) => {
      try {
        let paymentPlan = await Plot.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
        if (!paymentPlan) {
          var error = new Error(`Please provide a valid plotPaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
          error.status = 400;
          reject(error);
      } else {
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
          else  {
            var error = new Error(`Plot installments not created, please contact support.`);
            error.status = 400;
            reject(error);
        }
        }
      } catch (error) {
        var error = new Error(error);
        error.status = 400;
        reject(error);
      }
    })
  }

  // save plot info after creating installment array...
  // function saveInstallmentsInDB(plotId, plotInfo) {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       await Plot.replaceById(plotId, plotInfo, {
  //         validate: true
  //       });
  //     } catch (err) {
  //       reject(err);
  //     }
  //   })
  // }


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
  Plot.submitInstallment = async function (submittedBy, submittedTo, contact, plotId, cb) {
    try {
      let plotInfo = await Plot.findById(plotId);
      if (plotInfo && plotInfo.installments.length > 0 && plotInfo.landPaymentStatus != "sold") {
        let plotPaymentPlan = plotInfo.plotPaymentPlanData;
        let allInstallments = plotInfo.installments;

        let isSubmitted = false;
        for (let i=0; i< plotPaymentPlan.no_of_installment; i++) {
          if (allInstallments[i].status == "pending" && !isSubmitted) {
            isSubmitted = true;
            plotInfo.installments[i].status = "done";
            plotInfo.installments[i].submittedOn = new Date();
            plotInfo.installments[i].submittedBy = submittedBy;
            plotInfo.installments[i].submittedTo = submittedTo;
            plotInfo.installments[i].contact = contact;
          }
        }
        if (allInstallments[allInstallments.length - 1].status == "done") {
          plotInfo.landPaymentStatus = "sold";
        }
        let isUpsertSuccess = await Plot.upsert(plotInfo);
        if (isSubmitted && isUpsertSuccess)
          cb(null, {
            ...plotInfo
          })
        else {
          cb(`Payment for installment not added successfully, please contact support.`);
        }
      } else {
        throw(`Plot with plotId ${landId} payment status is already done, please verify.`)
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
