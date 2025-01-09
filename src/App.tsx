import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://ionex.sexyoung.tw", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});

function App() {
  const [numbers, setNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem("drawnNumbers");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [latestNumber, setLatestNumber] = useState<number | null>(null);
  const [sortByNewest, setSortByNewest] = useState(false);
  const [spinDuration, setSpinDuration] = useState(5000);
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    spinSound.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3"
    );
    winSound.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
    );

    spinSound.current.loop = true;

    // 連接時接收伺服器的初始狀態
    socket.on("init", (initialNumbers: number[]) => {
      if (initialNumbers.length > 0) {
        setNumbers(initialNumbers);
        setLatestNumber(initialNumbers[initialNumbers.length - 1]);
      }
    });

    return () => {
      socket.off("init");
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("drawnNumbers", JSON.stringify(numbers));
    // 當號碼更新時，通知所有客戶端
    socket.emit("numbers-updated", numbers);
  }, [numbers]);

  const getRandomNumber = () => {
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (num) => !numbers.includes(num)
    );
    return availableNumbers[
      Math.floor(Math.random() * availableNumbers.length)
    ];
  };

  const playSound = (sound: HTMLAudioElement | null) => {
    if (sound && isSoundEnabled) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const stopSound = (sound: HTMLAudioElement | null) => {
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  };

  const spinNumbers = () => {
    if (isSpinning || numbers.length >= 75) return;

    setIsSpinning(true);
    setIsWinner(false);
    playSound(spinSound.current);

    let duration = 0;
    const spinInterval = 50;
    const totalDuration = spinDuration;

    const interval = setInterval(() => {
      setCurrentNumber(getRandomNumber());
      duration += spinInterval;

      if (duration >= totalDuration) {
        clearInterval(interval);
        setIsSpinning(false);
        stopSound(spinSound.current);

        const finalNumber = getRandomNumber();
        setCurrentNumber(finalNumber);
        if (finalNumber) {
          setNumbers((prev) => [...prev, finalNumber]);
          setLatestNumber(finalNumber);
          setIsWinner(true);
          playSound(winSound.current);

          setTimeout(() => {
            setIsWinner(false);
          }, 500);
        }
      }
    }, spinInterval);
  };

  const removeNumber = (numberToRemove: number) => {
    setNumbers(numbers.filter((num) => num !== numberToRemove));
    if (latestNumber === numberToRemove) {
      setLatestNumber(null);
    }
  };

  const getSortedNumbers = () => {
    if (sortByNewest) {
      return [...numbers].reverse();
    }
    return [...numbers].sort((a, b) => a - b);
  };

  const exportNumbers = () => {
    // 直接使用原始順序，不進行排序
    const content = numbers.join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bingo-numbers-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importNumbers = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // 將文字內容按行分割，過濾空行，轉換為數字
        const importedNumbers = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "")
          .map((line) => parseInt(line, 10))
          .filter((num) => !isNaN(num) && num > 0 && num <= 75);

        if (importedNumbers.length > 0) {
          setNumbers(importedNumbers);
          setLatestNumber(importedNumbers[importedNumbers.length - 1]);
          socket.emit("numbers-updated", importedNumbers);
        } else {
          alert("無效的檔案格式或沒有有效的號碼");
        }
      } catch {
        alert("讀取檔案時發生錯誤");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAllNumbers = () => {
    if (window.confirm("確定要清除所有號碼嗎？此操作無法復原。")) {
      setNumbers([]);
      setLatestNumber(null);
      socket.emit("numbers-updated", []);
    }
  };

  return (
    <div className="container">
      <button
        className="sound-toggle"
        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
        title={isSoundEnabled ? "關閉音效" : "開啟音效"}
      >
        {isSoundEnabled ? "🔊" : "🔈"}
      </button>

      <div className="main-content">
        <div className="lottery-section">
          <div className="display">
            <div
              className={`number ${isSpinning ? "spinning" : ""} ${
                isWinner ? "winner" : ""
              }`}
            >
              {currentNumber || "?"}
            </div>
          </div>

          <div className="control-panel">
            <div className="duration-control">
              <label>轉動時間: {(spinDuration / 1000).toFixed(1)}秒</label>
              <input
                type="range"
                min="500"
                max="10000"
                step="100"
                value={spinDuration}
                onChange={(e) => setSpinDuration(Number(e.target.value))}
                disabled={isSpinning}
              />
            </div>
            <button
              onClick={spinNumbers}
              disabled={isSpinning || numbers.length >= 75}
              className="spin-button"
            >
              {isSpinning ? "抽獎中..." : "抽號碼"}
            </button>
            <div className="import-export-controls">
              <button onClick={exportNumbers} className="export-button">
                匯出號碼 💾
              </button>
              <label
                className="import-button"
                title="請選擇之前匯出的 .txt 檔案"
              >
                匯入號碼 📂
                <input
                  type="file"
                  accept=".txt"
                  onChange={importNumbers}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <button onClick={clearAllNumbers} className="clear-button">
              清除全部 🗑️
            </button>
          </div>
        </div>

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
                onClick={() => removeNumber(number)}
                title="點擊刪除"
              >
                {number}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
