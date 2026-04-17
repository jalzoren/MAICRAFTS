import React from "react";
import "../../css/OrderManagement.css";

// Icons as inline SVGs
const ShoppingBagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const HourglassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22" />
    <path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Stat Card Component
const StatCard = ({ label, value, icon, iconClass }) => (
  <div className="stat-card">
    <div className="stat-card__content">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value.toLocaleString()}</span>
    </div>
    <div className={`stat-card__icon ${iconClass}`}>
      {icon}
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => (
  <span className={`status-badge status-badge--${status.toLowerCase()}`}>
    {status}
  </span>
);

// Payment Status Component
const PaymentStatus = ({ status }) => (
  <span className={`payment-status payment-status--${status.toLowerCase()}`}>
    <span className="payment-status__dot" />
    {status}
  </span>
);

// Sample data
const orders = [
  {
    id: "#ORD-2485",
    customerName: "Jerimiah Bitancor",
    date: "Oct 24, 2023",
    items: "2 Items",
    totalAmount: "₱145.00",
    status: "Pending",
    payment: "Paid",
  },
  {
    id: "#ORD-2484",
    customerName: "Bianca Rain Castillon",
    date: "Oct 23, 2023",
    items: "1 Item",
    totalAmount: "₱85.50",
    status: "Preparing",
    payment: "Paid",
  },
  {
    id: "#ORD-2483",
    customerName: "Laurence Flavier",
    date: "Oct 22, 2023",
    items: "4 Items",
    totalAmount: "₱100.20",
    status: "Completed",
    payment: "Paid",
  },
  {
    id: "#ORD-2482",
    customerName: "Lyn Czyla Alpuerto",
    date: "Oct 21, 2023",
    items: "1 Item",
    totalAmount: "₱45.00",
    status: "Cancelled",
    payment: "Refunded",
  },
  {
    id: "#ORD-2481",
    customerName: "Neil Adrian Onrubia",
    date: "Oct 21, 2023",
    items: "3 Items",
    totalAmount: "₱210.00",
    status: "Shipped",
    payment: "Paid",
  },
];

const OrderManagement = () => {
  return (
    <div className="order-management">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-header__title">Order Management</h1>
        <p className="page-header__breadcrumb">Seller Dashboard / Order Management</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard
          label="TOTAL ORDERS"
          value={1248}
          icon={<ShoppingBagIcon />}
          iconClass="stat-card__icon--blue"
        />
        <StatCard
          label="PENDING"
          value={45}
          icon={<HourglassIcon />}
          iconClass="stat-card__icon--yellow"
        />
        <StatCard
          label="PREPARING"
          value={18}
          icon={<BriefcaseIcon />}
          iconClass="stat-card__icon--purple"
        />
        <StatCard
          label="SHIPPED"
          value={32}
          icon={<TruckIcon />}
          iconClass="stat-card__icon--orange"
        />
        <StatCard
          label="COMPLETED"
          value={1185}
          icon={<CheckCircleIcon />}
          iconClass="stat-card__icon--green"
        />
        <StatCard
          label="CANCELLED"
          value={1}
          icon={<XCircleIcon />}
          iconClass="stat-card__icon--red"
        />
      </div>

      {/* Filters & Search */}
      <div className="filters-bar">
        <div className="filters-bar__dropdowns">
          <button className="dropdown-btn">
            Payment Status
            <span className="dropdown-btn__icon"><ChevronDownIcon /></span>
          </button>
          <button className="dropdown-btn">
            Order Status
            <span className="dropdown-btn__icon"><ChevronDownIcon /></span>
          </button>
        </div>
        <div className="search-box">
          <span className="search-box__icon"><SearchIcon /></span>
          <input
            type="text"
            className="search-box__input"
            placeholder="Search by Order ID, Customer Name..."
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>ORDER NO.</th>
              <th>CUSTOMER NAME</th>
              <th>DATE</th>
              <th>ITEMS</th>
              <th>TOTAL AMOUNT</th>
              <th>STATUS</th>
              <th>PAYMENT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="order-id">{order.id}</td>
                <td className="customer-name">{order.customerName}</td>
                <td className="order-date">{order.date}</td>
                <td className="order-items">{order.items}</td>
                <td className="order-amount">{order.totalAmount}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td>
                  <PaymentStatus status={order.payment} />
                </td>
                <td>
                  <button className="view-details-btn">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button className="pagination__btn pagination__btn--nav">Previous</button>
        <button className="pagination__btn pagination__btn--active">1</button>
        <button className="pagination__btn">2</button>
        <button className="pagination__btn">3</button>
        <span className="pagination__ellipsis">...</span>
        <button className="pagination__btn pagination__btn--nav">Next</button>
      </div>
    </div>
  );
};

export default OrderManagement;