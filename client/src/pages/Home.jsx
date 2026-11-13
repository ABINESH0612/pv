import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Scale,
  CheckCircle,
  Clock,
  ShieldCheck,
  Send,
  UserCheck,
  Activity,
  Heart
} from 'lucide-react';

export default function Home({ setActivePage, setSelectedCoachId }) {
  // 1. Dynamic Posters Carousel State (Module 2)
  const [posters, setPosters] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // 2. Interactive BMI & Calorie Calculator State
  const [calcHeight, setCalcHeight] = useState(172);
  const [calcWeight, setCalcWeight] = useState(72);
  const [calcGender, setCalcGender] = useState('Male');
  const [calcActivity, setCalcActivity] = useState('moderate');

  // 3. Find My Coach Wizard State (Module 10)
  const [quizGoal, setQuizGoal] = useState('');
  const [quizGenderPref, setQuizGenderPref] = useState('Any');
  const [matchedCoach, setMatchedCoach] = useState(null);
  const [matchExplanation, setMatchExplanation] = useState('');

  // 4. Quick Enquiry Form State (Module 1)
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquirySending, setEnquirySending] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  // Load Posters
  useEffect(() => {
    async function fetchPosters() {
      try {
        const res = await api.getPosters();
        if (Array.isArray(res) && res.length > 0) {
          setPosters(res);
        } else {
          // Default fallbacks
          setPosters([
            {
              id: 'p1',
              title: 'HEALTH IS WEALTH',
              subtitle: 'Personalized Nutrition & Tailored 21 Days Wellness Transformation in Thanjavur.',
              image_url: '/wellness_hero.jpg',
              button_text: 'Book Consultation',
              button_link: 'coaches'
            },
            {
              id: 'p2',
              title: 'Transform Everyday Vitality',
              subtitle: 'Science-backed meal planning, balanced weight loss, and cellular skin radiance.',
              image_url: '/banner.jpg',
              button_text: 'Explore ₹100, ₹200, ₹300 Options',
              button_link: 'services'
            },
            {
              id: 'p3',
              title: 'Children & Family Nutrition',
              subtitle: 'Wholesome immunity-building diet plans for growing children and busy families.',
              image_url: '/solutions.jpg',
              button_text: 'Meet Our Coaches',
              button_link: 'coaches'
            }
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchPosters();
  }, []);

  // Carousel Autoplay Timer
  useEffect(() => {
    if (posters.length <= 1 || isCarouselPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % posters.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [posters.length, isCarouselPaused]);

  // BMI Calculation
  const heightM = calcHeight / 100;
  const bmiVal = (heightM > 0 && calcWeight > 0) ? (calcWeight / (heightM * heightM)).toFixed(1) : 22.0;
  const idealWeightMin = (18.5 * heightM * heightM).toFixed(0);
  const idealWeightMax = (24.9 * heightM * heightM).toFixed(0);

  let bmiLabel = 'Healthy Weight';
  let bmiColor = '#009933';
  let gaugeOffset = 180 - (Math.min(Math.max(bmiVal, 15), 35) - 15) * 9; // Range 15 to 35 mapped to semi-circle

  if (bmiVal < 18.5) {
    bmiLabel = 'Underweight';
    bmiColor = '#3B82F6';
  } else if (bmiVal <= 24.9) {
    bmiLabel = 'Healthy Weight';
    bmiColor = '#009933';
  } else if (bmiVal <= 29.9) {
    bmiLabel = 'Overweight';
    bmiColor = '#D97706';
  } else {
    bmiLabel = 'Obese Range';
    bmiColor = '#DC2626';
  }

  // Estimated Daily Calorie Maintenance
  const bmr = calcGender === 'Male'
    ? (10 * calcWeight + 6.25 * calcHeight - 5 * 30 + 5)
    : (10 * calcWeight + 6.25 * calcHeight - 5 * 30 - 161);
  const activityMultiplier = calcActivity === 'sedentary' ? 1.2 : calcActivity === 'moderate' ? 1.55 : 1.725;
  const dailyCalories = Math.round(bmr * activityMultiplier);

  // Coach Matcher Action
  const handleMatchCoach = async (goal, genderPref) => {
    setQuizGoal(goal);
    setQuizGenderPref(genderPref);

    try {
      const res = await api.recommendCoach({ primaryGoal: goal, preferredGender: genderPref });
      if (res.recommendedCoach) {
        setMatchedCoach(res.recommendedCoach);
        setMatchExplanation(res.matchReason);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCoach = (coachId) => {
    setSelectedCoachId(coachId);
    setActivePage('coach-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquirySending(true);
    try {
      await api.submitEnquiry({
        name: enquiryName,
        email: enquiryEmail,
        phone: enquiryPhone,
        message: enquiryMessage
      });
      setEnquirySuccess(true);
      setEnquiryName('');
      setEnquiryEmail('');
      setEnquiryPhone('');
      setEnquiryMessage('');
    } catch (err) {
      alert('Failed to send enquiry. Please try again.');
    } finally {
      setEnquirySending(false);
    }
  };

  return (
    <div>
      {/* =========================================================================
          MODULE 2: INTERACTIVE WEBSITE POSTERS & HERO CAROUSEL
          ========================================================================= */}
      <section
        className="hero-editorial hero-animated-logo-bg"
        style={{ padding: '2.5rem 0 4rem' }}
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
      >
        <div className="hero-logo-orb hero-logo-orb-green" aria-hidden="true" />
        <div className="hero-logo-orb hero-logo-orb-blue" aria-hidden="true" />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          {/* Poster Carousel Container */}
          <div className="poster-carousel-wrapper">
            {posters.map((poster, idx) => (
              <div
                key={poster.id || idx}
                className={`poster-slide ${currentSlide === idx ? 'active' : ''}`}
              >
                <img
                  src={poster.image_url || '/wellness_hero.jpg'}
                  alt={poster.title}
                  className="poster-bg-img"
                />

                <div className="poster-slide-content">
                  <span className="poster-slide-eyebrow">
                    PV Nutrition Center &bull; Thanjavur &bull; Poster #{idx + 1}
                  </span>
                  <h1 className="poster-slide-title">
                    {poster.title}
                  </h1>
                  <p className="poster-slide-desc">
                    {poster.subtitle}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => setActivePage(poster.button_link || 'coaches')}
                    >
                      {poster.button_text || 'Book Consultation'} <ArrowRight size={18} style={{ marginLeft: '6px' }} />
                    </button>
                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={() => setActivePage('services')}
                      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                      View Options (₹100 - ₹300)
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            {posters.length > 1 && (
              <>
                <button
                  className="carousel-nav-btn carousel-nav-prev"
                  aria-label="Previous Poster"
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? posters.length - 1 : prev - 1))}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  className="carousel-nav-btn carousel-nav-next"
                  aria-label="Next Poster"
                  onClick={() => setCurrentSlide(prev => (prev + 1) % posters.length)}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            {/* Indicators */}
            {posters.length > 1 && (
              <div className="carousel-indicators">
                {posters.map((_, idx) => (
                  <button
                    key={idx}
                    className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`}
                    aria-label={`Go to slide ${idx + 1}`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Strip */}
          <div className="hero-features-strip" style={{ marginTop: '2rem' }}>
            <div className="hero-feature-item">
              <div className="hero-feature-val">₹100 / ₹200 / ₹300</div>
              <div className="hero-feature-label">Flexible Consultation Tiers</div>
            </div>
            <div className="hero-feature-item">
              <div className="hero-feature-val">2 Dedicated Coaches</div>
              <div className="hero-feature-label">Palani &amp; Vijayashanthi</div>
            </div>
            <div className="hero-feature-item">
              <div className="hero-feature-val">Private 1-on-1 Chat</div>
              <div className="hero-feature-label">Direct Verified Access</div>
            </div>
            <div className="hero-feature-item">
              <div className="hero-feature-val">Digital Health Form</div>
              <div className="hero-feature-label">Personalized Intake &amp; Consent</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE WELLNESS FEATURE 1: BMI & CALORIE CALCULATOR
          ========================================================================= */}
      <section className="section section-spacious section-bg-wellness">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="editorial-eyebrow">Interactive Wellness Tool</span>
            <h2 className="section-title">Instant Health &amp; Caloric Assessment</h2>
            <p className="section-desc">
              Calculate your Body Mass Index (BMI) and discover tailored daily caloric targets.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center', maxWidth: '1020px', margin: '0 auto' }}>
            {/* Interactive Inputs */}
            <div className="calculator-card">
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scale size={20} color="var(--color-logo-green)" />
                Adjust Your Parameters
              </h3>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Height (cm)</label>
                  <strong style={{ color: 'var(--color-dark)' }}>{calcHeight} cm</strong>
                </div>
                <input
                  type="range"
                  min="130"
                  max="210"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-logo-green)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Weight (kg)</label>
                  <strong style={{ color: 'var(--color-dark)' }}>{calcWeight} kg</strong>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-logo-green)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={calcGender} onChange={(e) => setCalcGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Activity Level</label>
                  <select className="form-input" value={calcActivity} onChange={(e) => setCalcActivity(e.target.value)}>
                    <option value="sedentary">Sedentary (Desk)</option>
                    <option value="moderate">Moderate Exercise</option>
                    <option value="active">High Physical Activity</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                Ideal healthy weight range for your height: <strong>{idealWeightMin} kg - {idealWeightMax} kg</strong>
              </div>
            </div>

            {/* Live Visual Gauge & Advice */}
            <div className="calculator-card" style={{ textAlign: 'center' }}>
              <span className="editorial-eyebrow">Calculated Health Metric</span>

              <div className="gauge-container">
                <svg className="gauge-svg" viewBox="0 0 200 110">
                  <path
                    className="gauge-track"
                    d="M 20 100 A 80 80 0 0 1 180 100"
                  />
                  <path
                    className="gauge-progress"
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    style={{
                      stroke: bmiColor,
                      strokeDasharray: '251',
                      strokeDashoffset: `${Math.max(0, Math.min(251, (1 - (bmiVal - 15) / 20) * 251))}`
                    }}
                  />
                </svg>

                <div className="gauge-value-number" style={{ color: bmiColor }}>
                  {bmiVal}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="badge" style={{ background: bmiColor, color: '#fff', fontSize: '0.9rem', padding: '0.35rem 0.9rem' }}>
                    {bmiLabel}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-tint)', padding: '1.25rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0 1.25rem', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated Daily Caloric Need</span>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--color-dark)', margin: '0.2rem 0' }}>
                  ~{dailyCalories} kcal / day
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)', margin: 0 }}>
                  Consult our coaches for tailored caloric deficits or muscle surplus blueprints.
                </p>
              </div>

              <button className="btn btn-primary btn-block" onClick={() => setActivePage('health-assessment')} style={{ width: '100%' }}>
                Fill Full Digital Health Assessment &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODULE 10: INTERACTIVE "FIND MY COACH" RECOMMENDATION WIZARD
          ========================================================================= */}
      <section className="section section-spacious">
        <div className="container" style={{ maxWidth: '960px' }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="editorial-eyebrow">Module 10 &bull; Coach Recommendation</span>
            <h2 className="section-title">Find the Perfect Wellness Coach</h2>
            <p className="section-desc">
              Answer 2 quick questions to get matched with the advisor specialized in your wellness goals.
            </p>
          </div>

          <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-dark)', display: 'block', marginBottom: '0.75rem' }}>
                1. What is your primary wellness goal?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {[
                  { id: 'Weight Loss & Digestion', label: 'Weight & Gut Health' },
                  { id: 'Skin & Radiance', label: 'Skin Vitality & Glow' },
                  { id: 'Children & Family', label: 'Children & Family' },
                  { id: '21 Days Transformation', label: '21 Days Transformation' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`quiz-pill-btn ${quizGoal === opt.id ? 'selected' : ''}`}
                    onClick={() => handleMatchCoach(opt.id, quizGenderPref)}
                  >
                    <CheckCircle size={16} color={quizGoal === opt.id ? 'var(--color-logo-green)' : 'var(--color-border)'} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-dark)', display: 'block', marginBottom: '0.75rem' }}>
                2. Do you have a coach preference?
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {['Any', 'Male (Palani Manickam)', 'Female (Vijayashanthi)'].map(pref => {
                  const val = pref.startsWith('Male') ? 'Male' : pref.startsWith('Female') ? 'Female' : 'Any';
                  return (
                    <button
                      key={pref}
                      type="button"
                      className={`quiz-pill-btn ${quizGenderPref === val ? 'selected' : ''}`}
                      style={{ width: 'auto' }}
                      onClick={() => handleMatchCoach(quizGoal || 'Weight Loss & Digestion', val)}
                    >
                      <UserCheck size={16} color={quizGenderPref === val ? 'var(--color-logo-green)' : 'var(--color-border)'} />
                      <span>{pref}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matched Coach Reveal Card */}
            {matchedCoach && (
              <div className="coach-match-reveal">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <img
                    src={matchedCoach.image_url || (matchedCoach.name.includes('Palani') ? '/coach_palani.jpg' : '/coach_vijaya.jpg')}
                    alt={matchedCoach.name}
                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: 'var(--shadow-card)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <span className="badge badge-success" style={{ marginBottom: '0.4rem' }}>
                      Recommended Match
                    </span>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '600', color: 'var(--color-dark)' }}>
                      {matchedCoach.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-muted-sage)', margin: '0.2rem 0 0.6rem' }}>
                      {matchExplanation}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-dark)' }}>
                        Consultation from ₹{matchedCoach.consultation_fee || 200}
                      </span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSelectCoach(matchedCoach.id || matchedCoach.coach_id)}
                      >
                        Book With {matchedCoach.name} &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODULE 10: THE TWO COACHES SHOWCASE
          ========================================================================= */}
      <section className="section section-spacious section-bg-wellness">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="editorial-eyebrow">Dedicated Certified Advisors</span>
            <h2 className="section-title">Meet Our Two Official Coaches</h2>
            <p className="section-desc">
              PV Nutrition Center is led by senior certified wellness advisors with decades of combined experience.
            </p>
          </div>

          <div className="coaches-editorial-grid" style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* Coach 1: Palani Manickam */}
            <div className="coach-card-editorial">
              <div className="coach-card-photo-wrapper">
                <img
                  src="/coach_palani.jpg"
                  alt="Palani Manickam"
                  className="coach-card-photo"
                />
              </div>
              <div className="coach-card-body">
                <h3 className="coach-card-name">Palani Manickam</h3>
                <div className="coach-card-role">Senior Wellness Coach &bull; 8+ Years</div>
                <p className="coach-card-bio">
                  Specialized in structured weight management, digestive balance, and tailored 21-day lifestyle transformation guidance.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '1rem 0' }}>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>Weight Management</span>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>Digestive Health</span>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>21-Day Transformation</span>
                </div>
                <div className="coach-card-footer">
                  <div className="coach-card-price">
                    ₹200 <span>/ consultation</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSelectCoach('cch_palani_01')}
                  >
                    View Profile &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Coach 2: Vijayashanthi */}
            <div className="coach-card-editorial">
              <div className="coach-card-photo-wrapper">
                <img
                  src="/coach_vijaya.jpg"
                  alt="Vijayashanthi"
                  className="coach-card-photo"
                />
              </div>
              <div className="coach-card-body">
                <h3 className="coach-card-name">Vijayashanthi</h3>
                <div className="coach-card-role">Certified Wellness Coach &bull; 6+ Years</div>
                <p className="coach-card-bio">
                  Specialized in cellular skin vitality, children's nutrition, balanced family wellness, and holistic daily habits.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '1rem 0' }}>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>Skin Vitality</span>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>Children Nutrition</span>
                  <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)' }}>Family Fitness</span>
                </div>
                <div className="coach-card-footer">
                  <div className="coach-card-price">
                    ₹200 <span>/ consultation</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSelectCoach('cch_vijayashanthi_02')}
                  >
                    View Profile &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODULE 6 & 7: 4-STEP JOURNEY
          ========================================================================= */}
      <section className="section section-spacious">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="editorial-eyebrow">Seamless Flow</span>
            <h2 className="section-title">How Consultation Works</h2>
            <p className="section-desc">
              From appointment slot booking to private unlocked chat with your advisor.
            </p>
          </div>

          <div className="process-editorial-grid">
            <div className="process-editorial-card">
              <div className="process-step-num">01</div>
              <h3 className="process-step-title">Choose Service &amp; Tier</h3>
              <p className="process-step-desc">
                Select from ₹100 query, ₹200 standard consultation, ₹300 deep-dive, or full coaching packages.
              </p>
            </div>

            <div className="process-editorial-card">
              <div className="process-step-num">02</div>
              <h3 className="process-step-title">Pick Date &amp; Time Slot</h3>
              <p className="process-step-desc">
                Choose an appointment date and reserved time slot with real-time duplicate collision protection.
              </p>
            </div>

            <div className="process-editorial-card">
              <div className="process-step-num">03</div>
              <h3 className="process-step-title">Razorpay Payment</h3>
              <p className="process-step-desc">
                Complete payment securely via UPI, Card, or NetBanking. Instant receipt generated upon verification.
              </p>
            </div>

            <div className="process-editorial-card">
              <div className="process-step-num">04</div>
              <h3 className="process-step-title">Private Chat Unlocks</h3>
              <p className="process-step-desc">
                1-on-1 private messaging with photo attachment upload and ongoing progress chart tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODULE 1 & 13: CUSTOMER ENQUIRY FORM
          ========================================================================= */}
      <section className="section section-bg-wellness">
        <div className="container" style={{ maxWidth: '780px' }}>
          <div className="card" style={{ padding: '3rem 2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span className="editorial-eyebrow">Module 1 &bull; Direct Connect</span>
              <h2 style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>Have a Question? Send an Enquiry</h2>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.94rem' }}>
                Leave your details and our wellness advisors will reach out with guidance.
              </p>
            </div>

            {enquirySuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle size={36} color="var(--color-logo-green)" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-dark)', marginBottom: '0.25rem' }}>Enquiry Received!</h3>
                <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.9rem' }}>
                  Thank you! Our wellness team will get in touch with you shortly.
                </p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setEnquirySuccess(false)}>
                  Send Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Your name"
                      value={enquiryName}
                      onChange={(e) => setEnquiryName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="name@example.com"
                      value={enquiryEmail}
                      onChange={(e) => setEnquiryEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 98401 23456"
                      value={enquiryPhone}
                      onChange={(e) => setEnquiryPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label className="form-label">Message / Wellness Query *</label>
                  <textarea
                    rows={3}
                    required
                    className="form-input"
                    placeholder="Tell us about your nutrition goals, queries, or coaching questions..."
                    value={enquiryMessage}
                    onChange={(e) => setEnquiryMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={enquirySending}
                  style={{ width: '100%' }}
                >
                  {enquirySending ? 'Submitting...' : 'Submit Customer Enquiry'} <Send size={15} style={{ marginLeft: '6px' }} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
