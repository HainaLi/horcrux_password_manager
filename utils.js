var crypto = require('crypto');
var secrets = require('secrets.js');
var fs = require('fs');
var bigInt = require("big-integer");
var generator = require('generate-password');
var aws = require('aws-sdk');

/*
	check the presence of filename
*/
function check_config(filename) {
    if (fs.existsSync(filename)) {
        console.log("config.json present: Account ready for login");
    } else {
        console.log("config.json not present: Need to set up an account");
    }
}

function encrypt(text, key) {
    var cipher = crypto.createCipher('aes-256-ctr', key.toString('hex'));
    var enc_text = cipher.update(text, 'utf8', 'base64');
    enc_text += cipher.final('base64');
    return enc_text;
}

function decrypt(text, key) {
    var decipher = crypto.createDecipher('aes-256-ctr', key.toString('hex'));
    var dec_text = decipher.update(text, 'base64', 'utf8');
    dec_text += decipher.final('utf8');
    return dec_text;
}

function getPBKDF2(master_password) {
    return crypto.pbkdf2Sync(master_password, '0945jv209j252x5', 100000, 512, 'sha512');
}


/*
	Calculate n table keys from the key and domain_hash
	H_n = SHA256(mp_key||str(n)||domain_hash) mod p
*/
function getTableKeys(mp_key, domain_hash, n, p) {
    var tableKeys = [];
    const key = getPBKDF2(mp_key);
    for (var i = 0; i < n; i++) {
        var hash = crypto.createHash('sha256');
        hash.update(key + i + domain_hash.toString());
        var hashVal_mod = bigInt(hash.digest('hex'), 16).mod(p);
        tableKeys.push(hashVal_mod['value']);
    }
    var unique = tableKeys.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    })
    return unique;
}

/*
	Generates a cryptographically strong password of length pw_length
*/
function generatePassword(pw_length) {
    var password = generator.generate({
        length: pw_length,
        numbers: true
    });
    console.log(password);
    //pw = secrets.str2hex(password);
    return password;
}

/*
Splits val_to_be_split into s shares and s_threshold to reconstruct it
*/
function splitIntoShares(string_to_be_split, s, s_threshold, enc_key) {
    var shares = secrets.share(secrets.str2hex(string_to_be_split), s, s_threshold);

    for (var s in shares) {
        s = encrypt(s, enc_key);
    }

    return shares;
}

function combineShares(horcruxes, enc_key) {

    for (var s in horcruxes) {
        s = encrypt(s, enc_key);
    }

    var comb = secrets.combine(horcruxes);
    return comb;
}

function encryptConfigString(configJSON, auth) {
    const key = getPBKDF2(auth);
    var input = JSON.parse(configJSON);

    console.log("Super secret auth key is: " + key.toString('hex') + "\n"); // '3745e48...aa39b34'

    // for loop over all credentials
    for (var k in input) {
        if (k.indexOf("region") == -1) {
            input[k] = encrypt(input[k].toString('utf8'), key);
        }
    }

    fs.writeFile('config.json', JSON.stringify(input), function(err) {
        if (err) return console.log(err);

    });

    //console.log(JSON.stringify(input));
}

function checkConfigKeys(input, master_password, table_size) {
    const key = crypto.pbkdf2Sync(master_password, '0945jv209j252x5', 100000, 512, 'sha512');
    //perform a very simple sanity check on the config.json file
    var total_store_count = Object.keys(input).length;
    if (total_store_count % 3 != 0) {
        console.log("Please double check the format of your config file");
    } else {
        var num_successes = 0;
        total_store_count = total_store_count / 3;
        for (var i = 1; i <= total_store_count; i++) {
            aws.config.update({
                'accessKeyId': decrypt(input['accessKeyId' + (i)], key),
                'secretAccessKey': decrypt(input['secretAccessKey' + (i)], key),
                'region': input['region' + (i)]
            });
            var dynamodb = new aws.DynamoDB();
            var params = {
                TableName: "horcrux-store"
            };

            dynamodb.describeTable(params, function(err, data) {
                if (err) {
                    console.log("Authentication failed"); // an error occurred
                } else {
					num_successes += 1;
                    if (data["Table"]["ItemCount"] != total_store_count) { //check that we have the correct number of items in the table
                        setupEmptytables(master_password, input, table_size);                        
                    }

                    if (num_successes == total_store_count) {
                        console.log(key.toString('hex'));

                    }
                }

            });
        }
    }
}

