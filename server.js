const app = require('express')();
const http = require('http').createServer(app);
const dotenv = require('dotenv');
dotenv.config();
const io = require('socket.io')(http, {
  cors: {
    origins: [process.env.DOMAIN]
  },
  maxHttpBufferSize: 1e8
});


app.set('port', process.env.PORT_ID);
  
app.get('/', (req, res) => {
  res.send('<h1>Hello WPGuppy Socket.io</h1>');
});

var connectedUsers  = [];

http.listen(app.get('port'), () =>  console.log('server is running on port '+ app.get('port')));

io.on('connection', (socket) => {
  
  // let token = socket.handshake.auth.token;
  //add new user's id to socket.
	socket.on('addUser', (data) => {
    
    let onlineUsers = [];
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(!onlineUsers.includes(item.userId)){
          onlineUsers.push(item.userId);
        }
      });
    }
    let payload = {
      userId          :  data.userId,
      connectedUsers  :  onlineUsers,
    }
    io.emit('userConnected',  payload);
    connectedUsers.push({ userId: data.userId, socket_id: socket.id });
		console.log('connectusers',connectedUsers);
	});
  
  // on disconnection 
  socket.on('disconnect', () => {
    let userId = 0;
    let userData = [];
    if(connectedUsers.length){
      userData = connectedUsers.find((user) => user.socket_id == socket.id);
      if(userData){
        userId = userData.userId;
      }
    }
   
    connectedUsers = connectedUsers.filter(function(user){
      return user.socket_id != socket.id;
    });

    if(connectedUsers.length){
      let index = connectedUsers.findIndex((user) => user.userId == userId);
      if(index == -1 && userData){
        userId = userData.userId;
        io.emit('userOffline', userId);
      }
    }else{
      io.emit('userOffline', userId);
    }
    console.log('user disconnect',connectedUsers);
  });

  //update message to receiver
	socket.on('receiverChatData', (data) => {
    let chatType = data.chatData.chatType;
    if(chatType == 0){
      let receiverId  = data.chatData.chatId;
      receiverId = receiverId.split('_');
      receiverId      = receiverId[1];
      let payload = {
        chatId                : data.messagelistData.chatId,
        chatData              : data.chatData,
        chatType              : data.chatType,
        messagelistData       : data.messagelistData,
      }
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('receiverChatData', payload);
          }
        });
      }
    }else if(chatType == 1 || chatType == 3){
      let receiverId  = data.chatData.chatId.split('_');
      receiverId        = receiverId[0];
      let payload = {
        chatId                : data.messagelistData.chatId,
        chatData              : data.chatData,
        chatType              : data.chatType,
        messagelistData       : data.messagelistData,
      }
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('receiverChatData', payload);
          }
        });
      }
    }else if(chatType == 2) {
      let groupMembers = data.groupMembers;
      if(groupMembers.length){
        let payload = {
          chatId                : data.chatData.chatId,
          chatType              : data.chatType,
          chatData              : data.chatData,
        }
        groupMembers.forEach(memberId => {
          payload.messagelistData = data.messagelistData[memberId];
          let receiverId = memberId;
          if(connectedUsers.length){
            connectedUsers.forEach( item => {
              if(item.userId == receiverId){ 
                io.to(item.socket_id).emit('receiverChatData', payload);
              }
            });
          }
        }); 
      }
    }
	});

  //update message to sender
	socket.on('senderChatData', (senderData) => {
    let payload     = JSON.parse(JSON.stringify(senderData));
    let chatType    = payload.chatData.chatType;
    if(chatType == 0){
      let receiverId    = payload.messagelistData.chatId.split('_');
      receiverId        = receiverId[1];
      let senderId    = payload.chatData.chatId.split('_');
      senderId        = senderId[1];
      payload.messagelistData.isSender        = true; 
      payload.chatData.isSender               = true; 
      payload.messagelistData.UnreadCount     = 0;
      payload.messagelistData.chatId          = payload.chatData.chatId;
      payload.messagelistData.userName        = payload.userName; 
      payload.messagelistData.userAvatar      = payload.userAvatar; 
      payload.messagelistData.postReceiverId  = senderId; 
      
      if(connectedUsers.length){
        let data = {
          chatId            : payload.chatData.chatId,
          chatType          : payload.chatType,
          messagelistData   : payload.messagelistData,
          chatData          : payload.chatData,
        } 
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('senderChatData', data);
          }
        });
      }
    }else if(chatType == 1 || chatType == 3){
      let receiverId    = payload.messagelistData.chatId.split('_');
      receiverId        = receiverId[0];
      payload.messagelistData.isSender        = true; 
      payload.chatData.isSender               = true; 
      payload.messagelistData.UnreadCount     = 0;
      payload.messagelistData.chatId          = payload.chatData.chatId;
      payload.messagelistData.userName        = payload.userName; 
      payload.messagelistData.userAvatar      = payload.userAvatar; 
      payload.messagelistData.muteNotification = payload.muteNotification; 
      if(connectedUsers.length){
        let data = {
          chatId            : payload.chatData.chatId,
          chatType          : payload.chatType,
          messagelistData   : payload.messagelistData,
          chatData          : payload.chatData,
        } 
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('senderChatData', data);
          }
        });
      }
    }else if(chatType == 2){
      if(connectedUsers.length){
        let sender = {};
        sender = payload.messagelistData[senderData.userId];
        if(sender){
          sender.isSender             = true; 
          payload.chatData.isSender   = true; 
          sender.UnreadCount     = 0;
          let data = {
            chatId            : senderData.chatData.chatId,
            chatType          : payload.chatType,
            messagelistData   : sender,
            chatData          : payload.chatData,
          } 
          connectedUsers.forEach( item => {
            if(item.userId == senderData.userId){ 
              io.to(item.socket_id).emit('senderChatData', data);
            }
          });
        }
      }
    }
	});

  //update message status to sender
	socket.on('updateMsgStatus', (data) => {
    let chatType    = data.chatType;
    if(chatType == 0 || chatType == 1 || chatType == 3){
      let receiverId  = data.chatId.split('_');
      if(chatType == 0){
        receiverId        = receiverId[1];
      }else{
        receiverId        = receiverId[0];
      }
      let senderId = data.senderId;
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == senderId){ 
            data.isSender = true;
            io.to(item.socket_id).emit('updateMsgStatus', data);
          }
          if(item.userId == receiverId){
            data.isSender = false;
            io.to(item.socket_id).emit('updateMsgStatus', data);
          }
        });
      }
    }else if(chatType == 2){
      if(connectedUsers.length){
        let payload = {
          chatId 			: data.chatId,
          chatType 		: data.chatType,
          isSender    : true,
        }
        for (let [id, single] of Object.entries(data.messageSenders)) {
          payload.detail = single;
          connectedUsers.forEach( item => {
            if(item.userId == id){ 
              io.to(item.socket_id).emit('updateMsgStatus', payload);
            }
          });
        }
        let receiverId = data.userId;
        payload.isSender = false;
        payload.messageCounter = data.messageCounter;
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('updateMsgStatus', payload);
          }
        });
      }
    }
    
	});

  //delete sender Message
	socket.on('deleteSenderMessage', (data) => {
    if(connectedUsers.length){
      let payload     = JSON.parse(JSON.stringify(data));
      let chatType    = payload.chatType;
      if(chatType == 0 ){
        let chatId  = payload.chatId;
        chatKey = chatId.split('_');
        payload.chatId = chatKey[0]+'_'+payload.receiverId+'_'+chatType;
      }else if(chatType == 1 ){
        payload.chatId = payload.receiverId+'_'+chatType;
      }
      connectedUsers.forEach( item => {
        if(item.userId == data.userId){ 
          io.to(item.socket_id).emit('deleteSenderMessage', payload);
        }
      });
    } 
	});

  //delete receiver Message
	socket.on('deleteReceiverMessage', (data) => {
    let payload     = JSON.parse(JSON.stringify(data));
    let chatType    = payload.chatType;
    if(chatType == 0 ){
      let receiverId      = payload.receiverId;
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
          io.to(item.socket_id).emit('deleteReceiverMessage', payload);
          }
        });
      }
    }else if(chatType == 1){
      let receiverId      = payload.receiverId;
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
          io.to(item.socket_id).emit('deleteReceiverMessage', payload);
          }
        });
      }
    }else if(chatType == 2){
      if(payload.groupMembers.length && connectedUsers.length){
        let sendData = {
          chatId  : payload.chatId,
          chatType,
          messageId : payload.messageId
        }
        payload.groupMembers.forEach( id => {
          connectedUsers.forEach( item => {
            if(item.userId == id){ 
              io.to(item.socket_id).emit('deleteReceiverMessage', sendData);
            }
          });
        });
      }
    }
    
	});

  //is Typing
	socket.on('isTyping', (data) => {
   
    let chatType    = data.chatType;
    if(chatType == 0){
      let receiverId    = data.chatId;
      receiverId = receiverId.split('_');
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId[1]){ 
          io.to(item.socket_id).emit('isTyping', data);
          }
        });
      }
    }else if(chatType == 1 || chatType == 3){
      let receiverId    = data.chatId;
      receiverId = receiverId.split('_');
      receiverId = receiverId[0];
      if(connectedUsers.length){
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
          io.to(item.socket_id).emit('isTyping', data);
          }
        });
      }
    }else if(chatType == 2 && connectedUsers.length && data.groupMembers.length){
      data.groupMembers.forEach( id => {
        connectedUsers.forEach( item => {
          if(item.userId == id){ 
            io.to(item.socket_id).emit('isTyping', data);
          }
        });
      });
    }  
	});

  //update user
	socket.on('updateReceiverUser', (data) => {
    let payload = data.userData;
    let receiverId = 0;
    payload['userName']   = payload.senderUserName;
    payload['userAvatar'] = payload.senderUserAvatar;
    payload['isReceiver'] = true;
    if(payload.chatType == 0){
      let chatId    = payload.chatId;
      chatId        = chatId.split('_');
      receiverId    = chatId[1];
      blockerId     = payload.blockerId;
      payload.chatId = chatId[0]+'_'+blockerId+'_0';
    }else if(payload.chatType == 1){
      let chatId      = payload.chatId;
      chatId          = chatId.split('_');
      receiverId      = chatId[0];
      blockerId       = payload.blockerId;
      payload.chatId  = blockerId+'_1';
    }
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(item.userId == receiverId){ 
         io.to(item.socket_id).emit('updateUser', payload);
        }
      });
    }
	});

	socket.on('updateSenderUser', (data) => {
    let payload = data.userData;
        payload['muteNotification'] = payload.receiverMuteNotification;
        payload['isReceiver']       = false;
    let receiverId    = payload.blockerId;
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(item.userId == receiverId){ 
         io.to(item.socket_id).emit('updateUser', payload);
        }
      });
    }
	});

	socket.on('updateMuteChatNotify', (data) => {
    let receiverId    = data.userId;
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(item.userId == receiverId){ 
         io.to(item.socket_id).emit('updateMuteChatNotify', data);
        }
      });
    }
	});

	socket.on('clearChat', (data) => {
    let receiverId    = data.userId;
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(item.userId == receiverId){ 
         io.to(item.socket_id).emit('clearChat', data);
        }
      });
    }
	});

  // delete group
	socket.on('deleteGroup', (data) => {
    let receiverId    = data.userId;
    if(connectedUsers.length){
      connectedUsers.forEach( item => {
        if(item.userId == receiverId){ 
         io.to(item.socket_id).emit('deleteGroup', data);
        }
      });
    }
	});

  //update message to group receiver
	socket.on('groupChatData', (sendData) => {
    let data     = JSON.parse(JSON.stringify(sendData));
    let groupMembers = data.groupMembers;
    if(groupMembers.length && Object.keys(data.userMessages).length){

      groupMembers.forEach(memberId => {
        
        let payload = {
          chatId                : data.chatData.chatId,
          chatType              : data.chatType,
          chatData              : data.chatData,
        }
        payload.messagelistData = data.messagelistData[memberId];
        let receiverId = memberId;
        if(memberId == data.userId){
          payload.messagelistData.isSender          = true;
          payload.chatData.isSender                 = true;
          payload.messagelistData.userDisableReply  = false;
        }else{
          payload.messagelistData.isSender  = false;
          payload.chatData.isSender         = false;
        }
        if(connectedUsers.length){
          connectedUsers.forEach( item => {
            if(item.userId == receiverId){ 
              let userMessages = data.userMessages[memberId];
              userMessages.forEach( single => {
                let message = {};
                if(single.type == 1 || single.type == 6){
                  message.type = single.type;
                  payload.chatData.message = message;
                  payload.messagelistData.message = message;
                }else{
                  message.type = single.type;
                  message.memberIds = single.memberIds;
                  
                  payload.messagelistData.membersUpdate   = single.membersUpdate;
                  payload.messagelistData.message = message;
                  payload.chatData.message = message;
                  payload.chatData.membersUpdate    = single.membersUpdate;
                  
                  if(single.type == 3 && single.memberIds.includes(memberId)){
                    delete payload.chatData;
                  }
                }
                io.to(item.socket_id).emit('groupChatData', payload);
              });
            }
          });
        }
      }); 
    }
	});

  //update message to group receiver
	socket.on('leaveGuppyGroup', (sendData) => {
    let data     = JSON.parse(JSON.stringify(sendData));
    let groupMembers = data.groupMembers;
    if(groupMembers.length && Object.keys(data.userMessages).length){

      groupMembers.forEach(memberId => {
        
        let payload = {
          chatId                : data.chatData.chatId,
          chatType              : data.chatType,
          chatData              : data.chatData,
        }
        payload.messagelistData = data.messagelistData[memberId];
        let receiverId = memberId;
        if(memberId == data.userId){
          payload.messagelistData.isSender = true;
          payload.chatData.isSender       = true;
        }else{
          payload.messagelistData.isSender = false;
          payload.chatData.isSender       = false;
        }
        if(connectedUsers.length){
          connectedUsers.forEach( item => {
            if(item.userId == receiverId){ 
              let userMessages = data.userMessages[memberId];
              userMessages.forEach( single => {
                let message = {};
                message.type = single.type;
                message.memberIds = single.memberIds;
                payload.messagelistData.membersUpdate   = single.membersUpdate;
                payload.messagelistData.message = message;
                if(single.type == 4 && single.memberIds.includes(memberId)){
                  delete payload.chatData;
                }else{
                  payload.chatData = data.chatData;
                  if(memberId == data.userId){
                    payload.chatData.isSender       = true;
                  }else{
                    payload.chatData.isSender       = false;
                  }
                  payload.chatData.message = message;
                  payload.chatData.membersUpdate    = single.membersUpdate;
                }
                io.to(item.socket_id).emit('leaveGuppyGroup', payload);
              });
            }
          });
        }
      }); 
    }
	});

  // update online status to all friends
  socket.on('updateOnlineStatus', (data) => {
    if(data.userFriendList){
      for (let [id, single] of Object.entries(data.userFriendList)) {
        let receiverId = id.split('_')[0];
        connectedUsers.forEach( item => {
          if(item.userId == receiverId){ 
            io.to(item.socket_id).emit('updateOnlineStatus', single);
          }
        });
      }
    }
    if(data.onlineFriendslist){
      connectedUsers.forEach( item => {
        if(item.userId == data.userId){ 
          io.to(item.socket_id).emit('updateUserOnlineFriends', data.onlineFriendslist);
        }
      });
    }
	});

});