
/*

future: connect github users to podio accounts


add an app (id and token) and get a hook url for that app.
  any items to update must have a tag like "github:<username>/<repository>", plus any other included tags at generation
  comments will be added to all matching items

*/
require('with-env')(); //include environment variables from .env on development

var express = require('express');
var jade = require('jade');
var async = require('async');
var Podio = require('podio-js').api;
var templates = require('./templates');


var app = express();
app.set('port', process.env.PORT || 5000);
app.use(require('body-parser').json());

var podio = new Podio({
  authType: 'app',
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

//Lookup app and authenticate
var databaseHandler = require('./podio_connect_middleware')(podio);

app.use('/app/:id', databaseHandler.databaseLookup);

app.post('/add-hook', databaseHandler.create);

app.post('/add-user', databaseHandler.addUser);

//github hook filter
app.use(function(req, res, next){

    var event_type = req.headers['x-github-event'];
    var action = req.body.action;

    if((( event_type === 'pull_request' || event_type === 'issues') && (action === 'opened' || action === 'reopened'))
      || event_type === 'release'){

      console.log("generating comment");
      var data = req.body;
      
      databaseHandler.getUser(data.sender.login, function(podio_user){
        //@[Charles Julian Knight](user:2990084)
        data.podio_username = (podio_user ? " (@["+podio_user.podio_name+"](user:"+podio_user.podio_id+"))" : "");
        req.comment = {
          id: req.headers['x-github-delivery'],
          body: templates[event_type](data),
          primary_tag: "github:"+data.repository.full_name.toLowerCase() // all tags on Podio are stored in lowercase
        };


        if(event_type==='issues'){
          req.comment.url = data.issue.html_url; //event is 'issues' but data field is 'issue'
        }else{
          req.comment.url = data[event_type].html_url;
        }
        next();
      });

    }else{
      next();
    }
});

app.post('/app/:id/github-hook', function(req, res){

  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    return res.end(req.body.zen);
  }
  

  if(!req.comment){ //nothing to do
    return res.status(204).end('This service only listends to new pull requests and issues.');
  }

  if(!req.podio_app){
    return res.status(500).end('Unable to connect to app');
  }
  
  var search_tags = req.podio_app.tags.concat(req.comment.primary_tag); //the saved tags plus the primary tag

  podio.request('POST', '/item/app/'+req.podio_app.app_id+'/filter/', {

    filters:{ tags: search_tags }

  }).then(function(results){

    if(results.filtered <= 0){
      console.error("no matching items in app", search_tags);
      return res.status(204).end("Couldn't find an item with the appropriate tags: "+search_tags);

    }else{
      var commentIds = [];
      console.log("writing comments to "+results.items.length+" items");

      var comment_data = {
        value: req.comment.body,
        external_id: req.comment.id,
        embed_url: req.comment.url
      };
      
      async.each(results.items, function(item, callback){
        podio.request('POST', "/comment/item/"+item.item_id+
          (req.podio_app.silent ? "?silent=true" : ""), comment_data)
          .then(function(responseData){
            console.log("comment added: ", responseData);
            commentIds.push(responseData.comment_id);
            callback();
          }, callback);
        callback();
      }, function(err){ //on all complete
        if(err){
          console.error("problem writing comment", err);
          return res.status(500).end(errBody || "An unknown error occured.");
        }
        console.log("write complete", commentIds);
        return res.status(200).end(JSON.stringify(commentIds));
      });
    }
  }, function(err){
    console.error("problem getting items", err);
    return res.status(500).end(String(err));
  });
});

app.use('/images', express.static(__dirname + '/images'));

app.get(['/', '/index.html', '/home'], function(req, res){
  return res.end(jade.renderFile('index.jade'));
});


app.listen(app.get('port'));
console.log("Server running");