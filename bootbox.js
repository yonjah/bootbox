/**
 * bootbox.js [v4.x/master branch]
 *
 * http://bootboxjs.com/license.txt
 */
// @see https://github.com/makeusabrew/bootbox/issues/71
window.bootbox = window.bootbox || (function(document, $, undefined) {
  "use strict";

  // the base DOM structure needed to create a modal
  var templates = {
    dialog:
      "<div class='bootbox modal' tabindex='-1'>" +
        "<div class='modal-dialog'>" +
          "<div class='modal-content'>" +
            "<div class='modal-header'>" +
              "<h4 class='modal-title'></h4>" +
            "</div>" +
            "<div class='modal-body'></div>" +
            "<div class='modal-footer'></div>" +
          "</div>" +
        "</div>" +
      "</div>",
    closeButton:
      "<button type='button' class='bootbox-close-button close'>&times;</button>",
    form:
      "<form class='bootbox-form'></form>",
    inputs: {
      text:
        "<input class='bootbox-input input-block-level' autocomplete=off type=text />"
    }
  };

  // cache a reference to the jQueryfied body element
  var appendTo = $("body");

  var defaults = {
    // default language
    locale: "en",
    // show backdrop or not
    backdrop: true,
    // animate the modal in/out
    animate: true,
    // additional class string applied to the top level dialog
    className: null,
    // show the modal header or not
    header: true,
    // whether or not to include a close button, if a header is present
    closeButton: true,
    // show the dialog immediately by default
    show: true
  };

  // our public object; augmented after our private API
  var exports = {};

  /**
   * @private
   */
  function _t(key) {
    return locales[defaults.locale][key] || locales.en[key];
  }

  // @TODO inline within exports.dialog? closing over dialog & callbacks is neater...
  function processCallback(e, dialog, callback) {
    // by default we assume a callback will get rid of the dialog,
    // although they are given the opportunity to override this
    var preserveDialog = false;

    // so, if the callback can be invoked and it *explicitly returns false*
    // then we'll set a flag to keep the dialog active...
    if ($.isFunction(callback)) {
      preserveDialog = (callback(e) === false);
    }

    // ... otherwise we'll bin it
    if (!preserveDialog) {
      dialog.modal("hide");
    }
  }

  function sanitize(options) {
    var buttons = options.buttons;
    var total;
    var key;
    var keyIndex;
    var button;

    total = (function getKeyLength(obj) {
      // @TODO defer to Object.keys(x).length if available?
      var k, t = 0;
      for (k in obj) {
        t ++;
      }
      return t;
    }(buttons));

    if (typeof options !== "object") {
      throw new Error("Please supply an object of options");
    }

    if (!options.message) {
      throw new Error("Please specify a message");
    }

    // make sure any supplied options take precedence over defaults
    options = $.extend({}, defaults, options);

    if (!options.buttons) {
      options.buttons = {};
    }

    if (!options.title) {
      // @FIXME gah; we need to pad the header a bit...
      options.title = "&nbsp;";
    }

    // we only support Bootstrap's "static" and false backdrop args
    // supporting true would mean you could dismiss the dialog without
    // explicitly interacting with it
    options.backdrop = options.backdrop ? "static" : false;

    keyIndex = 0;

    for (key in buttons) {
      keyIndex ++;

      button = buttons[key];

      if (!button.label) {
        throw new Error("Button with key " + key + " requires a label");
      }

      if (!button.className) {
        if (total <= 2 && keyIndex === total) {
          // always add a primary to the main option in a two-button dialog
          button.className = "btn-primary";
        } else {
          button.className = "btn-default";
        }
      }
    }

    return options;
  }

  function mapArguments(args, properties) {
    var argn = args.length;
    var options = {};

    if (argn < 1 || argn > 2) {
      throw new Error("Invalid argument length");
    }

    if (argn === 2 || typeof args[0] === "string") {
      options[properties[0]] = args[0];
      options[properties[1]] = args[1];
    } else {
      options = args[0];
    }

    return options;
  }

  function mergeArguments(defaults, args, properties) {
    return $.extend(true, {}, defaults, mapArguments(args, properties));
  }

  exports.alert = function() {
    var options;
    var defaults;

    defaults = {
      buttons: {
        ok: {
          label: _t("OK")
        }
      }
    };

    options = mergeArguments(defaults, arguments, ["message", "callback"]);

    /**
     * overrides
     */
    options.buttons.ok.callback = options.onEscape = function() {
      if ($.isFunction(options.callback)) {
        return options.callback();
      }
      return true;
    };

    return exports.dialog(options);
  };

  exports.confirm = function() {
    var options;
    var defaults;

    defaults = {
      buttons: {
        cancel: {
          label: _t("CANCEL")
        },
        confirm: {
          label: _t("CONFIRM")
        }
      }
    };

    options = mergeArguments(defaults, arguments, ["message", "callback"]);

    /**
     * overrides; undo anything the user tried to set they shouldn't have
     */
    options.buttons.cancel.callback = options.onEscape = function() {
      return options.callback(false);
    };

    options.buttons.confirm.callback = function() {
      return options.callback(true);
    };

    // confirm specific validation
    if (!$.isFunction(options.callback)) {
      throw new Error("Confirm method requires callback");
    }

    return exports.dialog(options);
  };

  exports.prompt = function() {
    var options;
    var defaults;
    var dialog;
    var form;
    var input;

    // we have to create our form first otherwise
    // its value is undefined when gearing up our options
    // @TODO this could be solved by allowing message to
    // be a function instead...
    form = $(templates.form);

    defaults = {
      buttons: {
        cancel: {
          label: _t("CANCEL")
        },
        confirm: {
          label: _t("CONFIRM")
        }
      },
      value: ""
    };

    options = mergeArguments(defaults, arguments, ["title", "callback"]);

    /**
     * overrides; undo anything the user tried to set they shouldn't have
     */
    options.message = form;

    options.buttons.cancel.callback = options.onEscape = function() {
      return options.callback(null);
    };

    options.buttons.confirm.callback = function() {
      return options.callback(input.val());
    };

    // prompt specific validation
    if (!options.title) {
      throw new Error("This method requires a title");
    }

    if (!$.isFunction(options.callback)) {
      throw new Error("This method requires a callback");
    }

    // create the input
    input = $(templates.inputs.text);
    input.val(options.value);

    // now place it in our form
    form.append(input);

    form.on("submit", function(e) {
      e.preventDefault();
      // @TODO can we actually click *the* button object instead?
      // e.g. buttons.confirm.click() or similar
      dialog.find(".btn-primary").click();
    });

    dialog = exports.dialog(options);

    // clear the existing handler focusing the submit button...
    dialog.off("shown.bs.modal");

    // ...and replace it with one focusing our input, if possible
    dialog.on("shown.bs.modal", function() {
      input.focus();
    });

    // @TODO this needs to respect whether the user asked for the dialog
    // to be shown or not, not just assumed...
    dialog.modal("show");

    return dialog;
  };

  exports.dialog = function(options) {
    options = sanitize(options);

    var dialog = $(templates.dialog);
    var buttons = options.buttons;
    var button;
    var key;
    var buttonStr = "";
    var callbacks = {
      // always assume an onEscape for now
      // @TODO make this optional
      // @TODO namespace this in case a user passes a button called 'escape'
      "escape": options.onEscape
    };

    // @TODO hasOwnProperty
    for (key in buttons) {
      button = buttons[key];

      // @TODO I don't like this string appending to itself; bit dirty. Needs reworking
      // can we just build up button elements instead? slower but neater. Then button
      // can just become a template too
      buttonStr += "<button data-bb-handler='" + key + "' type='button' class='btn " + button.className + "'>" + button.label + "</button>";
      callbacks[key] = button.callback;
    }

    if (options.animate === true) {
      dialog.addClass("fade");
    }

    if (options.className) {
      dialog.addClass(options.className);
    }

    if (options.closeButton) {
      dialog.find(".modal-header").prepend(templates.closeButton);
    }

    if (options.title) {
      dialog.find(".modal-title").html(options.title);
    }

    // required bits last
    dialog.find(".modal-body").html(options.message);
    dialog.find(".modal-footer").html(buttonStr);

    /**
     * Bootstrap event listeners; used handle extra
     * setup & teardown required after the underlying
     * modal has performed certain actions
     */

    dialog.on("hidden.bs.modal", function(e) {
      // ensure we don't accidentally intercept hidden events triggered
      // by children of the current dialog. We shouldn't anymore now BS
      // namespaces its events; but still worth doing
      if (e.target === this) {
        dialog.remove();
      }
    });

    dialog.on("shown.bs.modal", function() {
      dialog.find(".btn-primary:first").focus();
    });

    /**
     * Bootbox event listeners; experimental and may not last
     * just an attempt to decouple some behaviours from their
     * respective triggers
     */

    dialog.on("escape.close.bb", function(e) {
      // @NOTE
      // if we declared processCallback locally we could take
      // advantage of our scope to just make the following...
      // processCallback(e, "escape");
      // and the one a bit further:
      // processCallback(e, $(this).data("bb-handler")
      // worth considering...
      processCallback(e, dialog, callbacks.escape);
    });

    /**
     * Standard jQuery event listeners; used to handle user
     * interaction with our dialog
     */

    dialog.on("click", ".modal-footer button", function(e) {
      e.preventDefault();

      var callbackKey = $(this).data("bb-handler");

      processCallback(e, dialog, callbacks[callbackKey]);

    });

    dialog.on("click", ".modal-header .close", function(e) {
      e.preventDefault();
      processCallback(e, dialog, callbacks.escape);
    });

    dialog.on("keyup", function(e) {
      // @TODO make conditional
      if (e.which === 27) {
        dialog.trigger("escape.close.bb");
      }
    });

    // the remainder of this method simply deals with adding our
    // dialogent to the DOM, augmenting it with Bootstrap's modal
    // functionality and then giving the resulting object back
    // to our caller

    appendTo.append(dialog);

    dialog.modal({
      backdrop: options.backdrop,
      keyboard: false,
      show: false
    });

    if (options.show) {
      dialog.modal("show");
    }

    // @TODO should we return the raw element here or should
    // we wrap it in an object on which we can expose some neater
    // methods, e.g. var d = bootbox.alert(); d.hide(); instead
    // of d.modal("hide");

   /*
    function BBDialog(elem) {
      this.elem = elem;
    }

    BBDialog.prototype = {
      hide: function() {
        return this.elem.modal("hide");
      },
      show: function() {
        return this.elem.modal("show");
      }
    };
    */

    return dialog;

  };

  exports.setDefaults = function(values) {
    $.extend(defaults, values);
  };

  exports.hideAll = function() {
    $(".bootbox").modal("hide");
  };


  /**
   * standard locales. Please add more according to ISO 639-1 standard. Multiple language variants are
   * unlikely to be required. If this gets too large it can be split out into separate JS files.
   */
  var locales = {
    br : {
      OK      : "OK",
      CANCEL  : "Cancelar",
      CONFIRM : "Sim"
    },
    da : {
      OK      : "OK",
      CANCEL  : "Annuller",
      CONFIRM : "Accepter"
    },
    de : {
      OK      : "OK",
      CANCEL  : "Abbrechen",
      CONFIRM : "Akzeptieren"
    },
    en : {
      OK      : "OK",
      CANCEL  : "Cancel",
      CONFIRM : "OK"
    },
    es : {
      OK      : "OK",
      CANCEL  : "Cancelar",
      CONFIRM : "Aceptar"
    },
    fi : {
      OK      : "OK",
      CANCEL  : "Peruuta",
      CONFIRM : "OK"
    },
    fr : {
      OK      : "OK",
      CANCEL  : "Annuler",
      CONFIRM : "D'accord"
    },
    it : {
      OK      : "OK",
      CANCEL  : "Annulla",
      CONFIRM : "Conferma"
    },
    nl : {
      OK      : "OK",
      CANCEL  : "Annuleren",
      CONFIRM : "Accepteren"
    },
    pl : {
      OK      : "OK",
      CANCEL  : "Anuluj",
      CONFIRM : "Potwierdź"
    },
    ru : {
      OK      : "OK",
      CANCEL  : "Отмена",
      CONFIRM : "Применить"
    },
    zh_CN : {
      OK      : "OK",
      CANCEL  : "取消",
      CONFIRM : "确认"
    },
    zh_TW : {
      OK      : "OK",
      CANCEL  : "取消",
      CONFIRM : "確認"
    }
  };

  return exports;

}(document, window.jQuery));
