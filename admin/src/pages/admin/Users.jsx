import React, { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiUserPlus, FiUserCheck, FiEye, FiSave, FiX, FiFilter, FiLock, FiUnlock, FiUsers, FiUserCheck as FiActiveUsers, FiUserX, FiMail } from "react-icons/fi";
import AddUser from "../../components/addUser";
import LockedAccounts from "../../components/LockedAccounts";
import Swal from "sweetalert2";
import "../../css/Users.css";
import "../../components/AddUserModal.css";

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditTrails] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userFromRequest, setUserFromRequest] = useState(null);
  const [lockedAccountsCount, setLockedAccountsCount] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');
      
      const transformedUsers = data.map(user => ({
        id: user.id,
        username: user.email?.split('@')[0] || '',
        fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
        email: user.email,
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        joinDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isLocked: !user.is_active
      }));
      
      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to fetch users',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/contact-admin");
      const data = await res.json();
  
      if (!res.ok) throw new Error(data.error);
  
      setRequests(data);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  };

  const fetchLockedAccountsCount = async () => {
    try {
      const response = await fetch("http://localhost:5000/login/locked-accounts");
      const data = await response.json();
      setLockedAccountsCount(data.length);
    } catch (err) {
      console.error("Error fetching locked count:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRequests();
    fetchLockedAccountsCount();
  }, []);

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active' && !user.isLocked).length;
  const lockedAccounts = users.filter(user => user.isLocked || user.status === 'inactive').length;
  const adminUsers = users.filter(user => user.role === 'admin' || user.role === 'super_admin').length;

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.status === 'active' && !user.isLocked) ||
                         (statusFilter === 'locked' && (user.isLocked || user.status === 'inactive'));
    return matchesSearch && matchesRole && matchesStatus;
  });

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getRoleBadgeClass = (role) => {
    const normalizedRole = role?.toLowerCase();
    switch(normalizedRole) {
      case 'admin': return 'role-badge admin';
      case 'seller': return 'role-badge editor';
      case 'super_admin': return 'role-badge admin';
      default: return 'role-badge';
    }
  };

  const getStatusBadgeClass = (status, isLocked) => {
    if (isLocked) return 'status-badge locked';
    return status === 'active' ? 'status-badge active' : 'status-badge inactive';
  };

  const getStatusText = (status, isLocked) => {
    if (isLocked) return 'Locked';
    return status === 'active' ? 'Active' : 'Inactive';
  };

  const handleSaveRole = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole })
      });

      if (!response.ok) throw new Error('Failed to update role');

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: editingRole } : user
      ));
      
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'User role has been updated.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error updating role:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to update user role',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setEditingUserId(null);
      setEditingRole('');
    }
  };

  const handleLockUnlockUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    const action = user.isLocked ? 'unlock' : 'lock';
    
    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${action} this user account?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: user.isLocked ? '#3085d6' : '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, ${action} it!`
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: user.isLocked })
        });
        
        if (!response.ok) throw new Error(`Failed to ${action} user`);

        setUsers(users.map(u => 
          u.id === userId ? { ...u, isLocked: !u.isLocked, status: !u.isLocked ? 'inactive' : 'active' } : u
        ));
        
        Swal.fire({
          icon: 'success',
          title: `${action === 'lock' ? 'Locked' : 'Unlocked'}!`,
          text: `User account has been ${action}ed successfully.`,
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        console.error(`Error ${action}ing user:`, err);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: `Failed to ${action} user account`,
          confirmButtonColor: '#3085d6'
        });
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete user');

        setUsers(users.filter(user => user.id !== userId));
        
        Swal.fire('Deleted!', 'User has been deleted.', 'success');
      } catch (err) {
        console.error('Error deleting user:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to delete user',
          confirmButtonColor: '#3085d6'
        });
      }
    }
  };

  const handleAddUser = () => setShowAddModal(true);
  
  const handleUserAdded = (newUser) => {
    const transformedUser = {
      id: newUser.id,
      username: newUser.email?.split('@')[0] || '',
      fullName: [newUser.first_name, newUser.last_name].filter(Boolean).join(' ') || newUser.email,
      email: newUser.email,
      role: newUser.role,
      status: newUser.is_active ? 'active' : 'inactive',
      joinDate: newUser.created_at ? new Date(newUser.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isLocked: !newUser.is_active
    };
    setUsers([transformedUser, ...users]);
  };

  const getRoleCount = (role) => {
    if (role === 'all') return users.length;
    return users.filter(user => user.role === role).length;
  };

  const StatCard = ({ title, count, icon: Icon, color, bgColor }) => (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-card-icon" style={{ backgroundColor: bgColor, color: color }}>
        <Icon />
      </div>
      <div className="stat-card-content">
        <h3 className="stat-card-title">{title}</h3>
        <p className="stat-card-count">{count}</p>
      </div>
    </div>
  );

  const getFullName = (req) =>
    [req.first_name, req.middle_name, req.last_name]
      .filter(Boolean)
      .join(" ");

  const pendingRequests = requests.filter(
    (req) => req.status === "pending"
  );

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">User Management</h1>
          <p className="breadcrumb">Admin Dashboard / User Management</p>
        </div>
        <button className="add-user-btn" onClick={handleAddUser}>
          <FiUserPlus />
          Add New User
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards-container">
        <StatCard 
          title="Total Users" 
          count={totalUsers} 
          icon={FiUsers}
          color="#4361ee"
          bgColor="#e8ecff"
        />
        <StatCard 
          title="Active Users" 
          count={activeUsers} 
          icon={FiActiveUsers}
          color="#2dc653"
          bgColor="#e6f4ea"
        />
        <StatCard 
          title="Locked Accounts" 
          count={lockedAccounts} 
          icon={FiLock}
          color="#f4a261"
          bgColor="#fff3e0"
        />
        <StatCard 
          title="Administrators" 
          count={adminUsers} 
          icon={FiUserCheck}
          color="#e63946"
          bgColor="#ffe5e5"
        />
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FiUserCheck />
          Users
          <span className="tab-count">{users.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FiEye />
          Audit Trails
          <span className="tab-count">{auditTrails.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <FiMail />
          Requests
          <span className="tab-count">{pendingRequests.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'locked' ? 'active' : ''}`}
          onClick={() => setActiveTab('locked')}
        >
          <FiLock />
          Locked Accounts
          <span className="tab-count">{lockedAccountsCount}</span>
        </button>
      </div>

      {activeTab === 'requests' ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.length > 0 ? (
                  requests.map((req, index) => (
                    <tr key={req.id}>
                      <td>{index + 1}</td>
                      <td>{getFullName(req)}</td>
                      <td>{req.email}</td>
                      <td>{req.message}</td>
                      <td>{req.status}</td>
                      <td>
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="action-btn edit"
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowRequestModal(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'locked' ? (
          <LockedAccounts onUnlock={fetchLockedAccountsCount} />
        ) : activeTab === 'users' ? (
        <>
          <div className="search-filter-container">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by username, full name, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <div className="filter-dropdown">
                <FiFilter className="filter-icon" />
                <select 
                  value={roleFilter} 
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="role-filter-select"
                >
                  <option value="all">All Roles ({getRoleCount('all')})</option>
                  <option value="admin">Admin ({getRoleCount('admin')})</option>
                  <option value="seller">Seller ({getRoleCount('seller')})</option>
                  <option value="super_admin">Super Admin ({getRoleCount('super_admin')})</option>
                </select>
              </div>

              <div className="filter-dropdown">
                <FiLock className="filter-icon" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="status-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="locked">Locked Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading users...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Join Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user, index) => (
                      <tr key={user.id} className={user.isLocked ? 'locked-row' : ''}>
                        <td>{indexOfFirstUser + index + 1}</td>
                        <td className="username-cell">@{user.username}</td>
                        <td>{user.fullName}</td>
                        <td>{user.email}</td>
                        <td>
                          {editingUserId === user.id ? (
                            <select 
                              value={editingRole} 
                              onChange={(e) => setEditingRole(e.target.value)}
                              className="role-dropdown"
                            >
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className={getRoleBadgeClass(user.role)}>
                              {user.role === 'seller' ? 'Seller' : user.role === 'admin' ? 'Admin' : user.role === 'super_admin' ? 'Super Admin' : user.role}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(user.status, user.isLocked)}>
                            {getStatusText(user.status, user.isLocked)}
                          </span>
                        </td>
                        <td>{user.joinDate}</td>
                        <td>
                          <div className="action-buttons">
                            {editingUserId === user.id ? (
                              <>
                                <button className="action-btn save" onClick={() => handleSaveRole(user.id)}>
                                  <FiSave />
                                </button>
                                <button className="action-btn cancel" onClick={() => {
                                  setEditingUserId(null);
                                  setEditingRole('');
                                }}>
                                  <FiX />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className={`action-btn ${user.isLocked ? 'unlock' : 'lock'}`} 
                                  onClick={() => handleLockUnlockUser(user.id)}
                                  title={user.isLocked ? 'Unlock Account' : 'Lock Account'}
                                >
                                  {user.isLocked ? <FiUnlock /> : <FiLock />}
                                </button>
                                <button className="action-btn edit" onClick={() => {
                                  setEditingUserId(user.id);
                                  setEditingRole(user.role);
                                }}>
                                  <FiEdit2 />
                                </button>
                                <button className="action-btn delete" onClick={() => handleDeleteUser(user.id)}>
                                  <FiTrash2 />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="no-data">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">
                ← Previous
              </button>
              <div className="pagination-numbers">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => paginate(pageNum)} className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn">
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="audit-section">
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>No.</th><th>User</th><th>Action</th><th>Details</th><th>Timestamp</th><th>IP Address</th></tr></thead>
              <tbody><tr><td colSpan="6" className="no-data">No audit trails available</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddUser
          onClose={() => {
            setShowAddModal(false);
            setUserFromRequest(null);
          }}
          onUserAdded={handleUserAdded}
          requestData={userFromRequest}
        />
      )}

      {showRequestModal && selectedRequest && (
            <div className="popup-overlay">
              <div className="register-container">
                <div className="register-header">
                  <span className="register-text">Request Details</span>
                  <span
                    className="register-close-btn"
                    onClick={() => setShowRequestModal(false)}
                  >
                    <FiX />
                  </span>
                </div>
                <div className="register-form">
                  <div className="form-row">
                    <div className="input-group">
                      <label>Name</label>
                      <input value={getFullName(selectedRequest)} disabled />
                    </div>
                    <div className="input-group">
                      <label>Email</label>
                      <input value={selectedRequest.email} disabled />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label>Message</label>
                      <textarea
                        value={selectedRequest.message}
                        disabled
                        className="message-box"
                      />
                    </div>
                    <div className="input-group">
                      <label>Status</label>
                      <input value={selectedRequest.status} disabled />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn add"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `http://localhost:5000/api/contact-admin/${selectedRequest.id}/approve`,
                            { method: "PUT" }
                          );
                      
                          if (!res.ok) throw new Error("Failed");
                      
                          Swal.fire({
                            icon: "success",
                            title: "Approved!",
                            text: "Request has been approved",
                            confirmButtonText: "OK"
                          }).then(() => {
                            setShowRequestModal(false);
                            setUserFromRequest(selectedRequest);
                            setShowAddModal(true);
                            fetchRequests();
                          });
                      
                        } catch (err) {
                          Swal.fire("Error", "Failed to approve request", "error");
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn cancel"
                      onClick={() => setShowRequestModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default Users;