/*
	construct the valid id tag using the domain_hash
*/
function get_valid_id_tag(domain) {
    var hash = crypto.createHash('sha256');
    hash.update(domain);
    var valid_id_tag = hash.digest('hex');
    return valid_id_tag;
}

function pad_with_zeroes_end(input, length) {

    var my_string = input;
    while (my_string.length < length) {
        my_string = my_string + '0';
    }

    return my_string;

}

/*
	Generate random word of length len
*/
function generateRandomWord(len) {
    var random_word = generator.generate({
        length: parseInt(len),
        numbers: true
    });
    return random_word;
}

/*
	obtain random values for an empty cell and split it into s shares. usernamd and password lengths are set in number of chars
*/
function getEmptyCellValues(enc_key, s) {
    var zeros_string = pad_with_zeroes_end("0", 64); //this is a hex string, represents 256 0's
    var username_shares = splitIntoShares(zeros_string, s, s, enc_key);
    var password_shares = splitIntoShares(zeros_string, s, s, enc_key);
    var username_length_shares = splitIntoShares(zeros_string, s, s, enc_key);
    var password_length_shares = splitIntoShares(zeros_string, s, s, enc_key);
    var id_tag_shares = splitIntoShares(zeros_string, s, s, enc_key);
    return {
        "id_tag_shares": id_tag_shares,
        "username_shares": username_shares,
        "username_length_shares": username_length_shares,
        "password_shares": password_shares,
        "password_length_shares": password_length_shares
    }
}

/*
	Setup empty table with p dummy values
	For this demo, let's set p to a small prime number
*/
function setupEmptytables(auth, input, p) {
    const enc_key = getPBKDF2(auth);
    var num_stores = Object.keys(input).length / 3;
    var to_be_saved = {};
    for (var k = 0; k < p; k++) {
        to_be_saved[k.toString()] = getEmptyCellValues(enc_key, num_stores);
    }
    simpleBatchStore(to_be_saved, auth, input, num_stores);
}

/*
	perform a batch store on the values in to_be_saved
*/
function simpleBatchStore(to_be_saved, auth, input, num_stores) {
    const dec_key = getPBKDF2(auth);

    //for each store
    for (var i = 1; i <= num_stores; i++) {
        var accessID = decrypt(input['accessKeyId' + i], dec_key);
        var accessKey = decrypt(input['secretAccessKey' + i], dec_key);
        var regionID = input['region' + i];

        aws.config.update({
            'accessKeyId': accessID,
            'secretAccessKey': accessKey,
            'region': regionID
        });
        var dynamodb = new aws.DynamoDB();

        var put_requests = [];
        for (var key in to_be_saved) {
            put_requests.push({
                PutRequest: {
                    Item: {
                        "tableKey": {
                            S: key.toString()
                        },
                        "id_tag_share": {
                            S: to_be_saved[key]["id_tag_shares"][i - 1]
                        },
                        "username_share": {
                            S: to_be_saved[key]["username_shares"][i - 1]
                        },
                        "username_length_share": {
                            S: to_be_saved[key]["username_length_shares"][i - 1]
                        },
                        "password_share": {
                            S: to_be_saved[key]["password_shares"][i - 1]
                        },
                        "password_length_share": {
                            S: to_be_saved[key]["password_length_shares"][i - 1]
                        }
                    }
                }
            });
        }

        var params = {
            RequestItems: {
                "horcrux-store": put_requests
            }
        };
        dynamodb.batchWriteItem(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {

            }
        });
    }
}

/*
	put values in table using the i_th access keys
	For testing only - uncomment to use. 
*/
/*
function putValueInTable_Test(input, auth, i, tableKey){
	const key = getPBKDF2(auth);
	var shares = getEmptyCellValues(key, 2); //number of shares doesn't matter in this test case
	var accessID = decrypt(input['accessKeyId' + i], key);
	var accessKey = decrypt(input['secretAccessKey' + i], key);
	var regionID = input['region' + i];

	var config = {
		'accessKeyId': accessID,
		'secretAccessKey': accessKey,
		"region":regionID
	}

	var dynamodb = new aws.DynamoDB(config);

	var params = {
		Key: {
			"tableKey": {
				S: tableKey
			}
		},
		TableName: "horcrux-store",
		AttributeUpdates:{
			"id_tag_share": {
				Action: "PUT", 
				Value: {
					S: shares["id_tag_share"][0]
				}
			},
			"username_share": {
				Action: "PUT", 
				Value: {
					S: shares["username_share"][0]
				}
				
			},
			"username_length_share": {
				Action: "PUT", 
				Value: {
					S: shares["username_length_share"][0]
				}
			},
			"password_share": {
				Action: "PUT", 
				Value: {
					S: shares["password_share"][0]
				}
			},
			"password_length_share": {
				Action: "PUT", 
				Value: {
					S: shares["password_length_share"][0]
				}
			}
		}, 
		ReturnConsumedCapacity: "TOTAL"
	};
	var date1 = new Date(); 
	dynamodb.updateItem(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else {
			var date2 = new Date();
			console.log( date2 - date1);
		}
	});
}
*/

