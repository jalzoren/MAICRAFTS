// src/pages/staff/Products.jsx (Product Management for Seller)
import React, { useState } from 'react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    description: ''
  });

  const handleInputChange = (e) => {
    setNewProduct({
      ...newProduct,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setProducts([...products, { ...newProduct, id: Date.now() }]);
    setNewProduct({ name: '', price: '', stock: '', description: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setProducts(products.filter(product => product.id !== id));
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Product Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="product-form">
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={newProduct.price}
            onChange={handleInputChange}
            required
          />
          <input
            type="number"
            name="stock"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={newProduct.description}
            onChange={handleInputChange}
          />
          <button type="submit" className="btn-success">Save Product</button>
        </form>
      )}

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No products yet</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>${product.price}</td>
                  <td>{product.stock}</td>
                  <td>{product.description}</td>
                  <td>
                    <button onClick={() => handleDelete(product.id)} className="btn-danger">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;