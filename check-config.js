 CheckConfigNamespace = function() {
     var fs = require('fs');

     if (fs.existsSync('config.json')) {
         console.log("config.json present: Account ready for login");
     } else {
         console.log("config.json not present: Need to set up an account");
     }
 }();
