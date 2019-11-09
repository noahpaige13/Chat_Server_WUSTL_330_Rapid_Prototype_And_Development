// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
	
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);
var rooms = ['main'];
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	socket.join(rooms[0]);
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		console.log("user: "+data["user"]);
		console.log("message: "+data["message"]); // log it to the Node.JS output
		
		socket.room = data["room"];
		// console.log(socket.room)
		io.sockets.in(socket.room).emit("message_to_client",{user:data["user"], message:data["message"] }) // broadcast the message to other users
		
	});

	socket.on('room_to_server', function(data) {
		socket.leave(socket.room);
		socket.join(data['room']);
		// console.log("Room: "+data["room"]);
		rooms.push(data["room"]);
		socket.room = data['room'];
		
		io.sockets.emit("room_to_client",{room:data["room"]}) // broadcast the rooms to all users
	});

	socket.on('changeroom_to_server', function(data) {
		socket.leave(socket.room);
		socket.join(data['room']);
		// console.log("Room: "+data["room"]);
		socket.room = data['room'];

		io.sockets.emit("changeroom_to_client",{room:data["room"]}) // broadcast the rooms to all users
	});
});