from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
from functools import wraps
import mysql.connector

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'secret123'

# ================= DB CONNECTION =================
def get_db():
    return mysql.connector.connect(
        host="mysql.railway.internal",
        user="root",
        password="krATQmTaBmgVryRcpBbuhSSmNpZcaXyq",
        database="railway",
        port=3306
    )

# ================= TOKEN DECORATOR =================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token missing"}), 401

        try:
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        except Exception:
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated

# ================= LOGIN =================
@app.route("/login", methods=["POST"])
def login():
    data = request.json

    if data["username"] == "admin" and data["password"] == "1234":
        token = jwt.encode({
            "user": data["username"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=5)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"token": token})

    return jsonify({"message": "Invalid credentials"}), 401

# ================= STATS =================
@app.route("/stats", methods=["GET"])
@token_required
def stats():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) as total FROM students")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT class, COUNT(*) as count FROM students GROUP BY class")
    classes = cursor.fetchall()

    conn.close()

    return jsonify({
        "total_students": total,
        "class_data": classes
    })

# ================= GET STUDENTS =================
@app.route("/students", methods=["GET"])
@token_required
def get_students():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM students")
    data = cursor.fetchall()

    conn.close()
    return jsonify(data)

# ================= ADD =================
@app.route("/add", methods=["POST"])
@token_required
def add_student():
    data = request.json

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO students (name, age, class) VALUES (%s,%s,%s)",
        (data["name"], data["age"], data["class"])
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Added"})

# ================= UPDATE =================
@app.route("/update/<int:id>", methods=["PUT"])
@token_required
def update_student(id):
    data = request.json

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE students SET name=%s, age=%s, class=%s WHERE id=%s",
        (data["name"], data["age"], data["class"], id)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Updated"})

# ================= DELETE =================
@app.route("/delete/<int:id>", methods=["DELETE"])
@token_required
def delete_student(id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM students WHERE id=%s", (id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Deleted"})

# ================= MARK ATTENDANCE =================
@app.route("/attendance", methods=["POST"])
@token_required
def mark_attendance():
    data = request.json

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # ❗ Prevent duplicate entry
    cursor.execute(
        "SELECT * FROM attendance WHERE student_id=%s AND date=%s",
        (data["student_id"], data["date"])
    )
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return jsonify({"message": "Already marked"}), 400

    cursor.execute(
        "INSERT INTO attendance (student_id, date, status) VALUES (%s,%s,%s)",
        (data["student_id"], data["date"], data["status"])
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Attendance marked"})

# ================= GET ATTENDANCE =================
@app.route("/attendance/<int:student_id>", methods=["GET"])
@token_required
def get_attendance(student_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM attendance WHERE student_id=%s ORDER BY date DESC",
        (student_id,)
    )

    data = cursor.fetchall()
    conn.close()

    return jsonify(data)

# ================= ATTENDANCE REPORT =================
@app.route("/attendance/report", methods=["GET"])
@token_required
def attendance_report():
    date = request.args.get("date")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT s.id, s.name, s.class, a.status, a.date
        FROM students s
        LEFT JOIN attendance a 
        ON s.id = a.student_id AND a.date = %s
    """, (date,))

    data = cursor.fetchall()
    conn.close()

    return jsonify(data)

# ================= RUN =================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  