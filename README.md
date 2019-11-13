# CSE330
455539
458011

Link to Multi-Room Chat Server: http://ec2-18-221-130-56.us-east-2.compute.amazonaws.com:3456/~jenniferlu/module6/client.html

Creative Portion:

1. Timestamp: When a message is sent, the date and time of when the message was sent is also emitted using socket.uo and displayed in the chat log for all users to see in the bottom right corner of the user's message box.
2. Delete a room: We added the feature of deleting a room. In order to delete the room, the user must be the creator of that room. All users currently in that room are then moved back to the main lobby and the room is removed from the chat room list.  If any user who is not the creator attempts to delete the room, the user will be alerted with a message saying they do not have the ability to do that.
3. Broadcast messages: When a user joins or leaves a room, a broadcast message is sent to all other users that that user has entered/left the room they are in.  This functionality works when joining or leaving different chat rooms, as well as broadcasts to users if the user has been kicked or banned from the given chat room.
