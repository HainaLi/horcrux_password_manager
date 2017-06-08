contentScriptNamespace = function() {

    var regexes_sign_up = /(sign[\s_-]?up)|(regist)|(new[\s_-]?account)/gi;
    var regexes_username = /(log[\s_-]?[io]n)|(us?e?r)|(us?e?r[\s_-]?name)|(e[\s_-]?mail)|(phone)/gi;
    var forms_on_the_page = [];


    function findLoginForm() {
        var forms_ = document.forms;
        var i = 0;
        var j = 0;
        for (i = 0; i < forms_.length; i++) {
            //exclude sign up forms
            if (checkFormAttributes(forms_.item(i), regexes_sign_up)) {
                continue;
            }
            //exclude invisible forms
            if (!onTopLayer(forms_.item(i)))
                continue;
            var elemts = forms_.item(i).elements;
            for (j = 0; j < elemts.length; j++) {
                var elemts_ = elemts[j];
                if (elemts_.type == "password") {
                    forms_on_the_page.push(forms_.item(i));
                }
            }

        }
        if (forms_on_the_page.length == 0) {
            return false;
        } else {
            self.port.emit("login_form_found", "");
            return true;
        }
    }

    function checkFormAttributes(form, regex) {
        for (var att, i = 0, atts = form.attributes, n = atts.length; i < n; i++) {
            var att = atts[i];
            if (att.nodeValue.match(regex) != null) {
                return true;
            }
        }
        return false;
    }

    function onTopLayer(ele) {

        if (!ele)
            return false;
        var document = ele.ownerDocument;
        var inputWidth = ele.offsetWidth;
        var inputHeight = ele.offsetHeight;
        if (inputWidth <= 0 || inputHeight <= 0) return false; //Elements that are on top layer must be visible.
        var position = $(ele).offset();
        var j;
        var score = 0;
        var maxHeight = (document.documentElement.clientHeight - position.top > inputHeight) ? inputHeight : document.documentElement.clientHeight - position.top;
        var maxWidth = (document.documentElement.clientWidth > inputWidth) ? inputWidth : document.documentElement.clientWidth - position.left;
        //Instead of deciding it on one try, deciding it on 10 tries.  This tackles some weird problems.
        for (j = 0; j < 10; j++) {
            score = isChildElement(ele, document.elementFromPoint(position.left + 1 + j * maxWidth / 10, position.top + 1 + j * maxHeight / 10)) ? score + 1 : score;
        }
        if (score >= 5) {
            return true;
        } else {
            return false;
        }
    }

    function isChildElement(parent, child) {
        if (child == null) return false;
        if (parent == child) return true;
        if (parent == null || typeof parent == "undefined") return false;
        if (parent.children.length == 0) return false;
        var i = 0;
        for (i = 0; i < parent.children.length; i++) {
            if (isChildElement(parent.children[i], child)) return true;
        }
        return false;
    }

    function execute(count) {
        if (findLoginForm() == false) {
            console.log("Didn't find login form");
        } else {
            console.log("Found login form");
        }
    }

    function scoreElementAttributes(element, regex) {
        var all_attributes = element.attributes;
        var total_matches = 0;
        for (var i = 0; i < all_attributes.length; i++) {
            var attr = all_attributes[i].value;
            var match_result = attr.match(regex);
            var score = 0;
            if (match_result != undefined) {
                score = match_result.length;
            }
            total_matches += score;
        }
        return total_matches;
    }

    function autofillForm(dummyusername, dummypassword, form) {
        var elemts = form.elements;
        for (j = 0; j < elemts.length; j++) {
            var elemt_ = elemts[j];
            if (elemt_.type == "password") {
                elemt_.value = dummypassword;
            } else if (elemt_.type == "submit") {
                console.log("submit button found");
            } else if (scoreElementAttributes(elemt_, regexes_username) > 0) {
                elemt_.value = dummyusername;
            }
        }
        return true;
    }

    console.log("Script injected: " + document.URL);
    self.port.on("autofill_form", function(info) {
        autofillForm(info['username'], info['password'], forms_on_the_page[0]);
    });

    execute();

}();