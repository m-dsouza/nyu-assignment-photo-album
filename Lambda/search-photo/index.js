//Testing deployment
var AWS = require('aws-sdk');
 AWS.config.update({region: 'us-west-2'});
 var region = 'us-west-2';
var domain = 'search-photos-lgukomkbmiehedsl7mwdpyhgqi.us-west-2.es.amazonaws.com'; 
var index = 'photos';
var type = 'Photo';
const imageName = new Set();
 
 var lexChatBot = new AWS.LexRuntime();

 

exports.handler = (event, context, callback) => {
console.log(" Inside lex bot",event);
//var obj =JSON.parse(event.body);
var searchedImages;
console.log(" Inside event",event);

 var lexNyuDiningParams = {
        botAlias: 'Testing',
        botName: 'nyuphoto',
        //inputText: event.queryStringParameters.q,
        inputText: 'dog',
        userId: 'UserRole',
        requestAttributes: {},
        sessionAttributes: {}
    };

    return lexChatBot.postText(lexNyuDiningParams).promise()
    .then((data) =>{
     console.log(data.slots);
     var values = Object.values(data.slots);
    var obj = values.filter(function(obj) { return obj });
    searchedImages = indexDocumentSearch(obj);
    
     console.log(searchedImages);
        const response = {
             headers: {
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
             },
            statusCode: 200,
             'body': JSON.stringify(JSON.stringify(Array.from(searchedImages))),
            'isBase64Encoded': false
        };
        return response;
    })
    .catch((err) =>{
        console.log(err.message);
    })
     
};



function indexDocumentSearch(labels) {
  var endpoint = new AWS.Endpoint(domain);
  var request = new AWS.HttpRequest(endpoint, region);
  request.method = 'GET';
  request.path+= index+'/'+ type + '/_search';
  for(let item of labels){
  var queryJson = {
  "query": {
    "query_string": {
      "query": item,
      "default_field": 'labels'
    }
  }
};

console.log(queryJson);
 
  request.body = JSON.stringify(queryJson);
  request.headers['host'] = domain;
  request.headers['Content-Type'] = 'application/json';
  request.headers['Content-Length'] = Buffer.byteLength(request.body);

  var credentials = new AWS.EnvironmentCredentials('AWS');
  var signer = new AWS.Signers.V4(request, 'es');
  signer.addAuthorization(credentials, new Date());
  const client = new AWS.HttpClient();
  
client.handleRequest(request, null, function(response) {
console.log(response.statusCode + ' ' + response.statusMessage);
    var responseBody = '';
    response.on('data', function (chunk) {
      responseBody += chunk;
    });
  response.on('end', function (chunk) {
      const obj = JSON.parse(responseBody);
       const hits = obj.hits.hits;
 for(var i=0;i < hits.length;i++ ){
        imageName.add('https://nyu-photo-album-bucket2.s3-us-west-2.amazonaws.com/'+ hits[i]._source.objectKey)
  }
  
        console.log("Elastic Search ",imageName);
      
});
  }, function(error) {
    console.log('Error: ' + error);
  });
  }
  console.log("Image Names", imageName);
  
  return imageName;
}