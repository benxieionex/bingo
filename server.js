import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 儲存目前的號碼狀態
let currentNumbers = [];

io.on("connection", (socket) => {
  console.log("Client connected");

  // 當新客戶端連接時，發送目前的號碼狀態
  socket.emit("init", currentNumbers);

  // 監聽主控端的更新
  socket.on("numbers-updated", (numbers) => {
    console.log("Numbers updated:", numbers);
    currentNumbers = [...numbers]; // 確保深拷貝
    // 廣播給所有客戶端
    io.emit("numbers-updated", currentNumbers);
  });

  // 監聽斷開連接
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// 定期打印當前狀態（用於調試）
setInterval(() => {
  console.log("Current numbers:", currentNumbers);
}, 5000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
