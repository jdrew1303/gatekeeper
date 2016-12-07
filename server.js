var url     = require('url'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs'),
    qs      = require('querystring'),
    _       = require('lodash'),
    express = require('express'),
    app     = express();

// Load config defaults from JSON file.
function loadConfig() {
  var config = JSON.parse(fs.readFileSync(__dirname+ '/config.json', 'utf-8'));
  console.log('Configuration');
  console.log(config);
  return config;
}

var config = loadConfig();

function authenticate(clientId, code, cb) {
  var appConfig = _.findWhere(config.apps, {'oauth_client_id': clientId});
  if (!appConfig) {
    cb(404);
    return;
  }
  console.log('Authenticating for app :');
  console.log(appConfig);
  var data = qs.stringify({
    client_id: appConfig.oauth_client_id,
    client_secret: appConfig.oauth_client_secret,
    code: code
  });

  var reqOptions = {
    host: appConfig.oauth_host,
    port: appConfig.oauth_port,
    path: appConfig.oauth_path,
    method: appConfig.oauth_method,
    headers: { 'content-length': data.length }
  };

  var body = "";
  var req = https.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, qs.parse(body).access_token);
    });
  });

  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}


// Convenience for allowing CORS on routes - GET only
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.get('/authenticate/:client/:code', function(req, res) {
  console.log('ClientId: ' + req.params.client);
  console.log('Authenticating Code: ' + req.params.code);
  authenticate(req.params.client, req.params.code, function(err, token) {
    var code, result;
    if (err === 404) {
      code = 404;
      result = {'error': 'No app found for clientId : ' + req.params.client};
    } else if (err || !token) {
      code = 401;
      result = {'error': 'Bad code'};
    } else {
      code = 200;
      result = {'token': token};
    }
    res.status(code).json(result);
    console.log('Response : ' + code, result, err);
  });
});

var port = process.env.PORT || config.port || 9999;

app.listen(port, null, function (err) {
  console.log('Gatekeeper, at your service: http://localhost:' + port);
});
