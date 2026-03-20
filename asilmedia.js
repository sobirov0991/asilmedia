/**
 * AsilMedia.org — Lampa TV Plugin
 * O'zbek tilida tarjima kinolar uchun plagin
 * Version: 1.0.0
 */

(function () {
    'use strict';

    var BASE_URL = 'http://asilmedia.org';
    var PLUGIN_NAME = 'AsilMedia';

    // ─── Proxy orqali HTML olish ──────────────────────────────────────────────
    function fetchPage(url, callback) {
        var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);

        Lampa.Ajax.get(
            proxyUrl,
            function (response) {
                try {
                    var data = typeof response === 'string' ? JSON.parse(response) : response;
                    callback(null, data.contents || data);
                } catch (e) {
                    callback(null, response);
                }
            },
            function (err) {
                callback(err || 'Xato: sahifani yuklab bo\'lmadi');
            }
        );
    }

    // ─── HTML parse yordamchi ────────────────────────────────────────────────
    function parseHTML(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return div;
    }

    // ─── Kino kartochkasini Lampa formatiga o'girish ─────────────────────────
    function parseCards(dom) {
        var results = [];
        var items = dom.querySelectorAll('.short-item, .th-item, article.th');

        if (!items.length) {
            items = dom.querySelectorAll('a[href*="asilmedia.org"]');
        }

        items.forEach(function (item) {
            try {
                var linkEl   = item.querySelector('a') || item;
                var imgEl    = item.querySelector('img');
                var titleEl  = item.querySelector('.th-title, .short-title, h2, .title');
                var yearEl   = item.querySelector('.th-year, .year');
                var qualEl   = item.querySelector('.th-quality, .quality');

                var href  = linkEl.getAttribute('href') || '';
                var title = titleEl ? titleEl.textContent.trim() : (linkEl.textContent.trim() || 'Nomsiz');
                var img   = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
                var year  = yearEl ? yearEl.textContent.trim() : '';
                var qual  = qualEl ? qualEl.textContent.trim() : '';

                // To'liq URL
                if (href && !href.startsWith('http')) {
                    href = BASE_URL + (href.startsWith('/') ? '' : '/') + href;
                }
                if (img && !img.startsWith('http') && !img.startsWith('data:')) {
                    img = BASE_URL + (img.startsWith('/') ? '' : '/') + img;
                }

                if (href && title && title.length > 1) {
                    results.push({
                        id:          href,
                        title:       title,
                        original_title: title,
                        poster:      img,
                        poster_path: img,
                        backdrop_path: img,
                        year:        year,
                        overview:    qual ? 'Sifat: ' + qual : '',
                        media_type:  'movie',
                        source_url:  href
                    });
                }
            } catch (e) { /* skip */ }
        });

        return results;
    }

    // ─── Kino sahifasidan video URL olish ───────────────────────────────────
    function extractVideoUrl(html) {
        var urls = [];

        // iframe src
        var iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi) || [];
        iframeMatch.forEach(function (m) {
            var src = m.match(/src=["']([^"']+)["']/);
            if (src && src[1] && src[1].indexOf('asilmedia') === -1) {
                urls.push({ type: 'iframe', url: src[1] });
            }
        });

        // file: "..." yoki file: '...'
        var fileMatch = html.match(/['"]file['"]\s*:\s*['"]([^'"]+)['"]/gi) || [];
        fileMatch.forEach(function (m) {
            var u = m.match(/:\s*['"]([^'"]+)['"]/);
            if (u && u[1]) {
                var url = u[1].replace(/\\\//g, '/');
                if (/\.(mp4|m3u8|mkv|avi)/i.test(url)) {
                    urls.push({ type: 'direct', url: url });
                }
            }
        });

        // src="...mp4" yoki .m3u8
        var directMatch = html.match(/src=["']([^"']*\.(mp4|m3u8))[^"']*["']/gi) || [];
        directMatch.forEach(function (m) {
            var u = m.match(/src=["']([^"']+)["']/);
            if (u && u[1]) urls.push({ type: 'direct', url: u[1] });
        });

        // Playlist JSON format: [{file:"...",label:"..."}]
        var playlistMatch = html.match(/\[\s*\{[^}]*file\s*:\s*["']([^"']+)["']/gi) || [];
        playlistMatch.forEach(function (m) {
            var u = m.match(/file\s*:\s*["']([^"']+)["']/);
            if (u && u[1] && /\.(mp4|m3u8)/i.test(u[1])) {
                urls.push({ type: 'direct', url: u[1] });
            }
        });

        return urls;
    }

    // ─── Asosiy sahifalar ────────────────────────────────────────────────────
    var CATEGORIES = [
        { title: "So'nggi kinolar",   url: BASE_URL + '/lastnews/',                    icon: '🆕' },
        { title: 'Tarjima kinolar',   url: BASE_URL + '/films/tarjima_kinolar/',        icon: '🎬' },
        { title: 'Seriallar',         url: BASE_URL + '/films/serial/',                 icon: '📺' },
        { title: 'Multfilmlar',       url: BASE_URL + '/films/multfilmlar_multiklar/',  icon: '🎠' },
        { title: 'Jangari',           url: BASE_URL + '/xfsearch/genre/боевик/',        icon: '💥' },
        { title: 'Komediya',          url: BASE_URL + '/xfsearch/genre/комедия/',       icon: '😂' },
        { title: 'Drama',             url: BASE_URL + '/xfsearch/genre/драма/',         icon: '🎭' },
        { title: 'Triller',           url: BASE_URL + '/xfsearch/genre/триллер/',       icon: '😱' },
        { title: 'Fantastika',        url: BASE_URL + '/xfsearch/genre/фантастика/',    icon: '🚀' },
        { title: 'Sarguzasht',        url: BASE_URL + '/xfsearch/genre/приключения/',   icon: '🗺️' },
        { title: 'Kriminal',          url: BASE_URL + '/xfsearch/genre/криминал/',      icon: '🔫' },
        { title: 'Harbiy',            url: BASE_URL + '/xfsearch/genre/военный/',       icon: '🪖' },
        { title: 'Tarixiy',           url: BASE_URL + '/xfsearch/genre/исторический/',  icon: '🏛️' },
        { title: '2026 yil',          url: BASE_URL + '/xfsearch/year/2026/',           icon: '🌟' },
        { title: '2025 yil',          url: BASE_URL + '/xfsearch/year/2025/',           icon: '📅' },
        { title: 'TOP-100',           url: BASE_URL + '/top.html',                      icon: '🏆' },
    ];

    // ─── Komponent: kategoriya ro'yxati ─────────────────────────────────────
    function CategoryComponent(object) {
        var scroll = new Lampa.Scroll({ horizontal: false });
        var items  = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);

        this.create = function () {
            return this.render();
        };

        this.render = function () {
            scroll.render();
            return scroll.body();
        };

        this.start = function () {
            var _this = this;

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');

            CATEGORIES.forEach(function (cat) {
                var card = Lampa.Template.get('card', {});
                if (!card) {
                    card = $('<div class="card selector" style="margin:10px;padding:15px;background:rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;min-width:180px;text-align:center;"></div>');
                }
                card.html('<div style="font-size:2em;">' + cat.icon + '</div><div style="margin-top:8px;font-weight:bold;">' + cat.title + '</div>');
                card.on('hover:enter click', function () {
                    Lampa.Activity.push({
                        url:       cat.url,
                        title:     cat.title,
                        component: 'asilmedia_list',
                        page:      1
                    });
                });
                scroll.append(card);
            });

            // Qidiruv
            var searchCard = $('<div class="card selector" style="margin:10px;padding:15px;background:rgba(255,200,0,0.2);border-radius:8px;cursor:pointer;min-width:180px;text-align:center;border:1px solid rgba(255,200,0,0.5);"></div>');
            searchCard.html('<div style="font-size:2em;">🔍</div><div style="margin-top:8px;font-weight:bold;">Qidirish</div>');
            searchCard.on('hover:enter click', function () {
                Lampa.Input.edit({ placeholder: 'Kino nomi...' }, function (query) {
                    if (query && query.trim()) {
                        Lampa.Activity.push({
                            url:       BASE_URL + '/?do=search&subaction=search&story=' + encodeURIComponent(query),
                            title:     'Qidiruv: ' + query,
                            component: 'asilmedia_list',
                            page:      1,
                            query:     query
                        });
                    }
                });
            });
            scroll.append(searchCard);
        };

        this.pause  = function () {};
        this.resume = function () {};
        this.back   = function () { Lampa.Activity.backward(); };
        this.destroy = function () { scroll.destroy(); };
    }

    // ─── Komponent: kino ro'yxati ────────────────────────────────────────────
    function ListComponent(object) {
        var scroll  = new Lampa.Scroll({ horizontal: false });
        var loading = false;
        var page    = object.page || 1;
        var hasMore = true;
        var baseUrl = object.url;

        function buildUrl(p) {
            if (baseUrl.indexOf('/do=search') !== -1) {
                return baseUrl + '&start=' + ((p - 1) * 10);
            }
            return baseUrl + (baseUrl.slice(-1) === '/' ? '' : '/') + (p > 1 ? 'page/' + p + '/' : '');
        }

        function load(p) {
            if (loading) return;
            loading = true;

            var url = buildUrl(p);
            fetchPage(url, function (err, html) {
                loading = false;
                if (err || !html) {
                    Lampa.Noty.show('Sahifani yuklashda xato: ' + (err || 'Ma\'lumot yo\'q'));
                    return;
                }

                var dom   = parseHTML(html);
                var cards = parseCards(dom);

                if (cards.length === 0) {
                    hasMore = false;
                    if (p === 1) {
                        Lampa.Noty.show('Hech narsa topilmadi');
                    }
                    return;
                }

                cards.forEach(function (item) {
                    var card = createCard(item);
                    scroll.append(card);
                });

                // Keyingi sahifa buttonini ko'rsatish
                if (hasMore) {
                    showLoadMore(p + 1);
                }
            });
        }

        function createCard(item) {
            var wrap = $([
                '<div class="card selector" style="display:inline-block;margin:8px;vertical-align:top;width:160px;cursor:pointer;">',
                '  <div style="width:160px;height:220px;background:#111;border-radius:6px;overflow:hidden;position:relative;">',
                item.poster ? '<img src="' + item.poster + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">' : '',
                '    <div style="position:absolute;bottom:0;left:0;right:0;padding:8px;background:linear-gradient(transparent,rgba(0,0,0,0.9));font-size:12px;font-weight:bold;">' + item.title + '</div>',
                item.year ? '<div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);padding:2px 6px;border-radius:4px;font-size:11px;">' + item.year + '</div>' : '',
                '  </div>',
                '</div>'
            ].join(''));

            wrap.on('hover:enter click', function () {
                Lampa.Activity.push({
                    url:       item.source_url,
                    title:     item.title,
                    component: 'asilmedia_detail',
                    movie:     item
                });
            });

            return wrap;
        }

        function showLoadMore(nextPage) {
            var btn = $('<div class="card selector" style="margin:20px auto;padding:15px 30px;background:rgba(255,255,255,0.15);border-radius:8px;cursor:pointer;text-align:center;display:block;width:200px;">Ko\'proq yuklash ...</div>');
            btn.on('hover:enter click', function () {
                btn.remove();
                load(nextPage);
            });
            scroll.append(btn);
        }

        this.create = function () {
            return scroll.body();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
            load(page);
        };

        this.pause   = function () {};
        this.resume  = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.destroy = function () { scroll.destroy(); };
    }

    // ─── Komponent: kino detail va player ───────────────────────────────────
    function DetailComponent(object) {
        var scroll = new Lampa.Scroll({ horizontal: false });
        var movie  = object.movie || {};

        this.create = function () {
            return scroll.body();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');

            // Kino ma'lumotlarini ko'rsatish
            var info = $([
                '<div style="padding:20px;">',
                movie.poster ? '<img src="' + movie.poster + '" style="width:200px;border-radius:8px;float:left;margin-right:20px;">' : '',
                '<div style="overflow:hidden;">',
                '<h2 style="margin-bottom:10px;">' + (movie.title || 'Kino') + '</h2>',
                movie.year ? '<p>Yil: <b>' + movie.year + '</b></p>' : '',
                movie.overview ? '<p>' + movie.overview + '</p>' : '',
                '<p style="color:#aaa;font-size:13px;">Video yuklanmoqda...</p>',
                '</div>',
                '<div style="clear:both;"></div>',
                '</div>'
            ].join(''));

            scroll.append(info);

            // Sahifadan video URL larni olish
            fetchPage(object.url, function (err, html) {
                if (err || !html) {
                    Lampa.Noty.show('Sahifani yuklashda xato');
                    return;
                }

                var videoUrls = extractVideoUrl(html);
                var dom = parseHTML(html);

                // Kino tavsifini olish
                var desc = dom.querySelector('.fll-descr, .full-descr, #short-story, .news-text');
                if (desc) {
                    info.find('p:last').before('<p style="margin:10px 0;">' + desc.textContent.trim().substring(0, 300) + '...</p>');
                }

                if (videoUrls.length === 0) {
                    info.find('p:last').html('<span style="color:#f66;">Video topilmadi. Saytga brauzer orqali kiring.</span>');

                    var openBtn = $('<div class="card selector" style="margin:15px 20px;padding:12px 20px;background:rgba(255,100,0,0.3);border-radius:8px;cursor:pointer;display:inline-block;">🌐 Saytda ochish</div>');
                    openBtn.on('hover:enter click', function () {
                        window.open(object.url, '_blank');
                    });
                    scroll.append(openBtn);
                    return;
                }

                info.find('p:last').remove();

                // Har bir video variant uchun tugma
                videoUrls.forEach(function (v, i) {
                    var label = v.type === 'iframe' ? ('Pleyer ' + (i + 1)) : ('Video ' + (i + 1));
                    var btn = $('<div class="card selector" style="margin:10px 20px;padding:14px 22px;background:rgba(0,150,255,0.25);border-radius:8px;cursor:pointer;display:inline-block;margin-right:10px;">▶ ' + label + '</div>');

                    btn.on('hover:enter click', function () {
                        if (v.type === 'direct') {
                            Lampa.Player.open(v.url);
                        } else {
                            // iframe — ochish
                            Lampa.Activity.push({
                                url:       v.url,
                                title:     movie.title || 'Video',
                                component: 'iframe'
                            });
                        }
                    });
                    scroll.append(btn);
                });
            });
        };

        this.pause   = function () {};
        this.resume  = function () {};
        this.back    = function () { Lampa.Activity.backward(); };
        this.destroy = function () { scroll.destroy(); };
    }

    // ─── Lampa'ga komponentlarni ro'yxatdan o'tkazish ───────────────────────
    function register() {
        Lampa.Component.add('asilmedia', CategoryComponent);
        Lampa.Component.add('asilmedia_list', ListComponent);
        Lampa.Component.add('asilmedia_detail', DetailComponent);
    }

    // ─── Bosh menyuga qo'shish ────────────────────────────────────────────────
    function addToMenu() {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                var menuItem = $('<li class="menu__item selector" data-action="asilmedia">' +
                    '<div class="menu__ico">🎞</div>' +
                    '<div class="menu__text">' + PLUGIN_NAME + '</div>' +
                    '</li>');

                menuItem.on('hover:enter click', function () {
                    Lampa.Activity.push({
                        url:       BASE_URL,
                        title:     PLUGIN_NAME,
                        component: 'asilmedia'
                    });
                });

                $('.menu .menu__list').eq(0).append(menuItem);
            }
        });
    }

    // ─── Ishga tushirish ─────────────────────────────────────────────────────
    function init() {
        register();
        addToMenu();
        Lampa.Noty.show('✅ AsilMedia plagin yuklandi!');
    }

    // Lampa tayyor bo'lgandan so'ng ishlatish
    if (window.Lampa) {
        init();
    } else {
        document.addEventListener('lampa-ready', init);
        // Backup: 3 soniyadan keyin sinab ko'rish
        setTimeout(function () {
            if (window.Lampa) init();
        }, 3000);
    }

})();
