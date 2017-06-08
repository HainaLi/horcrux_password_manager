document.getElementById("username_submit").addEventListener("click", function() {
	var username = document.getElementById("username_input").value
	document.getElementById("username_input").value = ""
	self.port.emit('username', username);
}, false);
