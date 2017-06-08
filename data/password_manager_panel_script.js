document.getElementById("master_password_submit").addEventListener("click", function() {
	var master_password = document.getElementById("master_password_input").value
	document.getElementById("master_password_input").value = ""
	self.port.emit('master_password', {"master_password": master_password});
}, false);
