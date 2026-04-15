import React from "react";

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="cards">
        <div className="card">
          <h2>Users</h2>
          <p>120</p>
        </div>
        <div className="card">
          <h2>Orders</h2>
          <p>80</p>
        </div>
        <div className="card">
          <h2>Products</h2>
          <p>50</p>
        </div>
      </div>

      <div className="table-container">
        <h3>Recent Users</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>John Doe</td>
              <td>john@example.com</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Jane Smith</td>
              <td>jane@example.com</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
