// Require the packages we will use:
let http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
let app = http.createServer(function(req, resp){
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
let io = socketio.listen(app);
let rooms = {'Main Lobby': {'pass': null, 'creator': 'none', 'banList': []}};
let users = {};
let ids = {};

io.sockets.on("connection", function(socket){

	// This callback runs when a new Socket.IO connection is established.
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		console.log("user: "+data["user"]);
		console.log("message: "+data["message"]); // log it to the Node.JS output

		io.sockets.in(socket.room).emit("message_to_client",{user:data["user"], message:data["message"] }) 
	});

	socket.on('login_to_server', function(data) {
		socket.name = data['user'];
		ids[data['user']]= socket.id;
		socket.room = "Main Lobby";
		socket.join(socket.room);
		users[data["user"]] = socket.room;
		console.log("login users: "+ JSON.stringify(users) )

		userlist = [];
		for (user in users){
			userlist.push(user);
		}
		socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
		io.sockets.to(socket.room).emit("users_to_client",{ userlist:userlist, room: socket.room});
		io.sockets.emit("login_to_client",{rooms: rooms, users:users}); 
		
	});

	socket.on('disconnect', function(data) {
		console.log(socket.name)
		socket.leave(socket.room);
		delete users[socket.name];
		userlist = [];
		for (user in users){
			userlist.push(user);
		}
		socket.broadcast.to(socket.room).emit('broadcast', {message: socket.name+" has left the chat."})
		io.sockets.to(socket.room).emit("users_to_client",{ userlist:userlist, room: ""});
	});

	socket.on('add_room_to_server', function(data) {
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
			if (users[user] == socket.room){
				userlist.push(user);
			}
			else{
				olduserlist.push(user);
			}
		}
		socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
		socket.broadcast.to(oldroom).emit('broadcast', {message: data["user"]+" has left the chat."})
		io.sockets.to(socket.room).emit("users_to_client",{ userlist:userlist, room: socket.room}) // broadcast the rooms to all users
		io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})
		io.sockets.emit('update_rooms_to_client',{room:data["room"], password: password})
	});

	socket.on('changeroom_to_server', function(data) {
		if (rooms[data['room']]['pass'] != null){
			if (rooms[data['room']]['banList'].includes(data["user"])){
				socket.emit('banned')
			}
			else{
				if (rooms[data["room"]]["pass"] == data["pass_guess"]){
					console.log("PASS /// " + data['user'] + "changing rooms /// joining: " + data['room'] + " /// leaving: "+socket.room)
					let oldroom = socket.room;
					socket.leave(socket.room);
					socket.join(data['room']);
					socket.room = data['room'];
					socket.emit("update_chat")

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
					socket.broadcast.to(oldroom).emit('broadcast', {message: data["user"]+" has left the chat."})
					io.sockets.to(socket.room).emit("users_to_client",{userlist:userlist, room: socket.room}) 
					io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})
				}
				else if(data["pass_guess"] == ''){
					return;
				}
				else{
					socket.emit('wrong_pass')
					return;
				}
			}
		}
		else{
			if (rooms[data['room']]['banList'].includes(data["user"])){
				socket.emit('banned')
			}
			else{
				console.log(data['user'] + "changing rooms /// joining: " + data['room'] + " /// leaving: "+socket.room)

				let oldroom = socket.room;
				socket.leave(socket.room);
				socket.join(data['room']);
				socket.room = data['room'];

				// if user is not joining the room they are already in, clear the chat log
				if(oldroom != socket.room){
					socket.emit("update_chat")
				}

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
				socket.broadcast.to(oldroom).emit('broadcast', {message: data["user"]+" has left the chat."})
				io.sockets.to(socket.room).emit("users_to_client",{userlist:userlist, room:socket.room}) 
				io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})
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

		socket.broadcast.to(socket.room).emit('broadcast', {message: data["user"]+" has joined the chat."})
		socket_other.broadcast.to(socket_other.room).emit('broadcast', {message: data["other_user"]+" has joined the chat."})

		users[data['user']] = socket.room;
		users[data['other_user']] = socket.room;
		
		socket.emit("update_chat")
		socket_other.emit("update_chat")

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
		io.sockets.to(socket.room).emit("users_to_client",{userlist:null, room:data["user"]+" and " + data["other_user"]}) 
		io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})

	});


	socket.on('kick_to_server', function(data) {
		if (data["user"] == rooms[socket.room]['creator']){
			let oldroom = socket.room;
			
			let socket_kick = io.sockets.sockets[ids[data['other_user']]];	
			socket_kick.leave(socket_kick.room);
			socket_kick.broadcast.to(socket_kick.room).emit('broadcast', {message: data["other_user"]+" has been kicked out of the chat."})
			socket_kick.join('Main Lobby');
			socket_kick.room = 'Main Lobby';
			socket_kick.emit("update_chat")

			users[data['other_user']] = "Main Lobby";
	
			userlist = [];
			olduserlist = [];
			for (user in users){
				if (users[user] == 'Main Lobby'){
					userlist.push(user);
				}
				else if (users[user] == oldroom){
					olduserlist.push(user);
				}
			}
			io.sockets.to('Main Lobby').emit("users_to_client",{userlist:userlist, room: 'Main Lobby'}) 
			io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})
			socket_kick.broadcast.to('Main Lobby').emit('broadcast', {message: data["other_user"]+" has joined the chat."})
		}
		else{
			socket.emit('cannot_kick')
		}
	});

	socket.on('ban_to_server', function(data) {
		if (data["user"] == rooms[socket.room]['creator']){
			rooms[socket.room]['banList'].push(data["other_user"]);
			let oldroom = socket.room;
			
			let socket_kick = io.sockets.sockets[ids[data['other_user']]];
			socket_kick.leave(socket_kick.room);
			socket_kick.broadcast.to(socket_kick.room).emit('broadcast', {message: data["other_user"]+" has been banned from the chat."})
			socket_kick.join('Main Lobby');
			socket_kick.room = 'Main Lobby';
			socket_kick.emit("update_chat")

			users[data['other_user']] = "Main Lobby";
	
			userlist = [];
			olduserlist = [];
			for (user in users){
				if (users[user] == 'Main Lobby'){
					userlist.push(user);
				}
				else if (users[user] == oldroom){
					olduserlist.push(user);
				}
			}
			io.sockets.to('Main Lobby').emit("users_to_client",{userlist:userlist,room: 'Main Lobby'}) 
			io.sockets.to(oldroom).emit("oldroom_users_to_client",{olduserlist:olduserlist})
			socket_kick.broadcast.to('Main Lobby').emit('broadcast', {message: data["other_user"]+" has joined the chat."})
		}
		else{
			socket.emit('cannot_ban')
		}
	});

	socket.on('deleteroom_to_server', function(data) {
		console.log(data["room"])
		console.log(rooms[data["room"]])
		if (data["user"] == rooms[data["room"]]['creator']){
			userlist = [];
			delete rooms[data["room"]];
			for (user in users){
				if (users[user] == data['room']){
					users[user] == "Main Lobby";
					let socket_kick = io.sockets.sockets[ids[user]];			
					socket_kick.leave(data["room"]);
					socket_kick.join("Main Lobby");
					socket_kick.room = "Main Lobby";
					userlist.push(user);
					socket_kick.emit("update_chat");
					socket_kick.broadcast.to('Main Lobby').emit('broadcast', {message: user+" has joined the chat."})
				}
				else if (users[user] == "Main Lobby"){
					userlist.push(user);
				}
			}
			io.sockets.to('Main Lobby').emit("users_to_client",{userlist:userlist,room: 'Main Lobby'}) 
			io.sockets.emit("login_to_client",{rooms: rooms, users:users});
		}
		else{
			socket.emit('cannot_delete')
		}
	});
});