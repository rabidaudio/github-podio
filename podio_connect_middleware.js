
var mongoose = require('mongoose');
var _ = require('lodash');
var url = require('url');

mongoose.connect(process.env.MONGOLAB_URI);
var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;

var PodioApp = mongoose.model('PodioApp', new Schema({
  app_id:  { type: String, match: /^[0-9]+$/, required: true },
  token:  { type: String, match: /^[0-9a-f]+$/, required: true },
  tags: { type: [String], default: [] },
  silent: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}));

var GitHubPodioUser = mongoose.model('GitHubPodioUser', new Schema({
  github_username: { type: String, required: true, index: true },
  podio_name: { type: String, required: true },
  podio_id: { type: String, required: true },
}));

module.exports = function(podio, app_id_key){
  return {

    /**
     *  Take the given app_id and look up app info in database, then use that
     *  info to authenticate with Podio as that app
     */
    databaseLookup: function(req, res, next){
      var app_id = req.params.id;
      if(!app_id){
        console.log("no app_id");
        return next();
      }
      
      PodioApp.findById(app_id, function(err, data){
        if(err){
          console.error("problem connecting to database", err);
          return next(err);
        }else if(data===null||data===undefined){
          console.error("couldn't find PodioApp: "+app_id+" in database");
          return next("App not found: "+app_id);
        }else{
          req.podio_app = {};
          req.podio_app = data;
          
          //log into podio as app
          console.log("authenticating with podio as app", data._id);
          podio.authenticateWithApp(data.app_id, data.token, function(err, data){
            if(err){
              console.error("problem authentiating with podio", err);
              return next(err);
            }else{
              console.log("authenticated");
              return next();
            }
          });
        }
      });
    },

    /**
     * Respond to new app requests (store in database).
     */
    create: function(req, res){
      var hook = new PodioApp(req.body);
      hook.validate(function(err){
        if(err){
          return res.status(400).end(String(err));
        }else{
          hook.save(function(err){
            if(err){
              res.status(400).end(String(err));
            }else{
              console.log("added app:", hook);
              res.json(url.format({
                protocol: req.protocol,
                hostname: req.hostname,
                port: (process.env.NODE_ENV==="production" ? null : req.app.get('port')),
                pathname: "/app/"+hook._id.toString()+"/github-hook"
              }));
            }
          });
        }
      });
    },

    addUser: function(req, res){
      var user = new GitHubPodioUser(req.body);
      user.validate(function(err){
        if(err){
          return res.status(400).end(String(err));
        }else{
          user.save(function(err){
            if(err){
              return res.status(400).end(String(err));
            }else{
              console.log("added user", user);
              return res.status(200).end("OK");
            }
          });
        }
      });
    },

    getUser: function(github_username, callback){
      GitHubPodioUser.findOne({ github_username: github_username }, function (err, user) {
        if(err){
          callback(null);
        }else{
          callback(user);
        }
      });
    }
  };
}