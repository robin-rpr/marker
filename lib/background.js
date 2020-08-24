var app = {};

app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};

app.tab = {
  "open": function (url) {chrome.tabs.create({"url": url, "active": true})},
  "inject": function (tabId, details, callback) {chrome.tabs.executeScript(tabId, details, callback)},
  "query": function (options, callback) {
    chrome.tabs.query(options, function (tabs) {
      if (tabs && tabs.length) {
        callback(tabs);
      }
    });
  }
};

app.button = {
  "icon": function (state, tabId) {
    var options = {};
    /*  */
    if (tabId) options["tabId"] = tabId;
    options["path"] = {
      "16": "../../data/icons/" + (state ? state + '/' : '') + "16.png",
      "32": "../../data/icons/" + (state ? state + '/' : '') + "32.png",
      "48": "../../data/icons/" + (state ? state + '/' : '') + "48.png",
      "64": "../../data/icons/" + (state ? state + '/' : '') + "64.png",
      "128": "../../data/icons/" + (state ? state + '/' : '') + "128.png"
    };
    /*  */
    chrome.browserAction.setIcon(options);
  }
};

if (!navigator.webdriver) {
  chrome.runtime.setUninstallURL(app.homepage() + "?v=" + app.version() + "&type=uninstall", function () {});
  chrome.runtime.onInstalled.addListener(function (e) {
    chrome.management.getSelf(function (result) {
      if (result.installType === "normal") {
        window.setTimeout(function () {
          var previous = e.previousVersion !== undefined && e.previousVersion !== app.version();
          if (e.reason === "install" || (e.reason === "update" && previous)) {
            var parameter = (e.previousVersion ? "&p=" + e.previousVersion : '') + "&type=" + e.reason;
            app.tab.open(app.homepage() + "?v=" + app.version() + parameter);
          }
        }, 3000);
      }
    });
  });
}

app.storage = (function () {
  var objs = {};
  window.setTimeout(function () {
    chrome.storage.local.get(null, function (o) {objs = o});
    var script = document.createElement("script");
    script.src = "lib/interface.js";
    document.body.appendChild(script);
  }, 300);
  /*  */
  return {
    "read": function (id) {return objs[id]},
    "write": function (id, data) {
      var tmp = {};
      tmp[id] = data;
      objs[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  }
})();