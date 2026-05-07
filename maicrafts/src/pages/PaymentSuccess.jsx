import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    if (orderId) {
      localStorage.removeItem('checkout_items');
      clearCart();
      setTimeout(() => navigate(`/order-success?order_id=${orderId}`), 3000);
    }
  }, [orderId, navigate, clearCart]);

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>Payment Successful!</h1>
      <p>Your order has been paid. Redirecting to order confirmation...</p>
    </div>
  );
};

export default PaymentSuccess;