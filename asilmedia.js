(function () {
    'use strict';

    const BASE = 'http://asilmedia.org';

    function parseItems(html) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, 'text/html');

        let items = [];

        doc.querySelectorAll('.short').forEach(el => {
            let title = el.querySelector('.short-title')?.innerText || 'No title';
            let link = el.querySelector('a')?.href || '';
            let img = el.querySelector('img')?.src || '';

            items.push({
                title: title,
                poster: img,
                url: link,
                type: 'movie'
            });
        });

        return items;
    }

    function loadPage(url, callback) {
        fetch(url)
            .then(res => res.text())
            .then(html => callback(parseItems(html)))
            .catch(() => callback([]));
    }

    function search(query, page, callback) {
        let url = `${BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}&page=${page}`;
        loadPage(url, callback);
    }

    function category(type, page, callback) {
        let url = '';

        if (type === 'movies') {
            url = `${BASE}/films/tarjima_kinolar/page/${page}/`;
        } else if (type === 'serials') {
            url = `${BASE}/serials/page/${page}/`;
        }

        loadPage(url, callback);
    }

    function extractVideos(html) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, 'text/html');

        let results = [];

        // iframe player
        doc.querySelectorAll('iframe').forEach((frame, i) => {
            if (frame.src) {
                results.push({
                    title: 'Player ' + (i + 1),
                    url: frame.src,
                    quality: 'auto'
                });
            }
        });

        // video sources (agar bor bo‘lsa)
        doc.querySelectorAll('source').forEach((src, i) => {
            if (src.src) {
                results.push({
                    title: 'Source ' + (i + 1),
                    url: src.src,
                    quality: src.getAttribute('label') || 'HD'
                });
            }
        });

        return results;
    }

    function getVideos(url, callback) {
        fetch(url)
            .then(res => res.text())
            .then(html => {
                let videos = extractVideos(html);
                callback(videos);
            })
            .catch(() => callback([]));
    }

    Lampa.Plugin.add('asilmedia_pro', {
        title: 'AsilMedia PRO',
        version: '2.0.0',

        // 🔍 SEARCH
        onSearch: function (query, page, callback) {
            search(query, page || 1, callback);
        },

        // 📂 CATEGORY
        onCategory: function (params, callback) {
            let page = params.page || 1;

            if (params.url === 'movies') {
                category('movies', page, callback);
            } else if (params.url === 'serials') {
                category('serials', page, callback);
            }
        },

        // 📺 ITEM → PLAYER
        onItem: function (item, callback) {
            getVideos(item.url, callback);
        },

        // 📁 MENU
        onMenu: function (callback) {
            callback([
                {
                    title: 'Tarjima kinolar',
                    url: 'movies'
                },
                {
                    title: 'Seriallar',
                    url: 'serials'
                }
            ]);
        }
    });

})();
