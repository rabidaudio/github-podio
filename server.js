
/*

attach github repository => podio deliverable
  on pull request
    find deliverable with a tag with the github repo (user/repo) and add comment to it
    if PR contains link to a particular task, comment on it as well and reference it on deliverable comment


future: connect github users to podio accounts

*/
require('with-env')(); //include environment variables from .env on development

var express = require('express');
var _ = require('lodash');
var Podio = require('podio-js').api;
// var Datastore = require('nedb');

var app = express();
var podio = new Podio({
  authType: 'app',
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

app.use(require('body-parser').json());

var comment_template = _.template("[<%= pull_request.user.login %>](<%= pull_request.user.html_url %>) issued a pull request\n\n"+
      "## [<%= pull_request.title %>](<%= pull_request.html_url %>)\n\n" +
      "<%= pull_request.body %>\n\n"+
      "> commits: <%= pull_request.commits %>, "+
        "changed files: <%= pull_request.changed_files %>, "+
        "<%= pull_request.additions %>++/<%= pull_request.deletions %>--");


app.post('/github-hook', function(req, res){
  //issues, pull_request, issue_comment
  
  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    res.end(res.body.zen);

  }else if(req.headers['x-github-event'] === 'pull_request'){
    if(req.body.action === "opened"){
      var comment = comment_template(req.body);
      console.log(comment);
      podio.request('POST', '/item/app/'+process.env.APP_ID+'/filter/', {
        filters:{
          tags: ['github-test']
        }
      }).then(function(results){
        if(results.filtered<=0){
          res.status(204).end("Couldn't find an item with the appropriate tag.");
        }else{
          var commentIds = [];
          _.each(results.items, function(item){
            podio.request('POST', "/comment/item/?silent=false"+item.item_id, {
              value: comment,
              external_id: req.headers['x-github-delivery'],
              embed_url: req.body.pull_request.html_url
            }).then(function(responseData){
              console.log("comment added: ", responseData);
              commentIds.push(responseData.comment_id);
            }, function(errBody){
              res.status(500).json(errBody || {error: "An unknown error occured."});
            });
          });
          res.json(commentIds);
        }
      }, function(err){
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

// app.post('/add-hook') //TODO add a way to submit app id and key



podio.isAuthenticated().then(start, function(err) {
    podio.authenticateWithApp(process.env.APP_ID, process.env.APP_TOKEN, start).catch(function(){
      throw "unable to authenticate with podio: "+err;
    });
});

function start () {
  app.listen(process.env.PORT || 5000);
  console.log("Server running");
}