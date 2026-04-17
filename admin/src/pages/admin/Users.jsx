import React, { useState, useEffect } from 'react';
import { FiSearch, FiEdit2, FiTrash2, FiUserPlus, FiUserCheck, FiUserX, FiEye, FiSave, FiX, FiFilter } from 'react-icons/fi';
import '../../css/Users.css';

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'Admin', 'Editor', 'Viewer'
  const [activeTab, setActiveTab] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('');

  // Sample users data
  const [users, setUsers] = useState([
    { id: 1, username: 'john_doe', fullName: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', joinDate: '2024-01-15' },
    { id: 2, username: 'jane_smith', fullName: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'active', joinDate: '2024-01-20' },
    { id: 3, username: 'mike_johnson', fullName: 'Mike Johnson', email: 'mike@example.com', role: 'Viewer', status: 'inactive', joinDate: '2024-01-25' },
    { id: 4, username: 'sarah_wilson', fullName: 'Sarah Wilson', email: 'sarah@example.com', role: 'Editor', status: 'active', joinDate: '2024-02-01' },
    { id: 5, username: 'david_brown', fullName: 'David Brown', email: 'david@example.com', role: 'Viewer', status: 'active', joinDate: '2024-02-05' },
    { id: 6, username: 'emma_davis', fullName: 'Emma Davis', email: 'emma@example.com', role: 'Editor', status: 'inactive', joinDate: '2024-02-10' },
    { id: 7, username: 'chris_martin', fullName: 'Chris Martin', email: 'chris@example.com', role: 'Viewer', status: 'active', joinDate: '2024-02-15' },
    { id: 8, username: 'lisa_anderson', fullName: 'Lisa Anderson', email: 'lisa@example.com', role: 'Admin', status: 'active', joinDate: '2024-02-20' },
  ]);

  // Sample audit trails data
  const [auditTrails, setAuditTrails] = useState([
    { id: 1, user: 'john_doe', action: 'User Login', details: 'Logged in successfully', timestamp: '2024-01-15 09:30:00', ip: '192.168.1.1' },
    { id: 2, user: 'admin', action: 'User Created', details: 'Created new user jane_smith', timestamp: '2024-01-20 14:15:00', ip: '192.168.1.2' },
    { id: 3, user: 'jane_smith', action: 'Profile Updated', details: 'Updated email address', timestamp: '2024-01-22 11:45:00', ip: '192.168.1.3' },
    { id: 4, user: 'admin', action: 'Role Changed', details: 'Changed mike_johnson role to Viewer', timestamp: '2024-01-25 16:20:00', ip: '192.168.1.1' },
    { id: 5, user: 'sarah_wilson', action: 'Password Changed', details: 'Password reset successful', timestamp: '2024-02-01 10:00:00', ip: '192.168.1.4' },
  ]);

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'Admin': return 'role-badge admin';
      case 'Editor': return 'role-badge editor';
      case 'Viewer': return 'role-badge viewer';
      default: return 'role-badge';
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === 'active' ? 'status-badge active' : 'status-badge inactive';
  };

  // Handle edit role
  const handleEditRole = (user) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
  };

  // Handle save role
  const handleSaveRole = (userId) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: editingRole } : user
    ));
    setEditingUserId(null);
    setEditingRole('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  // Handle delete user
  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  // Handle add new user
  const handleAddUser = () => {
    alert('Add new user functionality will be implemented here');
  };

  // Get unique role counts for filter badges
  const getRoleCount = (role) => {
    if (role === 'all') return users.length;
    return users.filter(user => user.role === role).length;
  };

  return (
    <div className="user-management">
      {/* Header with Breadcrumb */}
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

      {/* Tabs */}
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
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Search and Filter Bar */}
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
                <option value="Admin">Admin ({getRoleCount('Admin')})</option>
                <option value="Editor">Editor ({getRoleCount('Editor')})</option>
                <option value="Viewer">Viewer ({getRoleCount('Viewer')})</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-container">
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
                    <tr key={user.id}>
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
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                        )}
                       </td>
                      <td>
                        <span className={getStatusBadgeClass(user.status)}>{user.status}</span>
                       </td>
                      <td>{user.joinDate}</td>
                      <td>
                        <div className="action-buttons">
                          {editingUserId === user.id ? (
                            <>
                              <button 
                                className="action-btn save" 
                                onClick={() => handleSaveRole(user.id)}
                                title="Save"
                              >
                                <FiSave />
                              </button>
                              <button 
                                className="action-btn cancel" 
                                onClick={handleCancelEdit}
                                title="Cancel"
                              >
                                <FiX />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="action-btn edit" 
                                onClick={() => handleEditRole(user)}
                                title="Edit Role"
                              >
                                <FiEdit2 />
                              </button>
                              <button 
                                className="action-btn delete" 
                                onClick={() => handleDeleteUser(user.id)}
                                title="Delete User"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                       </td>
                     </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <div className="pagination-numbers">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="pagination-dots">...</span>
                    <button
                      onClick={() => paginate(totalPages)}
                      className="pagination-number"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button 
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        // Audit Trails Table
        <div className="audit-section">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditTrails.map((audit, index) => (
                  <tr key={audit.id}>
                    <td>{index + 1}</td>
                    <td>@{audit.user}</td>
                    <td><span className="action-badge">{audit.action}</span></td>
                    <td>{audit.details}</td>
                    <td>{audit.timestamp}</td>
                    <td><code className="ip-address">{audit.ip}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;