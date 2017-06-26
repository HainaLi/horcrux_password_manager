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
        console.log(filename + " present: Account ready for login");
    } else {
        console.log(filename + " not present: Need to set up an account");
    }
}

function encrypt(text, key, iv) {
    var cipher = crypto.createCipheriv('id-aes256-GCM', key, iv);	
    var enc_text = cipher.update(text, 'utf8', 'base64');
    enc_text += cipher.final('base64');
	var tag = cipher.getAuthTag();
    return {
		cipher_text: enc_text,
		tag: tag
	};
}

function decrypt(text, key, iv, tag) {
    var decipher = crypto.createDecipheriv('id-aes256-GCM', key, iv);
	decipher.setAuthTag(tag); 
    var dec_text = decipher.update(text, 'base64', 'utf8');
    dec_text += decipher.final('utf8');
    return dec_text;
}

function decrypt_input(auth){
	var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));
	var encryption_specs = JSON.parse(fs.readFileSync("encryption_specs.json", 'utf8'));
	var pbkdf_salt = new Buffer(encryption_specs["pbkdf_salt"]);
	var config_iv = new Buffer(encryption_specs["config_iv"]);
	const key = getPBKDF2(auth, pbkdf_salt);
	var total_store_count = Object.keys(input).length / 3;
	var counter = 0; 
    for (var i = 1; i <= total_store_count; i++) {
		input['accessKeyId' + i] = decrypt(input['accessKeyId' + i], key, incrementIV(config_iv, 256, 5*counter), new Buffer(encryption_specs["tag_"+'accessKeyId' + i]));
		counter = counter + 1; 
		input['secretAccessKey' + i] = decrypt(input['secretAccessKey' + i], key, incrementIV(config_iv, 256, 5*counter), new Buffer(encryption_specs["tag_"+'secretAccessKey' + i]));
		counter = counter + 1; 
	}
	return {
		input: input, 
		key: key
	}; 
}

function getPBKDF2(master_password, salt) {
    return crypto.pbkdf2Sync(master_password, salt, 100000, 32, 'sha512');
}


/*
	Calculate n table keys from the key and domain_hash
	H_n = SHA256(mp_key||str(n)||domain_hash) mod p
*/
function getTableKeys(key, domain_hash, n, p) {
    var tableKeys = [];
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
    return password;
}

/*
Generates random bytes of string length 
*/
function generateBytes(length) {
	return crypto.randomBytes(length);
}

function incrementIV (buffer, mod, inc_by) {
	var new_buf = new Buffer(buffer);
	var carry_over = 0; 
	var added_inc_by = 0; 
    for (var i = new_buf.length - 1; i >= 0; i--) {
		var cur_buf = new_buf[i];
		if (added_inc_by == 0) {
			cur_buf = cur_buf + inc_by; 
			added_inc_by += 1; 
		}
		else {
			cur_buf = cur_buf + carry_over; 
		}
		new_buf[i] = cur_buf
		if (cur_buf >= mod) {	
					
			carry_over = 1; 
		}
		else {
			break;
		}
	}
	
	return new_buf;
}

/*
Splits val_to_be_split into s shares and s_threshold to reconstruct it
*/
function splitIntoShares(string_to_be_split, s, s_threshold) {
    var shares = secrets.share(secrets.str2hex(string_to_be_split), s, s_threshold);
    return shares;
}

function combineShares(horcruxes) {
    var comb = secrets.combine(horcruxes);
    return comb;
}

function encryptConfigString(configJSON, auth) {
	var pbkdf_salt = generateBytes(32);
    const key = getPBKDF2(auth, pbkdf_salt);
    var input = JSON.parse(configJSON);

    console.log("Super secret auth key is: " + key.toString('hex') + "\n"); 
	var config_iv = generateBytes(12); 
	
	var encryption_specs = {"config_iv": config_iv, "pbkdf_salt": pbkdf_salt};
    // for loop over all credentials
	var counter=0;
    for (var k in input) {
        if (k.indexOf("region") == -1) {
            var enc_result = encrypt(input[k].toString('utf8'), key, incrementIV(config_iv, 256, 5*counter));
			input[k] = enc_result.cipher_text;
			encryption_specs["tag_" + k] = enc_result.tag; 
			counter = counter + 1; 
        }
    }

    fs.writeFile('config.json', JSON.stringify(input), function(err) {
        if (err) return console.log(err);

    });
    fs.writeFile('encryption_specs.json', JSON.stringify(encryption_specs), function(err) {
        if (err) return console.log(err);

    });

    //console.log(JSON.stringify(input));
}

