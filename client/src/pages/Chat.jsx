import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Clock,
  Phone,
  Video,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  UserCheck
} from 'lucide-react';

export default function Chat({
  consultationId,
  setActivePage,
  setSelectedCoachId
}) {
  const { user } = useAuth();
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // Session Timer countdown state (30 minutes default)
  const [remainingSeconds, setRemainingSeconds] = useState(1800);
  const [showCallModal, setShowCallModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    if (!consultationId) {
      setError('No consultation selected.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.getChatHistory(consultationId);

      if (res.locked) {
        setIsLocked(true);
        setLockMessage(res.error || 'Payment required to access consultation chat.');
        setLoading(false);
        return;
      }

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setIsLocked(false);
      setConsultation(res.consultation);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load chat:', err);
      setError('Network error while loading chat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setActivePage('login');
      return;
    }
    fetchChat();

    // Auto-poll for new messages every 3 seconds if unlocked
    const interval = setInterval(() => {
      if (!isLocked && consultationId) {
        fetchChat();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [consultationId, user, isLocked]);

  // Session timer ticker
  useEffect(() => {
    if (isLocked) return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use FileReader for instant in-browser base64 preview & transmission
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        url: event.target.result,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || sending) return;

    const textToSend = inputText.trim();
    const currentAttachment = attachment;

    setInputText('');
    setAttachment(null);
    setSending(true);

    try {
      const res = await api.sendChatMessage(consultationId, textToSend, currentAttachment);

      if (res.locked) {
        setIsLocked(true);
        setLockMessage(res.error);
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err) {
      setError('Failed to deliver message.');
    } finally {
      setSending(false);
    }
  };

  const handleEndConsultation = async () => {
    if (!window.confirm('Are you sure you want to conclude and complete this consultation?')) return;
    try {
      await api.endConsultation(consultationId);
      fetchChat();
    } catch (e) {
      alert('Failed to complete consultation');
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Connecting to consultation chat...</p>
      </div>
    );
  }

  // Strict Payment Verification Gatekeeper (PDF Rule: Open private chat ONLY after payment)
  if (isLocked) {
    return (
      <div className="section section-spacious">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="card" style={{ padding: '3.5rem 2.5rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertCircle size={36} />
            </div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', color: 'var(--color-dark)' }}>
              Chat Access Locked
            </h2>
            <p style={{ color: 'var(--color-muted-sage)', lineHeight: 1.6, marginBottom: '2rem' }}>
              {lockMessage || 'A confirmed and verified Razorpay payment is required to unlock direct 1-on-1 text consultation with your wellness coach.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setActivePage('coaches')}
              >
                Select Coach &amp; Complete Payment
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setActivePage('customer-dashboard')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = user.role === 'customer'
    ? consultation?.coach_name || 'Wellness Coach'
    : consultation?.customer_name || 'Customer';

  return (
    <div className="section section-spacious" style={{ paddingTop: '2rem' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Chat Window Wrapper */}
        <div className="card chat-window" style={{ display: 'flex', flexDirection: 'column', height: '780px', padding: 0, overflow: 'hidden' }}>
          {/* 1. Header Bar */}
          <div style={{ padding: '1.25rem 1.75rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={consultation?.coach_image || '/pv_logo.png'}
                alt={partnerName}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-logo-green)' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--color-dark)', margin: 0 }}>
                    {partnerName}
                  </h3>
                  <span className="chat-status-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#009933' }}></span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)' }}>
                  {consultation?.service_name || 'Consultation'} &bull; {consultation?.date} ({consultation?.time_slot})
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Countdown Session Timer */}
              <div className="chat-session-timer">
                <Clock size={14} />
                <span>Session Time: {formatTimer(remainingSeconds)}</span>
              </div>

              {/* Voice & Video Future Enhancement buttons */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                title="Voice Call (Phase 2 Enhancement)"
                onClick={() => setShowCallModal(true)}
                style={{ padding: '0.4rem 0.65rem' }}
              >
                <Phone size={15} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                title="Video Call (Phase 2 Enhancement)"
                onClick={() => setShowCallModal(true)}
                style={{ padding: '0.4rem 0.65rem' }}
              >
                <Video size={15} />
              </button>

              {/* Coach Can Complete Consultation */}
              {user.role === 'coach' && consultation?.status !== 'completed' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleEndConsultation}
                  style={{ fontSize: '0.78rem' }}
                >
                  Complete Consultation
                </button>
              )}
            </div>
          </div>

          {/* 2. Messages Thread */}
          <div style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', background: 'var(--bg-cream)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-muted-sage)' }}>
                <p>Welcome! Say hello to start your personalized consultation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                const isSystem = msg.sender_role === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                      <span style={{ display: 'inline-block', fontSize: '0.78rem', background: 'var(--bg-surface-tint)', color: 'var(--color-logo-teal)', padding: '0.4rem 1rem', borderRadius: '999px', border: '1px solid var(--color-border)' }}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="chat-bubble"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '75%'
                    }}
                  >
                    <div
                      style={{
                        padding: '0.85rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isMe ? 'var(--color-dark)' : 'var(--bg-surface)',
                        color: isMe ? '#FAFDF7' : 'var(--color-dark)',
                        border: isMe ? 'none' : '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-subtle)'
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', opacity: 0.75, marginBottom: '0.25rem', fontWeight: '600' }}>
                        {isMe ? 'You' : msg.sender_name}
                      </div>

                      {msg.text && (
                        <div style={{ fontSize: '0.94rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                      )}

                      {/* Attached Image or File Preview */}
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <img
                          src={msg.attachment_url}
                          alt={msg.attachment_name || 'Attachment'}
                          className="chat-attachment-img"
                          onClick={() => setPreviewImage(msg.attachment_url)}
                        />
                      )}

                      {msg.attachment_url && msg.attachment_type === 'file' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                          <FileText size={16} />
                          <span style={{ fontSize: '0.82rem' }}>{msg.attachment_name || 'Document'}</span>
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '0.68rem', color: 'var(--color-muted-sage)', marginTop: '0.25rem', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 3. Attachment Preview Bar if selected */}
          {attachment && (
            <div style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-surface-tint)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                <ImageIcon size={16} color="var(--color-logo-green)" />
                <span>Ready to send: <strong>{attachment.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 4. Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="chat-input-container"
            style={{ padding: '1rem 1.5rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              title="Attach meal photo or health report"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '0.6rem' }}
            >
              <Paperclip size={18} />
            </button>

            <input
              type="text"
              className="form-input"
              placeholder="Type your message to coach..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{ flex: 1, margin: 0 }}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || (!inputText.trim() && !attachment)}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Future Enhancement Voice/Video Call Modal (Module 9 PDF note) */}
        {showCallModal && (
          <div className="modal-overlay" onClick={() => setShowCallModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '2.5rem 2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-surface-tint)', color: 'var(--color-logo-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Video size={28} />
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Audio &amp; Video Consultations</h3>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Per PV Nutrition Centre architectural specification (Module 9), voice and video calls are scheduled as future enhancements. Direct real-time chat with photo/diet upload is currently live!
              </p>
              <button className="btn btn-primary btn-block" onClick={() => setShowCallModal(false)}>
                Got it, Continue Chat
              </button>
            </div>
          </div>
        )}

        {/* Image Preview Lightbox Modal */}
        {previewImage && (
          <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
            <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-float)' }} />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#060904', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
