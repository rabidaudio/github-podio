
var request = require('request');

require('./server.js');

request({
  url: 'http://localhost:8000/github-hook',
  method: 'POST',
  json: true,
  body: {
    "action": "opened",
    "issue": {
      "url": "https://api.github.com/repos/octocat/Hello-World/issues/1347",
      "number": 1347,
    },
    "repository" : {
      "id": 1296269,
      "full_name": "octocat/Hello-World",
      "owner": {
        "login": "octocat",
        "id": 1,
      },
    },
    "sender": {
      "login": "octocat",
      "id": 1,
    }
  },
  headers: {
    'X-Github-Delivery': '1234567xx',
    'X-Github-Event': 'pull_request'
  }
}, function(err, res, body){
  if(err) throw err;
  console.log(body);
});