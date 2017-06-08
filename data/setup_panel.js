document.getElementById("master_password_submit").addEventListener("click", function() {
	var configJSON = document.getElementById("configJSON_input").value
	document.getElementById("configJSON_input").value = ""
	var master_password = document.getElementById("master_password_input").value
	document.getElementById("master_password_input").value = ""
	self.port.emit('setup_json', {"master_password": master_password, "configJSON":configJSON});
}, false);
