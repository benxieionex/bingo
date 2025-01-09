import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

// 確保只創建一個 socket 實例
const socket = io("https://ionex.sexyoung.tw", {
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
  const prevNumbersRef = useRef<number[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(() => {
    const saved = localStorage.getItem("markedNumbers");
    return new Set(saved ? JSON.parse(saved) : []);
  });

  useEffect(() => {
    // 保存標記的數字到 localStorage
    localStorage.setItem(
      "markedNumbers",
      JSON.stringify(Array.from(markedNumbers))
    );
  }, [markedNumbers]);

  const updateNumbers = useCallback((newNumbers: number[]) => {
    if (Array.isArray(newNumbers)) {
      setNumbers(newNumbers);
      if (newNumbers.length > prevNumbersRef.current.length) {
        // 有新號碼出現
        const newNumber = newNumbers[newNumbers.length - 1];
        setLatestNumber(newNumber);
        // 播放音效或其他效果可以在這裡添加
      }
      prevNumbersRef.current = newNumbers;
    }
  }, []);

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
      updateNumbers(initialNumbers);
    });

    // 接收更新
    socket.on("numbers-updated", (updatedNumbers: number[]) => {
      console.log("Received updated numbers:", updatedNumbers);
      updateNumbers(updatedNumbers);
    });

    // 組件卸載時清理
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("init");
      socket.off("numbers-updated");
    };
  }, [updateNumbers]);

  const getSortedNumbers = () => {
    if (sortByNewest) {
      return [...numbers].reverse();
    }
    return [...numbers].sort((a, b) => a - b);
  };

  const toggleMark = (number: number) => {
    setMarkedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(number)) {
        newSet.delete(number);
      } else {
        newSet.add(number);
      }
      return newSet;
    });
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
              } ${markedNumbers.has(number) ? "marked" : ""}`}
              onClick={() => toggleMark(number)}
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
