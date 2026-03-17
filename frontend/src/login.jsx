import { useState } from "react";
import axios from "axios";

export default function Login({ setToken }) {
  const [form, setForm] = useState({
    username: "",
    password: ""
  });
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogin = () => {
    axios.post(`${API_URL}/login`, form)
      .then(res => {
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
      })
      .catch(() => alert("Invalid credentials"));
  };

  return (
    <div className="dashboard">
      <div className="card">
        <h2>🔐 Login</h2>

        <input
          placeholder="Username"
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button className="add-btn" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}