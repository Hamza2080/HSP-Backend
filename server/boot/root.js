'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  router.get('/paypal_test', (req, res) => {
    console.log("paypal_test route hit successfully.");
    console.log(req.query);
    res.send("Hello");
  });
  server.use(router);
};
