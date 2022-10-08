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
  document.addEventListener("keydown", function (e) {
    var code = e.keyCode ? e.keyCode : e.which;
    /*  */
    if (code === 27) {
      if (config.interface.disabled) {
        background.send("enable");
        config.interface.enable();
      } else {
        background.send("disable");
        config.interface.disable();
      }
    }
  });
  /*  */
  var config = {
    "scrollY": null,
    "iframe": null,
    "interface": {
      "disabled": false,
      "whoami": function () {
        console.log(window.scrollY);
        background.send("scrollY", window.scrollY);
      },
      "disable": function () {
        config.iframe.style.pointerEvents = "none";
        config.interface.disabled = true;
      },
      "enable": function () {
        config.iframe.style.pointerEvents = "auto";
        config.interface.disabled = false;
      },
      "print": function () {
        window.print();
      },
      "toggle": function () {
        config.iframe = document.querySelector(".draw-on-page-parent-iframe");
        config.interface[config.iframe ? "hide" : "show"]();
      },
      "hide": function () {
        background.send("icon", "OFF");
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
        config.iframe.style.pointerEvents = "auto";
        /*  */
        document.documentElement.appendChild(config.iframe);
        background.send("icon", "ON");
      }
    }
  };
  /*  */
  background.receive("close", config.interface.hide);
  background.receive("print", config.interface.print);
  background.receive("disable", config.interface.disable);
  background.receive("enable", config.interface.enable);
  background.receive("whoami", config.interface.whoami);
}

config.interface.toggle();