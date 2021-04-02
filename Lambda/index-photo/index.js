// Load the SDK and UUID
var AWS = require('aws-sdk');
//var uuid = require('node-uuid');
var labels =[];
var elasticObject ={};

var region = 'us-west-2';
var domain = 'search-photos-lgukomkbmiehedsl7mwdpyhgqi.us-west-2.es.amazonaws.com'; 
var index = 'photos';
var type = 'Photo';

AWS.config.update({region: 'us-west-2'});

const client = new AWS.Rekognition();

exports.handler = function(event, context, callback) {
   console.log("Incoming Event: ", event);
   const bucket = event.Records[0].s3.bucket.name;
   const uploadedPhoto = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
   const message = `File is uploaded in - ${bucket} -> ${uploadedPhoto}`;
   console.log(message);
     
const params = {
  Image: {
    S3Object: {
      Bucket: bucket,
      Name: uploadedPhoto
    },
  },
  MaxLabels: 5
};
console.log(params);
 try{ 
client.detectLabels(params).promise().then(function(returnValue) {
    console.log("out function result: " + JSON.stringify(returnValue));
    
    returnValue.Labels.forEach(record => {
       labels.push(record.Name);
    });
elasticObject= {
    "objectKey": uploadedPhoto, 
    "bucket": bucket,
    "createdTimestamp": new Date(),
    "labels" : labels};

  indexDocumentSearch(elasticObject);
});
}
catch (error){
       console.log(error);
   }
return elasticObject;
};


function indexDocument(document,id) {
  var endpoint = new AWS.Endpoint(domain);
  var request = new AWS.HttpRequest(endpoint, region);
  var nextId= Number(id) + Number(1);
  


  request.method = 'PUT';
  request.path+= index+'/'+ type +'/' + nextId;
  request.body = JSON.stringify(document);
  request.headers['host'] = domain;
  request.headers['Content-Type'] = 'application/json';
  request.headers['Content-Length'] = Buffer.byteLength(request.body);

  var credentials = new AWS.EnvironmentCredentials('AWS');
  var signer = new AWS.Signers.V4(request, 'es');
  signer.addAuthorization(credentials, new Date());
  const esClient = new AWS.HttpClient();
  
  
  
  
  
  
   esClient.handleRequest(request, null, function(response) {
    console.log(response.statusCode + ' ' + response.statusMessage);
    var responseBody = '';
    response.on('data', function (chunk) {
      responseBody += chunk;
    });
    response.on('end', function (chunk) {
      console.log('Response body: ' + responseBody);
    });
  }, function(error) {
    console.log('Error: ' + error);
  });
}

 function indexDocumentSearch(document) {
  var endpoint = new AWS.Endpoint(domain);
  var request = new AWS.HttpRequest(endpoint, region);
  
  
  
   var idJson ={
  "query": {
    "match_all": {}
  },
  "size": 1,
  "sort": [
    {
      "createdTimestamp": {
        "order": "desc"
      }
    }
  ]
};
  request.method = 'GET';
  request.path+= index+'/'+ type + '/_search';
  request.body = JSON.stringify(idJson);
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
 
        var id= hits[0]._id;
        console.log("Elastic Search ",id);
      indexDocument(document,id);
      
});
  }, function(error) {
    console.log('Error: ' + error);
  });
 
}

