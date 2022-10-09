var button = {
  "init": function (callback) {
    chrome.storage.local.get({"context": "page"}, function (storage) {
      interface.url = interface.path + '?' + storage.context;
      /*  */
      app.button.icon(storage.context === "page" ? "OFF" : "ON", null);
      chrome.browserAction.setPopup({"popup": (storage.context === "popup" ? interface.url : '')}, callback);
    });
  },
  "click": function () {
    chrome.storage.local.get({"context": "page"}, function (storage) {
      interface.url = interface.path + '?' + storage.context;
      /*  */
      if (storage.context === "win") {
        interface.id ? chrome.windows.update(interface.id, {"focused": true}) : interface.create();
      } else if (storage.context === "tab") {
        interface.id ? chrome.tabs.update(interface.id, {"active": true}) : app.tab.open(interface.url);
      } else if (storage.context === "page") {
        app.tab.query({"active": true, "currentWindow": true}, function (tabs) {
          try {
            app.tab.inject(tabs[0].id, {
              "runAt": "document_start",
              "file": "data/content_script/inject.js"
            }, function () {});
          } catch (e) {}
        });
      }
      else {}
    });
  }
};

var connect = function (port) {
  if (port) {
    if (port.name) {
      if (port.sender) {        
        if (port.name === "tab") {
          if (port.sender.tab) {
            interface.id = port.sender.tab.id;
          }
        }
        /*  */
        port.onDisconnect.addListener(function (e) {
          if (port.name === "tab") interface.id = null;
          if (port.name === "win") {
            if (port.sender.tab) {
              if (port.sender.tab.windowId === interface.id) {
                interface.id = null;
              }
            }
          }
        });
      }
    }
  }
}

var interface = {
  "url": '',
  "id": null,
  "parent": {"id": null},
  "path": chrome.runtime.getURL("data/interface/index.html"),
  "close": function (e) {
    if (interface.id) {
      try {
        if (e === "tab") chrome.tabs.remove(interface.id);
        if (e === "win") chrome.windows.remove(interface.id);
      } catch (e) {}
    }
  },
  "create": function () {
    chrome.storage.local.get({"width": 950, "height": 650}, function (storage) {
      chrome.windows.getCurrent(function (win) {
        interface.parent.id = win.id;
        /*  */
        var url = interface.url;
        var width = storage.width;
        var height = storage.height;
        var top = win.top + Math.round((win.height - height) / 2);
        var left = win.left + Math.round((win.width - width) / 2);
        chrome.windows.create({"url": url, "type": "popup", "width": width, "height": height, "top": top, "left": left}, function (w) {
          interface.id = w.id;
        });
      });
    });
  }
};

var contextmenu = {
  "click": function (e) {
    chrome.storage.local.get({"context": "page"}, function (storage) {
      interface.close(storage.context);
      /*  */
      interface.url = interface.path + '?' + e.menuItemId;
      chrome.storage.local.set({"context": e.menuItemId}, function () {
        var popup = e.menuItemId === "popup" ? interface.url : '';
        app.button.icon(e.menuItemId === "page" ? "OFF" : "ON", null);
        chrome.browserAction.setPopup({"popup": popup}, function () {});
      });
    });
  },
  "create": {
    "button": function () {
      chrome.storage.local.get({"context": "page"}, function (storage) {
        var popup = storage.context === "popup", win = storage.context === "win", tab = storage.context === "tab", page = storage.context === "page";
        /*  */
        chrome.contextMenus.create({"id": "tab", "type": "radio", "title": "Open in tab",  "contexts": ["browser_action"], "checked": tab, "onclick": contextmenu.click});
        chrome.contextMenus.create({"id": "page", "type": "radio", "title": "Open in page",  "contexts": ["browser_action"], "checked": page, "onclick": contextmenu.click});
        chrome.contextMenus.create({"id": "win", "type": "radio", "title": "Open in window",  "contexts": ["browser_action"], "checked": win, "onclick": contextmenu.click});
        chrome.contextMenus.create({"id": "popup", "type": "radio", "title": "Open in popup",  "contexts": ["browser_action"], "checked": popup, "onclick": contextmenu.click});
      });
    }
  }
};

chrome.runtime.onStartup.addListener(function () {
  
})

chrome.runtime.onConnect.addListener(connect);
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.method === "icon") {
    app.button.icon(request.data, sender.tab.id);
  }
  if (request.method === "whoami") {
    app.tab.query({"active": true, "currentWindow": true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { "method": "whoami", "data": tabs[0].url, "path": "background-to-interface"});
    });
  }
  if (request.method === "scrollY") {
    app.tab.query({"active": true, "currentWindow": true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { "method": request.method, "data": request.data, "path": "background-to-interface"});
    });
  }
  if (request.method === "enable" || request.method === "disable") {
    app.tab.query({"active": true, "currentWindow": true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { "method": request.method, "data": request.data, "path": "background-to-page"});
      chrome.tabs.sendMessage(tabs[0].id, { "method": request.method, "data": request.data, "path": "background-to-interface"});
    });
  }
  else {
    app.tab.query({"active": true, "currentWindow": true}, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { "method": request.method, "data": request.data, "path": "background-to-page"});
    }); 
  }
});

button.init(contextmenu.create.button);
chrome.browserAction.onClicked.addListener(button.click);