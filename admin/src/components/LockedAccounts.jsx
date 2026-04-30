// admin/src/components/LockedAccounts.jsx
import React, { useState, useEffect } from "react";
import { FiUnlock, FiClock, FiAlertCircle } from "react-icons/fi";
import Swal from "sweetalert2";

const LockedAccounts = ({ onUnlock }) => {
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLockedAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/login/locked-accounts");
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setLockedAccounts(data);
    } catch (err) {
      console.error("Error fetching locked accounts:", err);
      Swal.fire("Error", "Failed to fetch locked accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedAccounts();
    // Refresh list every 30 seconds to get new locked accounts
    const refreshInterval = setInterval(() => {
      fetchLockedAccounts();
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleUnlock = async (email, userName) => {
    const result = await Swal.fire({
      title: "Unlock Account?",
      text: `Are you sure you want to unlock ${userName || email}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, unlock it!"
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch("http://localhost:5000/login/unlock-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        if (!response.ok) throw new Error("Failed to unlock");

        Swal.fire("Unlocked!", "Account has been unlocked successfully.", "success");
        fetchLockedAccounts();
        if (onUnlock) onUnlock();
      } catch (err) {
        console.error("Error unlocking:", err);
        Swal.fire("Error", "Failed to unlock account", "error");
      }
    }
  };

  // Format date to Philippine Time
  const formatPHTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Get live time left (updates every second because currentTime changes)
  const getTimeLeft = (lockedUntil) => {
    const lockEnd = new Date(lockedUntil);
    const diffMs = lockEnd - currentTime;
    
    if (diffMs <= 0) return "Expired";
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ${diffMins}m ${diffSecs}s`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ${diffSecs}s`;
    }
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  // Remove expired accounts from list
  const activeLockedAccounts = lockedAccounts.filter(account => {
    const lockEnd = new Date(account.locked_until);
    return lockEnd > currentTime;
  });

  return (
    <div>
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading locked accounts...</div>
        ) : activeLockedAccounts.length === 0 ? (
          <div className="no-data" style={{ textAlign: "center", padding: "40px" }}>
            <FiAlertCircle size={40} style={{ marginBottom: "10px", color: "#999" }} />
            <p>No locked accounts found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Failed Attempts</th>
                <th>Locked Until (PHT)</th>
                <th>Time Left</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeLockedAccounts.map((account, index) => (
                <tr key={account.id}>
                  <td>{index + 1}</td>
                  <td>{account.user?.first_name || ''} {account.user?.last_name || ''}</td>
                  <td>{account.email}</td>
                  <td>
                    <span className={`role-badge ${account.user?.role}`}>
                      {account.user?.role || "customer"}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: "bold", color: "#e74c3c" }}>{account.attempt_count}</span></td>
                  <td>{formatPHTime(account.locked_until)}</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "monospace", fontWeight: "bold" }}>
                      <FiClock size={14} /> 
                      {getTimeLeft(account.locked_until)}
                    </span>
                   </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => handleUnlock(account.email, account.user?.first_name)}
                      title="Unlock Account"
                      style={{ 
                        background: "#2ecc71", 
                        color: "white", 
                        border: "none", 
                        padding: "6px 12px", 
                        borderRadius: "4px", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "5px" 
                      }}
                    >
                      <FiUnlock /> Unlock
                    </button>
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LockedAccounts;