(function () {
  'use strict';

  var PLUGIN_NAME = 'uzmovi';
  var BASE_URL = 'https://uzmovi.tv';

  // HTML dan kino kartalarini parse qilish
  function parseMovies(html) {
    var movies = [];
    // Kino kartalarini topish
    var regex = /<a href="(https:\/\/uzmovi\.tv\/[^"]+\.html)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/g;
    var match;
    while ((match = regex.exec(html)) !== null) {
      var url = match[1];
      var title = match[2];
      var poster = match[3];
      // Duplikatlarni oldini olish
      if (!movies.find(function(m){ return m.url === url; })) {
        movies.push({ url: url, title: title, poster: poster });
      }
    }
    return movies;
  }

  // Kino sahifasidan iframe/video URL olish
  function getVideoUrl(pageUrl, callback) {
    Lampa.Ajax.get(pageUrl, function(html) {
      // iframe src ni topish
      var iframeMatch = html.match(/iframe[^>]+src=["']([^"']+)["']/);
      if (iframeMatch) {
        callback(iframeMatch[1]);
      } else {
        callback(null);
      }
    }, function() {
      callback(null);
    });
  }

  // Kinolar ro'yxatini ko'rsatish
  function showMovieList(page) {
    page = page || 1;
    var url = BASE_URL + '/lastnews/page/' + page;

    Lampa.Ajax.get(url, function(html) {
      var movies = parseMovies(html);

      var items = movies.map(function(movie) {
        return {
          title: movie.title,
          poster: movie.poster,
          type: 'movie',
          source: PLUGIN_NAME,
          _uzmovi_url: movie.url
        };
      });

      Lampa.Activity.push({
        title: 'UZMovi - Premyeralar (Bet ' + page + ')',
        component: 'card',
        source: PLUGIN_NAME,
        items: items,
        page: page,
        onscroll: function() {
          showMovieList(page + 1);
        }
      });

    }, function() {
      Lampa.Noty.show('UZMovi: Ma\'lumot yuklanmadi!');
    });
  }

  // Kino ochish
  Lampa.Listener.follow('full', function(e) {
    if (e.data && e.data.source === PLUGIN_NAME && e.data._uzmovi_url) {
      getVideoUrl(e.data._uzmovi_url, function(videoUrl) {
        if (videoUrl) {
          Lampa.Player.play({
            url: videoUrl,
            title: e.data.title
          });
        } else {
          Lampa.Noty.show('Video topilmadi!');
        }
      });
    }
  });

  // Menyu qo'shish
  Lampa.Plugin.add({
    name: PLUGIN_NAME,
    type: 'other',
    component: 'menu',
    onstart: function() {
      Lampa.Menu.add({
        title: 'UZMovi Premyeralar',
        icon: 'icon-play',
        action: function() {
          showMovieList(1);
        }
      });
    }
  });

})();
