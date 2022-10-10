var background = {
  "port": null,
  "message": {},
  "receive": function (id, callback) {
    if (id) {
      background.message[id] = callback;
    }
  },
  "connect": function (port) {
    chrome.runtime.onMessage.addListener(background.listener); 
    /*  */
    if (port) {
      background.port = port;
      background.port.onMessage.addListener(background.listener);
      background.port.onDisconnect.addListener(function () {
        background.port = null;
      });
    }
  },
  "send": function (id, data) {
    if (id) {
      if (background.port.name !== "webapp") {
        chrome.runtime.sendMessage({
          "method": id,
          "data": data,
          "path": "interface-to-background"
        }); 
      }
    }
  },
  "post": function (id, data) {
    if (id) {
      if (background.port) {
        background.port.postMessage({
          "method": id,
          "data": data,
          "port": background.port.name,
          "path": "interface-to-background"
        });
      }
    }
  },
  "listener": function (e) {
    if (e) {
      for (var id in background.message) {
        if (background.message[id]) {
          if ((typeof background.message[id]) === "function") {
            if (e.path === "background-to-interface") {
              if (e.method === id) {
                background.message[id](e.data);
              }
            }
          }
        }
      }
    }
  }
};

var config  = {
  "id": null,
  "contextMenu": {
    "target": null,
    "menuItems": [],
    "mode": "light",
    "isOpened": false,
    "getTargetNode": function () {
      const nodes = document.querySelectorAll(config.contextMenu.target);
  
      if (nodes && nodes.length !== 0) {
        return nodes;
      } else {
        console.error(`getTargetNode :: "${config.contextMenu.target}" target not found`);
        return [];
      }
    },
    "getMenuItemsNode": function () {
      const nodes = [];
  
      if (!config.contextMenu.menuItems) {
        console.error("getMenuItemsNode :: Please enter menu items");
        return [];
      }
  
      config.contextMenu.menuItems.forEach((data, index) => {
        const item = config.contextMenu.createItemMarkup(data);
        item.firstChild.setAttribute(
          "style",
          `animation-delay: ${index * 0.08}s`
        );
        nodes.push(item);
      });
  
      return nodes;
    },
    "createItemMarkup": function (data) {
      const button = document.createElement("BUTTON");
      const item = document.createElement("LI");
  
      /* TODO: Sanitize insecure innerHTML */
      button.innerHTML = data.content;
      button.classList.add("contextMenu-button");
      item.classList.add("contextMenu-item");
  
      if (data.divider) item.setAttribute("data-divider", data.divider);
      item.appendChild(button);
  
      if (data.events && data.events.length !== 0) {
        Object.entries(data.events).forEach((event) => {
          const [key, value] = event;
          button.addEventListener(key, value);
        });
      }

      return item;
    },
    "render": function (menuItemsNode) {
      const menuContainer = document.createElement("UL");

      menuContainer.classList.add("contextMenu");
      menuContainer.setAttribute("data-theme", config.contextMenu.mode);

      menuItemsNode.forEach((item) => menuContainer.appendChild(item));

      return menuContainer;
    }
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "print": function () {
    if (config.port.name === "page") {
      background.send("print");
    } else {
      window.print();
    }
  },
  "controls": {
    "hide": function () {
      var target = document.querySelector(".controls");
      target.style.display = "none";
    },
    "show": function () {
      var target = document.querySelector(".controls");
      target.style.display = target.style.display === "none" ? "block" : "none";
    },
    "update": function () {
      function isBright(rgbHex) {
        var rgb = config.draw.convert.to.rgb(rgbHex);
        var luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; // per ITU-R BT.709
        return luma > 120;
      }      

      /* Background */
      var target = document.querySelector("#color");
      target.style.fill = config.draw.brushing.line.color.value;

      var target = document.querySelector("#opacity");
      target.style.background = config.draw.convert.to.mix(
        config.draw.brushing.line.color.value,
        '#ffffff',
        config.draw.brushing.line.opacity.value
      );

      var color = isBright(config.draw.convert.to.hex(target.style.background)) ? 'black' : 'white';
      var target = document.querySelector("#text");
      target.style.fill = color;

      var target = document.querySelector("#width");
      target.style.background = config.draw.convert.to.mix(
        config.draw.brushing.line.color.value,
        '#ffffff',
        config.draw.brushing.line.opacity.value
      );
      target.style.width = config.draw.brushing.line.width.value + 'px';
      target.style.height = config.draw.brushing.line.width.value + 'px';

      var target = document.getElementById('cursor');
      target.style.width = parseInt(config.draw.brushing.line.width.value) - 1 + 'px';
      target.style.height = parseInt(config.draw.brushing.line.width.value) - 1 + 'px';


      /* Contrast */
      var target = document.querySelector("#pen");
      target.style.fill = isBright(config.draw.brushing.line.color.value) ? 'black' : 'white';

      var target = document.querySelector("#text");
      target.style.fill = isBright(config.draw.brushing.line.color.value) ? 'black' : 'white';
      
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          var current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          tmp["last.id"] = config.id;
          config.storage.local["last.id"] = config.id;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?page") config.port.name = "page";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.body.style.width = "800px";
              document.body.style.height = "580px";
              document.documentElement.setAttribute("context", "extension");
            }
            /*  */
            background.connect(chrome.runtime.connect({"name": config.port.name}));
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "render": {
    "interface": function () {
      config.draw.mode = config.storage.read("draw.mode") !== undefined ? config.storage.read("draw.mode") : "brushing";
      config.draw.brushing.line.width.value = config.storage.read("line.width") !== undefined ? config.storage.read("line.width") : 20;
      config.draw.shape.stroke.width.value = config.storage.read("stroke.width") !== undefined ? config.storage.read("stroke.width") : 5;
      config.draw.shape.fill.opacity.value = config.storage.read("fill.opacity") !== undefined ? config.storage.read("fill.opacity") : 1;
      config.draw.shape.fill.color.value = config.storage.read("fill.color") !== undefined ? config.storage.read("fill.color") : "#0169FF";
      config.draw.brushing.shadow.width.value = config.storage.read("shadow.width") !== undefined ? config.storage.read("shadow.width") : 0;
      config.draw.brushing.line.opacity.value = config.storage.read("line.opacity") !== undefined ? config.storage.read("line.opacity") : 1;
      config.draw.brushing.line.color.value = config.storage.read("line.color") !== undefined ? config.storage.read("line.color") : "#0169FF";
      config.draw.brushing.shadow.offset.value = config.storage.read("shadow.offset") !== undefined ? config.storage.read("shadow.offset") : 0;
      config.draw.shape.stroke.color.value = config.storage.read("stroke.color") !== undefined ? config.storage.read("stroke.color") : "#0169FF";
      config.draw.brushing.shadow.color.value = config.storage.read("shadow.color") !== undefined ? config.storage.read("shadow.color") : "#777777";
      config.draw.background.color.value = config.storage.read("background.color") !== undefined ? config.storage.read("background.color") : "#ffffff";
      config.draw.shape.selector.setAttribute("selected", config.storage.read("shape.selector") !== undefined ? config.storage.read("shape.selector") : "Circle");
      config.draw.brushing.selector.setAttribute("selected", config.storage.read("brushing.selector") !== undefined ? config.storage.read("brushing.selector") : "Pencil");
      /*  */
      var computed = window.getComputedStyle(document.body);
      var width = computed ? parseInt(computed.width) : 800;
      
      config.draw.options.width = config.draw.options.height = width;
      config.draw.options.backgroundColor = config.port.name === "page" ? "transparent" : config.draw.background.color.value;
      /*  */      
      config.draw.canvas = new fabric.Canvas(config.draw.id, config.draw.options);
      config.draw.canvas.on("object:modified", config.listeners.object.updated);
      config.draw.canvas.on("object:added", config.listeners.object.updated);
      config.draw.canvas.on("mouse:wheel", config.listeners.mouse.wheel);
      config.draw.canvas.on("mouse:move", config.listeners.mouse.move);
      config.draw.canvas.on("mouse:down", config.listeners.mouse.down);
      config.draw.canvas.on("mouse:up", config.listeners.mouse.up);
      /*  */
      config.draw.canvas.isDrawingMode = config.draw.mode === "brushing";
      config.draw.brushing.controls.style.display = "block";
      /*  */
      var last = config.storage.read("last.draw");
      background.send("whoami");
      background.receive("whoami", function (e) {
        setTimeout(function () {
          var url = new URL(e);
          var key = url.hostname + url.pathname;
          if (last) {
            config.draw.canvas.loadFromJSON(JSON.parse(last)[key]);
            if (config.port.name === "page") {
              config.draw.canvas.backgroundColor = "transparent";
            }
            /*  */
            config.draw.canvas.renderAll();
          }
        }, 30);
      });
    }
  },
  "toast": {
    "show": function (message) {
      const container = document.querySelector(".toast-container");
      
      details = container.querySelector("#toast > .content > .details");
      details.innerHTML = message;
      container.classList.remove("hide");
      container.classList.add("show");
    },
    "hide": function () {
      const container = document.querySelector(".toast-container");

      container.classList.remove("show");
      container.classList.add("hide");
    }
  },
  "draw": {
    "mode": "brushing",
    "selector": "Pencil",
    "lastMode": "brushing",
    "lastSelector": "Pencil",
    "cache": {},
    "screen": 0,
    "history": [],
    "canvas": null,
    "disabled": false,
    "background": {},
    "clipboard": null,
    "keyborad": {"code": null},
    "id": "draw-on-page-canvas",
    "options": {"width": 800, "height": 800},
    "save": function () {
      var current = config.draw.history[config.draw.history.length - 1];
      const lastId = config.storage.read("last.id") !== undefined ? config.storage.read("last.id") : config.id;
      if (lastId !== config.id) {
        /* Fetch again */
        config.draw.cache = config.storage.read("last.draw") !== undefined ? JSON.parse(config.storage.read("last.draw")): {};
      }
      config.draw.cache[config.url] = current;
      config.storage.write("last.draw", JSON.stringify(config.draw.cache));
    },
    "copy": function () {
      var active = config.draw.canvas.getActiveObject();
      if (active) {
        active.clone(function (cloned) {
          config.draw.clipboard = cloned;
        });
      }
    },
    "convert": {
      "to": {
        "mix": function(hexA, hexB, amountToMix) {
          var rgbA = config.draw.convert.to.rgb(hexA);
          var rgbB = config.draw.convert.to.rgb(hexB);

          function colorChannelMixer(colorChannelA, colorChannelB, amountToMix){
            var channelA = colorChannelA*amountToMix;
            var channelB = colorChannelB*(1-amountToMix);
            return parseInt(channelA+channelB);
          }
          /*  */
          var r = colorChannelMixer(rgbA[0],rgbB[0],amountToMix);
          var g = colorChannelMixer(rgbA[1],rgbB[1],amountToMix);
          var b = colorChannelMixer(rgbA[2],rgbB[2],amountToMix);

          return '#' +
            config.draw.convert.to.hexadecimal(r) +
            config.draw.convert.to.hexadecimal(g) +
            config.draw.convert.to.hexadecimal(b);
        },
        "rgb": function(rgbHex) {
          var rgbHex = rgbHex.substring(1);
          var rgb = parseInt(rgbHex, 16);
          var r = (rgb >> 16) & 0xff; // extract red
          var g = (rgb >>  8) & 0xff; // extract green
          var b = (rgb >>  0) & 0xff; // extract blue
  
          return [r,g,b]
        },
        "hex": function (rgb) {
          var rgb = rgb.substring(4, rgb.length-1)
            .replace(/ /g, '')
            .split(',');

          return '#' + 
            config.draw.convert.to.hexadecimal(rgb[0]) + 
            config.draw.convert.to.hexadecimal(rgb[1]) +
            config.draw.convert.to.hexadecimal(rgb[2])
        },
        "hexadecimal": function (val) {
          return ((parseInt(val) | 1 << 8).toString(16).slice(1));
        },
        "png": function () {
          var a = document.createElement('a');
          var src = config.draw.canvas.toDataURL({"format": "png", "quality": 1.00});
          a.download = "drawing.png";
          a.style.display = "none";
          a.href = src;
          a.click();
          window.setTimeout(function () {a.remove()}, 1000);
        }
      }
    },
    "undo": function () {
      if (config.draw.screen < config.draw.history.length) {
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        var index = config.draw.history.length - 1 - config.draw.screen;
        config.draw.canvas.loadFromJSON(config.draw.history[index - 1]);
        config.draw.canvas.renderAll();
        config.draw.screen += 1;
      }
    },
    "redo": function () {
      if (config.draw.screen > 0) {
        config.draw.canvas.clear();
        config.draw.canvas.renderAll();
        var index = config.draw.history.length - 1 - config.draw.screen;
        config.draw.canvas.loadFromJSON(config.draw.history[index + 1]);
        config.draw.canvas.renderAll();
        config.draw.screen -= 1;
      }
    },
    "remove": {
      "active": {
        "objects": function () {
          config.draw.canvas.getActiveObjects().forEach(function (object) {
            config.draw.canvas.remove(object);
          });
        }
      }
    },
    "zoom": {
      "in": function () {
        var zoom = config.draw.canvas.getZoom();
        zoom = zoom + 0.01;
        if (zoom > 20) zoom = 20;
        config.draw.canvas.setZoom(zoom);
      },
      "out": function () {
        var zoom = config.draw.canvas.getZoom();
        zoom = zoom - 0.01;
        if (zoom < 0.01) zoom = 0.01;
        config.draw.canvas.setZoom(zoom);
      }
    },
    "paste": function () {
      config.draw.clipboard.clone(function (cloned) {
        config.draw.canvas.discardActiveObject();
        cloned.set({
          "evented": true, 
          "top": cloned.top + 50, 
          "left": cloned.left + 50
        });
        /*  */
        if (cloned.type === "activeSelection") {
          cloned.canvas = config.draw.canvas;
          cloned.forEachObject(function (e) {config.draw.canvas.add(e)});
          cloned.setCoords();
        } else {
          config.draw.canvas.add(cloned);
        }
        /*  */
        config.draw.canvas.setActiveObject(cloned);
        config.draw.canvas.renderAll();
        config.listeners.object.updated();
      });
    },
    "action": {
      "rotate": function (code) {
        var active = config.draw.canvas.getActiveObject();
        if (active) {
          var degrees = code === 219 ? -1 : +1;
          active.rotate(active.angle + degrees);
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      },
      "move": function (dir, shift) {
        var active = config.draw.canvas.getActiveObject();
        if (active) {
          switch (dir) {
            case 38: active.top = active.top - (shift ? 10 : 1); break;
            case 40: active.top = active.top + (shift ? 10 : 1); break;
            case 37: active.left = active.left - (shift ? 10 : 1); break;
            case 39: active.left = active.left + (shift ? 10 : 1); break;
          }
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      },
      "resize": function (code) {
        var active = config.draw.canvas.getActiveObject();
        if (active) {
          var center = active.getCenterPoint();
          var scale = (code === 188 ? 0.99 : 1.01);
          var selection = active.type === "activeSelection";
          /*  */
          active.scaleX = active.scaleX * scale;
          active.scaleY = active.scaleY * scale;
          active.top = active.top + (selection ? center.y * (1 - scale) / 2 : 0);
          active.left = active.left + (selection ? center.x * (1 - scale) / 2 : 0);
          /*  */
          active.setCoords();
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        }
      }
    },
    "brushing": {
      "line": {},
      "shadow": {},
      "label": null,
      "selector": null,
      "options": function (e) {
        return {
          "offsetX": 0,
          "offsetY": 0,
          "affectStroke": true,
          "color": e.color.value,
          "blur": parseInt(e.width.value, 10) || 0
        }
      },
      "update": function () {
        if (config.draw.canvas) {
          var value = config.draw.brushing.selector.getAttribute("selected");
          if (value) {
            var key = value + "Brush";
            config.draw.canvas.freeDrawingBrush = new fabric[key](config.draw.canvas, {"originX": "center", "originY": "center"});
            if (config.draw.canvas.freeDrawingBrush) {
              if (key !== "Eraser") {
                var opacity = config.draw.convert.to.hexadecimal(config.draw.brushing.line.opacity.value * 255);
                config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
                config.draw.canvas.freeDrawingBrush.shadow = new fabric.Shadow(config.draw.brushing.options(config.draw.brushing.shadow));
              }
              config.draw.canvas.freeDrawingBrush.width = parseInt(config.draw.brushing.line.width.value, 10) || 1;
            }
          }
        }
      }
    },
    "shape": {
      "fill": {},
      "line": {},
      "stroke": {},
      "label": null,
      "selector": null,
      "generate": {
        "regular": {
          "polygon": {
            "points": function (n, r) {
              var cx = r;
              var cy = r;
              var points = [];
              var sweep = Math.PI * 2 / n;
              /*  */
              for (var i = 0; i < n; i++) {
                var x = cx + r * Math.cos(i * sweep);
                var y = cy + r * Math.sin(i * sweep);
                points.push({'x': x, 'y': y});
              }
              /*  */
              return(points);
            }
          }
        }
      }
    }
  },
  "app": {
    "start": function () {
      config.make.draggable();
      config.render.interface();
      config.draw.brushing.update();
      config.controls.update();
      fabric.Object.prototype.transparentCorners = false;
      /*  */
      background.receive("scrollY", function (e) {
        config.listeners.window.scrollY(e);
      });
      /*  */
      config.draw.shape.stroke.color.addEventListener("input", function () {
        config.storage.write("stroke.color", this.value);
      });
      /*  */
      config.draw.shape.fill.opacity.addEventListener("input", function () {
        config.storage.write("fill.opacity", this.value);
      });
      /*  */
      config.draw.shape.stroke.width.addEventListener("input", function () {
        config.storage.write("stroke.width", this.value);
      });
      /*  */
      config.draw.brushing.shadow.color.addEventListener("input", function () {
        config.storage.write("shadow.color", this.value);
        config.draw.canvas.freeDrawingBrush.shadow.color = this.value;
      });
      /*  */
      config.draw.background.color.addEventListener("input", function () {
        config.storage.write("background.color", this.value);
        config.draw.canvas.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        config.draw.options.backgroundColor = config.port.name === "page" ? "transparent" : this.value;
        /*  */
        config.draw.canvas.renderAll();
        config.listeners.object.updated();
      });
      /*  */
      config.draw.brushing.line.color.addEventListener("input", function () {
        config.storage.write("line.color", this.value);
        var opacity = config.draw.convert.to.hexadecimal(config.draw.brushing.line.opacity.value * 255);
        config.draw.canvas.freeDrawingBrush.color = this.value + opacity;
        config.controls.update();
      });
      /*  */
      config.draw.brushing.line.width.addEventListener("input", function () {
        config.storage.write("line.width", this.value);
        config.draw.canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
        config.controls.update();
      });
      /*  */
      config.draw.brushing.shadow.width.addEventListener("input", function () {
        config.storage.write("shadow.width", this.value);
        config.draw.canvas.freeDrawingBrush.shadow.blur = parseInt(this.value, 10) || 0;
      });
      /*  */
      config.draw.brushing.line.opacity.addEventListener("input", function () {
        config.storage.write("line.opacity", this.value);
        var opacity = config.draw.convert.to.hexadecimal(this.value * 255);
        config.controls.update();
        config.draw.canvas.freeDrawingBrush.color = config.draw.brushing.line.color.value + opacity;
      });
      /*  */
      config.draw.brushing.shadow.offset.addEventListener("input", function () {
        config.storage.write("shadow.offset", this.value);
        config.draw.canvas.freeDrawingBrush.shadow.offsetX = parseInt(this.value, 10) || 0;
        config.draw.canvas.freeDrawingBrush.shadow.offsetY = parseInt(this.value, 10) || 0;
      });
      /*  */
      config.draw.shape.fill.color.addEventListener("input", function () {
        config.storage.write("fill.color", this.value);
        config.draw.canvas.getActiveObjects().forEach(function (object) {
          object.set("fill", config.storage.read("fill.color"));
          config.draw.canvas.renderAll();
          config.listeners.object.updated();
        });
      });
      /*  */
      const copyIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      const cutIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
      const pasteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
      const downloadIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
      const deleteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right: 7px" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      /*  */
      config.contextMenu.target = ".upper-canvas";
      config.contextMenu.menuItems = [
        {
          content: `${copyIcon}Copy`,
          events: {
            click: (e) => config.draw.copy()
            // mouseover: () => console.log("Copy Button Mouseover")
            // You can use any event listener from here
          }
        },
        { 
          content: `${pasteIcon}Paste`,
          events: {
            click: (e) => config.draw.paste()
          }
        },
        { 
          content: `${downloadIcon}Save`,
          events: {
            click: (e) => config.draw.convert.to.png()
          }
        },
        {
          content: `${deleteIcon}Clear`,
          divider: "top", // top, bottom, top-bottom
          events: {
            click: (e) => {
              const lastId = config.storage.read("last.id") !== undefined ? config.storage.read("last.id") : config.id;
              if (lastId !== config.id) {
                /* Fetch again */
                config.draw.cache = config.storage.read("last.draw") ? JSON.parse(config.storage.read("last.draw")) : {};
              }
              delete config.draw.cache[config.url];
              config.storage.write("last.draw", JSON.stringify(config.draw.cache));
              config.draw.canvas.clear();
            }
          }
        }
      ];
      /*  */
      var targetNode = config.contextMenu.getTargetNode();
      var menuItemsNode = config.contextMenu.getMenuItemsNode();
      var contextMenu = config.contextMenu.render(menuItemsNode);
      /*  */
      document.addEventListener("click", function () {
        if (config.contextMenu.isOpened) {
          config.contextMenu.isOpened = false;
          contextMenu.remove();
        }
      });
      window.addEventListener("blur", function () {
        if (config.contextMenu.isOpened) {
          config.contextMenu.isOpened = false;
          contextMenu.remove();
        }
      });
      document.addEventListener("contextmenu", (e) => {
        targetNode.forEach((target) => {
          if (!e.target.contains(target)) {
            contextMenu.remove();
          }
        });
      });
      /*  */
      targetNode.forEach((target) => {
        target.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          config.contextMenu.isOpened = true;

          const { clientX, clientY } = e;
          document.body.appendChild(contextMenu);

          const positionY =
            clientY + contextMenu.scrollHeight >= window.innerHeight
              ? window.innerHeight - contextMenu.scrollHeight - 20
              : clientY;
          const positionX =
            clientX + contextMenu.scrollWidth >= window.innerWidth
              ? window.innerWidth - contextMenu.scrollWidth - 20
              : clientX;

          contextMenu.setAttribute(
            "style",
            `width: ${contextMenu.scrollWidth}px;
            height: ${contextMenu.scrollHeight}px;
            top: ${positionY}px;
            left: ${positionX}px;`
          );
        });
      });
    }
  },
  "make": {
    "draggable": function () {
      var x = {"init": null, "first": null};
      var y = {"init": null, "first": null};
      /*  */
      var touchmove = function (e) {
        var touch = e.touches[0];        
        if (touch.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.style.top = y.init + touch.pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + touch.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
            };
      /*  */
      var touchstart = function (e) {
        var touch = e.touches[0];
        if (touch.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.addEventListener("touchmove", touchmove, false);
        e.preventDefault();
        /*  */
        x.first = touch.pageX;
        y.first = touch.pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
      };
      /*  */
      var mousemove = function (e) {
        if (e.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.style.top = y.init + e.pageY - y.first + "px";
        config.draw.brushing.controls.style.left = x.init + e.pageX - x.first + "px";
        /*  */
        config.storage.write("controls.top", config.draw.brushing.controls.style.top);
        config.storage.write("controls.left", config.draw.brushing.controls.style.left);
      };
      /*  */
      var mousedown = function (e) {      
        if (e.target.getAttribute("drag") === "disabled") return;
        config.draw.brushing.controls.addEventListener("mousemove", mousemove, false);
        e.preventDefault();
        /*  */
        x.first = e.pageX;
        y.first = e.pageY;
        y.init = config.draw.brushing.controls.offsetTop;
        x.init = config.draw.brushing.controls.offsetLeft;
      };
      /*  */
      config.draw.brushing.controls.addEventListener("mousedown", mousedown, false);
      config.draw.brushing.controls.addEventListener("touchstart", touchstart, false);
      window.addEventListener("mouseup", function () {config.draw.brushing.controls.removeEventListener("mousemove", mousemove, false)}, false);
      window.addEventListener("touchend", function () {config.draw.brushing.controls.removeEventListener("touchmove", touchmove, false)}, false);
    }
  },
  "load": function () {
    var png = document.getElementById("png");
    var copy = document.getElementById("copy");
    var show = document.getElementById("show");
    var undo = document.getElementById("undo");
    var redo = document.getElementById("redo");
    var hide = document.getElementById("hide");
    var save = document.getElementById("save");
    var paste = document.getElementById("paste");
    var close = document.getElementById("close");
    var clear = document.getElementById("clear");
    var print = document.getElementById("print");
    var remove = document.getElementById("remove");
    var reload = document.getElementById("reload");
    var zoomin = document.getElementById("zoom-in");
    var support = document.getElementById("support");
    var zoomout = document.getElementById("zoom-out");
    var donation = document.getElementById("donation");
    var cursor = document.getElementById('cursor');
    var crosshair = document.getElementById('crosshair');
    var controls = document.querySelector(".controls");
    /*  */
    function makeid(length) {
      var result           = '';
      var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var charactersLength = characters.length;
      for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    }
    config.id = makeid(25);
    /*  */
    background.send("whoami");
    background.receive("whoami", function (e) {
      var url = new URL(e);
      config.url = url.hostname + url.pathname;
    });
    /*  */
    config.draw.cache = config.storage.read("last.draw") ? JSON.parse(config.storage.read("last.draw")) : {};
    /*  */
    var drawing = false;
    window.addEventListener('mousemove', (e)=> {
      const mouseY = e.clientY;
      const mouseX = e.clientX;
      crosshair.style.transform = `translate3d(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%), 0)`;
      cursor.style.transform = `translate3d(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%), 0)`;
      if (drawing && config.draw.selector !== "Eraser") {
        crosshair.style.display = 'block';
      } else {
        cursor.style.display = 'block';
      }
    })
    window.addEventListener('mousein', (e) => {
      drawing = false;
      crosshair.style.display = 'none';
      cursor.style.display = 'block';
    })
    window.addEventListener('mouseout', (e) => {
      drawing = false;
      crosshair.style.display = 'none';
      cursor.style.display = 'none';
    })
    window.addEventListener('mousedown', (e) => {
      drawing = true;
      if (config.draw.selector !== "Eraser") {
        crosshair.style.display = 'block';
        cursor.style.display = 'none';
      }
    })
    window.addEventListener('mouseup', (e) => {
      drawing = false;
      if (config.draw.selector !== "Eraser") {
        crosshair.style.display = 'none';
        cursor.style.display = 'block';
      }
    })
    /*  */
    config.draw.brushing.controls = document.querySelector(".controls");
    config.draw.shape.selector = document.querySelector(".draw-shape-selector");
    config.draw.background.color = document.getElementById("draw-background-color");
    config.draw.shape.fill.color = document.getElementById("draw-shape-fill-color");
    config.draw.brushing.selector = document.querySelector(".draw-brushing-selector");
    config.draw.shape.fill.opacity = document.getElementById("draw-shape-fill-opacity");
    config.draw.brushing.line.color = document.getElementById("draw-brushing-line-color");
    config.draw.brushing.line.width = document.getElementById("draw-brushing-line-width");
    config.draw.shape.stroke.width = document.getElementById("draw-brushing-stroke-width");
    config.draw.shape.stroke.color = document.getElementById("draw-brushing-stroke-color");
    config.draw.brushing.line.opacity = document.getElementById("draw-brushing-line-opacity");
    config.draw.brushing.shadow.width = document.getElementById("draw-brushing-shadow-width");
    config.draw.brushing.shadow.color = document.getElementById("draw-brushing-shadow-color");
    config.draw.brushing.shadow.offset = document.getElementById("draw-brushing-shadow-offset");
    /*  */
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    background.receive("enable", function () {
      config.listeners.selector.reset();
    })
    /*  */
    background.receive("erase", function () {
      if(config.draw.selector !== "Mouse") {
        config.listeners.selector.eraser();
      }
    })
    /*  */
    background.receive("disable", function () {
      config.listeners.selector.mouse();
    })
    /*  */
    document.addEventListener("keydown", function (e) {
      var key = e.key ? e.key : e.code;
      var arrow = key.indexOf("Arrow") === 0;
      var code = e.keyCode ? e.keyCode : e.which;
      /*  */
      config.draw.keyborad.code = code;
      /*  */
      if (code === 8 && config.draw.selector === "Pencil") {
        config.listeners.selector.eraser();
      } else if (code === 27 && config.draw.selector === "Eraser") {
        config.listeners.selector.reset();
      } else if (code === 27 && config.draw.selector === "Mouse") {
        background.send("enable");
        config.listeners.selector.reset();
      } else if (code === 27 && config.draw.selector !== "Mouse") {
        background.send("disable");
        config.listeners.selector.mouse();
      }
      /*  */
      if (e.ctrlKey && code === 67) config.draw.copy();
      if (e.ctrlKey && code === 89) config.draw.redo();
      if (e.ctrlKey && code === 90) config.draw.undo();
      if (e.ctrlKey && code === 86) config.draw.paste();
      if (code === 46) config.draw.remove.active.objects();
      if (arrow) config.draw.action.move(code, e.shiftKey);
      if (code === 188 || code === 190) config.draw.action.resize(code);
      if (code === 219 || code === 221) config.draw.action.rotate(code);
    });
    /*  */
    save.addEventListener("click", function () {
      var flag = window.confirm("Are you sure you want to save all drawings?");
      if (flag) {
        config.draw.save();
      }
    });
    /*  */
    clear.addEventListener("click", function () {
      var flag = window.confirm("Are you sure you want to clear all drawings?");
      if (flag) {
        const lastId = config.storage.read("last.id") !== undefined ? config.storage.read("last.id") : config.id;
        if (lastId !== config.id) {
          /* Fetch again */
          config.draw.cache = config.storage.read("last.draw") ? JSON.parse(config.storage.read("last.draw")) : {};
        }
        delete config.draw.cache[config.url];
        config.storage.write("last.draw", JSON.stringify(config.draw.cache));
        config.draw.canvas.clear();
      }
    });
    /*  */
    print.addEventListener("click", function () {config.print()});
    undo.addEventListener("click", function () {config.draw.undo()});
    redo.addEventListener("click", function () {config.draw.redo()});
    copy.addEventListener("click", function () {config.draw.copy()});
    paste.addEventListener("click", function () {config.draw.paste()});
    remove.addEventListener("click", config.draw.remove.active.objects);
    show.addEventListener("click", function () {config.controls.show()});
    hide.addEventListener("click", function () {config.controls.hide()});
    zoomin.addEventListener("click", function () {config.draw.zoom.in()});
    close.addEventListener("click", function () {background.send("close")});
    zoomout.addEventListener("click", function () {config.draw.zoom.out()});
    png.addEventListener("click", function () {config.draw.convert.to.png()});
    reload.addEventListener("click", function () {document.location.reload()});
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "listeners": {
    "window": {
      "scrollY": function (scrollYPos) {
        var vpt = config.draw.canvas.viewportTransform;
        vpt[5] = scrollYPos * -1;
        /*  */
        config.draw.canvas.setViewportTransform(vpt);
        config.draw.canvas.requestRenderAll();
      }
    },
    "object": {
      "timeout": null,
      "updated": function () {
        window.clearTimeout(config.listeners.object.timeout);
        config.listeners.object.timeout = window.setTimeout(function () {          
          var screen = JSON.stringify(config.draw.canvas);
          if (config.draw.history.indexOf(screen) === -1) {
            config.draw.history.push(screen);
            config.draw.save();
          }
        }, 300);
      }
    },
    "mouse": {
      "up": function () {
        if (config.draw.mode === "shape") {
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") config.draw.shape.line.active = false;
        }
      },
      "move": function (o) {
        if (config.draw.mode === "shape") {
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            if (config.draw.shape.line.active) {
              config.draw.canvas.selection = false;
              var pointer = config.draw.canvas.getPointer(o.e);
              if (config.draw.shape.line.object) {
                config.draw.shape.line.object.set({"x2": pointer.x, "y2": pointer.y});
                config.draw.canvas.renderAll();
                config.listeners.object.updated();
              } 
            }
          }
        }
      },
      "wheel": function (o) {
        if (config.draw.keyborad.code === 16) {
          var delta = o.e.deltaY;
          var zoom = config.draw.canvas.getZoom();
          var point = {'x': o.e.offsetX, 'y': o.e.offsetY};
          /*  */
          zoom *= 0.999 ** delta;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          /*  */
          config.draw.canvas.zoomToPoint(point, zoom);
          o.e.preventDefault();
          o.e.stopPropagation();
        }
      },
      "down": function (o) {
        if (config.draw.mode === "shape") {
          var value = config.draw.shape.selector.getAttribute("selected");
          if (value === "Line") {
            config.draw.shape.line.active = true;
            var pointer = config.draw.canvas.getPointer(o.e);
            config.draw.shape.line.object = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            });
            /*  */
            config.draw.canvas.add(config.draw.shape.line.object);
          }
        }
      }
    },
    "selector": {
      "reset": function () {
        if (config.draw.selector === "Pencil") return; /* Nothing to reset */
        if (config.draw.selector === "Eraser" || config.draw.selector === "Mouse") {
          config.toast.hide();
          config.draw.lastMode = "brushing";
          config.draw.lastSelector = "Pencil";
        }
        /*  */
        config.listeners.selector[config.draw.lastSelector.toLowerCase()]();
      },
      "eraser": function () {
        if (config.draw.selector !== "Eraser") {
          config.toast.show('Use <span class="key">ESC</span> to exit Eraser');

          var pencil = document.querySelector("#pencil");
          var eraser = document.querySelector("#eraser");
          var mouse = document.querySelector("#mouse");
          var tool = document.querySelector("#tool");
          document.querySelector("#draw-brushing-line-color").disabled = true;
          
          tool.innerText = "Eraser"
          pencil.style.display = "none";
          mouse.style.display = "none";
          eraser.style.display = "block";

          config.draw.lastMode = config.draw.mode;
          config.draw.mode = "brushing";
          config.draw.lastSelector = config.draw.selector;
          config.draw.selector = "Eraser";
          config.draw.canvas.isDrawingMode = true;
          config.draw.brushing.selector.setAttribute("selected", config.draw.selector);
          /*  */
          config.draw.brushing.update();
        }
      },
      "mouse": function () {
        if (config.draw.selector !== "Mouse") {
          config.toast.show('Use <span class="key">ESC</span> to exit Mouse');
    
          var pencil = document.querySelector("#pencil");
          var mouse = document.querySelector("#mouse");
          var eraser = document.querySelector("#eraser");
          var tool = document.querySelector("#tool");
          document.querySelector("#draw-brushing-line-color").disabled = true;
          
          tool.innerText = "Mouse"
          pencil.style.display = "none";
          eraser.style.display = "none";
          mouse.style.display = "block";

          config.draw.lastSelector = config.draw.selector;
          config.draw.selector = "Mouse";
          config.draw.lastMode = config.draw.mode;
          config.draw.mode = "";
        }
      },
      "pencil": function () {
        if (config.draw.selector !== "Pencil") {

          var pencil = document.querySelector("#pencil");
          var mouse = document.querySelector("#mouse");
          var eraser = document.querySelector("#eraser");
          var tool = document.querySelector("#tool");
          document.querySelector("#draw-brushing-line-color").disabled = false;
          
          tool.innerText = "Pen"
          pencil.style.display = "block";
          eraser.style.display = "none";
          mouse.style.display = "none";

          config.draw.lastMode = config.draw.mode;
          config.draw.mode = "brushing";
          config.draw.lastSelector = config.draw.selector;
          config.draw.selector = "Pencil";
          config.draw.canvas.isDrawingMode = true;
          config.draw.brushing.selector.setAttribute("selected", config.draw.selector);
          config.storage.write("draw.mode", config.draw.mode);
          /*  */
          config.draw.brushing.update();
          config.storage.write("brushing.selector", config.draw.selector);
        }
      },
      "shape": function (value) {
        if (value) {
          config.draw.mode = "shape";
          config.draw.selector = value;
          config.draw.canvas.selection = true;
          config.draw.canvas.isDrawingMode = false;
          config.draw.brushing.shape.setAttribute("selected", value);
          config.storage.write("draw.mode", config.draw.mode);
          config.storage.write("shape.selector", value);
          /*  */
          if (value === "Move") {
            config.draw.canvas.selection = true;
          }
          /*  */
          if (value === "Circle") {
            config.draw.canvas.add(new fabric.Circle({
              "top": 200, 
              "left": 200,
              "radius": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (value === "Hexagon") {
            var points = config.draw.shape.generate.regular.polygon.points(6, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 200, 
              "left": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (value === "Octagon") {
            var points = config.draw.shape.generate.regular.polygon.points(8, 200);
            config.draw.canvas.add(new fabric.Polygon(points, {
              "top": 200, 
              "left": 200,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (value === "Triangle") {
            config.draw.canvas.add(new fabric.Triangle({
              "top": 150, 
              "left": 200,
              "width": 400,
              "height": 300,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
          /*  */
          if (value === "Rect") {
            config.draw.canvas.add(new fabric.Rect({
              "top": 150,
              "left": 250,
              "width": 500,
              "height": 300,
              "originX": "center",
              "originY": "center",
              "fill": config.draw.shape.fill.color.value,
              "stroke": config.draw.shape.stroke.color.value,
              "opacity": Number(config.draw.shape.fill.opacity.value),
              "strokeWidth": parseInt(config.draw.shape.stroke.width.value, 10) || 0
            }));
          }
        }
      }
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);