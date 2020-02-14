'use strict';

module.exports = function (Land) {

  //validity of name field...
  Land.validatesUniquenessOf('name');

  // operation hook before save on land for checking information....
  Land.observe("before save", async function (ctx, next) {
    try {
      if (ctx.instance && ctx.isNewInstance) {
        let instance = ctx.instance;
        if (instance.isOnInstallment) {
          await createInstallments(instance, next);
          next();
        } else if (instance.totalPayment < instance.downPayment + instance.discount) throw ("Total payment for land must be greater then or equal to downPayment + discount.");
        else if (instance.totalPayment > instance.downPayment + instance.discount) throw (`Total payment is greater then downPayment + discount, please submit whole payment or book land on installment.`);
        else if (instance.totalPayment == instance.downPayment + instance.discount && !instance.isOnInstallment) {
          instance.landPaymentStatus = "Done";
          instance.installments = [];
          await putLandInfoWhileCreate(instance);
          next();
        } else throw ("Invalid Input data, please contact support.")
      } else if (ctx.data) next();
      else throw ("Error while creting new instance of Land.");
    } catch (error) {
      next(error)
    }
  });

  function putLandInfoWhileCreate(instance) {
    return new Promise(async (resolve, reject) => {
      try {
        Promise.all([
          getLandMeasuringData(instance.landMeasuringUnitId),
          getLandLordById(instance.landlordId),
          getPaymentPlan(instance),
          getLandCategoryById(instance.plotcategoriesId)
        ]).then(result => {
          let landMeasuringData = result[0];
          let landlordData = result[1];
          let plotPaymentPlanData = result[2] || instance["plotPaymentPlanId"];
          if (instance.totalPayment == instance.downPayment + instance.discount && !instance.isOnInstallment)
            instance.plotPaymentStatus = "Done";
          instance.installments = [];
          if (landMeasuringData) instance["measuring_unitData"] = landMeasuringData;
          if (landlordData) instance["landlordData"] = landlordData;
          if (plotPaymentPlanData) instance["plotPaymentPlanData"] = plotPaymentPlanData;
          resolve();
        })
      } catch (error) {
        reject(error);
      }
    })
  }

  function getLandLordById(landlordId) {
    return new Promise((resolve, reject) => {
      Land.app.models.landlord.findById(landlordId, function (error, data) {
        if (error) reject(error);
        else {
          resolve(data)
        }
      })
    })
  }

  function getLandCategoryById(plotcategoryId) {
    return new Promise((resolve, reject) => {
      if (plotcategoryId) {
        Land.app.models.plotcategory.findById(plotcategoryId, function (error, data) {
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
        Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId, function (error, data) {
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
      Land.app.models.land_measuring_unit.findById(landMeasuringId, function (error, data) {
        if (error) reject(error);
        else {
          resolve(data)
        }
      })
    })
  }

  //create installments against payment plan...
  function createInstallments(instance, next) {
    return new Promise(async (resolve, reject) => {
      try {
        let paymentPlan = await Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
        if (!paymentPlan) throw (`Please provide a valid PaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
        else if (paymentPlan) {
          let totalInstallments = paymentPlan.no_of_installment;
          let remainingAmount = instance.totalPayment - instance.downPayment - instance.discount;
          let installmentAmount = paymentPlan.installmentAmount;
          let installmentGap = paymentPlan.installmentGap;
          let purchaseDate = instance.acquired_date;
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
          instance["totalPayment"] = paymentPlan.totalAmount;
          instance["downPayment"] = paymentPlan.downPayment;
          instance["meauringUnitData"] = await Land.app.models.land_measuring_unit.findById(instance.landMeasuringUnitId);
          instance["landlordData"] = await Land.app.models.landlord.findById(instance.landlordId);
          instance["paymentPlanData"] = await Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    })
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
  Land.submitInstallment = async function (submittedBy, submittedTo, contact, landId, cb) {
    try {
      let landInfo = await Land.findById(landId);
      if (landInfo && landInfo.installments.length > 0 && landInfo.landPaymentStatus != "Done") {
        let landPaymentPlan = landInfo.paymentPlanData;
        let allInstallments = landInfo.installments;

        let isSubmitted = false;
        for (let i=0; i< landPaymentPlan.no_of_installment; i++) {
          if (allInstallments[i].status == "pending" && !isSubmitted) {
            isSubmitted = true;
            landInfo.installments[i].status = "done";
            landInfo.installments[i].submittedOn = new Date();
            landInfo.installments[i].submittedBy = submittedBy;
            landInfo.installments[i].submittedTo = submittedTo;
            landInfo.installments[i].contact = contact;
          }
        }
        if (allInstallments[allInstallments.length - 1].status == "done") {
          landInfo.landPaymentStatus = "Done";
        }
        let isUpsertSuccess = await Land.upsert(landInfo);
        if (isSubmitted && isUpsertSuccess)
          cb(null, {
            ...landInfo
          })
        else {
          cb(`Payment for installment not added successfully, please contact support.`);
        }
      } else {
        throw(`Land with landId ${landId} payment status is already done, please verify.`)
      }
    } catch (err) {
      cb(err);
    }
  }
};
