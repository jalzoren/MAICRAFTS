import { useSearchParams, Link } from 'react-router-dom';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>Payment Failed</h1>
      <p>Something went wrong. Please try again.</p>
      <Link to={`/checkout?retry=${orderId}`}>Return to Checkout</Link>
    </div>
  );
};

export default PaymentFailed;