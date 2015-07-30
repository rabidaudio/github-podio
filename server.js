
/*

attach github repository => podio deliverable
  on pull request
    find deliverable with a tag with the github repo (user/repo) and add comment to it
    if PR contains link to a particular task, comment on it as well and reference it on deliverable comment


future: connect github users to podio accounts

*/
require('with-env')(); //include environment variables from .env on development

var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var Podio = require('podio-js').api;
var Datastore = require('nedb');

var app = express();
var podio = new Podio({
  authType: 'app',
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

app.use(bodyParser.json());


var comment_template = _.template("[<%= pull_request.user.login %>](<%= pull_request.user.html_url %>) issued a pull request\n\n"+
      "## [<%= pull_request.title %>](<%= pull_request.html_url %>)\n\n" +
      "<%= pull_request.body %>\n\n"+
      "> commits: <%= pull_request.commits %>, "+
        "changed files: <%= pull_request.changed_files %>, "+
        "<%= pull_request.additions %>++/<%= pull_request.deletions %>--");


app.post('/github-hook', function(req,res){
  //issues, pull_request, issue_comment
  
  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    res.end("OK");

  }else if(req.headers['x-github-event'] === 'pull_request'){
    if(req.body.action === "opened"){
      var comment = comment_template(req.body);
      console.log(comment);
      // podio.request('POST',  "/comment/{type}/{id}/", {
      //   value: comment,
      //   external_id: req.headers['x-github-delivery'],

      // }).then(function(responseData){
      //   console.log("comment added: "+responseData.comment_id, responseData.ref);
      //   res.end(responseData.comment_id);
      // }).catch(function(errBody){
      //   res.status(500).json(errBody);
      // });
    }
  }else{
    res.status(400).end('This service only listends to pull requests.');
  }
});

app.get('/', function(req, res){
  res.end("Hello, world!");
});


podio.isAuthenticated().then(start).catch(function(err) {
    podio.authenticateWithApp(process.env.APP_ID, process.env.APP_TOKEN, start).catch(function(){
      throw "unable to authenticate with podio: "+err;
    });
});

function start () {
  app.listen(process.env.PORT || 5000);
  console.log("Server running");
}