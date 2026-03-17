import { useState } from "react";
import axios from "axios";

export default function Login({ setToken }) {
  const [form, setForm] = useState({
    username: "",
    password: ""
  });

  const handleLogin = () => {
    axios.post("http://127.0.0.1:5000/login", form)
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