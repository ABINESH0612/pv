import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Clock, Calendar, MessageSquare, Check, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Services({ setActivePage, setSelectedCoachId }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [srvRes, catRes] = await Promise.all([
          api.getServices(),
          api.getCategories()
        ]);
        if (Array.isArray(srvRes)) setServices(srvRes);
        if (Array.isArray(catRes)) setCategories(catRes);
      } catch (e) {
        setError('Failed to load services and packages');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleBookService = (service) => {
    setActivePage('coaches');
  };

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category_id === selectedCategory);

  return (
    <div>
      {/* Editorial Header */}
      <section className="section section-bg-wellness" style={{ paddingBottom: '3.5rem' }}>
        <div className="container">
          <div className="section-header" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <span className="editorial-eyebrow">Module 3 &amp; 7 &bull; Transparent Wellness Options</span>
            <h1 className="section-title" style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>
              Consultations &amp; Coaching Packages
            </h1>
            <p className="section-desc" style={{ fontSize: '1.1rem' }}>
              Choose from focused query sessions starting at ₹100, standard consultations at ₹200, deep-dive reviews at ₹300, or structured 7 to 30-day coaching programs.
            </p>

            {/* Regulatory Disclaimer Notice (PDF Rule: Do not display products for direct sale) */}
            <div style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(6, 9, 4, 0.04)', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
              <ShieldCheck size={16} color="var(--color-logo-green)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-dark)', fontWeight: '500' }}>
                Strict Advisory: We provide private nutritional consultations and coaching only. No products for direct retail sale.
              </span>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2.5rem' }}>
            <button
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Programs ({services.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section section-spacious">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="spinner" style={{ marginBottom: '1rem' }}></div>
              <p style={{ color: 'var(--color-muted-sage)' }}>Loading wellness options...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error" style={{ maxWidth: '500px', margin: '0 auto' }}>{error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              {filteredServices.map(srv => {
                const isPackage = srv.type && srv.type.includes('package');
                const isHighlight = srv.price === 200 || srv.price === 2499;

                return (
                  <div
                    key={srv.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '2.25rem',
                      position: 'relative',
                      border: isHighlight ? '2px solid var(--color-logo-green)' : '1px solid var(--color-border)',
                      boxShadow: isHighlight ? 'var(--shadow-float)' : 'var(--shadow-card)',
                      transform: isHighlight ? 'translateY(-4px)' : 'none'
                    }}
                  >
                    {isHighlight && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          right: '24px',
                          background: 'var(--color-logo-green)',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase'
                        }}
                      >
                        Most Popular
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <span className="editorial-eyebrow" style={{ marginBottom: '0.25rem', display: 'block' }}>
                            {isPackage ? 'Coaching Program' : 'Direct Consultation'}
                          </span>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--color-dark)' }}>
                            {srv.name}
                          </h3>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '2.4rem', fontFamily: 'var(--font-serif)', fontWeight: '600', color: 'var(--color-dark)' }}>
                          ₹{srv.price}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: 'var(--color-muted-sage)' }}>
                          {isPackage ? ` / ${srv.duration}` : ` / ${srv.duration} session`}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.92rem', color: 'var(--color-muted-sage)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        {srv.description}
                      </p>

                      {/* Specs Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', background: 'var(--bg-surface-tint)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark)' }}>
                          <Clock size={13} color="var(--color-logo-green)" />
                          {srv.duration}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', background: 'var(--bg-surface-tint)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark)' }}>
                          <Calendar size={13} color="var(--color-logo-blue)" />
                          {srv.sessions || 1} Session{srv.sessions > 1 ? 's' : ''}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', background: 'var(--bg-surface-tint)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark)' }}>
                          <MessageSquare size={13} color="var(--color-logo-teal)" />
                          {srv.chat_access_days || 7} Days Chat Support
                        </span>
                      </div>

                      {/* Benefits Checklist */}
                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '0.75rem' }}>
                          Included Benefits:
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {(srv.benefits || []).map((ben, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--color-dark)' }}>
                              <Check size={16} color="var(--color-logo-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{ben}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      className={`btn ${isHighlight ? 'btn-primary' : 'btn-secondary'} btn-block`}
                      onClick={() => handleBookService(srv)}
                      style={{ width: '100%' }}
                    >
                      Book for ₹{srv.price} <ArrowRight size={15} style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Category In-Depth Overview */}
      <section className="section section-bg-wellness">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="editorial-eyebrow">Core Focus Areas</span>
            <h2 className="section-title">Personalized Lifestyle Nutrition</h2>
            <p className="section-desc">Every consultation is tailored to your unique metabolic profile, routine, and dietary habits.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {categories.map(c => (
              <div key={c.id} className="card" style={{ padding: '2rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: 'var(--color-logo-green)' }}>
                  <Sparkles size={22} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>{c.name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-sage)', lineHeight: 1.55 }}>
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
