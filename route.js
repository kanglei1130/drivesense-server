var path = require('path');     //used for file path

var upload = function (req, res, next) {
  req.pipe(req.busboy);
  var result = {};
  req.busboy.on('field', function(fieldname, val) {
    result[fieldname] = val;
  });  
  req.busboy.on('file', function (fieldname, file, filename) {  
    console.log("Uploading: " + filename);
    var folder = path.join(__dirname, '../uploads/' + result['deviceid'] + '/');
    fs.mkdirp(folder, function (err) {
      var fstream = fs.createWriteStream(folder + filename);
      file.pipe(fstream);
      fstream.on('close', function () {    
        console.log("Upload Finished of " + filename);              
        res.send('okay');           //where to go next
      });
    });
  });
};



var showtrip = function (req, res, next) {
  var query = req.query;
  var devid = query.devid;
  var tripid = query.tripid;
  var dir = path.join(__dirname, "../uploads/" + devid + "/");
  try {
    var files = fs.readdirSync(dir);
    var dbfile = dir + files[tripid];
    var db = new sqlite3.Database(dbfile);
  } catch(err) {
    var msg = {status: 'err', data: err};
    res.json(msg);
    return;
  }
  db.all("SELECT * FROM gps;", function(err, rows) {
    if(err) {
      var msg = {status: 'err', data: err};
      res.json(msg);
    } else {
      var msg = {status: 'okay', data: rows};
      res.json(msg);
    }
  });
};

var signup = function (req, res, next) {
  console.log(req.body);

  req.pipe(req.busboy);
  var result = {};
  req.busboy.on('field', function(fieldname, val) {
    result[fieldname] = val;
    console.log(result);
  });  

};

var signin = function (req, res, next) {


};


module.exports.upload = upload;
module.exports.showtrip = showtrip;
module.exports.signup = signup;
module.exports.signin = signin;