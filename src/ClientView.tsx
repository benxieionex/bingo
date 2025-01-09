import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

// 確保只創建一個 socket 實例
const socket = io(`http://${window.location.hostname}:3001`, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

function ClientView() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [latestNumber, setLatestNumber] = useState<number | null>(null);
  const [sortByNewest, setSortByNewest] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 連接狀態處理
    socket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    // 接收初始數據
    socket.on("init", (initialNumbers: number[]) => {
      console.log("Received initial numbers:", initialNumbers);
      if (Array.isArray(initialNumbers)) {
        setNumbers(initialNumbers);
        if (initialNumbers.length > 0) {
          setLatestNumber(initialNumbers[initialNumbers.length - 1]);
        }
      }
    });

    // 接收更新
    socket.on("numbers-updated", (updatedNumbers: number[]) => {
      console.log("Received updated numbers:", updatedNumbers);
      if (Array.isArray(updatedNumbers)) {
        setNumbers(updatedNumbers);
        if (updatedNumbers.length > 0) {
          setLatestNumber(updatedNumbers[updatedNumbers.length - 1]);
        }
      }
    });

    // 組件卸載時清理
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("init");
      socket.off("numbers-updated");
    };
  }, []);

  const getSortedNumbers = () => {
    if (sortByNewest) {
      return [...numbers].reverse();
    }
    return [...numbers].sort((a, b) => a - b);
  };

  if (!connected) {
    return (
      <div className="container client-view">
        <div className="connection-status">正在連接伺服器...</div>
      </div>
    );
  }

  return (
    <div className="container client-view">
      <div className="drawn-numbers">
        <div className="drawn-numbers-header">
          <h2>已抽出的號碼 ({numbers.length}/75)</h2>
          <button
            className="sort-toggle"
            onClick={() => setSortByNewest(!sortByNewest)}
            title={sortByNewest ? "切換為數字排序" : "切換為時間排序"}
          >
            {sortByNewest ? "⏱️" : "🔢"}
            {sortByNewest ? " 依抽出時間" : " 依數字大小"}
          </button>
        </div>
        <div className="number-grid">
          {getSortedNumbers().map((number) => (
            <div
              key={number}
              className={`drawn-number ${
                number === latestNumber ? "latest" : ""
              }`}
            >
              {number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ClientView;