/*
	get items with keys using all the access keys
	if store=1, this function will look for an empty spot to store (till max steps) and then store the specified password
*/
function getItemsAndOrStore(input, auth, keys, table_size, domain, store, max, username, password, to_be_saved) {
    if (max == 0) {
        console.log("Max number of cuckoo collisions reached. The new account will not be stored. Please rehash the table");
    }

    const key = getPBKDF2(auth);


    var horcruxes = {};
    var list_of_blank_id_tags = [];
    var list_of_filled_id_tags_value = {};
    var checked_id = 0;
    var valid_count = 0;
    var store_loop_count = 0;
    var printed_no_register = 0;
    var total_store_count = Object.keys(input).length / 3;

    for (var i = 1; i <= total_store_count; i++) {
        var accessID = decrypt(input['accessKeyId' + i], key);
        var accessKey = decrypt(input['secretAccessKey' + i], key);
        var regionID = input['region' + i];

        var config = {
            'accessKeyId': accessID,
            'secretAccessKey': accessKey,
            'region': regionID
        }

        var dynamodb = new aws.DynamoDB(config);
        var request_keys = [];
        keys.forEach(function(k) {
            //compose request JSON
            request_keys.push({
                "tableKey": {
                    S: k.toString()
                }
            });

            //compose JSON that will store the results
            horcruxes[k.toString()] = {
                "id_tag_share": [],
                "username_share": [],
                "username_length_share": [],
                "password_share": [],
                "password_length_share": []
            };
        });

        var params = {
            RequestItems: {
                "horcrux-store": {
                    Keys: request_keys
                }
            }
        };
        dynamodb.batchGetItem(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                for (var st = 0; st < data['Responses']['horcrux-store'].length; st++) {

                    var current_set = data['Responses']['horcrux-store'][st];
                    var current_key = current_set["tableKey"]["S"];
                    horcruxes[current_key]["id_tag_share"].push(current_set["id_tag_share"]["S"]);
                    horcruxes[current_key]["username_share"].push(current_set["username_share"]["S"]);
                    horcruxes[current_key]["username_length_share"].push(current_set["username_length_share"]["S"]);
                    horcruxes[current_key]["password_share"].push(current_set["password_share"]["S"]);
                    horcruxes[current_key]["password_length_share"].push(current_set["password_length_share"]["S"]);

                    if (horcruxes[current_key]["id_tag_share"].length == total_store_count) { //finished fetching everything
                        var current_id_tag_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["id_tag_share"], key));

                        var username_fetched = combineShares(horcruxes[current_key]["username_share"], key);
                        var username_length_fetched = combineShares(horcruxes[current_key]["username_length_share"], key);
                        var password_fetched = combineShares(horcruxes[current_key]["password_share"], key);
                        var password_length_fetched = combineShares(horcruxes[current_key]["password_length_share"], key);
                        if (store == 0) { //just retrieve
                            var valid_id_tag = get_valid_id_tag(domain);
                            store_loop_count += 1;
                            if (valid_id_tag == current_id_tag_fetched && printed_no_register == 0) {
                                //console.log(valid_id_tag)
                                valid_count += 1;
                                //console.log(secrets.hex2str(username_length_fetched))
                                //console.log(secrets.hex2str(password_length_fetched))
                                console.log(secrets.hex2str(username_fetched).substring(0, parseInt(secrets.hex2str(username_length_fetched))));
                                console.log(secrets.hex2str(password_fetched).substring(0, parseInt(secrets.hex2str(password_length_fetched))));

                            }
                            if (valid_count == 0 && store_loop_count == total_store_count && printed_no_register == 0) {
                                printed_no_register += 1;
                                console.log("No account registered for " + domain);
                            }
                        } else if (store == 1) { //looking for a blank spot to store
                            checked_id += 1;
                            if (current_id_tag_fetched == pad_with_zeroes_end("0", 64)) { //if the id tag is blank
                                list_of_blank_id_tags.push(current_key);
                            } else {
                                list_of_filled_id_tags_value[current_key] = {
                                    "id_tag_shares": horcruxes[current_key]["id_tag_share"],
                                    "username_shares": horcruxes[current_key]["username_share"],
                                    "username_length_shares": horcruxes[current_key]["username_length_share"],
                                    "password_shares": horcruxes[current_key]["password_share"],
                                    "password_length_shares": horcruxes[current_key]["password_length_share"]
                                }
                            }
                            if (checked_id == keys.length) { //when we've checked all the id tags

                                if (username != "" && password != "" && domain != "") { //if we're storing a new value instead of possibly evicting a value

                                    var whole_id_tag = get_valid_id_tag(domain);
                                    var id_tag_shares = splitIntoShares(whole_id_tag, total_store_count, total_store_count, key);
                                    var username_shares = splitIntoShares(pad_with_zeroes_end(username, 64), total_store_count, total_store_count, key);
                                    var password_shares = splitIntoShares(pad_with_zeroes_end(password, 64), total_store_count, total_store_count, key);
                                    var username_length_shares = splitIntoShares(String(username.length), total_store_count, total_store_count, key);
                                    var password_length_shares = splitIntoShares(String(password.length), total_store_count, total_store_count, key);
                                }

                                if (list_of_blank_id_tags.length > 0) { //theres a spot
                                    //randomly choose a key to store to
                                    //but first check whether the list of filled id tags has the tag we're looking for
                                    var rand_key = -1;
                                    for (table_key in list_of_filled_id_tags_value) {
                                        if (secrets.hex2str(combineShares(list_of_filled_id_tags_value[table_key]["id_tag_shares"], key)) == get_valid_id_tag(domain)) {
                                            rand_key = table_key;
                                        }
                                    }

                                    if (rand_key == -1) {
                                        rand_key = list_of_blank_id_tags[Math.floor(Math.random() * list_of_blank_id_tags.length)];
                                    }

                                    if (username != "" && password != "" && domain != "") { //if we're storing a new value instead of just bumping a value
                                        //add this current username/password
                                        to_be_saved[rand_key] = {
                                            "id_tag_shares": id_tag_shares,
                                            "username_shares": username_shares,
                                            "username_length_shares": username_length_shares,
                                            "password_shares": password_shares,
                                            "password_length_shares": password_length_shares
                                        }
                                    } else { //we've found a home for the bumped value YAY! :)
                                        to_be_saved[rand_key] = to_be_saved["unknown"];
                                        delete to_be_saved["unknown"];
                                    }
                                    simpleBatchStore(to_be_saved, auth, input, total_store_count);
                                } else { //there isn't a spot
                                    //randomly pick a key to displace

                                    var list_of_filled_id_tags = Object.keys(list_of_filled_id_tags_value);
                                    var rand_key_filled = list_of_filled_id_tags[Math.floor(Math.random() * list_of_filled_id_tags.length)];

                                    if (username != "" && password != "" && domain != "") { //if we're storing a new value instead of just bumping a value
                                        //save username/pw and key in to_be_saved
                                        to_be_saved[rand_key_filled] = {
                                            "id_tag_shares": id_tag_shares,
                                            "username_shares": username_shares,
                                            "username_length_shares": username_length_shares,
                                            "password_shares": password_shares,
                                            "password_length_shares": password_length_shares
                                        }
                                    }
                                    //else { //need to bump this value; make sure it finds a new home in the next recursive iteration by saving its key as "unknown"
                                    to_be_saved["unknown"] = {
                                        "id_tag_shares": list_of_filled_id_tags_value[rand_key_filled]["id_tag_shares"],
                                        "username_shares": list_of_filled_id_tags_value[rand_key_filled]["username_shares"],
                                        "username_length_shares": list_of_filled_id_tags_value[rand_key_filled]["username_length_shares"],
                                        "password_shares": list_of_filled_id_tags_value[rand_key_filled]["password_shares"],
                                        "password_length_shares": list_of_filled_id_tags_value[rand_key_filled]["password_length_shares"]
                                    }

                                    //}
                                    //calculate new location for the displaced key (using its domain/tag)
                                    var new_locations = getTableKeys(auth, combineShares(list_of_filled_id_tags_value[rand_key_filled]["id_tag_shares"], key), total_store_count, table_size); //change this!

                                    //console.log(new_locations)
                                    getItemsAndOrStore(input, auth, new_locations, table_size, "", 1, max - 1, "", "", to_be_saved);

                                    //if there isn't a spot, repeat recursively till empty spot found or max reached


                                }

                            }
                        }

                    }
                }
            }
        });

    }

}

