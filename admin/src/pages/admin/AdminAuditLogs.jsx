// AdminAuditLogs.jsx
import React, { useEffect, useState } from "react";
import { FiLogIn, FiShield } from "react-icons/fi";
import "../../css/AdminAuditLogs.css";

const API_BASE_URL = "http://localhost:5000";
const AUDIT_LOG_TIME_ZONE = "Asia/Manila";

const isAuthAuditLog = (log) => {
  const action = log?.action?.toLowerCase();
  const moduleName = log?.module?.toLowerCase();

  return moduleName === "authentication" || action === "login" || action === "logout";
};

const padTwoDigits = (value) => String(value).padStart(2, "0");

const formatDateTime = (value) => {
  if (!value) return "-";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: AUDIT_LOG_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(parsedDate).reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

    return result;
  }, {});

  const day = parts.day || "00";
  const month = parts.month || "00";
  const year = parts.year || "0000";
  const hours = parts.hour || "00";
  const minutes = parts.minute || "00";
  const seconds = parts.second || "00";
  const period = parts.dayPeriod ? ` ${parts.dayPeriod.toUpperCase()}` : "";

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}${period}`;
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState("system");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      setError("");
  
      try {
        // fetch BOTH APIs
        const [authResponse, systemResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/audit-logs`),
          fetch(`${API_BASE_URL}/api/admin/system-audit-logs`),
        ]);
  
        if (!authResponse.ok || !systemResponse.ok) {
          throw new Error("Failed to fetch audit logs");
        }
  
        const authPayload = await authResponse.json();
        const systemPayload = await systemResponse.json();
  
        const authData = Array.isArray(authPayload)
          ? authPayload
          : authPayload.data || authPayload.logs || [];
  
        const systemData = Array.isArray(systemPayload)
          ? systemPayload
          : systemPayload.data || systemPayload.logs || [];
  
        // combine both logs
        const combinedLogs = [...systemData, ...authData];
  
        // sort newest first
        combinedLogs.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
  
        setLogs(combinedLogs);
        setTotalCount(systemData.length);
  
      } catch (fetchError) {
        console.error("Failed to fetch audit logs:", fetchError);
  
        setLogs([]);
        setError("Unable to load audit logs right now.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchAuditLogs();
  }, []);

  const systemLogs = logs.filter((log) => !isAuthAuditLog(log));
  const authLogs = logs.filter(isAuthAuditLog);
  const visibleLogs = activeTab === "auth" ? authLogs : systemLogs;
  const emptyMessage =
    activeTab === "auth"
      ? "No login or logout logs found."
      : "No system audit logs found.";

  return (
    <div className="ss-page">
      <div className="ss-page-header">
        <h2 className="ss-page-title">Audit Logs</h2>
        <p className="ss-page-breadcrumb">Admin / System / Audit Logs</p>
      </div>

      <div className="ss-section">
        <div className="ss-section-header">Audit Trail Records</div>

        <div className="ss-section-body">
          <p className="ss-section-desc">
            This log records all system activities performed by users including authentication, updates, and administrative actions.
          </p>

          <div className="audit-summary">
            <div className="audit-summary-card">
              <span>Total Logs</span>
              <strong>{logs.length}</strong>
            </div>
            <div className="audit-summary-card">
              <span>System Actions</span>
              <strong>{systemLogs.length}</strong>
            </div>
            <div className="audit-summary-card">
              <span>Login / Logout</span>
              <strong>{authLogs.length}</strong>
            </div>
          </div>

          <div className="audit-tabs">
            <button
              type="button"
              className={`audit-tab ${activeTab === "system" ? "active" : ""}`}
              onClick={() => setActiveTab("system")}
            >
              <FiShield />
              System Audit
              <span className="audit-tab-count">{totalCount}</span>
            </button>

            <button
              type="button"
              className={`audit-tab ${activeTab === "auth" ? "active" : ""}`}
              onClick={() => setActiveTab("auth")}
            >
              <FiLogIn />
              Login & Logout
              <span className="audit-tab-count">{authLogs.length}</span>
            </button>
          </div>

          {error ? <div className="audit-error">{error}</div> : null}

          <div className="audit-table-wrapper">
            <table className="ss-audit-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Description</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="audit-empty-cell">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : visibleLogs.length > 0 ? (
                  visibleLogs.map((log) => {
                    const actionClass = log?.action?.toLowerCase() || "unknown";
                    const roleClass = log?.user_role?.toLowerCase() || "customer";

                    return (
                      <tr key={log.id || `${log.action}-${log.created_at}-${log.user_name}`}>
                        <td>{log.user_name || "Unknown User"}</td>

                        <td>
                          <span className={`role-badge ${roleClass}`}>
                            {log.user_role || "CUSTOMER"}
                          </span>
                        </td>

                        <td>
                          <span className={`audit-badge ${actionClass}`}>
                            {log.action || "UNKNOWN"}
                          </span>
                        </td>

                        <td>{log.module || "General"}</td>
                        <td>{log.description || "-"}</td>
                        <td>{formatDateTime(log.created_at)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="audit-empty-cell">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;