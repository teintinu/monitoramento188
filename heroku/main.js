
var WebSocket = require('socket.io-client');
var firebase = require('firebase-admin');
var express = require('express')();
var http = require('http');
var https = require('https');

var serviceAccount = require("./credentials.json");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://monitor188-692f8.firebaseio.com/",
    databaseAuthVariableOverride: {
        uid: "hoda5"
    }
});
firebase.database.enableLogging(true);

var url = 'http://186.209.79.26'
var next_save = new Date().getTime() + 5000;

var socket = WebSocket(url);

var NOTIF = 'N';
var CONFIG = 'c';
var ONLINE = 'o';
var ONLINE_TS = 'ots';
var RAMAIS = 'r';
var NOME = 'n';
var IP = 'i';
var LATENCIA = 'l';
var TIMESTAMP = 't';
var notif_db = create_notif_db();

socket.on('notification', socket_notification);
socket.on('alertando', socket_aletrando);
socket.on('error', socket_error);
socket.on('connect_error', socket_error);

setTimeout(socket_lista_checked, 1000);
setInterval(notificar_postos_offline, 30000);
setInterval(gravar_no_firebase, 30000);

express.get('/online.json', function (req, res) {
    firebase.database().ref('/notif/online').once('value', function (v) {
        var r = v.val();
        var t = new Date().getTime();
        Object.keys(r).forEach(function (n) {
            r[n].offline = t - r[n].ts;
        });
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(r));
    });
});

express.listen(process.env.PORT || 3000);

function socket_lista_checked() {
    var lista_checked = ["available", "haut", "calling", "oncall", "unreg"];
    socket.emit('updateStatus', lista_checked);
}

function socket_notification(data) {
    var now = new Date().getTime();
    Object.keys(data.stats).forEach(function (status) {
        data.stats[status].forEach(function (ramal) {
            var n = ramal.ramal;
            atualiza(n, status, ramal);
        });
    });
    notif_db.set([NOTIF, ONLINE_TS], now);

    function atualiza(n, status, ramal) {
        notif_db.set([NOTIF, CONFIG, RAMAIS, n, NOME], ramal.nome);
        notif_db.set([NOTIF, CONFIG, RAMAIS, n, IP], ramal.address);

        var latencia = ramal.latencia && parseInt(ramal.latencia);
        if (latencia && !isNaN(latencia)) {
            notif_db.inc([NOTIF, ONLINE, n, LATENCIA], latencia);
            notif_db.set([NOTIF, ONLINE, n, TIMESTAMP], now);
        }
    }
}

function socket_aletrando(data) {
    debugger
    console.log(data);
}

function socket_error(error) {
    debugger
    console.log("\nErro! Por Favor verifique se o serviço do Painel está em funcionamento, ou se a porta 8000 esta liberada em seu firewall\nApos liberar a porta tente novamente. Você será redirecionado para a versão anterior do painel");
}

function create_notif_db() {
    var db = false;
    load_db();
    return {
        set: function (path, value) {
            if (db) {
                var r = get_record(path);
                r.$value = value;
                r.$changed = true;
            }
        },
        inc: function (path, value) {
            if (db) {
                var r = get_record(path);
                r.$changed = true;
                r.$count = (r.$count || 0) + 1;
                r.$sum = (r.$sum || 0) + value;
            }
        },
        snapshot: function () {
            return db;
            //return JSON.parse(JSON.stringify(db));
        }
    }

    function get_record(path) {
        var r = db;
        path.forEach(function (p) {
            var n = r[p] = r[p] || {};
            r = n;
        });
        return r;
    }
    function load_db() {
        https.get('https://monitor188-692f8.firebaseio.com/N.json', function (res) {
            var statusCode = res.statusCode;
            var contentType = res.headers['content-type'];

            var error;
            if (statusCode !== 200) {
                console.log('Request Failed. Status Code: ' + statusCode);
                process.exit(1)
            }
            res.setEncoding('utf8');
            var rawData = [];
            res.on('data', (chunk) => rawData.push(chunk));
            res.on('end', function () {
                try {
                    var parsedData = JSON.parse(rawData.join(''));
                    db = convert(parsedData)
                } catch (e) {
                    console.log(e);
                    process.exit(1)
                }
            });
        }).on('error', function (e) {
            console.log(`Got error: ${e.message}`);
        });
        function convert(d) {
            var r = {};
            Object.keys(d).forEach(function (c) {
                var v = d[c];
                if (typeof v === 'object')
                    r[c] = convert(v);
                else
                    r[c] = { $value: v };
            });
            return r;
        }
    }
}

function gravar_no_firebase() {
    grava([], notif_db.snapshot());
    function grava(p, r) {
        Object.keys(r).forEach(function (c) {
            var v = r[c];
            var pr = p.concat(c);
            if (v.$count) {
                if (v.$changed) {
                    v.$value = Math.round(v.$sum / v.$count);
                    firebase.database().ref(pr.join('/')).set(v.$value);
                    v.$changed = false;
                }
            }
            else if (v.$value) {
                if (v.$changed) {
                    firebase.database().ref(pr.join('/')).set(v.$value);
                    v.$changed = false;
                }
            }
            else {
                grava(pr, v)
            }
        });
    };
}

function notificar_postos_offline() {
    var x = firebase.database().ref('/N').on('value', function (v) {
        // firebase.database().ref('/notif').once('value', function (v) {        
        debugger
        x.stop()
        var n = v.val();
        if (n.config.timeout_notificar) {
            var now = new Date().getTime() - n.config.timeout_notificar;
            Object.keys(n.config.ramais).forEach(function (n) {
                var o = n.online[n];
                var c = n_config[n];
                if (r.ts < t && r.telefone) // precisa notificar
                    if (!(r.last_notif && r.last_notif > t - (n.config.timeout_spam || 3600000))) // evitar spam
                        notificar(n, r);
            });
        }
    });

    function notificar(n, r) {
        debugger
        var msg = encodeURI('Ramal do 188 - ' + n + ' está offline!');
        var path = [
            '/painel/api.ashx?action=sendsms&lgn=6281130639&pwd=291672&msg=',
            msg,
            '&numbers=', r.telefone
        ].join('');
        http.get({
            hostname: '54.173.24.177',
            port: 80,
            path: path,
            agent: false  // create a new agent just for this one request
        });
    }
}