function checkConfigKeys(input, master_password, table_size) {

    //perform a very simple sanity check on the config.json file
    var total_store_count = Object.keys(input).length;
    if (total_store_count % 3 != 0) {
        console.log("Please double check the format of your config file");
    } else {
        var num_successes = 0;
        total_store_count = total_store_count / 3;
        for (var i = 1; i <= total_store_count; i++) {
            aws.config.update({
                'accessKeyId': input['accessKeyId' + i],
                'secretAccessKey': input['secretAccessKey' + i],
                'region': input['region' + i]
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
					
                    if (data["Table"]["ItemCount"] != table_size) { //check that we have the correct number of items in the table
                        setupEmptytables(master_password, input, table_size);                        
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

function pad_with_zeroes_beginning(input, length) {

    var my_string = input;
    while (my_string.length < length) {
        my_string = '0' + my_string;
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
function getEmptyCellValues(s) {
    var zeros_string = pad_with_zeroes_end("0", 88); //this is a hex string, represents 256 0's
    var username_shares = splitIntoShares(zeros_string, s, s);
    var password_shares = splitIntoShares(zeros_string, s, s);
    var username_length_shares = splitIntoShares(pad_with_zeroes_end("0", 2), s, s);
	var username_tag_shares = splitIntoShares(pad_with_zeroes_end("0", 8), s, s); 
    var password_length_shares = splitIntoShares(pad_with_zeroes_end("0", 2), s, s);
	var password_tag_shares = splitIntoShares(pad_with_zeroes_end("0", 8), s, s); 
    var id_tag_shares = splitIntoShares(pad_with_zeroes_end("0", 64), s, s);
	var iv_shares = splitIntoShares(pad_with_zeroes_end("0", 12), s, s);
    return {
        "id_tag_shares": id_tag_shares,
        "username_shares": username_shares,
        "username_length_shares": username_length_shares,
		"username_tag_shares": username_tag_shares,
        "password_shares": password_shares,
        "password_length_shares": password_length_shares, 
		"password_tag_shares": password_tag_shares,
		"iv_shares": iv_shares
    }
}

/*
	Setup empty table with p dummy values
	For this demo, let's set p to a small prime number
*/
function setupEmptytables(auth, input, p) {
    var num_stores = Object.keys(input).length / 3;
    var to_be_saved = {};
    for (var k = 0; k < p; k++) {
        to_be_saved[k.toString()] = getEmptyCellValues(num_stores);
    }
    simpleBatchStore(to_be_saved, auth, input, num_stores);
}

/*
	perform a batch store on the values in to_be_saved
*/
function simpleBatchStore(to_be_saved, auth, input, num_stores) {
    //for each store
    for (var i = 1; i <= num_stores; i++) {
        var accessID = input['accessKeyId' + i];
        var accessKey = input['secretAccessKey' + i];
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
                        "username_tag_share": {
                            S: to_be_saved[key]["username_tag_shares"][i - 1]
                        },
                        "password_share": {
                            S: to_be_saved[key]["password_shares"][i - 1]
                        },
                        "password_length_share": {
                            S: to_be_saved[key]["password_length_shares"][i - 1]
                        },
						"password_tag_share": {
                            S: to_be_saved[key]["password_tag_shares"][i - 1]
                        },
                        "iv_share": {
                            S: to_be_saved[key]["iv_shares"][i - 1]
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
	get items with keys using all the access keys
	if store=1, this function will look for an empty spot to store (till max steps) and then store the specified password
*/
function getItemsAndOrStore(input, auth, keys, table_size, domain, store, max, username, password, to_be_saved) {
    if (max == 0) {
        console.log("Max number of cuckoo collisions reached. The new account will not be stored. Please rehash the table");
    }

    var horcruxes = {};
    var list_of_blank_id_tags = [];
    var list_of_filled_id_tags_value = {};
    var checked_id = 0;
    var valid_count = 0;
    var store_loop_count = 0;
    var printed_no_register = 0;
    var total_store_count = Object.keys(input.input).length / 3;

    for (var i = 1; i <= total_store_count; i++) {
        var accessID = input.input['accessKeyId' + i];
        var accessKey = input.input['secretAccessKey' + i];
        var regionID = input.input['region' + i];

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
				"username_tag_share": [],
                "password_share": [],
                "password_length_share": [],
				"password_tag_share": [],
                "iv_share": []
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
					horcruxes[current_key]["username_tag_share"].push(current_set["username_tag_share"]["S"]);
                    horcruxes[current_key]["password_share"].push(current_set["password_share"]["S"]);
                    horcruxes[current_key]["password_length_share"].push(current_set["password_length_share"]["S"]);
					horcruxes[current_key]["password_tag_share"].push(current_set["password_tag_share"]["S"]);
                    horcruxes[current_key]["iv_share"].push(current_set["iv_share"]["S"]);

                    if (horcruxes[current_key]["id_tag_share"].length == total_store_count) { //finished fetching everything
                        var current_id_tag_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["id_tag_share"]));
                        var username_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["username_share"]));
                        var username_length_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["username_length_share"]));
						var username_tag_fetched = new Buffer(secrets.hex2str(combineShares(horcruxes[current_key]["username_tag_share"])), 'hex');
                        var password_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["password_share"]));
                        var password_length_fetched = secrets.hex2str(combineShares(horcruxes[current_key]["password_length_share"]));
						var password_tag_fetched = new Buffer(secrets.hex2str(combineShares(horcruxes[current_key]["password_tag_share"])), 'hex');
                        var iv_fetched = new Buffer(secrets.hex2str(combineShares(horcruxes[current_key]["iv_share"])), 'hex');
						
                        if (store == 0) { //just retrieve
                            var valid_id_tag = get_valid_id_tag(domain);

                            store_loop_count += 1;
                            if (valid_id_tag == current_id_tag_fetched && printed_no_register == 0) {
                                valid_count += 1;

                                //console.log(secrets.hex2str(username_length_fetched))
                                //console.log(secrets.hex2str(password_length_fetched))
								username_fetched = decrypt(username_fetched, input.key, iv_fetched, username_tag_fetched); 
								password_fetched = decrypt(password_fetched, input.key, incrementIV(iv_fetched, 256, 5), password_tag_fetched);
                                console.log(username_fetched.substring(0, parseInt(username_length_fetched)));
                                console.log(password_fetched.substring(0, parseInt(password_length_fetched)));

                            }
                            if (valid_count == 0 && store_loop_count == keys.length && printed_no_register == 0) {
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
                                    "username_tag_shares": horcruxes[current_key]["username_tag_share"],
									"password_shares": horcruxes[current_key]["password_share"],
                                    "password_length_shares": horcruxes[current_key]["password_length_share"],
                                    "password_tag_shares": horcruxes[current_key]["password_tag_share"],
									"iv_shares": horcruxes[current_key]["iv_share"]
									
                                }
                            }
                            if (checked_id == keys.length) { //when we've checked all the id tags

                                if (username != "" && password != "" && domain != "") { //if we're storing a new value instead of possibly evicting a value
									//generate IV
									var iv = generateBytes(12);
									
									//generate encryption tags for username and password
									var enc_username = encrypt(pad_with_zeroes_end(username.toString('utf8'), 64), input.key, iv);
									var encrypted_username = enc_username.cipher_text;
									var enc_username_tag = enc_username.tag; 
									var enc_password =  encrypt(pad_with_zeroes_end(password.toString('utf8'), 64), input.key, incrementIV(iv, 256, 5));
									var encrypted_password = enc_password.cipher_text;
									var enc_password_tag = enc_password.tag; 

                                    var whole_id_tag = get_valid_id_tag(domain);
                                    var id_tag_shares = splitIntoShares(whole_id_tag.toString(), total_store_count, total_store_count);
									
                                    var username_shares = splitIntoShares(encrypted_username, total_store_count, total_store_count);
                                    var password_shares = splitIntoShares(encrypted_password, total_store_count, total_store_count);
                                    var username_length_shares = splitIntoShares(pad_with_zeroes_beginning(String(username.length), 2), total_store_count, total_store_count);
                                    var password_length_shares = splitIntoShares(pad_with_zeroes_beginning(String(password.length), 2), total_store_count, total_store_count);
									var username_tag_shares = splitIntoShares(enc_username_tag.toString('hex'), total_store_count, total_store_count);
                                    var password_tag_shares = splitIntoShares(enc_password_tag.toString('hex'), total_store_count, total_store_count);
                                    var iv_shares = splitIntoShares(iv.toString("hex"), total_store_count, total_store_count);
                                }

                                if (list_of_blank_id_tags.length > 0) { //theres a spot
                                    //randomly choose a key to store to
                                    //but first check whether the list of filled id tags has the tag we're looking for
                                    var rand_key = -1;
                                    for (table_key in list_of_filled_id_tags_value) {
                                        if (secrets.hex2str(combineShares(list_of_filled_id_tags_value[table_key]["id_tag_shares"])) == get_valid_id_tag(domain)) {
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
											"username_tag_shares": username_tag_shares,
                                            "password_shares": password_shares,
                                            "password_length_shares": password_length_shares,
											"password_tag_shares": password_tag_shares,
                                            "iv_shares": iv_shares
                                        }
                                    } else { //we've found a home for the bumped value YAY! :)
                                        to_be_saved[rand_key] = to_be_saved["unknown"];
                                        delete to_be_saved["unknown"];
                                    }
                                    simpleBatchStore(to_be_saved, auth, input.input, total_store_count);
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
											"username_tag_shares": username_tag_shares,
                                            "password_shares": password_shares,
                                            "password_length_shares": password_length_shares,
											"password_tag_shares": password_tag_shares,
                                            "iv_shares": iv_shares
                                        }
                                    }
                                    to_be_saved["unknown"] = {
                                        "id_tag_shares": list_of_filled_id_tags_value[rand_key_filled]["id_tag_shares"],
                                        "username_shares": list_of_filled_id_tags_value[rand_key_filled]["username_shares"],
                                        "username_length_shares": list_of_filled_id_tags_value[rand_key_filled]["username_length_shares"],
										"username_tag_shares": list_of_filled_id_tags_value[rand_key_filled]["username_tag_shares"],
                                        "password_shares": list_of_filled_id_tags_value[rand_key_filled]["password_shares"],
                                        "password_length_shares": list_of_filled_id_tags_value[rand_key_filled]["password_length_shares"],
										"password_tag_shares": list_of_filled_id_tags_value[rand_key_filled]["password_tag_shares"],
                                        "iv_shares": list_of_filled_id_tags_value[rand_key_filled]["iv_shares"]
                                    }

                                    //}
                                    //calculate new location for the displaced key (using its domain/tag)
                                    var new_locations = getTableKeys(input.key, combineShares(list_of_filled_id_tags_value[rand_key_filled]["id_tag_shares"]), total_store_count, table_size); //change this!

                                    getItemsAndOrStore(input, auth, new_locations, table_size, "", 1, max - 1, "", "", to_be_saved);
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
			"username_tag": String, //this is the enc tag
    		"password": String, 
    		"password_length": String, 
			"password_tag": String, //this is the enc tag
			"iv": String
    	}
    */
    getItemsAndOrStore(input, auth, keys, table_size, domain, store, max_iterations, username, password, to_be_saved)
}



var command = process.argv[2];

if (command == "prepopulate") {
    var authKey = process.argv[3];
    var input = JSON.parse(fs.readFileSync("config.json", 'utf8'));

    setupEmptytables(authKey, input, 11);
}
else if (command == "check-config") {	
	check_config("config.json")
}
else if (command == "encryptConfig") {
	var configJSON = process.argv[3];
    var authKey = process.argv[4];
    encryptConfigString(configJSON, authKey);	
} 
else if (command == "checkConfigKeys") {
    var authKey = process.argv[3];
    var table_size = process.argv[4];
	var decrypted_outputs = decrypt_input(authKey);
    checkConfigKeys(decrypted_outputs.input, authKey, table_size);
}

/*
	node utils.js retrieve authKey domain table_size num_table_keys
	prints "no account registered for if there isn't an account"
	or username and password
*/
else if (command == "retrieve") {
    var authKey = process.argv[3];
    var domain = process.argv[4];
    var table_size = parseInt(process.argv[5]);
	var num_table_keys = parseInt(process.argv[6]);
	var decrypted_outputs = decrypt_input(authKey);

    //calculate table keys
    var total_num_tables = Object.keys(decrypted_outputs).length / 3;
    var domain_hash = get_valid_id_tag(domain);
    var tableKeys = getTableKeys(decrypted_outputs.key, domain_hash, num_table_keys, table_size);
    //obtain all the shares and combine
    getItemsAndOrStore(decrypted_outputs, authKey, tableKeys, table_size, domain, store = 0, max = -1, username = "", password = "", []);
}
/*
	node utils.js store authKey domain username table_size num_table_keys
	prints generated password, error if any
*/
else if (command == "store") { 
    var authKey = process.argv[3];
    var domain = process.argv[4];
    var username = process.argv[5];
	var decrypted_outputs = decrypt_input(authKey);

    var table_size = parseInt(process.argv[6]);
	var num_table_keys = parseInt(process.argv[7]);

    //generate password
    var generatedPassword = "AaBa12#$" + generatePassword(10).toString();
	console.log(generatedPassword);
    //calculte table keys
    var domain_hash = get_valid_id_tag(domain);
    var total_num_tables = Object.keys(decrypted_outputs.input).length / 3;
    var tableKeys = getTableKeys(decrypted_outputs.key, domain_hash, num_table_keys, table_size);
    store(decrypted_outputs, authKey, tableKeys, table_size, domain, 1, 10, username, generatedPassword);


}
