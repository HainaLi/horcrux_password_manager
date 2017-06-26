 EncrypterNamespace = function() {
     var crypto = require('crypto');

     function encrypt(text, key) {
         var cipher = crypto.createCipher('aes-256-ctr', key.toString('hex'))
         var enc_text = cipher.update(text, 'utf8', 'base64')
         enc_text += cipher.final('base64');
         return enc_text;
     }

     function decrypt(text, key) {
         var decipher = crypto.createDecipher('aes-256-ctr', key.toString('hex'))
         var dec_text = decipher.update(text, 'base64', 'utf8')
         dec_text += decipher.final('utf8');
         return dec_text;
     }

     var configJSON = JSON.parse(process.argv[2]);
     var auth = process.argv[3];

     // unique salt?
     const key = crypto.pbkdf2Sync(auth, '0945jv209j252x5', 100000, 512, 'sha512');

     console.log("Super secret auth key is: " + key.toString('hex') + "\n"); // '3745e48...aa39b34'
     var fs = require('fs');
     // for loop over all credentials, or, perhaps this is given already as stdin since this is the first time
     for (var k in input) {
         if (!k.includes("region")) {
             configJSON[k] = encrypt(configJSON[k].toString('utf8'), key);
         }
     }

     fs.writeFile('config.json', JSON.stringify(configJSON), function(err) {
         if (err) return console.log(err);

     });

     console.log(JSON.stringify(configJSON));
 }();
