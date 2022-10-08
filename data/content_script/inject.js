if (!background) {
  var background = (function () {
    var tmp = {};
    /*  */
    chrome.runtime.onMessage.addListener(function (request) {
      for (var id in tmp) {
        if (tmp[id] && (typeof tmp[id] === "function")) {
          if (request.path === "background-to-page") {
            if (request.method === id) {
              tmp[id](request.data);
            }
          }
        }
      }
    });
    /*  */
    return {
      "receive": function (id, callback) {
        tmp[id] = callback;
      },
      "send": function (id, data) {
        chrome.runtime.sendMessage({
          "method": id, 
          "data": data,
          "path": "page-to-background"
        });
      }
    }
  })();
  /*  */
  var ticking = false;
  document.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        background.send("scrollY", window.scrollY);
        ticking = false;
      });
  
      ticking = true;
    }
  });
  /*  */
  var config = {
    "scrollY": null,
    "iframe": null,
    "interface": {
      "url": function () {
        background.send("whoami");
      },
      "print": function () {
        window.print();
      },
      "toggle": function () {
        config.iframe = document.querySelector(".draw-on-page-parent-iframe");
        config.interface[config.iframe ? "hide" : "show"]();
      },
      "hide": function () {
        background.send("icon", {"path": "OFF"});
        config.iframe.remove();
      },
      "show": function () {
        config.iframe = document.createElement("iframe");
        config.iframe.setAttribute("class", "draw-on-page-parent-iframe");
        config.iframe.src = chrome.runtime.getURL("data/interface/index.html?page");
        /*  */
        config.iframe.style.top = "0";
        config.iframe.style.left = "0";
        config.iframe.style.margin = "0";
        config.iframe.style.border = "0";
        config.iframe.style.padding = "0";
        config.iframe.style.width = "100%";
        config.iframe.style.height = "100%";
        config.iframe.style.outline = "none";
        config.iframe.style.position = "fixed";
        config.iframe.style.zIndex = "2147483647";
        config.iframe.style.background = "transparent";
        /*  */
        document.documentElement.appendChild(config.iframe);
        background.send("icon", {"path": "ON"});
      }
    }
  };
  /*  */
  background.receive("close", config.interface.hide);
  background.receive("print", config.interface.print);
  background.receive("whoami", config.interface.whoami);
}

config.interface.toggle();