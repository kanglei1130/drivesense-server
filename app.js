var express = require('express');    //Express Web Server 
var busboy = require('connect-busboy'); //middleware for form/file upload
var path = require('path');     //used for file path
var fs = require('fs-extra');       //File System - for file manipulation
var util = require('util');
var sqlite3 = require('sqlite3').verbose();


var app = express();
app.use(busboy());

app.use(express.static(path.join(__dirname, 'public')));

/* ========================================================== 
Create a Route (/upload) to handle the Form submission 
(handle POST requests to /upload)
============================================================ */


app.route('/upload').post(function (req, res, next) {
  req.pipe(req.busboy);
  var result = {};
  req.busboy.on('field', function(fieldname, val) {
    result[fieldname] = val;
  });  
  req.busboy.on('file', function (fieldname, file, filename) {  
    console.log("Uploading: " + filename);
    var folder = __dirname + '/databases/' + result['deviceid'] + '/';
    fs.mkdirp(folder, function (err) {
      var fstream = fs.createWriteStream(folder + filename);
      file.pipe(fstream);
      fstream.on('close', function () {    
        console.log("Upload Finished of " + filename);              
        res.send('okay');           //where to go next
      });
    });
  });
});

app.route('/show').get(function (req, res) {
  var query = req.query;
  var tripid = query.tripid;
  var dir = "./databases/6c9b21c5b0db3074/";
  var files = fs.readdirSync(dir);
  var dbfile = dir + files[tripid];
  var db = new sqlite3.Database(dbfile);

  db.all("SELECT * FROM gps;", function(err, rows) {
    if(err) {
      var msg = {status: 'err', data: err};
      res.json(msg);
    } else {
      var msg = {status: 'okay', data: rows};
      res.json(msg);
    }
  });
});






var server = app.listen(8000, function() {
    console.log('Listening on port %d', server.address().port);
});