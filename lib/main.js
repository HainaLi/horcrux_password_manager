 MainNamespace = function() {
     const {
         Cc,
         Ci,
         Cr,
         Cu
     } = require("chrome");
     const components = require("chrome");
     const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
     const pageMod = require("sdk/page-mod");
     const self = require("sdk/self");
     const {
         Panel
     } = require('sdk/panel');
     const {
         ActionButton
     } = require("sdk/ui/button/action");
     const {
         emit
     } = require('sdk/event/core');
     const {
         spawn
     } = require('sdk/system/child_process');
     Cu.importGlobalProperties(['URL']);

     var node_path = '/usr/bin/nodejs';
     var keystore_size = "11";

     //set user dummy passwords
     var dummyUsername = "dummyUser";
     var dummyPassword = "dummyPassword";
     var dummyUsername_encoded = "dummyUserName%40gmail.com";
     var real_password = "";
     var real_username = "";
     var listen = 0;
     var decrypt_count = 0;
     var found = false;
     var setUp = false;

     // CORE: memory to store AuthKey (used to encrypt/decrypt keystore access creds)
     var authKey = "";

     var loginPanel = Panel({
         contentURL: self.data.url("password_manager_panel.html"),
         contentScriptFile: self.data.url("password_manager_panel_script.js"),
         width: 400,
         height: 200
     });


     // get master password from user via a panel
     loginPanel.port.on("master_password", function(message) {
         loginPanel.hide();
         //Initialization here

         var dec = spawn(node_path, ["utils.js", "checkConfigKeys", message["master_password"], keystore_size]);
         authKey = message["master_password"];
         dec.stdout.on('data', function(data) {
             // get the authKey for this session, derived from MP
             //console.log(data);
             decrypt_count += 1;
             if (decrypt_count == 1) { //prevent Horcrux from reading any other outputs
                 if (data.includes("Authentication failed")) {
                     var notifications = require("sdk/notifications");
                     notifications.notify({
                         title: "Horcrux has failed to authenticate",
                         text: "Horcrux has failed to authenticate to your keystores with the master password provided. Please try again (click the Firefox button on the top right of the browser)."
                     });

                 } else {
                     found = true;
                     //authKey = data.slice(0, data.length - 1); // remove newline character and store authKey
                 }
             }

         });

         dec.stderr.on('data', function(data) {
             console.log('decrypter stderr: ' + data);
         });

         dec.on('close', function(code) {
             console.log('decrypter exited with code ' + code);
         });
     });


     var setUpPanel = Panel({
         contentURL: self.data.url("setup_panel.html"),
         contentScriptFile: self.data.url("setup_panel.js"),
         width: 700,
         height: 500
     });

     setUpPanel.port.on("setup_json", function(message) {

         setUpPanel.hide(); // close the panel
         var configJSON = message['configJSON'];
         var master_password = message['master_password'];

         var enc = spawn(node_path, ["encrypter.js", configJSON, master_password]);

         enc.stdout.on('data', function(data) {
             console.log('encrypter: ' + data);
         });

         enc.stderr.on('data', function(data) {
             console.log('encrypter stderr: ' + data);
         });

         enc.on('close', function(code) {
             console.log("encrypter exited with " + code);
         });

     });

     // check for config.json (first action Horcrux does)
     var checkConfig = spawn(node_path, ["check-config.js"]);

     checkConfig.stdout.on('data', function(data) {
         if (data.includes("config.json present: Account ready for login")) {
             console.log("ready to login");
             setUp = true;
         }
     });

     checkConfig.stderr.on('data', function(data) {
         console.log('checkConfig stderr: ' + data);
     });

     checkConfig.on('close', function(code) {
         console.log("checkConfig exited with " + code);
         if (setUp) {
             loginPanel.show(); // regular login with master password
         } else {
             setUpPanel.show(); // setup process with keysotre specification and creating master password
         }

     });

     // add a button that opens the panel
     var button = ActionButton({
         id: "Horcrux_Login",
         label: "Horcrux Login",
         icon: {
             "16": "./firefox-16.png"
         },
         onClick: function(state) {
             loginPanel.show();
         }
     });


     var setUpbutton = ActionButton({
         id: "Horcrux_Setup",
         label: "Horcrux Setup",
         icon: {
             "16": "./firefox-16.png"
         },
         onClick: function(state) {
             setUpPanel.show();
         }
     });


     // inject content-script
     pageMod.PageMod({
         include: "*",
         contentScriptFile: [self.data.url("jquery-1.4.2.min.js"), self.data.url("findLoginForm.js")],
         onAttach: communicate_with_content_script,
         attachTo: 'top',
         contentScriptWhen: "end"

     });

     // listen to messages from content script
     function communicate_with_content_script(worker) {
         worker.port.on("login_form_found", function() {
             // Get the current domain 
             var url = require("sdk/tabs").activeTab.url;
             var domain = new URL(url).hostname;

             // retrieves the username/email associated with account
             var retrieve = spawn(node_path, ["utils.js", "retrieve", authKey, domain, keystore_size]);
             retrieve.stdout.on('data', function(data) {
                 console.log('retrieve: ' + data);

                 if (data.includes("No account registered for")) {
                     var makeAccount = Panel({
                         contentURL: self.data.url("account.html"),
                         contentScriptFile: self.data.url("account.js"),
                         width: 400,
                         height: 300
                     });
                     makeAccount.show();

                     // get username requested and create/store password shares
                     makeAccount.port.on("username", function(message) {
                         makeAccount.hide(); // close the panel
                         real_username = message; // username input to the panel

                         // make new password, shares, and storage requests
                         var storer = spawn(node_path, ["utils.js", "store", authKey, domain, real_username, keystore_size]);
                         storer.stdout.on('data', function(data) {
                             console.log('storer: ' + data);

                             var notifications = require("sdk/notifications");
                             notifications.notify({
                                 title: "Horcrux has created your password",
                                 text: "Horcrux has created a new password for you: '" + data +
                                     "'. Please register your account at '" + domain + "' with this password. This is the only time you need to know or use your new password! (Try copying this from the terminal). Then, return to the login form and wait for the form to autofill before clicking submit!"
                             });

                             found = true;

                         });

                         storer.stderr.on('data', function(data) {
                             console.log('storer stderr: ' + data);
                         });
                         storer.on('close', function(code) {
                             console.log('storer exited with code ' + code);
                         });

                     });

                 } else {
                     console.log("domain found in DB");
                     // tell content script to autofill the dummy PW
                     // this observer will swap
                     worker.port.emit("autofill_form", {
                         "username": dummyUsername,
                         "password": dummyPassword
                     });
                     // start listening to traffic and prepare to swap!
                     listen = 1;
                     var credentials = data.split("\n");
                     real_username = credentials[0].trim();
                     real_password = credentials[1].trim(); // set real password 
                 }

             });

             retrieve.stderr.on('data', function(data) {
                 console.log('encrypter stderr: ' + data);
             });

             retrieve.on('close', function(code) {
                 console.log('retrieve exited with code ' + code);
             });

         }); //login form found

     } //function close bracket



     // the rest of the code is swapping/listening for traffic

     function replaceAll(str, find, replace) {
         return str.replace(new RegExp(find, 'g'), replace)
     }

     if (typeof CCIN == "undefined") {
         function CCIN(cName, ifaceName) {
             return Cc[cName].createInstance(Ci[ifaceName]);
         }
     }

     if (typeof CCSV == "undefined") {
         function CCSV(cName, ifaceName) {
             if (Cc[cName])
                 return Cc[cName].getService(Ci[ifaceName]);
             else
                 dumpError("CCSV fails for cName:" + cName);
         };
     }

     function TracingListener() {
         this.originalListener = null;
         this.receivedData = [];
     }

     TracingListener.prototype = {
         onDataAvailable: function(request, context, inputStream, offset, count) {
             var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream");
             var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
             var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1", "nsIBinaryOutputStream");
             binaryInputStream.setInputStream(inputStream);
             storageStream.init(8192, count, null);
             binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
             var data = binaryInputStream.readBytes(count);
             this.receivedData.push(data);
             binaryOutputStream.writeBytes(data, count);
             this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), offset, count);
         },

         onStartRequest: function(request, context) {
             this.originalListener.onStartRequest(request, context);
         },

         onStopRequest: function(request, context, statusCode) {
             this.originalListener.onStopRequest(request, context, statusCode);
         },

         QueryInterface: function(aIID) {
             if (aIID.equals(Ci.nsIStreamListener) ||
                 aIID.equals(Ci.nsISupports)) {
                 return this;
             }
             throw Cr.NS_NOINTERFACE;
         }
     }


     observerService.addObserver({

         observe: function(aSubject, aTopic, aData) {
             if ("http-on-modify-request" == aTopic) {
                 var gchannel = aSubject.QueryInterface(Ci.nsIHttpChannel)
                 var url = gchannel.URI.spec;
                 //var postDATA = "";
                 var cookies = "";
                 //var requestRecord = new RequestRecord();
                 try {
                     cookies = gchannel.getRequestHeader("cookie");
                 } catch (e) {} //this creates lots of errors if not caught


                 if (gchannel.requestMethod == "POST" & url.startsWith("https")) {
                     var channel = gchannel.QueryInterface(Ci.nsIUploadChannel).uploadStream;
                     var prevOffset = channel.QueryInterface(Ci.nsISeekableStream).tell();
                     channel.QueryInterface(Ci.nsISeekableStream).seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
                     var stream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);

                     stream.setInputStream(channel);

                     var postBytes = stream.readByteArray(stream.available());
                     poststr = String.fromCharCode.apply(null, postBytes);

                     if (listen == 1) {
                         if ((poststr.indexOf(dummyUsername) > -1 || poststr.indexOf(dummyUsername_encoded)) && poststr.indexOf(dummyPassword) > -1) {
                             console.log(url)
                             console.log(poststr)
                             console.log("Found dummy strings!")
                             console.log("Replacing dummy strings with real credentials")
                             poststr = replaceAll(poststr, dummyUsername, real_username)
                             poststr = replaceAll(poststr, dummyUsername_encoded, real_username)
                             poststr = replaceAll(poststr, dummyPassword, real_password)
                             var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                             inputStream.setData(poststr, poststr.length);
                             var uploadChannel = gchannel.QueryInterface(Ci.nsIUploadChannel);
                             uploadChannel.setUploadStream(inputStream, "application/x-www-form-urlencoded", -1);
                             uploadChannel.requestMethod = "POST";
                             listen = 0

                         }
                     }
                     channel.QueryInterface(Ci.nsISeekableStream).seek(Ci.nsISeekableStream.NS_SEEK_SET, prevOffset);

                 }
                 var newListener = new TracingListener();
                 aSubject.QueryInterface(Ci.nsITraceableChannel);
                 newListener.originalListener = aSubject.setNewListener(newListener);
             }
         }
     }, "http-on-modify-request", false);
 }();