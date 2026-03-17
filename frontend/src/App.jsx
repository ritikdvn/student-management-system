import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Login from "./login";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function App() {
  const [students, setStudents] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [attendance, setAttendance] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [todayStatus, setTodayStatus] = useState({});

  const [reportDate, setReportDate] = useState("");
  const [reportData, setReportData] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    courses: {}
  });

  const [toast, setToast] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 5;

  const [form, setForm] = useState({
    name: "",
    age: "",
    class: ""
  });

  const API = import.meta.env.VITE_API_URL;

  const authHeader = {
    headers: { Authorization: token }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  // ================= FETCH STUDENTS =================
  const fetchStudents = () => {
    setLoading(true);

    axios.get(`${API}/students`, authHeader)
      .then(res => {
        setStudents(res.data);
        calculateStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (token) fetchStudents();
  }, [token]);

  // ================= STATS =================
  const calculateStats = (data) => {
    const total = data.length;
    const courses = {};

    data.forEach(s => {
      courses[s.class] = (courses[s.class] || 0) + 1;
    });

    setStats({ total, courses });
  };

  // ================= INPUT =================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // ================= ADD / UPDATE =================
  const handleSubmit = () => {
    if (!form.name || !form.age || !form.class) {
      setError("All fields are required");
      return;
    }

    setError("");

    if (editId) {
      axios.put(`${API}/update/${editId}`, form, authHeader)
        .then(() => {
          fetchStudents();
          setEditId(null);
          setForm({ name: "", age: "", class: "" });
          showToast("Student updated");
        });
    } else {
      axios.post(`${API}/add`, form, authHeader)
        .then(() => {
          fetchStudents();
          setForm({ name: "", age: "", class: "" });
          showToast("Student added");
        });
    }
  };

  // ================= DELETE =================
  const deleteStudent = (id) => {
    if (!window.confirm("Are you sure?")) return;

    axios.delete(`${API}/delete/${id}`, authHeader)
      .then(() => {
        fetchStudents();
        showToast("Deleted");
      });
  };

  // ================= ATTENDANCE =================
  const markAttendance = (id, status) => {
    const today = new Date().toISOString().split("T")[0];

    axios.post(`${API}/attendance`, {
      student_id: id,
      date: today,
      status: status
    }, authHeader)
      .then(() => {
        setTodayStatus(prev => ({
          ...prev,
          [id]: status
        }));
        showToast("Attendance marked");
      })
      .catch(err => {
        showToast(err.response?.data?.message || "Error");
      });
  };

  const fetchAttendance = (id) => {
    axios.get(`${API}/attendance/${id}`, authHeader)
      .then(res => {
        setAttendance(res.data);
        setSelectedStudent(id);
      });
  };

  // ================= REPORT =================
  const fetchReport = () => {
    axios.get(`${API}/attendance/report?date=${reportDate}`, authHeader)
      .then(res => setReportData(res.data));
  };

  const downloadExcel = () => {
    const formattedData = reportData.map(r => ({
      ID: r.id,
      Name: r.name,
      Class: r.class,
      Status: r.status || "Not Marked"
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array"
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream"
    });

    saveAs(file, `Attendance_${reportDate}.xlsx`);
  };

  // ================= SEARCH =================
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ================= PAGINATION =================
  const indexOfLast = currentPage * studentsPerPage;
  const indexOfFirst = indexOfLast - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // ================= LOGIN =================
  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="dashboard">

     <div className="top-bar">
      <button
        className="logout-btn"
        onClick={() => {
          localStorage.removeItem("token");
          setToken(null);
        }}
      >
        Logout
      </button>
    </div>

      <h1>🎓 Student Dashboard</h1>

      {toast && <div className="toast">{toast}</div>}

      {/* STATS */}
      <div className="stats">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{stats.total}</p>
        </div>

        {Object.keys(stats.courses).map(c => (
          <div key={c} className="stat-card">
            <h3>{c}</h3>
            <p>{stats.courses[c]}</p>
          </div>
        ))}
      </div>

      {/* FORM */}
      <div className="card">
        <h2>{editId ? "Update Student" : "Add Student"}</h2>

        {error && <p className="error">{error}</p>}

        <div className="form">
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
          <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
          <input name="class" placeholder="Class" value={form.class} onChange={handleChange} />

          <button className="add-btn" onClick={handleSubmit}>
            {editId ? "Update" : "Add"}
          </button>
        </div>
      </div>

      {/* REPORT */}
      <div className="card">
        <h2>📊 Attendance Report</h2>

        <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        <button className="green-btn" onClick={fetchReport}>
          Get Report
        </button>

        <button className="green-btn" onClick={downloadExcel}>
          Download Excel
        </button>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Class</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {reportData.map((r, i) => (
              <tr key={i}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.class}</td>
                <td>{r.status || "Not Marked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TABLE */}
      <div className="card">

        <input
          type="text"
          placeholder="🔍 Search..."
          className="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Class</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {currentStudents.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.age}</td>
                  <td>{s.class}</td>

                  <td>
                    <div className="action-container">

                      <div className="attendance-box">
                        {!todayStatus[s.id] ? (
                          <>
                            <button className="present-btn" onClick={() => markAttendance(s.id, "Present")}>Present</button>
                            <button className="absent-btn" onClick={() => markAttendance(s.id, "Absent")}>Absent</button>
                          </>
                        ) : (
                          <span className={`badge ${todayStatus[s.id].toLowerCase()}`}>
                            {todayStatus[s.id]}
                          </span>
                        )}
                      </div>

                      <div className="crud-box">
                        <button className="edit-btn" onClick={() => {
                          setForm({
                            name: s.name,
                            age: s.age,
                            class: s.class
                          });
                          setEditId(s.id);
                        }}>
                          Edit
                        </button>

                        <button className="delete-btn" onClick={() => deleteStudent(s.id)}>
                          Delete
                        </button>
                      </div>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination">
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}

export default App;