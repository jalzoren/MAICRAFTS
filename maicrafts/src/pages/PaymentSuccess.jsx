// src/pages/PaymentSuccess.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Swal from 'sweetalert2';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    if (orderId) {
      localStorage.removeItem('checkout_items');
      clearCart();
      
      Swal.fire({
        icon: 'success',
        title: 'Payment Successful!',
        text: 'Your order has been placed successfully.',
        confirmButtonColor: '#E6BB71',
        timer: 2000,
        showConfirmButton: true
      }).then(() => {
        navigate('/settings?tab=orders');
      });
    }
  }, [orderId, navigate, clearCart]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>Processing payment...</h1>
    </div>
  );
};

export default PaymentSuccess;