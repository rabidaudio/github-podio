
var mongoose = require('mongoose');

mongoose.connect(process.env.MONGOLAB_URI);
var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;

var PodioApp = mongoose.model('PodioApp', new Schema({
  app_d: String,
  token: String,
  tags: [String],
  silent: { type: Boolean, default: false }
  timestamp: { type: Date, default: Date.now }
}));

PodioApp.prototype.get_url = function() {
  return "/app/"+this._id+"/github-hook"; //TODO
};

module.exports = function(podio, app_id_key){
  return {
    databaseLookup: function(req, res, next){
      console.log("middleware called");
      var app_id = req.params[app_id_key];
      
      PodioApp.findById(app_id, function(err, data){
        if(err){
          console.error("problem connecting to database", err);
          res.status(500).json(err);
        }else if(data==null){
          console.error("couldn't find PodioApp:"+app_id+" in database");
          res.status(404).end("App not found: "+app_id);
        }else{
          req.podio_app = data;
          //log into podio as app
          console.log("authenticating with podio as app");
          podio.authenticateWithApp(data.app_id, data.token, function(err, data){
            if(err){
              console.error("problem authentiating with podio", err);
              res.status(500).json(err);
            }else{
              console.log("authenticated");
              next();
            }
          });
        }
      });
    },

    create: function(req, res){
      var hook = new PodioApp(req.body);
      hook.save(function(err){
        if(err){
          res.status(400).json(err);
        }else{
          res.end(hook.get_url());
        }
      });
    }
  };
}