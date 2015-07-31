
/*

future: connect github users to podio accounts


add an app (id and token) and get a hook url for that app.
  any items to update must have a tag like "github:<username>/<repository>", plus any other included tags at generation
  comments will be added to all matching items

*/
require('with-env')(); //include environment variables from .env on development

var express = require('express');
var jade = require('jade');
var _ = require('lodash');
var async = require('async');
var Podio = require('podio-js').api;


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


var pull_request_comment_template = _.template("[<%= pull_request.user.login %>](<%= pull_request.user.html_url %>) <%= action %> a pull request\n\n"+
      "# [<%= pull_request.title %>](<%= pull_request.html_url %>)\n\n" +
      "<%= pull_request.body %>\n\n"+
      "> commits: <%= pull_request.commits %>, "+
        "changed files: <%= pull_request.changed_files %>, "+
        "<%= pull_request.additions %>++/<%= pull_request.deletions %>--");

var issue_comment_template = _.template("[<%= issue.user.login %>](<%= issue.user.html_url %>) <%= action %> an issue\n\n"+
      "# [<%= issue.title %>](<%= issue.html_url %>)\n\n" +
      "<%= issue.body %>\n\n"+
      "<% _.forEach(issue.labels, function(label) { %><li>[<%- label.name %>](<%- label.url %>)</li><% }); %>");

//github hook filter
app.use(function(req, res, next){

    if(req.headers['x-github-event'] === 'pull_request' &&
      (req.body.action === 'opened' || req.body.action === 'reopened')){

        console.log("generating comment");
        req.generated_comment = pull_request_comment_template(req.body);

    }else if(req.headers['x-github-event'] === 'issues' &&
      (req.body.action === 'opened' || req.body.action === 'reopened')){

        console.log("generating comment");
        req.generated_comment = issue_comment_template(req.body);
    }
    next();
});

app.post('/app/:id/github-hook', function(req, res){
  //issues, pull_request, release

  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    return res.end(req.body.zen);
  }
  
  if(!!req.generated_comment){

    if(!req.podio_app){
      console.error("podio is not defined");
      return res.status(500).end("podio is not defined");
    }
    
    podio.request('POST', '/item/app/'+req.podio_app.app_id+'/filter/', {
      filters:{
        tags: req.podio_app.tags.concat("github:"+req.body.repository.full_name.toLowerCase())
      }
    }).then(function(results){
      if(results.filtered<=0){
        console.error("no matching items in app",req.podio_app.tags.concat("github:"+req.body.repository.full_name.toLowerCase()));
        return res.status(204).end("Couldn't find an item with the appropriate tag.");
      }else{
        var commentIds = [];
        console.log("writing comments to "+results.items.length+" items");

        var comment_data = {
          value: req.generated_comment,
          external_id: req.headers['x-github-delivery'],
          embed_url: (req.body.pull_request ? req.body.pull_request.html_url : req.body.issue.html_url) //todo
        };
        
        async.each(results.items, function(item, callback){
          podio.request('POST', "/comment/item/"+item.item_id+
            (req.podio_app.silent ? "?silent=true" : ""), comment_data)
            .then(function(responseData){
              console.log("comment added: ", responseData);
              commentIds.push(responseData.comment_id);
              callback();
            }, callback);
        }, function(err){
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

  }else{
    return res.status(204).end('This service only listends to new pull requests and issues.');
  }
});

app.use('/images', express.static(__dirname + '/images'));

app.get(['/', '/index.html', '/home'], function(req, res){
  return res.end(jade.renderFile('index.jade'));
});


app.listen(app.get('port'));
console.log("Server running");