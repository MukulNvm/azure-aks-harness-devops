import React, { useEffect, useState } from "react";

const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";

function App() {
  const [users, setUsers] = useState([]);
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const healthResponse = await fetch(`${apiBaseUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error("Backend health check failed.");
        }

        const health = await healthResponse.json();
        setBackendStatus(health.status);

        const usersResponse = await fetch(`${apiBaseUrl}/api/users`);
        if (!usersResponse.ok) {
          throw new Error("Failed to load users.");
        }

        const usersData = await usersResponse.json();
        setUsers(usersData);
      } catch (err) {
        setError(err.message);
      }
    };

    loadData();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>devops-harness-aks</h1>
        <p style={styles.subtitle}>Frontend connected to the backend API through Kubernetes Ingress</p>

        <div style={styles.statusRow}>
          <span style={styles.badgeLabel}>Backend status</span>
          <span style={styles.badge}>{backendStatus}</span>
        </div>

        {error ? <p style={styles.error}>{error}</p> : null}

        <h2 style={styles.sectionTitle}>Users</h2>
        <ul style={styles.list}>
          {users.map((user) => (
            <li key={user.id} style={styles.listItem}>
              <strong>{user.name}</strong>
              <span style={styles.role}>{user.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "32px",
    background: "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)",
    fontFamily: "'Segoe UI', sans-serif"
  },
  card: {
    maxWidth: "760px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
    padding: "32px"
  },
  title: {
    margin: "0 0 8px 0",
    color: "#0f172a"
  },
  subtitle: {
    marginTop: 0,
    color: "#475569"
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "24px 0"
  },
  badgeLabel: {
    fontWeight: 600,
    color: "#0f172a"
  },
  badge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: 700,
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: "#0f172a",
    marginBottom: "16px"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "12px"
  },
  role: {
    color: "#475569"
  },
  error: {
    color: "#b91c1c",
    fontWeight: 600
  }
};

export default App;
