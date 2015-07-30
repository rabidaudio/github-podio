
/*

attach github repository => podio deliverable
  on pull request
    find deliverable with a tag with the github repo (user/repo) and add comment to it
    if PR contains link to a particular task, comment on it as well and reference it on deliverable comment


future: connect github users to podio accounts

*/

var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var app = express();

app.use(bodyParser.json());


var comment_template = _.template("[<%= pull_request.user.login %>](<%= pull_request.user.html_url %>) issued a pull request\n\n"+
      "## [<%= pull_request.title %>](<%= pull_request.html_url %>)\n\n" +
      "<%= pull_request.body %>\n\n"+
      "> commits: <%= pull_request.commits %>, "+
        "changed files: <%= pull_request.changed_files %>, "+
        "<%= pull_request.additions %>++/<%= pull_request.deletions %>--");

app.post('/github-hook', function(req,res){

  if(req.headers['x-github-event'] === 'ping'){
    console.log('Received ping from github');
    res.end("OK");

  }else if(req.headers['x-github-event'] === 'pull_request'){
    var comment = comment_template(req.body);
    console.log(comment);
    res.end("OK");

  }else{
    res.status(400).end('This service only listends to pull requests.');
  }
});

app.listen(process.env.PORT || 8000);