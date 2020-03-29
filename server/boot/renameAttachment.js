//server/boot/any.js
module.exports = function(app) {
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
