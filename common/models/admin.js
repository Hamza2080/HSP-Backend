'use strict';

module.exports = function(Admin) {

  /**
   * Remote hook for assigning manager role to newly created user
   * after save operation hook
  */
  Admin.afterRemote( 'create', function( ctx, user, next) {
    if (user) {
      let roleObj = {
        "principalType":"USER",
        "roleId" : "5e0f242fc81eba319a373238",
        "principalId" : user.id
      };

      Admin.app.models.RoleMapping.create(roleObj, (error, roleMappingData) => {
        if (error) next("There is some error while assigning manager role to user (RoleMapping), please contact support.");
        else next();
      })
    } else next("There is some error while assigning manager role to user, please contact support.");
  });

  /**
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
  Admin.getAllUsers = async function () {
    let users = await Admin.find({where: {userRole:'Manager'}});
    return(users);
}

Admin.remoteMethod('getAllUsers', {
    "http": {"verb": "get", "path": "/getAllUsers"},
    "description" : "Get list of manager(user) in system.",
    "returns": { arg: 'users',type: 'array'}
});
};
