
/*

future: connect github users to podio accounts


add an app (id and token) and get a hook url for that app.
  any items to update must have a tag like "github:<username>/<repository>", plus any other included tags at generation
  comments will be added to all matching items

*/
require('with-env')(); //include environment variables from .env on development

var express = require('express');
var _ = require('lodash');
var mongoose = require('mongoose');
var Podio = require('podio-js').api;

mongoose.connect(process.env.MONGOLAB_URI);
var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;


var PodioApp = mongoose.model('PodioApp', new Schema({
  app_id: String,
  app_secret: String,
  tags: [String],
  timestamp: { type: Date, default: Date.now }
}));
PodioApp.prototype.get_url = function() {
  return "http://localhost:8000/app/"+this._id+"/github-hook";
};


var app = express();
var podio = new Podio({
  authType: 'app',
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

app.use(require('body-parser').json());

//Lookup app and authenticate
app.use('/app/:id', function(req, res, next){ ///\/app\/[0-9a-z]+\/?/, 
  console.log("middleware called");
  PodioApp.findById(req.params.id, function(err, data){
    if(err){
      console.error("problem connecting to database", err);
      res.status(500).json(err);
    }else if(data==null){
      console.error("couldn't find PodioApp:"+req.params.id+" in database");
      res.status(404).end("App not found: "+req.params.id);
    }else{
      req.podio_app = data;
      //log into podio as app
      console.log("authenticating with podio as app");
      podio.authenticateWithApp(data.app_id, data.app_secret, function(err, data){
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
});


var comment_template = _.template("[<%= pull_request.user.login %>](<%= pull_request.user.html_url %>) issued a pull request\n\n"+
      "## [<%= pull_request.title %>](<%= pull_request.html_url %>)\n\n" +
      "<%= pull_request.body %>\n\n"+
      "> commits: <%= pull_request.commits %>, "+
        "changed files: <%= pull_request.changed_files %>, "+
        "<%= pull_request.additions %>++/<%= pull_request.deletions %>--");


app.post('/app/:id/github-hook', function(req, res){
  //issues, pull_request, release
  
  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    res.end(res.body.zen);

  }else if(req.headers['x-github-event'] === 'pull_request'){
    if(req.body.action === "opened"){
      console.log("generating comment");
      var comment = comment_template(req.body);
      podio.request('POST', '/item/app/'+req.podio_app.app_id+'/filter/', {
        filters:{
          tags: req.podio_app.tags.concat("github:"+res.body.repository.full_name)
        }
      }).then(function(results){
        if(results.filtered<=0){
          console.error("no matching items in app");
          res.status(204).end("Couldn't find an item with the appropriate tag.");
        }else{
          var commentIds = [];
          console.log("writing comments to "+results.length+" items");
          _.each(results.items, function(item){
            podio.request('POST', "/comment/item/?silent=false"+item.item_id, {
              value: comment,
              external_id: req.headers['x-github-delivery'],
              embed_url: req.body.pull_request.html_url
            }).then(function(responseData){
              console.log("comment added: ", responseData);
              commentIds.push(responseData.comment_id);
            }, function(errBody){
              console.error("problem writing comment");
              res.status(500).json(errBody || {error: "An unknown error occured."});
            });
          });
          console.log("write complete", commentIds);
          res.json(commentIds);
        }
      }, function(err){
        console.error("problem getting items", err);
        res.status(500).json(err);
      });
    }
  }else{
    res.status(400).end('This service only listends to pull requests.');
  }
});

app.get('/', function(req, res){
  res.end("Hello, world!"); //TODO add a form for submitting new hooks
});

app.post('/add-hook', function(req, res){
  var hook = new PodioApp(req.body);
  hook.save(function(err){
    if(err){
      res.status(400).json(err);
    }else{
      res.end(hook.get_url());
    }
  });
});



// podio.isAuthenticated().then(start, function(err) {
//     podio.authenticateWithApp(process.env.APP_ID, process.env.APP_TOKEN, start).catch(function(){
//       throw "unable to authenticate with podio: "+err;
//     });
// });

start();

function start () {
  app.listen(process.env.PORT || 5000);
  console.log("Server running");
}