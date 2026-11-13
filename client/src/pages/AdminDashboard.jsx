import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Image,
  Package,
  Users,
  DollarSign,
  Calendar,
  MessageSquare,
  FileDown,
  Settings,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload
} from 'lucide-react';

export default function AdminDashboard({ setActivePage }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState('posters');
  // 'posters' | 'services' | 'coaches' | 'bookings' | 'payments' | 'enquiries' | 'reports' | 'settings'

  // Poster Modal State (Module 2)
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [editingPoster, setEditingPoster] = useState(null);
  const [posterForm, setPosterForm] = useState({
    title: '',
    subtitle: '',
    image_url: '/wellness_hero.jpg',
    button_text: 'Book Consultation',
    button_link: 'coaches',
    order: 1,
    is_active: true,
    start_date: '',
    end_date: ''
  });

  // Service Modal State (Module 3 & 7)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category_id: 'cat_weight',
    type: 'consultation',
    price: 200,
    duration: '30 Mins',
    sessions: 1,
    validity_days: 7,
    chat_access_days: 7,
    description: '',
    benefits: '1-on-1 Consultation\nPersonalized Habit Checklist\nChat Support',
    is_published: true,
    order: 1
  });

  // Coach Modal State (Module 10)
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [coachForm, setCoachForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: 'Coach@123',
    gender: 'Male',
    bio: '',
    experience: '',
    consultation_fee: 200,
    working_hours: '08:00 AM - 08:00 PM',
    is_active: true
  });

  // Audit Logs (Module 14)
  const [auditLogs, setAuditLogs] = useState([]);
  const [settingsForm, setSettingsForm] = useState({
    centre_name: 'PV Nutrition Center',
    tagline: 'HEALTH IS WEALTH',
    phone_primary: '90477 93275',
    phone_secondary: '74182 78569',
    email: 'contact@pvnutrition.com',
    address: 'PV Nutrition Center, Main Road, Thanjavur, Tamil Nadu 613001',
    working_hours: 'Mon - Sat: 7:00 AM - 8:30 PM',
    razorpay_test_mode: true
  });

  const fetchDashboard = async () => {
    try {
      const [dashRes, logsRes, settingsRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getAuditLogs(),
        api.getSystemSettings()
      ]);

      if (dashRes.error) {
        setError(dashRes.error);
      } else {
        setData(dashRes);
      }

      if (Array.isArray(logsRes)) setAuditLogs(logsRes);
      if (settingsRes && !settingsRes.error) setSettingsForm(settingsRes);
    } catch (err) {
      setError('Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setActivePage('login');
      return;
    }
    if (user.role !== 'admin') {
      setError('Restricted access. Administrator credentials required.');
      setLoading(false);
      return;
    }
    fetchDashboard();
  }, [user]);

  // ==========================================
  // POSTER HANDLERS (MODULE 2)
  // ==========================================
  const handleOpenPosterModal = (poster = null) => {
    if (poster) {
      setEditingPoster(poster);
      setPosterForm(poster);
    } else {
      setEditingPoster(null);
      setPosterForm({
        title: '',
        subtitle: '',
        image_url: '/wellness_hero.jpg',
        button_text: 'Book Consultation',
        button_link: 'coaches',
        order: (data?.posters?.length || 0) + 1,
        is_active: true,
        start_date: '',
        end_date: ''
      });
    }
    setShowPosterModal(true);
  };

  const handlePosterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPoster) {
        await api.updatePoster(editingPoster.id, posterForm);
      } else {
        await api.createPoster(posterForm);
      }
      setShowPosterModal(false);
      fetchDashboard();
    } catch (e) {
      alert('Error saving poster');
    }
  };

  const handleDeletePoster = async (id) => {
    if (!window.confirm('Are you sure you want to delete this poster?')) return;
    try {
      await api.deletePoster(id);
      fetchDashboard();
    } catch (e) {
      alert('Error deleting poster');
    }
  };

  // ==========================================
  // SERVICE HANDLERS (MODULE 3 & 7)
  // ==========================================
  const handleOpenServiceModal = (srv = null) => {
    if (srv) {
      setEditingService(srv);
      setServiceForm({
        ...srv,
        benefits: Array.isArray(srv.benefits) ? srv.benefits.join('\n') : (srv.benefits || '')
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        category_id: data?.categories?.[0]?.id || 'cat_weight',
        type: 'consultation',
        price: 200,
        duration: '30 Mins',
        sessions: 1,
        validity_days: 7,
        chat_access_days: 7,
        description: '',
        benefits: '1-on-1 Consultation\nPersonalized Habit Checklist\nChat Support',
        is_published: true,
        order: (data?.services?.length || 0) + 1
      });
    }
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...serviceForm,
      price: Number(serviceForm.price),
      sessions: Number(serviceForm.sessions),
      validity_days: Number(serviceForm.validity_days),
      chat_access_days: Number(serviceForm.chat_access_days),
      benefits: serviceForm.benefits.split('\n').filter(b => b.trim().length > 0)
    };

    try {
      if (editingService) {
        await api.updateService(editingService.id, payload);
      } else {
        await api.createService(payload);
      }
      setShowServiceModal(false);
      fetchDashboard();
    } catch (e) {
      alert('Error saving service');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Delete this service option?')) return;
    try {
      await api.deleteService(id);
      fetchDashboard();
    } catch (e) {
      alert('Error deleting service');
    }
  };

  // ==========================================
  // COACH HANDLERS (MODULE 10)
  // ==========================================
  const handleOpenCoachModal = (coach = null) => {
    if (coach) {
      setEditingCoach(coach);
      setCoachForm({
        name: coach.name,
        phone: coach.phone,
        email: coach.email || '',
        password: '',
        gender: coach.gender || 'Male',
        bio: coach.bio || '',
        experience: coach.experience || '',
        consultation_fee: coach.consultation_fee || 200,
        working_hours: coach.working_hours || '08:00 AM - 08:00 PM',
        is_active: coach.is_active !== false
      });
    } else {
      setEditingCoach(null);
      setCoachForm({
        name: '',
        phone: '',
        email: '',
        password: 'Coach@123',
        gender: 'Male',
        bio: '',
        experience: 'Certified Wellness Coach',
        consultation_fee: 200,
        working_hours: '08:00 AM - 08:00 PM',
        is_active: true
      });
    }
    setShowCoachModal(true);
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCoach) {
        await api.updateCoach(editingCoach.id, coachForm);
      } else {
        await api.addCoach(coachForm);
      }
      setShowCoachModal(false);
      fetchDashboard();
    } catch (e) {
      alert('Error saving coach');
    }
  };

  const handleDeactivateCoach = async (coachId) => {
    if (!window.confirm('Are you sure you want to toggle deactivation for this coach?')) return;
    try {
      await api.deactivateCoach(coachId);
      fetchDashboard();
    } catch (e) {
      alert('Error changing coach status');
    }
  };

  // ==========================================
  // REFUND HANDLER (MODULE 8)
  // ==========================================
  const handleRefund = async (paymentId) => {
    const reason = window.prompt('Please enter the reason for this refund:');
    if (!reason) return;
    try {
      await api.refundPayment(paymentId, reason);
      fetchDashboard();
      alert('Refund processed and recorded.');
    } catch (e) {
      alert('Failed to process refund');
    }
  };

  // ==========================================
  // ENQUIRY HANDLER (MODULE 13)
  // ==========================================
  const handleUpdateEnquiryStatus = async (id, status) => {
    try {
      await api.updateEnquiry(id, { status });
      fetchDashboard();
    } catch (e) {
      alert('Failed to update enquiry');
    }
  };

  // ==========================================
  // SYSTEM SETTINGS & BACKUP (MODULE 14)
  // ==========================================
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateSystemSettings(settingsForm);
      alert('System settings updated successfully!');
      fetchDashboard();
    } catch (e) {
      alert('Failed to update settings');
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (window.confirm('WARNING: Restoring will overwrite existing database records. Proceed?')) {
          await api.restoreDatabase(backupData);
          alert('Database restored successfully!');
          fetchDashboard();
        }
      } catch (err) {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Loading administrator console...</p>
      </div>
    );
  }

  const totals = data?.totals || {};

  return (
    <div className="section section-spacious">
      <div className="container">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.75rem' }}>
          <div>
            <span className="editorial-eyebrow">Module 13 &amp; 14 &bull; Admin Console</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '400', margin: '0.25rem 0' }}>
              PV Nutrition Administration
            </h1>
            <p style={{ color: 'var(--color-muted-sage)' }}>
              Complete content management, service pricing, booking schedule, reports, and security control.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchDashboard}>
            <RefreshCw size={15} style={{ marginRight: '6px' }} /> Refresh Data
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '2rem' }}>{error}</div>}

        {/* =========================================================================
            MODULE 13: KPI METRICS (TOTALS, COLLECTIONS, PROFIT)
            ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>Gross Collections</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)', margin: '0.2rem 0' }}>
              ₹{totals.total_revenue || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)' }}>{totals.total_successful_payments || 0} Successful</span>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>Net Margin / Profit</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-logo-green)', margin: '0.2rem 0' }}>
              ₹{totals.actual_profit || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)' }}>Refunds: ₹{totals.total_refunds || 0}</span>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>Total Bookings</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)', margin: '0.2rem 0' }}>
              {totals.total_consultations || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-logo-blue)' }}>{totals.completed_consultations || 0} Completed</span>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>Registered Customers</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)', margin: '0.2rem 0' }}>
              {totals.total_customers || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)' }}>Enquiries: {totals.new_enquiries || 0} New</span>
          </div>
        </div>

        {/* Tab Navigation Navigation Strip */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          {[
            { id: 'posters', label: 'Posters & Hero (Mod 2)', icon: Image },
            { id: 'services', label: 'Services & Pricing (Mod 3 & 7)', icon: Package },
            { id: 'coaches', label: 'Coaches (Mod 10)', icon: Users },
            { id: 'bookings', label: 'All Bookings (Mod 6)', icon: Calendar },
            { id: 'payments', label: 'Transactions (Mod 8)', icon: DollarSign },
            { id: 'enquiries', label: 'Enquiries (Mod 1)', icon: MessageSquare },
            { id: 'reports', label: 'CSV Reports (Mod 13)', icon: FileDown },
            { id: 'settings', label: 'Security & Backup (Mod 14)', icon: Shield }
          ].map(t => {
            const IconComponent = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(t.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconComponent size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            TAB 1: POSTERS & CONTENT MANAGEMENT (MODULE 2)
            ========================================================================= */}
        {activeTab === 'posters' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '500' }}>Homepage Posters &amp; Banners</h2>
                <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>
                  Changes appear immediately on the website without coding.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenPosterModal()}>
                <Plus size={15} style={{ marginRight: '4px' }} /> Add New Poster
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {data?.posters?.map((poster) => (
                <div key={poster.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
                      <img src={poster.image_url} alt={poster.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className={`badge ${poster.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ position: 'absolute', top: '8px', right: '8px' }}>
                        {poster.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>
                      Display Order: {poster.order}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-dark)', margin: '0.25rem 0' }}>
                      {poster.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {poster.subtitle}
                    </p>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-logo-blue)' }}>
                      Button: <strong>"{poster.button_text}"</strong> &rarr; #{poster.button_link}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenPosterModal(poster)}>
                      <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: '#DC2626' }} onClick={() => handleDeletePoster(poster.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SERVICE & PRICING MANAGEMENT (MODULE 3 & 7)
            ========================================================================= */}
        {activeTab === 'services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '500' }}>Services &amp; Packages (₹100, ₹200, ₹300)</h2>
                <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>
                  Manage session durations, prices, validity, and chat support rules.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenServiceModal()}>
                <Plus size={15} style={{ marginRight: '4px' }} /> Add Consultation Option
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {data?.services?.map((srv) => (
                <div key={srv.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="editorial-eyebrow" style={{ textTransform: 'uppercase' }}>
                        {srv.type}
                      </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)' }}>
                        ₹{srv.price}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-dark)', marginBottom: '0.4rem' }}>
                      {srv.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {srv.description}
                    </p>

                    <div style={{ fontSize: '0.8rem', color: 'var(--color-dark)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div>Duration: <strong>{srv.duration}</strong></div>
                      <div>Sessions Included: <strong>{srv.sessions || 1}</strong></div>
                      <div>Validity: <strong>{srv.validity_days || 7} Days</strong> (Chat: {srv.chat_access_days || 7} Days)</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1.25rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenServiceModal(srv)}>
                      <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: '#DC2626' }} onClick={() => handleDeleteService(srv.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: COACHES MANAGEMENT (MODULE 10)
            ========================================================================= */}
        {activeTab === 'coaches' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '500' }}>Coach Management (The 2 Advisors)</h2>
                <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>
                  Palani Manickam &amp; Vijayashanthi profile settings, hours, and status.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenCoachModal()}>
                <Plus size={15} style={{ marginRight: '4px' }} /> Add Coach Profile
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {data?.coaches?.map((c) => (
                <div key={c.id} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <img
                        src={c.image_url || '/pv_logo.png'}
                        alt={c.name}
                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: '600', color: 'var(--color-dark)', margin: 0 }}>
                          {c.name}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)' }}>{c.phone} &bull; {c.email}</div>
                        <span className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-sage)', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {c.bio}
                    </p>

                    <div style={{ fontSize: '0.82rem', color: 'var(--color-dark)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>Experience: <strong>{c.experience}</strong></div>
                      <div>Working Hours: <strong>{c.working_hours}</strong></div>
                      <div>Consultation Fee: <strong>₹{c.consultation_fee}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1.25rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCoachModal(c)}>
                      <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDeactivateCoach(c.id)}>
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: ALL BOOKINGS & CONSULTATIONS (MODULE 6)
            ========================================================================= */}
        {activeTab === 'bookings' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '500', marginBottom: '1.5rem' }}>
              All Customer Consultations &amp; Schedules ({data?.consultations?.length || 0})
            </h2>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-tint)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Coach</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Service</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Date &amp; Slot</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Fee</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.consultations?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '500' }}>
                        <div>{item.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)' }}>{item.customer_phone}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>{item.coach_name}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.88rem' }}>{item.service_name || 'Consultation'}</td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                        {item.date} &bull; {item.time_slot}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>₹{item.fee}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${item.status === 'confirmed' || item.status === 'paid' ? 'badge-success' : item.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PAYMENTS & REVENUE (MODULE 8 & 13)
            ========================================================================= */}
        {activeTab === 'payments' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '500', marginBottom: '1.5rem' }}>
              Razorpay Transactions &amp; Refund Management
            </h2>

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-tint)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Order ID</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.payments?.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                        {p.razorpay_order_id || p.id}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>{p.customer_name}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '600' }}>₹{p.amount}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${p.status === 'successful' ? 'badge-success' : p.status === 'refunded' ? 'badge-neutral' : 'badge-warning'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {p.status === 'successful' && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#DC2626', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => handleRefund(p.id)}
                          >
                            Process Refund
                          </button>
                        )}
                        {p.status === 'refunded' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)' }}>Refunded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: CUSTOMER ENQUIRIES (MODULE 1 & 13)
            ========================================================================= */}
        {activeTab === 'enquiries' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '500', marginBottom: '1.5rem' }}>
              Customer Contact Enquiries ({data?.enquiries?.length || 0})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data?.enquiries?.map((enq) => (
                <div key={enq.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--color-dark)' }}>
                        {enq.name}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)' }}>
                        Email: {enq.email} &bull; Phone: {enq.phone || 'N/A'}
                      </div>
                    </div>
                    <span className={`badge ${enq.status === 'new' ? 'badge-warning' : enq.status === 'resolved' ? 'badge-success' : 'badge-neutral'}`}>
                      {enq.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ background: 'var(--bg-surface-tint)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--color-dark)', margin: '0.75rem 0' }}>
                    "{enq.message}"
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    {enq.status !== 'contacted' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateEnquiryStatus(enq.id, 'contacted')}>
                        Mark Contacted
                      </button>
                    )}
                    {enq.status !== 'resolved' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateEnquiryStatus(enq.id, 'resolved')}>
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: CSV EXPORT REPORTS (MODULE 13)
            ========================================================================= */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Export Reports to CSV / Excel
            </h2>
            <p style={{ color: 'var(--color-muted-sage)', marginBottom: '2rem' }}>
              One-click download of all transactional, customer, and booking datasets for bookkeeping and accounting.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <DollarSign size={32} color="var(--color-logo-green)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Payments &amp; Revenue</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', marginBottom: '1.5rem' }}>
                  Full transactional records including order ID, method, amount, status, and dates.
                </p>
                <a
                  href={api.getExportUrl('payments')}
                  download
                  className="btn btn-primary btn-block"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                >
                  <Download size={15} /> Export Payments CSV
                </a>
              </div>

              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Users size={32} color="var(--color-logo-blue)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Customer Directory</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', marginBottom: '1.5rem' }}>
                  Registered customer database with phone numbers, emails, age, and registration dates.
                </p>
                <a
                  href={api.getExportUrl('customers')}
                  download
                  className="btn btn-primary btn-block"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                >
                  <Download size={15} /> Export Customers CSV
                </a>
              </div>

              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Calendar size={32} color="var(--color-logo-teal)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Consultation Bookings</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', marginBottom: '1.5rem' }}>
                  Appointment records with assigned coach, service category, date, slot, and completion status.
                </p>
                <a
                  href={api.getExportUrl('consultations')}
                  download
                  className="btn btn-primary btn-block"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                >
                  <Download size={15} /> Export Consultations CSV
                </a>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 8: SECURITY, AUDIT LOGS & BACKUP (MODULE 14)
            ========================================================================= */}
        {activeTab === 'settings' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
              {/* System Settings Form */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={20} color="var(--color-logo-green)" />
                  Website System Settings
                </h3>

                <form onSubmit={handleSettingsSubmit}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Centre Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsForm.centre_name || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, centre_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Tagline</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsForm.tagline || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Primary Phone (Palani)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={settingsForm.phone_primary || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone_primary: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secondary Phone (Vijaya)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={settingsForm.phone_secondary || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone_secondary: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsForm.address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Working Hours</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingsForm.working_hours || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, working_hours: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
                    Save System Settings
                  </button>
                </form>
              </div>

              {/* Database Backup & Restore */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="var(--color-logo-blue)" />
                  Database Backup &amp; Restore
                </h3>

                <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-sage)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Take regular snapshots of the full JSON database. You can restore the entire database in one click from any previous backup file.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <a
                    href={api.getBackupUrl()}
                    download
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Download size={16} /> Download Full Database Snapshot (.json)
                  </a>

                  <label className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <Upload size={16} /> Restore Database from File
                    <input type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Audit Logs Viewer (Module 14) */}
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Security &amp; Activity Audit Logs</h4>
                <div style={{ maxHeight: '240px', overflowY: 'auto', background: 'var(--bg-surface-tint)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.78rem', border: '1px solid var(--color-border)' }}>
                  {auditLogs.length === 0 ? (
                    <div>No activity logs recorded.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0.35rem 0' }}>
                        <span style={{ fontWeight: '700', color: 'var(--color-logo-blue)' }}>{log.action}</span>: {log.details}
                        <div style={{ color: 'var(--color-muted-sage)', fontSize: '0.7rem' }}>{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: ADD / EDIT POSTER (MODULE 2)
            ========================================================================= */}
        {showPosterModal && (
          <div className="modal-overlay" onClick={() => setShowPosterModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>
                {editingPoster ? 'Edit Poster' : 'Add New Homepage Poster'}
              </h3>
              <form onSubmit={handlePosterSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Poster Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. HEALTH IS WEALTH"
                    value={posterForm.title}
                    onChange={(e) => setPosterForm({ ...posterForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Subtitle / Description</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="e.g. Personalized Nutrition & Tailored 21 Days Transformation"
                    value={posterForm.subtitle}
                    onChange={(e) => setPosterForm({ ...posterForm, subtitle: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Button Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={posterForm.button_text}
                      onChange={(e) => setPosterForm({ ...posterForm, button_text: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Button Link Target</label>
                    <select
                      className="form-input"
                      value={posterForm.button_link}
                      onChange={(e) => setPosterForm({ ...posterForm, button_link: e.target.value })}
                    >
                      <option value="coaches">Meet Coaches / Book</option>
                      <option value="services">Services &amp; Packages</option>
                      <option value="health-assessment">Health Form</option>
                      <option value="contact">Contact Us</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Display Order</label>
                    <input
                      type="number"
                      className="form-input"
                      value={posterForm.order}
                      onChange={(e) => setPosterForm({ ...posterForm, order: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={posterForm.is_active ? 'true' : 'false'}
                      onChange={(e) => setPosterForm({ ...posterForm, is_active: e.target.value === 'true' })}
                    >
                      <option value="true">Active (Visible)</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPosterModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Poster
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: ADD / EDIT SERVICE & PRICING (MODULE 3 & 7)
            ========================================================================= */}
        {showServiceModal && (
          <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>
                {editingService ? 'Edit Consultation Option' : 'New Consultation / Package'}
              </h3>
              <form onSubmit={handleServiceSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Service Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Quick Wellness Query (₹100)"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price (INR) *</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      placeholder="100, 200, 300..."
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="15 Mins, 30 Mins..."
                      value={serviceForm.duration}
                      onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sessions</label>
                    <input
                      type="number"
                      className="form-input"
                      value={serviceForm.sessions}
                      onChange={(e) => setServiceForm({ ...serviceForm, sessions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Included Benefits (One per line)</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="15-minute consultation&#10;Instant diet checklist&#10;3 days chat support"
                    value={serviceForm.benefits}
                    onChange={(e) => setServiceForm({ ...serviceForm, benefits: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Consultation Tier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: ADD / EDIT COACH (MODULE 10)
            ========================================================================= */}
        {showCoachModal && (
          <div className="modal-overlay" onClick={() => setShowCoachModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>
                {editingCoach ? 'Edit Coach Profile' : 'Add Coach Profile'}
              </h3>
              <form onSubmit={handleCoachSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={coachForm.name}
                      onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      type="tel"
                      required
                      className="form-input"
                      value={coachForm.phone}
                      onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                {!editingCoach && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Login Email *</label>
                      <input
                        type="email"
                        required
                        className="form-input"
                        value={coachForm.email}
                        onChange={(e) => setCoachForm({ ...coachForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Login Password *</label>
                      <input
                        type="password"
                        required
                        className="form-input"
                        value={coachForm.password}
                        onChange={(e) => setCoachForm({ ...coachForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Bio &amp; Specialization</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={coachForm.bio}
                    onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Working Hours</label>
                    <input
                      type="text"
                      className="form-input"
                      value={coachForm.working_hours}
                      onChange={(e) => setCoachForm({ ...coachForm, working_hours: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee</label>
                    <input
                      type="number"
                      className="form-input"
                      value={coachForm.consultation_fee}
                      onChange={(e) => setCoachForm({ ...coachForm, consultation_fee: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCoachModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Coach
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
