'use strict';

module.exports = function (Land) {

  // //validity of name field...
  Land.validatesUniquenessOf('name');

  // // operation hook before save on land for checking information....
  // Land.observe("before save", async function (ctx, next) {
  //   try {
  //     if (ctx.instance && ctx.isNewInstance) {
  //       let instance = ctx.instance;
  //       if (instance.isOnInstallment) {
  //         await createInstallments(instance, next);
  //         next();
  //       } else if (instance.totalPayment < instance.downPayment + instance.discount) throw ("Total payment for land must be greater then or equal to downPayment + discount.");
  //       else if (instance.totalPayment > instance.downPayment + instance.discount) throw (`Total payment is greater then downPayment + discount, please submit whole payment or book land on installment.`);
  //       else if (instance.totalPayment == instance.downPayment + instance.discount && !instance.isOnInstallment) {
  //         instance.landPaymentStatus = "Done";
  //         instance.installments = [];
  //         await putLandInfoWhileCreate(instance);
  //         next();
  //       } else throw ("Invalid Input data, please contact support.")
  //     } else if (ctx.data) next();
  //     else throw ("Error while creting new instance of Land.");
  //   } catch (error) {
  //     next(error)
  //   }
  // });

  // function putLandInfoWhileCreate(instance) {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       Promise.all([
  //         getLandMeasuringData(instance.landMeasuringUnitId),
  //         getLandLordById(instance.landlordId),
  //         getPaymentPlan(instance),
  //         getLandCategoryById(instance.plotcategoriesId)
  //       ]).then(result => {
  //         let landMeasuringData = result[0];
  //         let landlordData = result[1];
  //         let plotPaymentPlanData = result[2] || instance["plotPaymentPlanId"];
  //         if (instance.totalPayment == instance.downPayment + instance.discount && !instance.isOnInstallment)
  //           instance.plotPaymentStatus = "Done";
  //         instance.installments = [];
  //         if (landMeasuringData) instance["measuring_unitData"] = landMeasuringData;
  //         if (landlordData) instance["landlordData"] = landlordData;
  //         if (plotPaymentPlanData) instance["plotPaymentPlanData"] = plotPaymentPlanData;
  //         resolve();
  //       })
  //     } catch (error) {
  //       reject(error);
  //     }
  //   })
  // }

  // function getLandLordById(landlordId) {
  //   return new Promise((resolve, reject) => {
  //     Land.app.models.landlord.findById(landlordId, function (error, data) {
  //       if (error) reject(error);
  //       else {
  //         resolve(data)
  //       }
  //     })
  //   })
  // }

  // function getLandCategoryById(plotcategoryId) {
  //   return new Promise((resolve, reject) => {
  //     if (plotcategoryId) {
  //       Land.app.models.plotcategory.findById(plotcategoryId, function (error, data) {
  //         if (error) reject(error);
  //         else {
  //           resolve(data)
  //         }
  //       })
  //     } else resolve()
  //   })
  // }

  // function getPaymentPlan(instance) {
  //   return new Promise((resolve, reject) => {
  //     if (instance.plotPaymentPlanId && instance.isOnInstallment) {
  //       Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId, function (error, data) {
  //         if (error) reject(error);
  //         else {
  //           resolve(data)
  //         }
  //       })
  //     } else resolve();
  //   })
  // }

  // function getLandMeasuringData(landMeasuringId) {
  //   return new Promise((resolve, reject) => {
  //     Land.app.models.land_measuring_unit.findById(landMeasuringId, function (error, data) {
  //       if (error) reject(error);
  //       else {
  //         resolve(data)
  //       }
  //     })
  //   })
  // }

  // //create installments against payment plan...
  // function createInstallments(instance, next) {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       let paymentPlan = await Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
  //       if (!paymentPlan) throw (`Please provide a valid PaymentPlan Id, ${instance.plotPaymentPlanId} is not a valid paymentPlan Id.`);
  //       else if (paymentPlan) {
  //         let totalInstallments = paymentPlan.no_of_installment;
  //         let remainingAmount = instance.totalPayment - instance.downPayment - instance.discount;
  //         let installmentAmount = paymentPlan.installmentAmount;
  //         let installmentGap = paymentPlan.installmentGap;
  //         let purchaseDate = instance.acquired_date;
  //         let installments = [];

  //         for (let i = 0; i < totalInstallments; i++) {
  //           let date = new Date(purchaseDate);
  //           let amount = remainingAmount >= installmentAmount ? installmentAmount : remainingAmount;
  //           installments.push({
  //             installmentAmount: amount,
  //             submissionDate: new Date(date.setMonth(date.getMonth() + (installmentGap * i))),
  //             status: "pending"
  //           })
  //         }
  //         instance["installments"] = installments;
  //         instance["totalPayment"] = paymentPlan.totalAmount;
  //         instance["downPayment"] = paymentPlan.downPayment;
  //         instance["meauringUnitData"] = await Land.app.models.land_measuring_unit.findById(instance.landMeasuringUnitId);
  //         instance["landlordData"] = await Land.app.models.landlord.findById(instance.landlordId);
  //         instance["paymentPlanData"] = await Land.app.models.plot_payment_plan.findById(instance.plotPaymentPlanId);
  //         resolve();
  //       }
  //     } catch (error) {
  //       reject(error);
  //     }
  //   })
  // }

  /**
   * submit installment api...
   */
  Land.remoteMethod('submitInstallment', {
    accepts: [{
        arg: 'data',
        type: 'object',
        required: true
      }
    ],
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });
  Land.submitInstallment = async function (data) {
    try {
      let {landId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment} = data;
      if (landId && receivedByName && receivedByNumber && receiveDate && paidBy && receiptNumber && attachment) {
        let landInfo = await Land.findById(landId);
        if (landInfo && (landInfo.landPaymentStatus == 'InProgress' || landInfo.landPaymentStatus == 'NotStarted')) {
          landInfo.landPaymentStatus = 'InProgress';
          let installment;
          let isLastInstallment = false;
          let installmentIndex = -1;
          for (let i=0; i< landInfo.installments.length; i++) {
            if (landInfo.installments[i].status == "Due") {
              installment = landInfo.installments[i];
              installmentIndex = i;
              if (i == landInfo.installments.length-1) isLastInstallment = true;
              break;
            }
          }
          if (installment) {
            installment.status = "Paid";
            installment.receivedByName = receivedByName;
            installment.receivedByNumber = receivedByNumber;
            installment.receiveDate = receiveDate;
            installment.paidBy = paidBy;
            installment.receiptNumber = receiptNumber;
            installment.attachment = attachment;
            
            landInfo.installments[installmentIndex] = installment;
            if (isLastInstallment) landInfo.landPaymentStatus = "Completed";
            await Land.upsert(landInfo);
            return({
              ...landInfo
            })
          } else {
            return(new Error("Installment not submitted successfully, please contact support, {installment object not found}."));
          }
        } else {
          if (landInfo) {
            return (new Error('Land data not found against id ' + landId + '.'))
           } else { return(new Error('Land PaymentStatus is already completed.'));
          }
        }
      } else {
        return(new Error('Invalid payload, payload must contain landId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment fields.'))
      }
    } catch (err) {
      return(new Error(err.message));
    }
  }
};
