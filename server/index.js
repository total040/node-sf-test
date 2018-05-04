const sf = require('node-salesforce');
const express = require('express');
const session = require('express-session');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

var app = express();
//initialize session
app.use(cookieParser('notsosecretkey'));
//app.use(session({secret: 'S3CRE7', resave: true, saveUninitialized: true}));
app.use(cookieSession({secret: 'notsosecretkey123'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var oauth2 = new sf.OAuth2({
    // you can change loginUrl to connect to sandbox or prerelease env.
    // loginUrl : 'https://test.salesforce.com',
    clientId : '3MVG9HxRZv05HarRVX5s2luNhU1VaJHSc1oxUtlkdCfBeipfkjsxlfIyCk.SK6E4CYGr29ZiUcyRmM1npTFqd',
    clientSecret : '4478142252522600907',
    redirectUri : 'http://localhost:3030/token'
});
//
// Get authz url and redirect to it.
//
app.get('/oauth2/auth', function(req, res) {
    var url = oauth2.getAuthorizationUrl({ scope : 'api web id refresh_token' });
    res.redirect(url);
});

app.get('/token', function(req, res) {
    var conn = new sf.Connection({ oauth2 : oauth2 });
    var code = req.query.code;
    req.session.token = 'tokken';
    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }

        console.log(conn.accessToken);
        console.log(conn.refreshToken);
        console.log(conn.instanceUrl);
        console.log('User ID: ' + userInfo.id);
        console.log('Org ID: ' + userInfo.organizationId);
        req.session.accessToken = conn.accessToken;
        req.session.instanceUrl = conn.instanceUrl;
        req.session.refreshToken = conn.refreshToken;
        // https://medium.com/netscape/first-time-dev-building-a-fullstack-js-app-for-salesforce-with-oauth-login-jsforce-react-redux-ca5962fb7fe3
    });

});

app.get('/api/test', function(req, res) {
    console.log('session: ', req.session);
    console.log('a_token: ', req.session.accessToken);
    console.log('token: ', req.session.token);
});

app.get('/api/accounts', function(req, res) {
// if auth has not been set, redirect to index
    console.log('session: ', req.session);
    if (!req.session.accessToken || !req.session.instanceUrl) { res.redirect('/'); }
//SOQL query
    let q = 'SELECT id, name FROM account LIMIT 10';
//instantiate connection
    let conn = new sf.Connection({
        oauth2 : {oauth2},
        accessToken: req.session.accessToken,
        instanceUrl: req.session.instanceUrl
    });
//set records array
    let records = [];
    let query = conn.query(q)
        .on("record", function(record) {
            records.push(record);
        })
        .on("end", function() {
            console.log("total in database : " + query.totalSize);
            console.log("total fetched : " + query.totalFetched);
            res.json(records);
        })
        .on("error", function(err) {
            console.error(err);
        })
        .run({ autoFetch : true, maxFetch : 4000 });
});

app.listen(3030, () => {
    console.log(`Starting on port 3030`);
});