function store(input, auth, keys, table_size, domain, store, max, username, password) {
    var max_iterations = max;
    var to_be_saved = {};
    /*
    	to_be_saved JSON follows the format
    	key: {
    		"id_tag": String, 
    		"username": String, 
    		"username_length": String, 
    		"password": String, 
    		"password_length": String
    	}
    */
    getItemsAndOrStore(input, auth, keys, table_size, domain, store, max_iterations, username, password, to_be_saved)
}

/*
Test retrieve timing
uncomment to use
*/
/*
function getItems_Test(input, auth, i, keys){
	const key = getPBKDF2(auth);
	
	if (input['cloud' + i] == "AWS") {
		var accessID = decrypt(input['accessKeyId' + i], key);
		var accessKey = decrypt(input['secretAccessKey' + i], key);
		var regionID = input['region' + i];

		var config = {
			'accessKeyId': accessID,
			'secretAccessKey': accessKey,
			'region': regionID
		}
		var dynamodb = new aws.DynamoDB(config);
		
		var request_keys = []; 
		for (k in keys) {
			request_keys.push({
				"tableKey": {
					S: k.toString()
				}
			}); 
		}
		var params = {
			RequestItems: {
				"horcrux-store": {
					Keys: request_keys
				}		
			}
		};
		var date1 = new Date();
		
		dynamodb.batchGetItem(params, function(err, data) {
			if (err) console.log(err, err.stack); // an error occurred
			else {
				var date2 = new Date();
				console.log( date2 - date1);
			}
		});
	}
	else if (input['cloud' + i] == "Azure") {
		console.log("azure")
	}
}
*/

