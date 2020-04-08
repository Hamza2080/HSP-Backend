'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();

  const fs = require('fs');
  const path = require('path');
  
  router.get('/:container/downloadFile/:fileName',(req,res) => {
    let container = req.params.container;
    let file = req.params.fileName;
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=" + file
    });
    fs.createReadStream(path.join(__dirname + '../../../storage/' + container + '/' + file)).pipe(res);
  })

  router.get('/', server.loopback.status());
  router.get('/paypal_test', (req, res) => {
    console.log("paypal_test route hit successfully.");
    console.log(req)
    console.log(req.query);
    res.redirect("https://www.google.com/");
  });
  server.use(router);
};
