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
let rooms = {'main': {'pass': null, 'creator': null, 'banList': []}};
let users = {};
let ids = {};

io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	
	

	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		console.log("user: "+data["user"]);
		console.log("message: "+data["message"]); // log it to the Node.JS output
		
		// socket.room = data["room"];
		// console.log(socket.room)
		io.sockets.in(socket.room).emit("message_to_client",{user:data["user"], message:data["message"] }) // broadcast the message to other users
		
	});

	socket.on('login_to_server', function(data) {
		ids[data['user']]= socket.id;
		socket.room = "main";
		socket.join(socket.room);
		// users.push([data["user"], socket.room]);
		users[data["user"]] = socket.room;
		console.log(socket.room);
		userlist = [];
		for (user in users){
			userlist.push(user);
		}
		socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
		io.sockets.to(socket.room).emit("room_to_client",{ userlist:userlist, room: socket.room});
		io.sockets.emit("login_to_client",{rooms: rooms, users:users}); // broadcast the message to other users
		
	});

	socket.on('logout_to_server', function(data) {
		socket.leave(socket.room);
		// users.push([data["user"], socket.room]);
		delete users[data["user"]];
		userlist = [];
		for (user in users){
			userlist.push(user);
		}
		// socket.disconnect();
		io.sockets.to(socket.room).emit("room_to_client",{ userlist:userlist, room: ""});
		
	});

	socket.on('room_to_server', function(data) {
		let password = false;
		let oldroom = socket.room;

		socket.leave(socket.room);
		socket.join(data['room']);
		if (data["pass"] != ""){
			rooms[data['room']] = {}
			rooms[data['room']]['pass'] = data["pass"];
			rooms[data['room']]['creator'] = data["user"];
			rooms[data['room']]['banList'] = [];
			password = true;
			console.log("pass");
		}
		else{
			rooms[data['room']] = {}
			rooms[data['room']]['pass'] = null;
			rooms[data['room']]['creator'] = data["user"];
			rooms[data['room']]['banList'] = [];
		}
		socket.room = data['room'];
		users[data['user']] = socket.room;
		userlist = [];
		olduserlist = [];
		for (user in users){
			console.log(user);
			if (users[user] == socket.room){
				userlist.push(user);
			}
			else{
				olduserlist.push(user);
			}
		}
		socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})

		io.sockets.to(socket.room).emit("room_to_client",{ userlist:userlist, room: socket.room}) // broadcast the rooms to all users
		io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})
		io.sockets.emit('everyone_to_client',{room:data["room"], password: password})
	});

	socket.on('changeroom_to_server', function(data) {
		if (data["pass_guess"]!= null){
			if (rooms[data['room']]['banList'].includes(data["user"])){
				console.log("BANNED");
				return;
			}
			else{
				if (rooms[data["room"]] == data["pass_guess"]){
					let oldroom = socket.room;
					socket.leave(socket.room);
					socket.join(data['room']);
					socket.room = data['room'];
	
					console.log(data['user'])
	
					users[data['user']] = socket.room;
	
					userlist = [];
					olduserlist = [];
					for (user in users){
						if (users[user] == socket.room){
							userlist.push(user);
						}
						else if (users[user] == oldroom){
							olduserlist.push(user);
						}
					}
					socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
					io.sockets.to(socket.room).emit("room_to_client",{userlist:userlist, room: socket.room}) 
					io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})
				}
				else{
				}
			}
		}
		else{
			if (rooms[data['room']]['banList'].includes(data["user"])){
				console.log("BANNED");
				return;
			}
			else{
				let oldroom = socket.room;
				socket.leave(socket.room);
				socket.join(data['room']);
				socket.room = data['room'];

				console.log(data['user'])

				users[data['user']] = socket.room;

				userlist = [];
				olduserlist = [];
				for (user in users){
					if (users[user] == socket.room){
						userlist.push(user);
					}
					else if (users[user] == oldroom){
						olduserlist.push(user);
					}
				}
				socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
				io.sockets.to(socket.room).emit("room_to_client",{userlist:userlist, room:socket.room}) 
				io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})
			}
		}
	});
	socket.on('private_chat_to_server', function(data) {
		let socket_other = io.sockets.sockets[ids[data['other_user']]];
		let oldroom = socket.room;
		socket.leave(oldroom);
		socket_other.leave(oldroom);

		socket.room = socket.id + ids[data['other_user']];
		socket.join(socket.room);
		socket_other.join(socket.room);
		socket_other.room = socket.room;

		users[data['user']] = socket.room;
		users[data['other_user']] = socket.room;

		console.log(users[data['user']] +" and " + users[data['other_user']]);
		console.log(oldroom)

		userlist = [];
		olduserlist = [];
		for (user in users){
			if (users[user] == socket.room){
				userlist.push(user);
			}
			else if (users[user] == oldroom){
				olduserlist.push(user);
			}
		}
		io.sockets.to(socket.room).emit("kick_to_client",{userlist:userlist, room:socket.room}) 
		io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})

	});


	socket.on('kick_to_server', function(data) {
		if (data["user"] == rooms[socket.room]['creator']){
			let oldroom = socket.room;
			console.log(ids);
			console.log(data['other_user']);
			console.log(ids[data['other_user']])
			
			var socket_kick = io.sockets.sockets[ids[data['other_user']]];
			console.log("getting kicked from :" + socket_kick.room);
	
			socket_kick.leave(socket_kick.room,function(err){
				console.log("err:" + err);
			});
	
			
			socket_kick.join('main');
			socket_kick.room = 'main';
	
			users[data['other_user']] = "main";
			console.log("NOT MAIN:" + socket.room)
	
			userlist = [];
			olduserlist = [];
			for (user in users){
				if (users[user] == 'main'){
					userlist.push(user);
				}
				else if (users[user] == oldroom){
					olduserlist.push(user);
				}
			}
	
			io.sockets.to('main').emit("kick_to_client",{userlist:userlist, room: 'main'}) 
			io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})
		}
		else{
			// window.alert("Cannot kick another user out!");
		}

	});


	socket.on('ban_to_server', function(data) {
		if (data["user"] == rooms[socket.room]['creator']){
			rooms[socket.room]['banList'].push(data["other_user"]);
			console.log(rooms)
			let oldroom = socket.room;
			
			var socket_kick = io.sockets.sockets[ids[data['other_user']]];
			socket_kick.leave(socket_kick.room);
			socket_kick.join('main');
			socket_kick.room = 'main';
	
			users[data['other_user']] = "main";
	
			userlist = [];
			olduserlist = [];
			for (user in users){
				if (users[user] == 'main'){
					userlist.push(user);
				}
				else if (users[user] == oldroom){
					olduserlist.push(user);
				}
			}
			
			
			io.sockets.to('main').emit("kick_to_client",{userlist:userlist,room: 'main'}) 
			io.sockets.to(oldroom).emit("room1_to_client",{olduserlist:olduserlist})
		}
		else{
			// window.alert("Cannot ban another user out!");
		}

	});
	socket.on('deleteroom_to_server', function(data) {
		if (data["user"] == rooms[socket.room]['creator']){
			userlist = [];
			delete rooms[data["room"]];
			for (user in users){
				if (users[user] == data['room']){
					users[user] == "main";
					var socket_kick = io.sockets.sockets[ids[user]];			
					socket_kick.leave(data["room"]);
					socket_kick.join("main");
					socket_kick.room = "main";
					userlist.push(user);
				}
				else if (users[user] == "main"){
					userlist.push(user);
				}
			}
			io.sockets.to('main').emit("kick_to_client",{userlist:userlist,room: 'main'}) 
			io.sockets.emit("login_to_client",{rooms: rooms, users:users}); // broadcast the message to other users
		}
		else{
			// window.alert("Cannot ban another user out!");
		}

	});
});