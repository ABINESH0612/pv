import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, HeartPulse, Scale, Activity, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function HealthAssessment({ setActivePage }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Form State (Module 5)
  const [formData, setFormData] = useState({
    // Step 1: Personal & Lifestyle
    gender: 'Male',
    age: '',
    diet_type: 'Non-Vegetarian',
    meals_per_day: '3 meals + snacks',
    water_liters: '2.5',
    junk_food_frequency: '1-2 times weekly',
    sleep_hours: '7',
    sleep_quality: 'Good',
    exercise_habits: 'Brisk walking / light exercise 3 days a week',

    // Step 2: Body Measurements
    height_cm: '',
    weight_kg: '',
    chest_in: '',
    waist_in: '',
    hips_in: '',

    // Step 3: Health History & Concerns
    health_history: '',
    health_concerns: '',
    allergies: '',
    current_medications: '',

    // Step 4: Goals & Consent
    wellness_goals: '',
    target_weight_kg: '',
    consent_agreed: false
  });

  // Calculate live BMI
  const heightM = Number(formData.height_cm) / 100;
  const weightKg = Number(formData.weight_kg);
  const bmi = (heightM > 0 && weightKg > 0) ? (weightKg / (heightM * heightM)).toFixed(1) : null;

  let bmiCategory = 'Normal';
  let bmiColor = 'var(--color-logo-green)';
  if (bmi) {
    if (bmi < 18.5) { bmiCategory = 'Underweight'; bmiColor = '#3B82F6'; }
    else if (bmi < 24.9) { bmiCategory = 'Healthy Weight'; bmiColor = 'var(--color-logo-green)'; }
    else if (bmi < 29.9) { bmiCategory = 'Overweight'; bmiColor = '#D97706'; }
    else { bmiCategory = 'Obese'; bmiColor = '#DC2626'; }
  }

  useEffect(() => {
    if (!user) {
      setActivePage('login');
      return;
    }

    async function loadExisting() {
      try {
        const res = await api.getHealthAssessment();
        if (res.assessment) {
          setFormData(prev => ({
            ...prev,
            ...res.assessment,
            consent_agreed: Boolean(res.assessment.consent_agreed)
          }));
        } else if (res.userProfile) {
          setFormData(prev => ({
            ...prev,
            age: res.userProfile.age || '',
            gender: res.userProfile.gender || 'Male'
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadExisting();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    setError(null);
    if (step === 2 && (!formData.height_cm || !formData.weight_kg)) {
      setError('Please provide height and weight to calculate baseline metrics.');
      return;
    }
    setStep(prev => Math.min(4, prev + 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setError(null);
    setStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent_agreed) {
      setError('Please tick the consent agreement checkbox to proceed.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const res = await api.saveHealthAssessment(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Failed to save assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Loading health assessment form...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="section section-spacious">
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-surface-subtle)', color: 'var(--color-logo-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={36} />
            </div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>Health Assessment Saved!</h2>
            <p style={{ color: 'var(--color-muted-sage)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your digital registration form has been securely recorded. Your assigned wellness coach can now review your metabolic history, daily habits, and baseline measurements for your upcoming consultation.
            </p>
            {bmi && (
              <div style={{ display: 'inline-block', background: 'var(--bg-surface-tint)', padding: '1rem 2rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase' }}>Baseline BMI</span>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: bmiColor }}>
                  {bmi} &bull; {bmiCategory}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setActivePage('customer-dashboard')}>
                Go to Dashboard
              </button>
              <button className="btn btn-secondary" onClick={() => setActivePage('coaches')}>
                Book / View Consultations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles = [
    'Personal & Lifestyle Habits',
    'Body Measurements & BMI',
    'Health History & Concerns',
    'Wellness Goals & Consent'
  ];

  return (
    <div className="section section-spacious">
      <div className="container" style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="editorial-eyebrow">Module 5 &bull; Digital Intake</span>
          <h1 style={{ fontSize: '2.6rem', marginBottom: '0.5rem' }}>
            Health Assessment Form
          </h1>
          <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.98rem' }}>
            Digital version of PV Nutrition Center's official wellness registration form.
          </p>
        </div>

        {/* Wizard Progress Bar */}
        <div className="wizard-progress-bar">
          <div className="wizard-progress-track"></div>
          <div className="wizard-progress-fill" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>

          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className={`wizard-step-node ${step === idx ? 'active' : step > idx ? 'completed' : ''}`}
              onClick={() => idx < step && setStep(idx)}
              style={{ cursor: idx < step ? 'pointer' : 'default' }}
            >
              {idx < step ? '✓' : idx}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: '600', color: 'var(--color-dark)', fontSize: '1.1rem' }}>
          Step {step} of 4: {stepTitles[step - 1]}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        <div className="card" style={{ padding: '2.5rem' }}>
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal & Lifestyle */}
            {step === 1 && (
              <div className="quiz-step-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select name="gender" className="form-input" value={formData.gender} onChange={handleChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Age (Years)</label>
                    <input
                      type="number"
                      name="age"
                      className="form-input"
                      placeholder="e.g. 29"
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dietary Preference</label>
                    <select name="diet_type" className="form-input" value={formData.diet_type} onChange={handleChange}>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Eggetarian">Eggetarian</option>
                      <option value="Vegan">Vegan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Daily Water Intake (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="water_liters"
                      className="form-input"
                      placeholder="e.g. 2.5"
                      value={formData.water_liters}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Daily Sleep (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      name="sleep_hours"
                      className="form-input"
                      placeholder="e.g. 7"
                      value={formData.sleep_hours}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sleep Quality</label>
                    <select name="sleep_quality" className="form-input" value={formData.sleep_quality} onChange={handleChange}>
                      <option value="Sound / Deep">Sound / Deep</option>
                      <option value="Good">Good</option>
                      <option value="Disturbed">Disturbed</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Daily Exercise &amp; Routine Habits</label>
                  <textarea
                    rows={2}
                    name="exercise_habits"
                    className="form-input"
                    placeholder="e.g. Sedentary desk job, 20 mins morning walking 3 times a week"
                    value={formData.exercise_habits}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Body Measurements */}
            {step === 2 && (
              <div className="quiz-step-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label className="form-label">Height (in cm) *</label>
                    <input
                      type="number"
                      required
                      name="height_cm"
                      className="form-input"
                      placeholder="e.g. 175"
                      value={formData.height_cm}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Weight (in kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      name="weight_kg"
                      className="form-input"
                      placeholder="e.g. 78.5"
                      value={formData.weight_kg}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Waist (in inches)</label>
                    <input
                      type="number"
                      step="0.5"
                      name="waist_in"
                      className="form-input"
                      placeholder="e.g. 34"
                      value={formData.waist_in}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chest (in inches)</label>
                    <input
                      type="number"
                      step="0.5"
                      name="chest_in"
                      className="form-input"
                      placeholder="e.g. 39"
                      value={formData.chest_in}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hips (in inches)</label>
                    <input
                      type="number"
                      step="0.5"
                      name="hips_in"
                      className="form-input"
                      placeholder="e.g. 40"
                      value={formData.hips_in}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Live BMI Gauge Card */}
                {bmi && (
                  <div style={{ background: 'var(--bg-surface-tint)', borderRadius: 'var(--radius-md)', padding: '1.75rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-earth-brown)', fontWeight: '600' }}>
                      Calculated Body Mass Index (BMI)
                    </span>
                    <div style={{ fontSize: '2.8rem', fontFamily: 'var(--font-serif)', fontWeight: '700', color: bmiColor, margin: '0.25rem 0' }}>
                      {bmi}
                    </div>
                    <span className="badge" style={{ background: bmiColor, color: '#fff', fontSize: '0.82rem', padding: '0.3rem 0.8rem' }}>
                      {bmiCategory}
                    </span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', marginTop: '0.75rem' }}>
                      Healthy BMI range is between 18.5 and 24.9. Your wellness coach will formulate tailored caloric targets.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Health History & Concerns */}
            {step === 3 && (
              <div className="quiz-step-card">
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Current Health Concerns &amp; Symptoms</label>
                  <textarea
                    rows={3}
                    name="health_concerns"
                    className="form-input"
                    placeholder="e.g. Low afternoon energy, stubborn belly fat, acid reflux, or irregular meal timings"
                    value={formData.health_concerns}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Health &amp; Family Medical History</label>
                  <textarea
                    rows={2}
                    name="health_history"
                    className="form-input"
                    placeholder="e.g. Thyroid, diabetes, cholesterol, blood pressure, or past surgeries"
                    value={formData.health_history}
                    onChange={handleChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Allergies (Food or Environmental)</label>
                    <input
                      type="text"
                      name="allergies"
                      className="form-input"
                      placeholder="e.g. Peanuts, lactose, gluten, none"
                      value={formData.allergies}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Medications or Supplements</label>
                    <input
                      type="text"
                      name="current_medications"
                      className="form-input"
                      placeholder="e.g. Daily multivitamin, antacids, none"
                      value={formData.current_medications}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Wellness Goals & Consent */}
            {step === 4 && (
              <div className="quiz-step-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Primary Wellness Goal</label>
                    <input
                      type="text"
                      name="wellness_goals"
                      className="form-input"
                      placeholder="e.g. Healthy fat loss, 21-day transformation, skin radiance"
                      value={formData.wellness_goals}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Ideal Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      name="target_weight_kg"
                      className="form-input"
                      placeholder="e.g. 70"
                      value={formData.target_weight_kg}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Explicit Customer Consent (PDF Rule) */}
                <div style={{ background: 'var(--bg-surface-tint)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <input
                      type="checkbox"
                      id="consent_checkbox"
                      name="consent_agreed"
                      checked={formData.consent_agreed}
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer' }}
                    />
                    <label htmlFor="consent_checkbox" style={{ fontSize: '0.88rem', color: 'var(--color-dark)', cursor: 'pointer', lineHeight: 1.55 }}>
                      <strong>Consent Agreement:</strong> I explicitly consent to PV Nutrition Center collecting and storing my personal health data, daily habits, and measurements to provide personalized wellness coaching. I understand this information is strictly for wellness tracking, nutrition habits, and lifestyle coaching, not medical diagnosis or clinical prescription.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              {step > 1 ? (
                <button type="button" className="btn btn-secondary" onClick={handlePrev}>
                  <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Previous
                </button>
              ) : <div></div>}

              {step < 4 ? (
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Next Step <ArrowRight size={16} style={{ marginLeft: '6px' }} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={saving || !formData.consent_agreed}>
                  {saving ? 'Saving Assessment...' : 'Submit Health Assessment'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
