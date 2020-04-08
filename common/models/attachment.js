'use strict';

module.exports = function(Attachment) {
    // Attachment.afterRemote('download', function(ctx, unused, next) {
    //     console.log(ctx);

    //     // var args = ctx.args;
    //     // Attachment.getFile(args.container, args.file,
    //     //    function(err, result) {
    //     //      if (err) return next(err);
    //     //      ctx.res.set('Content-Length', result.size);
    //     //      next();
    //     //    });
    //   });

    /**
   * Downloads file
   * @param {Request} req - Request object
   * @param {Response} res - Response object
   * @param {Function} cb Callback function
   */
//   let fs = require('fs');
//   Attachment.testDownload = function(req, res, containerName, fileName, cb) {
//       console.log(containerName, fileName)
//       //container, file, req, res, cb
//       res.send(fs.readFileSync('../../storage/attachment/' + fileName));
//   };
//   Attachment.remoteMethod('testDownload', {
//     accepts: [
//       {arg: 'req', type: 'object', http: {source: 'req'}},
//       {arg: 'res', type: 'object', http: {source: 'res'}},
//       {arg: 'containerName', type: 'string'},
//       {arg: 'fileName', type: 'string'},
//     ],
//     http: {path: '/attachments/:containerName/downloadFile/:fileName', verb: 'get'},
//     description: 'Downloads file.',
//   });
};