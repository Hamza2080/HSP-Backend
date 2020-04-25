"use strict";

module.exports = function (Plot) {
    /**
   * submit installment api...
   */
  Plot.remoteMethod('submitInstallment', {
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
  Plot.submitInstallment = async function (data, cb) {
    try {
      let {plotId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment} = data;
      if (plotId && receivedByName && receivedByNumber && receiveDate && paidBy && receiptNumber && attachment) {
        let plotInfo = await Plot.findById(plotId);
        if (plotInfo && (plotInfo.plotPaymentStatus == 'InProgress' || plotInfo.plotPaymentStatus == 'NotStarted')) {
          plotInfo.plotPaymentStatus = 'InProgress';
          let installment;
          let isLastInstallment = false;
          let installmentIndex = -1;
          for (let i=0; i< plotInfo.installments.length; i++) {
            if (plotInfo.installments[i].status == "Due") {
              installment = plotInfo.installments[i];
              installmentIndex = i;
              if (i == plotInfo.installments.length-1) isLastInstallment = true;
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
            
            plotInfo.installments[installmentIndex] = installment;
            if (isLastInstallment) plotInfo.plotPaymentStatus = "Completed";
            await Plot.upsert(plotInfo);
            cb(null, {
              ...plotInfo
            })
          } else {
            cb(new Error("Installment not submitted successfully, please contact support, {installment object not found}."));
          }
        } else {
          plotInfo ? cb(new Error('Plot data not found against id ' + plotId + '.')) : cb(new Error('Plot PaymentStatus is already completed.'));
        }
      } else {
        cb(new Error('Invalid payload, payload must contain plotId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment fields.'))
      }
    } catch (err) {
      cb(new Error(err.message));
    }
  }
};
