
/*

attach github repository => podio deliverable
  on pull request
    find deliverable with a tag with the github repo (user/repo) and add comment to it
    if PR contains link to a particular task, comment on it as well and reference it on deliverable comment


future: connect github users to podio accounts

*/

var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());

app.post('/github-hook', function(req,res){
  //issues, pull_request, issue_comment
  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    console.log(req.body.hook);
    res.end("OK");
  }else if(req.headers['x-github-event'] === 'pull_request'){
    console.log(req.body);
    res.end("OK");
  }else{
    res.status(400).end('This service only listends to pull requests.');
  }
});

app.listen(process.env.PORT || 8000);