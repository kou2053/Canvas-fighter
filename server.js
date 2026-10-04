const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 静的ファイル（HTML, CSS, JS）を配信する設定
app.use(express.static(path.join(__dirname, '.')));

// プレイヤーが接続したときの処理
io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id);

  // 切断時の処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id);
  });
});

// Render が自動指定するポート番号（process.env.PORT）を使うのがポイントです
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
