const express = require('express');
const http = require('http')
const socketio = require('socket.io');
var mysql = require('mysql');
var client = mysql.createConnection({
    host: 'cdb-rthom4by.bj.tencentcdb.com', //数据库的ip地址
    user: 'root',       //自己本地mysql数据库的账号
    password: '123456789jiao',    // 自己本地mysql的密码
    database: 'test',    // database的名字
    port: 10066
});
client.connect();
global.nowUser = null

function addUserContentIntoDatabase(param) {
console.log(param)
    // 插入数据
    try {
        client.query('INSERT INTO feedback(sender,robot_content,content) VALUES(?,?,?)', [param.sender, param.robot_content, param.content], function (err, result) {
            if (err) {
                console.log('err',err)
                return
            }
        })
    }catch(err) {
        console.log(err)
    }

}

const app = express();
const server = http.Server(app);
const websocket = socketio(server);
server.listen(3008, () => console.log('listening on *:3008'));

websocket.on('connection', (socket) => {
    socket.on('userJoined', (userId) => onUserJoined(userId, socket));
    socket.on('message', (message) => onMessageReceived(message, socket));
});

// Event listeners.
// When a user joins the chatroom.
function onUserJoined(userId, socket) {
    global.nowUser = userId
}

// When a user sends a message in the chatroom.
function onMessageReceived(message, senderSocket) {
    global.nowUser = message.user._id
    if (!global.nowUser) return;
    _sendAndSaveMessage(message, senderSocket);
}

// Save the message to the db and send all sockets but the sender.
function _sendAndSaveMessage(message, socket, fromServer) {
    console.log('send', JSON.stringify(message))
    if (!fromServer) {
        global.nowUser = message.user._id
    }
    console.log('nowuser', global.nowUser)
    addUserContentIntoDatabase({
        sender: global.nowUser,
        robot_content: fromServer ? message.text : '',
        content: fromServer ? '' : message.text,
    })
    var emitter = fromServer ? websocket : socket.broadcast;
    message.token = global.nowUser
    emitter.emit('message', [message]);
}

// Allow the server to participate in the chatroom through stdin.
var stdin = process.openStdin();
stdin.addListener('data', function (d) {
    _sendAndSaveMessage({
        text: d.toString().trim(),
        createdAt: new Date(),
        user: {
            _id: 2,
            name: 'React Native',
            avatar: 'https://placeimg.com/140/140/any',
        },
    }, null /* no socket */, true /* send from server */);
});