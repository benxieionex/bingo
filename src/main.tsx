import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import ClientView from "./ClientView.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/control-panel" element={<App />} />
        <Route path="/" element={<ClientView />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
