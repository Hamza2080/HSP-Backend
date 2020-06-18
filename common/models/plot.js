"use strict";

module.exports = function (Plot) {
  /**
  * isExist api...
  */
  Plot.remoteMethod('isExist', {
    accepts: [{
      arg: 'plotNumber',
      type: 'string',
      required: true
    }
    ],
    returns: {
      arg: 'isExist',
      type: 'object',
      root: true
    }
  });
  Plot.isExist = async function (plotNumber) {
    try {
      let plots = await Plot.find({where: { plotNumber : plotNumber }});
      if (plots.length > 0) return({isExist : true}) 
      return({isExist : false});
    } catch (err) {
      return(new Error(err.message));
    }
  }

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
  Plot.submitInstallment = async function (data) {
    try {
      let { plotId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment } = data;
      if (plotId && receivedByName && receivedByNumber && receiveDate && paidBy && receiptNumber && attachment) {
        let plotInfo = await Plot.findById(plotId);
        if (plotInfo && (plotInfo.plotPaymentStatus == 'InProgress' || plotInfo.plotPaymentStatus == 'NotStarted')) {
          plotInfo.plotPaymentStatus = 'InProgress';
          let installment;
          let isLastInstallment = false;
          let installmentIndex = -1;
          for (let i = 0; i < plotInfo.installments.length; i++) {
            if (plotInfo.installments[i].status == "Due") {
              installment = plotInfo.installments[i];
              installmentIndex = i;
              if (i == plotInfo.installments.length - 1) isLastInstallment = true;
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
            return({
              ...plotInfo
            })
          } else {
            return(new Error("Installment not submitted successfully, please contact support, {installment object not found}."));
          }
        } else {
            if (plotInfo) return(new Error('Plot data not found against id ' + plotId + '.'))
            else return(new Error('Plot PaymentStatus is already completed.'));
        }
      } else {
        return(new Error('Invalid payload, payload must contain plotId, receivedByName, receivedByNumber, receiveDate, paidBy, receiptNumber, attachment fields.'))
      }
    } catch (err) {
      return(new Error(err.message));
    }
  }
};
