'use strict';

module.exports = function(Admin) {
      //    /**
  //    * Hides all the methods besides those in 'methods'.
  //    *
  //    * @param Model model to be updated.
  //    * @param methods array of methods to expose, e.g.: ['find', 'updateAttributes'].
  //    */
  // //   Admin.sharedClass.methods().forEach(function(method) {
  // //         if (method.name != "login" && method.name != "logout" && method.name != "findById")
  // //             Admin.disableRemoteMethodByName(method.name, method.isStatic);
  // //   });

  /**
   * Hides all the methods besides those in 'methods'.
   *
   * @param Model model to be updated.
   * @param methods array of methods to expose, e.g.: ['find', 'updateAttributes'].
   */
  Admin.getAllUsers = async function (cb) {
    let users = await Admin.find({where: {userRole:'Manager'}});
    console.log(users);
  cb(null, users);
}

Admin.remoteMethod('getAllUsers', {
    "http": {"verb": "get", "path": "/getAllUsers"},
    "description" : "Get list of manager(user) in system.",
    "returns": { arg: 'users',type: 'array'}
});
};
