// src/pages/PaymentFailed.jsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();

  const handleReturnToCheckout = () => {
    navigate(`/checkout?retry=${orderId}`);
  };

  Swal.fire({
    icon: 'error',
    title: 'Payment Failed',
    text: 'Something went wrong. Please try again.',
    confirmButtonText: 'Return to Checkout',
    confirmButtonColor: '#E6BB71',
    allowOutsideClick: false
  }).then((result) => {
    if (result.isConfirmed) {
      navigate(`/checkout?retry=${orderId}`);
    }
  });

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>Payment Failed</h1>
      <p>Something went wrong. Please try again.</p>
      <button onClick={handleReturnToCheckout} className="btn-return-checkout">
        Return to Checkout
      </button>
    </div>
  );
};

export default PaymentFailed;