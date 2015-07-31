
var _ = require('lodash');
var fs = require('fs');

var Module = {};

_.each(['pull_request', 'issues', 'release'], function(action){
  Module[action] = _.template(fs.readFileSync('templates/'+action+".dash"));
});

module.exports = Module;