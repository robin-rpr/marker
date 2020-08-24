app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};

if (!navigator.webdriver) {
  app.on.uninstalled(app.homepage() + "?v=" + app.version() + "&type=uninstall");
  app.on.installed(function (e) {
    app.on.management(function (result) {
      if (result.installType === "normal") {
        app.tab.query.index(function (index) {
          var previous = e.previousVersion !== undefined && e.previousVersion !== app.version();
          var doupdate = previous && parseInt((Date.now() - config.welcome.lastupdate) / (24 * 3600 * 1000)) > 45;
          if (e.reason === "install" || (e.reason === "update" && doupdate)) {
            var parameter = (e.previousVersion ? "&p=" + e.previousVersion : '') + "&type=" + e.reason;
            var url = app.homepage() + "?v=" + app.version() + parameter;
            app.tab.open(url, index, e.reason === "install");
            config.welcome.lastupdate = Date.now();
          }
        });
      }
    });
  });
}

app.on.message(function (request, sender) {
  if (request) {
    if (request.path === "interface-to-background") {
      for (var id in app.interface.message) {
        if (app.interface.message[id]) {
          if ((typeof app.interface.message[id]) === "function") {
            if (id === request.method) {
              app.interface.message[id](request.data);
            }
          }
        }
      }
    }
    /*  */
    if (request.path === "page-to-background") {
      for (var id in app.page.message) {
        if (app.page.message[id]) {
          if ((typeof app.page.message[id]) === "function") {
            if (id === request.method) {
              var a = request.data || {};
              if (sender) {
                a.frameId = sender.frameId;
                /*  */
                if (sender.tab) {
                  if (a.tabId === undefined) a.tabId = sender.tab.id;
                  if (a.title === undefined) a.title = sender.tab.title ? sender.tab.title : '';
                  if (a.top === undefined) a.top = sender.tab.url ? sender.tab.url : (sender.url ? sender.url : '');
                }
              }
              /*  */
              app.page.message[id](a);
            }
          }
        }
      }
    }
  }
});

app.on.connect(function (port) {
  if (port) {
    if (port.name) {
      if (port.name in app) {
        app[port.name].port = port;
      }
      /*  */
      if (port.sender) {
        if (port.sender.tab) {
          app.interface.port = port;
          /*  */
          if (port.name === "tab") {
            app.interface.id = port.sender.tab.id;
          }
          /*  */
          if (port.name === "win") {
            if (port.sender.tab.windowId) {
              app.interface.id = port.sender.tab.windowId;
            }
          }
        }
      }
    }
    /*  */
    port.onMessage.addListener(function (e) {
      app.storage.load(function () {
        if (e) {
          if (e.path) {
            if (e.port) {
              if (e.port in app) {
                if (e.path === (e.port + "-to-background")) {
                  for (var id in app[e.port].message) {
                    if (app[e.port].message[id]) {
                      if ((typeof app[e.port].message[id]) === "function") {
                        if (id === e.method) {
                          app[e.port].message[id](e.data);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    });
    /*  */
    port.onDisconnect.addListener(function (e) {
      app.storage.load(function () {
        if (e) {
          if (e.name) {
            if (e.name in app) {
              app[e.name].port = null;
            }
            /*  */
            if (e.sender) {
              if (e.sender.tab) {
                app.interface.port = null;
                /*  */
                if (e.name === "tab") {
                  app.interface.id = '';
                }
                /*  */
                if (e.name === "win") {
                  if (e.sender.tab.windowId) {
                    if (e.sender.tab.windowId === app.interface.id) {
                      app.interface.id = '';
                    }
                  }
                }
              }
            }
          }
        }
      });
    });
  }
});