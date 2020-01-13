module.exports = function(server) {
    var remotes = server.remotes();
    // modify all returned values
    remotes.after('**', function (ctx, next) {
      ctx.result = {
        data: ctx.result,
        message: "Success",
        statusCode: 200
      };
  
      next();
    });
  };