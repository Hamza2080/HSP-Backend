//server/boot/any.js
module.exports = function(app) {
  // app.get('/deleteByName', function(req,res) {
  //   app.models.land.find(function (error, data) {
  //     for (let i = 0; i < data.length; i++) {
  //       console.log(data[i].id)
  //       if (data[i].id != "5e7fa3e30e31400017f1608c"){
  //       app.models.land.deleteById(data[i].id, function (error, data){
  //         console.log("deleted")
  //       })
  //       }
  //     }
  //   })
  // })

  app.dataSources.myFile.connector.getFilename = function(file, req, res) {
    let random = createRandomNumber(999, 9999999999);
    let random2 = createRandomNumber(999, 9999999999);
    let dateStamp = Math.floor(new Date().getTime() / 1000);
    let ext = file.originalFilename.substring(file.originalFilename.lastIndexOf('.') + 1, file.originalFilename.length);
    var filename = random + '-' + random2 + '-' + dateStamp + '.' + ext;
    return filename;
  };


  function createRandomNumber(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }
};
