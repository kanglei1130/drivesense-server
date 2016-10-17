var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleTokenStrategy = require('passport-google-id-token');
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
var mysqluser = require('./mysql_user.js');
var User = require('./user.js');
var jwt = require('jsonwebtoken');

passport.use(new LocalStrategy({
        usernameField: 'email'
    },
    function(email, password, done) {
      mysqluser.userSignIn(email, password, function(err, user) {
          if (err) { return done(err); }
          if (!user) { return done(null, false, { message: 'Incorrect username or password.' }); }
          return done(null, user);
      });
    }
));

passport.use(new GoogleTokenStrategy({
    clientID: "83228343356-ooeejimtmb7cn3bsnkr06ve67nip7e6o.apps.googleusercontent.com",
  },
  function(parsedToken, googleId, done) {
    mysqluser.getUserByEmail(parsedToken.payload.email, function (err, user) {
      if (err) { return done(err); }
      if (!user) { 
        user = new User(parsedToken.payload.given_name,parsedToken.payload.family_name, parsedToken.payload.email);
        mysqluser.userSignUp(user, function (err, id) {
          if (err) { return done(err); }
          user.userid = id;
          return done(null, user);
        });
      } else {
        return done(null, user);
      }      
    });
  }
));


var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
opts.secretOrKey = 'secret';
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    mysqluser.getUserByID(jwt_payload.userid, function(err, user) {
        if (err) {
            return done(err, false);
        }
        if (user) {
            done(null, user);
        } else {
            done(null, false);
        }
    });
}));

// Auth routes:

var signinstatus = function (req, res, next) {
  msg = {status: 'success', data: {firstname: req.user.firstname, lastname: req.user.lastname}};
  res.json(msg);
};

var signin = function (req, res, next) {
  var token = jwt.sign({userid:req.user.userid}, 'secret', {expiresIn: '1d'});
  msg = {status: 'success', data:{token:token}};
  res.json(msg);
};


module.exports.passport = passport;
module.exports.signin = signin;
module.exports.signinstatus = signinstatus;