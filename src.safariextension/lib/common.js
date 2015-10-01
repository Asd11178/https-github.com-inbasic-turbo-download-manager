'use strict';

/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
  var mwget = require('./mwget');
}
/**** wrapper (end) ****/

/* welcome page */
(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/turbo-download-manager.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
})();

/* manager */
app.button.onCommand(function () {
  app.tab.list().then(function (tabs) {
    tabs = tabs.filter(t => t.url.indexOf(app.getURL('manager/index.html')) === 0);
    if (tabs.length) {
      app.tab.reload(tabs[0]).then(app.tab.activate);
    }
    else {
      app.tab.open(app.getURL('./manager/index.html'));
    }
  });
});

/* main.js */
function download (obj) {
  obj.threads = obj.threads || config.wget.threads;
  obj.timeout = obj.timeout * 1000 || config.wget.timeout * 1000;
  obj.retries = obj.retries || config.wget.retrie;
  mwget.download(obj);
}
/* connect */
app.on('download', download);
/* context menu */
app.menu('Download with Turbo Download Manager', download);
/* manager */
mwget.addEventListener('done', function (id, status) {
  app.manager.send('status', {id, status});
});
mwget.addEventListener('add', function (id) {
  app.manager.send('new', id);
});
mwget.addEventListener('details', function (id, type, value) {
  if (type === 'name') {
    app.manager.send('name', {id, name: value});
  }
  if (type === 'status') {
    app.manager.send('status', {id, status: value});
  }
  if (type === 'count') {
    app.manager.send('count', {id, count: value});
  }
});
mwget.addEventListener('percent', function (id, remained, length) {
  let tmp = (length - remained) / length * 100;
  app.manager.send('percent', {id, percent: tmp});
});
mwget.addEventListener('total-percent', function (percent) {
  app.manager.send('total-percent', percent);
});
mwget.addEventListener('progress', function (id, stat) {
  app.manager.send('progress', {id, stat});
});
app.manager.receive('init', function () {
  let instances = mwget.list();
  instances.forEach(function (instance, id) {
    app.manager.send('add', {
      'id': id,
      'name': instance['internals@b'].name,
      'size': instance.info ? instance.info.length : 0,
      'percent': instance.info ? (instance.info.length - instance.remained) / instance.info.length * 100 : 0,
      'stats': mwget.stats(id),
      'status': instance.status
    });
  });
});
app.manager.receive('cmd', function (obj) {
  if (obj.cmd === 'pause') {
    mwget.pause(obj.id);
  }
  if (obj.cmd === 'resume') {
    mwget.resume(obj.id);
  }
  if (obj.cmd === 'trash') {
    mwget.remove(obj.id);
  }
  if (obj.cmd === 'cancel') {
    mwget.cancel(obj.id);
  }
});
app.manager.receive('open', function (cmd) {
  if (cmd === 'bug') {
    app.tab.open('https://github.com/inbasic/turbo-download-manager/');
  }
  if (cmd === 'faqs') {
    app.tab.open('http://add0n.com/turbo-download-manager.html');
  }
});
/* add ui */
app.add.receive('download', function (obj) {
  app.manager.send('hide');
  download(obj);
});