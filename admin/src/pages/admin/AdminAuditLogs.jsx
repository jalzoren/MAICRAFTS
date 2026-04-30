// AdminAuditLogs.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import '../../css/AdminAuditLogs.css';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get("/api/admin/audit-logs")
      .then((res) => {
        console.log("API RESPONSE:", res.data);
  
        const data =
          Array.isArray(res.data)
            ? res.data
            : res.data.data || res.data.logs || [];
  
        setLogs(data);
      })
      .catch((err) => {
        console.error("Failed to fetch audit logs:", err);
        setLogs([]);
      });
  }, []);

  return (
    <div className="ss-page">
  
      {/* Header */}
      <div className="ss-page-header">
        <h2 className="ss-page-title">Audit Logs</h2>
        <p className="ss-page-breadcrumb">Admin / System / Audit Logs</p>
      </div>
  
      {/* Section Card */}
      <div className="ss-section">
  
        <div className="ss-section-header">
          Audit Trail Records
        </div>
  
        <div className="ss-section-body">
  
          <p className="ss-section-desc">
            This log records all system activities performed by users including authentication, updates, and administrative actions.
          </p>
  
          {/* TABLE WRAPPER */}
          <div className="audit-table-wrapper">
  
            <table className="ss-audit-table">
            <thead>
            <tr>
                <th>User Name</th>
                <th>Role</th>
                <th>Action</th>
                <th>Module</th>
                <th>Description</th>
                <th>Date & Time</th>
            </tr>
            </thead>
  
              <tbody>
                {Array.isArray(logs) && logs.map((log) => (
                  <tr key={log.id}>
                  <td>{log.user_name}</td>
                
                  <td>
                    <span className={`role-badge ${log.user_role?.toLowerCase()}`}>
                      {log.user_role || "USER"}
                    </span>
                  </td>
                
                  <td>
                    <span className={`audit-badge ${log.action?.toLowerCase()}`}>
                      {log.action}
                    </span>
                  </td>
                
                  <td>{log.module}</td>
                  <td>{log.description}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
                ))}
              </tbody>
            </table>
  
          </div>
  
        </div>
      </div>
  
    </div>
  );
};

export default AdminAuditLogs;