var command = process.argv[2];

/*
	debugging capabilities 
*/
//var configJSON = ;
if (command == "prepopulate") {
    var authKey = process.argv[3];
    var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));

    setupEmptytables(authKey, input, 11);
}
/*
this command needs configJSON, which is a JSON of your keystore access keys
*/
else if (command == "encryptConfig") {
    var authKey = process.argv[3];
    encryptConfigString(configJSON, authKey);
} else if (command == "checkConfigKeys") {
    var authKey = process.argv[3];
    var table_size = process.argv[4];
    var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));

    checkConfigKeys(input, authKey, table_size);
}

/*
	node utils.js retrieve authKey domain table_size
	prints "no account registered for if there isn't an account"
	or username and password
*/
else if (command == "retrieve") {
    //queries the DB 
    var authKey = process.argv[3];
    var domain = process.argv[4];
    var table_size = parseInt(process.argv[5]);
    var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));


    //calculte table keys
    var total_num_tables = Object.keys(input).length / 3;
    var domain_hash = get_valid_id_tag(domain);
    var tableKeys = getTableKeys(authKey, domain_hash, total_num_tables, table_size);
    //obtain all the shares and combine
    getItemsAndOrStore(input, authKey, tableKeys, table_size, domain, store = 0, max = -1, username = "", password = "", []);

    //if no result
    //print no account registered
    //else
    //print username and password
}
/*
	node utils.js store authKey domain username table_size
	prints generated password, error if any
*/
else if (command == "store") {
    var authKey = process.argv[3];
    var domain = process.argv[4];
    var username = process.argv[5];
    var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));

    var table_size = parseInt(process.argv[6]);

    //generate password
    var generatedPassword = generatePassword(10).toString();
    //calculte table keys
    var domain_hash = get_valid_id_tag(domain);
    var total_num_tables = Object.keys(input).length / 3;
    var tableKeys = getTableKeys(authKey, domain_hash, total_num_tables, table_size);
    store(input, authKey, tableKeys, table_size, domain, 1, 10, username, generatedPassword);


}
/*
	Time writing one line to database
	node utils.js timeExperiments authKey store_num<1-3> write_or_read<write||read> repeat_times<integer greater than 0>
	Uncomment to use
*/
/*
else if (command == "timeExperiments") { 	
	var authKey = process.argv[3];
	var store_num = parseInt(process.argv[4]); 
	var write_or_read = process.argv[5];
	var repeat_times = parseInt(process.argv[6]); 
	
	console.log("Store_num: " + store_num);
	
	if (write_or_read == "write") {
		console.log("Write Experiments: ");
		for (var repeat=0; repeat<repeat_times; repeat++) {
	
			putValueInTable_Test(input, auth, store_num, repeat.toString());

		}
	}
	else if (write_or_read == "read") {
		
		console.log("Read Experiments: ");
		for (var repeat=0; repeat<repeat_times; repeat++) {
			getItems_Test(input, authKey, store_num, [0])
		}
		
	}
	
}
*/