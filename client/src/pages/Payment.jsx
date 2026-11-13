import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Calendar, Clock, CreditCard, CheckCircle, Printer, ArrowLeft, ArrowRight, FileText } from 'lucide-react';

export default function Payment({
  coachId,
  setActivePage,
  setActiveConsultationId
}) {
  const { user } = useAuth();
  const [coach, setCoach] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('srv_std_200');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Payment Success & Receipt Modal (Module 8)
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Test mode simulated order
  const [testOrder, setTestOrder] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setActivePage('login');
      return;
    }
    if (user.role !== 'customer') {
      setError('Only registered customers can book and pay for consultations.');
      setLoading(false);
      return;
    }
    if (!coachId) {
      setActivePage('coaches');
      return;
    }

    async function loadData() {
      try {
        const [coachData, srvData] = await Promise.all([
          api.getCoach(coachId),
          api.getServices()
        ]);

        if (coachData.error) {
          setError(coachData.error);
        } else {
          setCoach(coachData);
        }

        if (Array.isArray(srvData)) {
          setServices(srvData);
          const defaultSrv = srvData.find(s => s.price === (coachData.consultation_fee || 200)) || srvData[0];
          if (defaultSrv) setSelectedServiceId(defaultSrv.id);
        }
      } catch (err) {
        setError('Failed to load consultation setup.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [coachId, user]);

  // Load available slots for coach and date (Module 6: prevent duplicate booking)
  useEffect(() => {
    if (!coachId || !appointmentDate) return;

    async function fetchSlots() {
      try {
        const res = await api.getAvailableSlots(coachId, appointmentDate);
        if (res && res.slots) {
          setAvailableSlots(res.slots);
          const firstAvailable = res.slots.find(s => s.isAvailable);
          if (firstAvailable) setSelectedSlot(firstAvailable.slot);
          else setSelectedSlot('');
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSlots();
  }, [coachId, appointmentDate]);

  const activeService = services.find(s => s.id === selectedServiceId) || {
    name: 'Standard Nutrition Consultation',
    price: coach?.consultation_fee || 200,
    duration: '30 Mins'
  };

  const handleInitiatePayment = async () => {
    if (!selectedSlot) {
      setError('Please choose an available time slot for your appointment.');
      return;
    }

    setError(null);
    setPaymentProcessing(true);

    try {
      const orderRes = await api.createPaymentOrder({
        coachId,
        serviceId: selectedServiceId,
        date: appointmentDate,
        timeSlot: selectedSlot
      });

      if (orderRes.error) {
        setError(orderRes.error);
        setPaymentProcessing(false);
        return;
      }

      if (orderRes.alreadyPaid) {
        setActiveConsultationId(orderRes.consultationId);
        setActivePage('chat');
        return;
      }

      const isRealKey = orderRes.keyId && !orderRes.keyId.includes('PVNutrition2026') && window.Razorpay;

      if (isRealKey) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: 'PV Nutrition Center',
          description: `${orderRes.serviceName} with ${orderRes.coachName}`,
          image: '/pv_logo.png',
          order_id: orderRes.orderId,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || ''
          },
          theme: { color: '#009933' },
          handler: async function (response) {
            await handlePaymentVerification({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              consultation_id: orderRes.consultationId,
              payment_method: paymentMethod
            });
          },
          modal: {
            ondismiss: async function () {
              setPaymentProcessing(false);
              await api.recordPaymentFailure(orderRes.orderId, 'User closed checkout modal');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test Simulation Modal
        setTestOrder(orderRes);
        setShowTestModal(true);
        setPaymentProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to initiate consultation payment.');
      setPaymentProcessing(false);
    }
  };

  const handlePaymentVerification = async (payload) => {
    setPaymentProcessing(true);
    try {
      const res = await api.verifyPayment(payload);
      if (res.verified && res.success) {
        setShowTestModal(false);
        setPaymentSuccessData({
          consultationId: res.consultationId,
          paymentId: res.paymentId,
          coachName: coach.name,
          serviceName: activeService.name,
          amount: activeService.price,
          date: appointmentDate,
          timeSlot: selectedSlot
        });
      } else {
        setError(res.error || 'Payment verification failed. Chat remains locked.');
      }
    } catch (err) {
      setError('Server verification error. Please contact PV Nutrition support.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!testOrder) return;
    const mockPaymentId = 'pay_sim_' + Date.now();
    const mockSignature = 'test_sig_' + testOrder.orderId;

    await handlePaymentVerification({
      razorpay_order_id: testOrder.orderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
      consultation_id: testOrder.consultationId,
      payment_method: paymentMethod
    });
  };

  const handleViewReceipt = async () => {
    if (!paymentSuccessData?.paymentId) return;
    try {
      const receipt = await api.getPaymentReceipt(paymentSuccessData.paymentId);
      setReceiptData(receipt);
      setShowReceiptModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Preparing booking details...</p>
      </div>
    );
  }

  // Payment Success Screen
  if (paymentSuccessData) {
    return (
      <div className="section section-spacious">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="card" style={{ padding: '3.5rem 2.5rem', textAlign: 'center' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--bg-surface-subtle)', color: 'var(--color-logo-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={40} />
            </div>

            <h1 style={{ fontSize: '2.4rem', color: 'var(--color-dark)', marginBottom: '0.5rem' }}>
              Payment Verified!
            </h1>
            <p style={{ color: 'var(--color-muted-sage)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your appointment with <strong>{paymentSuccessData.coachName}</strong> has been successfully booked and confirmed. Direct 1-on-1 consultation chat is now unlocked!
            </p>

            <div style={{ background: 'var(--bg-surface-tint)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--color-border)', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>Service</span>
                <strong style={{ color: 'var(--color-dark)' }}>{paymentSuccessData.serviceName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>Appointment Date</span>
                <strong style={{ color: 'var(--color-dark)' }}>{paymentSuccessData.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>Time Slot</span>
                <strong style={{ color: 'var(--color-dark)' }}>{paymentSuccessData.timeSlot}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.6rem' }}>
                <span style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>Amount Paid</span>
                <strong style={{ color: 'var(--color-logo-green)', fontSize: '1.15rem' }}>₹{paymentSuccessData.amount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActiveConsultationId(paymentSuccessData.consultationId);
                  setActivePage('chat');
                }}
              >
                Open Coach Chat Now &rarr;
              </button>
              <button className="btn btn-secondary" onClick={handleViewReceipt}>
                <FileText size={16} style={{ marginRight: '6px' }} /> View Payment Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Official Receipt Modal (Module 8) */}
        {showReceiptModal && receiptData && (
          <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
              <div className="receipt-container">
                <div className="receipt-header">
                  <div style={{ fontWeight: '700', fontSize: '1.4rem', color: 'var(--color-logo-blue)' }}>
                    PV NUTRITION CENTER
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)' }}>
                    {receiptData.centre?.tagline}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', marginTop: '0.25rem' }}>
                    {receiptData.centre?.address}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <div><strong>Receipt No:</strong> {receiptData.receiptNumber}</div>
                    <div><strong>Date:</strong> {new Date(receiptData.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><strong>Customer:</strong> {receiptData.customerName}</div>
                    <div><strong>Phone:</strong> {receiptData.customerPhone}</div>
                  </div>
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Coach</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{receiptData.serviceName}</td>
                      <td>{receiptData.coachName}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{receiptData.amount}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: '500', color: 'var(--color-muted-sage)' }}>Total Paid</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-logo-green)' }}>₹{receiptData.amount}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginBottom: '1.5rem' }}>
                  Transaction Reference: {receiptData.razorpayPaymentId} &bull; Status: Verified Successful
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handlePrintReceipt}>
                    <Printer size={15} style={{ marginRight: '6px' }} /> Print / Save PDF
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowReceiptModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="section section-spacious">
      <div className="container" style={{ maxWidth: '920px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setActivePage('coaches')}
          style={{ marginBottom: '2rem' }}
        >
          <ArrowLeft size={15} style={{ marginRight: '6px' }} /> Back to Coaches
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="editorial-eyebrow">Module 6 &amp; 8 &bull; Consultation Scheduling &amp; Payment</span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Book Consultation with {coach?.name}
          </h1>
          <p style={{ color: 'var(--color-muted-sage)' }}>
            Select your consultation tier, pick a time slot, and confirm payment securely via Razorpay.
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '2rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2.5rem' }}>
          {/* Left Column: Service & Slot Selection */}
          <div>
            {/* Step 1: Service Tier */}
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--color-logo-green)" />
                1. Select Consultation Option
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {services.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: selectedServiceId === s.id ? '2px solid var(--color-logo-green)' : '1px solid var(--color-border)',
                      background: selectedServiceId === s.id ? 'var(--bg-surface-tint)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--color-dark)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)' }}>{s.duration} &bull; {s.chat_access_days} days chat</div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-dark)' }}>
                      ₹{s.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Date & Slot Selection (Module 6) */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--color-logo-blue)" />
                2. Choose Appointment Date &amp; Slot
              </h3>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Appointment Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Available Time Slots</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {availableSlots.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={!s.isAvailable}
                      onClick={() => setSelectedSlot(s.slot)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.82rem',
                        borderRadius: 'var(--radius-sm)',
                        border: selectedSlot === s.slot ? '2px solid var(--color-logo-green)' : '1px solid var(--color-border)',
                        background: selectedSlot === s.slot ? 'var(--bg-surface-subtle)' : s.isAvailable ? 'var(--bg-surface)' : 'rgba(0,0,0,0.04)',
                        color: s.isAvailable ? 'var(--color-dark)' : 'var(--color-muted-sage)',
                        cursor: s.isAvailable ? 'pointer' : 'not-allowed',
                        fontWeight: selectedSlot === s.slot ? '600' : '400',
                        opacity: s.isAvailable ? 1 : 0.6
                      }}
                    >
                      {s.slot} {s.isAvailable ? '' : '(Booked)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Razorpay Trigger */}
          <div>
            <div className="card" style={{ padding: '2rem', position: 'sticky', top: '100px' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>
                Order Summary
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                <img
                  src={coach?.image_url || '/pv_logo.png'}
                  alt={coach?.name}
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-dark)' }}>{coach?.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)' }}>{coach?.experience}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-logo-green)', fontWeight: '500' }}>Phone: {coach?.phone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-sage)' }}>Service:</span>
                  <strong style={{ color: 'var(--color-dark)' }}>{activeService.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-sage)' }}>Duration:</span>
                  <strong style={{ color: 'var(--color-dark)' }}>{activeService.duration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-sage)' }}>Date:</span>
                  <strong style={{ color: 'var(--color-dark)' }}>{appointmentDate}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted-sage)' }}>Slot:</span>
                  <strong style={{ color: 'var(--color-dark)' }}>{selectedSlot || 'None selected'}</strong>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['UPI (GPay / PhonePe)', 'Credit/Debit Card', 'NetBanking'].map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`btn btn-sm ${paymentMethod === m.split(' ')[0] ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem', flex: 1, padding: '0.4rem 0.2rem' }}
                      onClick={() => setPaymentMethod(m.split(' ')[0])}
                    >
                      {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Payable Amount:</span>
                <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-dark)', fontFamily: 'var(--font-serif)' }}>
                  ₹{activeService.price}
                </span>
              </div>

              <button
                className="btn btn-primary btn-block"
                disabled={paymentProcessing || !selectedSlot}
                onClick={handleInitiatePayment}
                style={{ width: '100%', padding: '0.9rem' }}
              >
                {paymentProcessing ? 'Connecting Gateway...' : `Proceed to Pay ₹${activeService.price}`}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-muted-sage)' }}>
                <ShieldCheck size={14} color="var(--color-logo-green)" />
                <span>256-Bit SSL Encrypted Razorpay Gateway</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Mode Simulation Modal */}
        {showTestModal && testOrder && (
          <div className="modal-overlay">
            <div className="modal-container modal-card-animated" style={{ maxWidth: '480px' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-surface-tint)', color: 'var(--color-logo-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <CreditCard size={24} />
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Razorpay Payment Gateway</h3>
                <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>
                  Order ID: <code>{testOrder.orderId}</code>
                </p>
              </div>

              <div style={{ background: 'var(--bg-surface-tint)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>Customer:</span>
                  <strong>{user.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>Coach:</span>
                  <strong>{testOrder.coachName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>Method:</span>
                  <strong>{paymentMethod}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid var(--color-border)' }}>
                  <span>Payable:</span>
                  <strong style={{ color: 'var(--color-logo-green)', fontSize: '1.1rem' }}>₹{testOrder.consultationFee}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="btn btn-primary btn-block"
                  disabled={paymentProcessing}
                  onClick={handleSimulateSuccess}
                >
                  {paymentProcessing ? 'Verifying with Server...' : '✓ Complete Successful Payment'}
                </button>
                <button
                  className="btn btn-outline btn-block"
                  disabled={paymentProcessing}
                  onClick={async () => {
                    await api.recordPaymentFailure(testOrder.orderId, 'User simulated payment decline');
                    setShowTestModal(false);
                    setError('Payment was cancelled. Consultation chat remains locked.');
                  }}
                >
                  Simulate Failed Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
