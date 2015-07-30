
require('with-env')(); //include environment variables from .env on development
var Podio = require('podio-js').api;
var podio = new Podio({
  authType: 'app',
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

function start(){
  console.log("READY");
}


podio.isAuthenticated().then(start, function(err) {
    podio.authenticateWithApp(process.env.APP_ID, process.env.APP_TOKEN, start).catch(function(){
      throw "unable to authenticate with podio: "+err;
    });
});


// podio.request('POST', '/item/app/'+process.env.APP_ID+'/filter/', {
//     filters:{
//         tags: ['github-test']
//       }
//   }).then(function(results){
//     console.log(results);
// });

// podio.request('GET', '/comment/item/'+id).then(function(data){ console.log(data);});

// for(i=0; i<commentIds.length;i++){
//   podio.request('DELETE', '/comment/'+commentIds[i]).then(function(data){ console.log(data);});
// }