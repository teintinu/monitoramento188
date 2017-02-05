window.initApp = function () {

    function InitMapa() {
        window.mapa = new google.maps.Map(document.getElementById('mapa'), {
            center: { lat: -11.081666181165778, lng: -51.89146270874022 },
            scrollwheel: true,
            zoom: 4,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    "featureType": "all",
                    "elementType": "labels",
                    "stylers": [{
                        "visibility": "off"
                    }]
                }
            ]
        });


        var marcas = {};

        marcas['8013'].animacao('red');
        firebase.database.ref('/N').on('value', function (v) {
            var notif = v.val();
            if (!notif) return;
            Object.keys(notif.c)
                .forEach(function (ramal) {
                    var marca = marcas[ramal]
                    if (!marca)
                        marcaPostoNoMapa(ramal, notif.c[ramal], notif.o[ramal])
                    else
                        marca.atualiza(notif.c[ramal], notif.o[ramal])
                });
        })

        function marcaPostoNoMapa(ramal, config, online) {

            pega_coordenada_do_posto(cria_marca)

            function cria_marca(loc) {
                var fillColor = '#37474F', strokeColor = 'black';
                var g = new google.maps.Marker({
                    position: { lat: loc.lat, lng: loc.lng },
                    map: mapa,
                    icon: getIcon(1),
                    title: ramal
                });
                var tm_animar, tam_animacao = 1;
                var marca = {
                    g: g,
                    animacao: function (ligar) {
                        if (ligar) {
                            if (!tm_animar)
                                animarProx();
                            strokeColor = ligar
                            function animarProx() {
                                tam_animacao++;
                                if (tam_animacao > 10) tam_animacao = 1;
                                g.setIcon(getIcon(tam_animacao));
                                setTimeout(animarProx, 100)
                            }
                        }
                        else {
                            if (tm_animar) clearInterval(tm_animar);
                            tm_animar = null;
                            tam_animacao = 1;
                            g.setIcon(getIcon(1));
                        }
                    },
                    atualiza(config, online) {

                    }
                };
                marcas[ramal] = marca;
                function getIcon(t) {
                    return {
                        path: tamanho(t),
                        fillColor: fillColor,
                        strokeColor: strokeColor,
                        fillOpacity: (10 - t) * 0.1,
                        strokeOpacity: (10 - t) * 0.1,
                        scale: 1
                    };
                }
                function tamanho(t) {
                    t = t * 2;
                    return [
                        'M-', t, ',0a', t, ',', t, ' 0 ', t, ',0 ', t * 2, ',0a', t, ',', t, ' 0 ', t, ',0 -', t * 2, ',0'
                    ].join('');
                }
            }

            function pega_coordenada_do_posto(callback) {
                if (config.localizacao)
                    callback(config.localizacao)
                var endereco = config.endereco || (config.n + ',Brasil');
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    "address": endereco
                }, function (results) {
                    var l = results[0].geometry.location;
                    callback({
                        lat: l.lat(),
                        lng: l.lng()
                    });
                });
            }
        }
    }
    function view(n) {
        var views = document.querySelectorAll('.demo-content');
        views.forEach(function (v) {
            if (v.children[0].id == n) {
                v.classList.remove('collapseIt');
            }
            else {
                v.classList.add('collapseIt');
            }
        });
    }

    window.loginGoogle = function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
    }
    window.loginFacebook = function () {
        var provider = new firebase.auth.GoogleAuthFacebook();
        firebase.auth().signInWithPopup(provider)
    }

    var config = {
        apiKey: "AIzaSyAAjRarDCaetGmCZgsMF5hzyaxc8t_Bk_k",
        authDomain: "monitor188-692f8.firebaseapp.com",
        databaseURL: "https://monitor188-692f8.firebaseio.com",
        storageBucket: "monitor188-692f8.appspot.com",
        messagingSenderId: "299510690103"
    };
    firebase.initializeApp(config);
    firebase.auth().onAuthStateChanged(function (user) {
        var username = document.querySelector('#username');
        var avatar = document.querySelector('.demo-avatar');
        if (user) {
            username.textContent = user.displayName || user.email || 'Logado';
            avatar.src = user.photoURL || 'images/user.jpg';
            view('mapa')
            InitMapa();
        } else {
            username.textContent = 'Identifique-se';
            avatar.src = 'images/unknown.jpg';
            view('login')
        }
    });
}