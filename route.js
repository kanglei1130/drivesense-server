var path = require('path');     //used for file path
var mysqluser = require('./mysql_user.js');
var mysqltrip = require('./mysql_trip.js');

var User = require('./user.js');
var Trip = require('./trip.js');



var fs = require('fs-extra');
var jwt = require('jsonwebtoken');
var util = require('util');
var formidable = require('formidable');
var sqlite3 = require('sqlite3').verbose();

var showtrips = function (req, res, next) {
  var userid = req.body.userid;
  var dir = path.join(__dirname, "../uploads/" + userid + "/");
  try {
    var files = fs.readdirSync(dir);
  } catch(err) {
    var msg = {status: 'fail', data: err};
    res.json(msg);
    return;
  }
  var trips = {};
  var index = 0;
  var len = files.length;
  (function loadTrip() {
    var dbfile = dir + files[index];
    if(index == len) {
      var msg = {status: 'success', data:trips};
      res.json(msg);
      return;
    }
    try {
      var db = new sqlite3.Database(dbfile);
      db.all("select * from gps;", function(err, rows) {
        if (err) { 
          console.log(err); 
        } else {
          trips[files[index].substr(0, 13)] = rows;
          index++;
          loadTrip();
        }
      });
    } catch (exception) {
      console.log(exception);
      var msg = {status: 'fail', data: exception};
      res.json(msg);     
      return;
    }
  })();

};


var signout = function(req, res, next) {
  res.clearCookie('token');
  var msg = {status:'success', data:'token cleared'};
  res.json(msg);
};


var signinstatus = function (req, res, next) {
  var userid = req.body.userid;
  mysqluser.getUserByID(userid, function(err, user) {
    var msg = {};
    if(err) {
      msg = {status: 'fail', data: err.message}; 
    } else {
      msg = {status: 'success', data: {firstname: user.firstname, lastname:user.lastname}};
    }
    res.json(msg);
  });
};


var tokenverification = function (req, res, next) {
   var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, 'secret', function(err, decoded) {      
      if (err) {
        var msg = {status: 'fail', data: 'Failed to authenticate token.'};    
        res.json(msg);
      } else {
        // if everything is good, save to request for use in other routes
        req.body.userid = decoded.userid;    
        next(); 
      }
    });

  } else {
    // if there is no token
    // return an error
    return res.status(403).send({ 
        status: 'fail', 
        data: 'No token provided.' 
    }); 
  }
};

var signin = function (req, res, next) {
  var user = new User();
  user.fromObject(req.body);
  mysqluser.userSignIn(user, function(err, row) {
    var msg = {};
    if(err) {
      console.log(err);
      msg = {status: 'fail', data: err};
    } else {
      var token = jwt.sign({userid:row.userid}, 'secret', {expiresIn: '1d'});
      res.cookie('token', token);
      msg = {status: 'success', data: {firstname: row.firstname, lastname: row.lastname}};
    }
    res.json(msg);
  });
};



var signup = function (req, res, next) {
  var query = req.body; 
  var user = new User();
  user.fromObject(query);
  console.log(user);
  mysqluser.userSignUp(user,function(err, id) {
    if(err) {
      console.log(err.code);
      var msg = {};
      if(err.code == "ER_DUP_ENTRY") {
        msg = {status: 'fail', data: err.code};
      } else {
        msg = {status: 'fail', data: 'unknown'}; 
      }
      res.json(msg);
    } else {
      var token = jwt.sign({userid:id}, 'secret', {expiresIn: '1d'});
      res.cookie('token', token);
      var msg = {status: 'success', data: {firstname: user.firstname, lastname:user.lastname}};
      res.json(msg);
    }
  }); 
};


var androidsignin = function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var user = fields;     
    mysqluser.userSignIn(user, function(err) {
      if(err) {
        var msg = {status: 'fail', data: err};         
      } else {
        var msg = {status: 'success', data: null};
      }
      res.json(msg);
    });
  });
}  


var androidsignup = function(req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var user = fields;     
    mysqluser.userSignUp(user, function(err, id) {
     if(err) {
        var msg = {status: 'fail', data: err};         
      } else {
        var msg = {status: 'success', data: null};
      }
      res.json(msg);
    });
  });
};  

var upload = function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var file = files.uploads;
    mysqluser.getUserIDByEmail(fields.email, function(err, id){
      if(err) {
        console.log(err);
        var msg = {status: 'fail', data: err.toString()};
        res.json(msg);
        return;
      } 
      var folder = path.join(__dirname, '../uploads/' + id + '/');
      fs.mkdirp(folder, function (err) {
        if(err) {
          console.log(err);
          var msg = {status: 'fail', data: err.toString()};
          res.json(msg);
          return;
        }
        //insert the data into database
        fields.userid = id;

        insertTripIntoDatabase(fields, file.path, function(err) {/*we do not care about err at this point*/});
        //backup the data
        fs.copy(file.path, path.join(folder, file.name), function(err){
          if (err) {
            console.error(err);
            var msg = {status: 'fail', data: err.toString()};
            res.json(msg);
          } else {
            var msg = {status: 'success', data: ''};
            res.json(msg);
          } 
        }); 
      });
    });
  });//end of paring form
}

var androidsync = function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    console.log(fields);
    console.log(files);
    mysqluser.getUserIDByEmail(fields.email, function(err, id){
      if(err) {
        console.log(err);
        var msg = {status: 'fail', data: err};
        res.json(msg);
        return;
      }
      var tnames = JSON.parse(fields.tripnames);
      //delete the trips in the database
      var msg = {status: 'success', data: JSON.stringify(tnames)};
      res.json(msg); 
    });
  });//end of paring form
}

var insertTripIntoDatabase = function (fields, dbfile, callback) {
  var trip = new Trip();
  trip.fromObject(fields);
  mysqltrip.insertTrip(trip, function(err, tripid) {
    if(err) {
      if(err.code == "ER_DUP_ENTRY") {
        callback(null);
      } else {
        callback(err);
      }
     // return;
    }
    tripid = 72;
    var db = new sqlite3.Database(dbfile);
    db.all("select * from gps;", function(err, rows) {
      if (err) { 
        console.log(err); 
      } else {
        mysqltrip.insertGPS(tripid, rows, function(err){

        }); 
      }
    });
  });
    //get userid etc. by email 
}
 

module.exports.upload = upload;
module.exports.androidsync = androidsync;


module.exports.showtrips = showtrips;
module.exports.signup = signup;
module.exports.signin = signin;
module.exports.signout = signout;

module.exports.signinstatus = signinstatus;
module.exports.tokenverification = tokenverification;

module.exports.androidsignin = androidsignin;
module.exports.androidsignup = androidsignup;





