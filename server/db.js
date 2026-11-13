const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB template with all 14 modules
const defaultData = {
  users: [],
  coaches: [],
  consultations: [],
  payments: [],
  messages: [],
  posters: [],
  categories: [],
  services: [],
  health_assessments: [],
  wellness_progress: [],
  enquiries: [],
  notifications: [],
  audit_logs: [],
  system_settings: {
    centre_name: 'PV Nutrition Center',
    tagline: 'HEALTH IS WEALTH - Online Consultation & Lifestyle Wellness',
    address: 'PV Nutrition Center, Main Road, Thanjavur, Tamil Nadu 613001',
    phone_primary: '90477 93275',
    phone_secondary: '74182 78569',
    email: 'contact@pvnutrition.com',
    working_hours: 'Mon - Sat: 7:00 AM - 8:30 PM | Sun: 8:00 AM - 1:00 PM',
    razorpay_test_mode: true,
    notifications_enabled: {
      email_otp: true,
      booking_confirmation: true,
      payment_alert: true,
      appointment_reminder: true,
      package_expiry: true
    }
  }
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Ensure all tables exist
    return { ...defaultData, ...parsed };
  } catch (err) {
    console.error('Error reading db:', err);
    return defaultData;
  }
}

function writeDb(data) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Database helper functions
const db = {
  get: readDb,
  save: writeDb,

  // ==========================================
  // USERS
  // ==========================================
  findUserByEmail(email) {
    const data = readDb();
    return data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id) {
    const data = readDb();
    return data.users.find(u => u.id === id);
  },

  createUser(userData) {
    const data = readDb();
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      gender: userData.gender || 'Not specified',
      age: userData.age || null,
      dob: userData.dob || '',
      is_verified: userData.is_verified || false,
      is_active: true,
      ...userData,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    writeDb(data);
    return newUser;
  },

  updateUser(id, updates) {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index] = { ...data.users[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.users[index];
  },

  deleteUser(id) {
    const data = readDb();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    data.users.splice(index, 1);
    writeDb(data);
    return true;
  },

  getAllCustomers() {
    const data = readDb();
    return data.users.filter(u => u.role === 'customer').map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });
  },

  // ==========================================
  // COACHES
  // ==========================================
  getCoaches(includeInactive = false) {
    const data = readDb();
    if (includeInactive) return data.coaches || [];
    return (data.coaches || []).filter(c => c.is_active);
  },

  getCoachById(id) {
    const data = readDb();
    return (data.coaches || []).find(c => c.id === id || c.coach_id === id);
  },

  getCoachByUserId(userId) {
    const data = readDb();
    return (data.coaches || []).find(c => c.user_id === userId);
  },

  createCoach(coachData) {
    const data = readDb();
    const newCoach = {
      id: 'cch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      is_active: true,
      working_hours: '08:00 AM - 08:00 PM',
      expertise: ['Weight Management', 'Balanced Nutrition'],
      ...coachData,
      created_at: new Date().toISOString()
    };
    data.coaches.push(newCoach);
    writeDb(data);
    return newCoach;
  },

  updateCoach(id, updates) {
    const data = readDb();
    const index = data.coaches.findIndex(c => c.id === id || c.coach_id === id);
    if (index === -1) return null;
    data.coaches[index] = { ...data.coaches[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.coaches[index];
  },

  deleteCoach(id) {
    const data = readDb();
    const index = data.coaches.findIndex(c => c.id === id || c.coach_id === id);
    if (index === -1) return false;
    data.coaches[index].is_active = false;
    writeDb(data);
    return true;
  },

  // ==========================================
  // POSTERS & CONTENT MANAGEMENT (MODULE 2)
  // ==========================================
  getPosters(activeOnly = true) {
    const data = readDb();
    const posters = data.posters || [];
    if (!activeOnly) return posters.sort((a, b) => (a.order || 0) - (b.order || 0));
    const now = new Date().toISOString().split('T')[0];
    return posters
      .filter(p => p.is_active && (!p.start_date || p.start_date <= now) && (!p.end_date || p.end_date >= now))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  createPoster(posterData) {
    const data = readDb();
    if (!data.posters) data.posters = [];
    const newPoster = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: posterData.title || 'Wellness Poster',
      subtitle: posterData.subtitle || '',
      image_url: posterData.image_url || '/wellness_hero.jpg',
      button_text: posterData.button_text || 'Book Consultation',
      button_link: posterData.button_link || 'coaches',
      order: posterData.order || data.posters.length + 1,
      is_active: posterData.is_active !== undefined ? posterData.is_active : true,
      start_date: posterData.start_date || '',
      end_date: posterData.end_date || '',
      created_at: new Date().toISOString()
    };
    data.posters.push(newPoster);
    writeDb(data);
    return newPoster;
  },

  updatePoster(id, updates) {
    const data = readDb();
    if (!data.posters) data.posters = [];
    const index = data.posters.findIndex(p => p.id === id);
    if (index === -1) return null;
    data.posters[index] = { ...data.posters[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.posters[index];
  },

  deletePoster(id) {
    const data = readDb();
    if (!data.posters) return false;
    data.posters = data.posters.filter(p => p.id !== id);
    writeDb(data);
    return true;
  },

  // ==========================================
  // SERVICE CATEGORIES & SERVICES (MODULE 3 & 7)
  // ==========================================
  getCategories(publishedOnly = true) {
    const data = readDb();
    const categories = data.categories || [];
    if (!publishedOnly) return categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    return categories.filter(c => c.is_published !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  createCategory(catData) {
    const data = readDb();
    if (!data.categories) data.categories = [];
    const newCat = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: catData.name,
      description: catData.description || '',
      icon: catData.icon || 'Sparkles',
      image_url: catData.image_url || '',
      order: catData.order || data.categories.length + 1,
      is_published: catData.is_published !== undefined ? catData.is_published : true,
      created_at: new Date().toISOString()
    };
    data.categories.push(newCat);
    writeDb(data);
    return newCat;
  },

  updateCategory(id, updates) {
    const data = readDb();
    if (!data.categories) data.categories = [];
    const index = data.categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    data.categories[index] = { ...data.categories[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.categories[index];
  },

  deleteCategory(id) {
    const data = readDb();
    if (!data.categories) return false;
    data.categories = data.categories.filter(c => c.id !== id);
    writeDb(data);
    return true;
  },

  getServices(publishedOnly = true) {
    const data = readDb();
    const services = data.services || [];
    if (!publishedOnly) return services.sort((a, b) => (a.order || 0) - (b.order || 0));
    return services.filter(s => s.is_published !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getServiceById(id) {
    const data = readDb();
    return (data.services || []).find(s => s.id === id);
  },

  createService(serviceData) {
    const data = readDb();
    if (!data.services) data.services = [];
    const newService = {
      id: 'srv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: serviceData.name,
      category_id: serviceData.category_id || '',
      type: serviceData.type || 'consultation', // 'consultation' | 'weekly_package' | 'monthly_package'
      price: Number(serviceData.price) || 200,
      duration: serviceData.duration || '30 Mins',
      sessions: Number(serviceData.sessions) || 1,
      validity_days: Number(serviceData.validity_days) || 7,
      chat_access_days: Number(serviceData.chat_access_days) || 7,
      description: serviceData.description || '',
      benefits: Array.isArray(serviceData.benefits) ? serviceData.benefits : [],
      is_published: serviceData.is_published !== undefined ? serviceData.is_published : true,
      order: serviceData.order || data.services.length + 1,
      created_at: new Date().toISOString()
    };
    data.services.push(newService);
    writeDb(data);
    return newService;
  },

  updateService(id, updates) {
    const data = readDb();
    if (!data.services) data.services = [];
    const index = data.services.findIndex(s => s.id === id);
    if (index === -1) return null;
    data.services[index] = { ...data.services[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.services[index];
  },

  deleteService(id) {
    const data = readDb();
    if (!data.services) return false;
    data.services = data.services.filter(s => s.id !== id);
    writeDb(data);
    return true;
  },

  // ==========================================
  // CONSULTATIONS & BOOKINGS (MODULE 6)
  // ==========================================
  createConsultation({ customer_id, coach_id, fee, service_id, service_name, date, time_slot }) {
    const data = readDb();
    const newConsultation = {
      id: 'cns_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      customer_id,
      coach_id,
      service_id: service_id || 'srv_std_200',
      service_name: service_name || 'Standard Wellness Consultation',
      date: date || new Date().toISOString().split('T')[0],
      time_slot: time_slot || '10:00 AM - 10:30 AM',
      fee: Number(fee) || 200,
      status: 'pending', // 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
      payment_id: null,
      coach_notes: '',
      reschedule_reason: '',
      cancellation_reason: '',
      created_at: new Date().toISOString(),
      paid_at: null
    };
    data.consultations.push(newConsultation);
    writeDb(data);
    return newConsultation;
  },

  getConsultationById(id) {
    const data = readDb();
    return data.consultations.find(c => c.id === id);
  },

  isSlotBooked(coachId, date, timeSlot) {
    const data = readDb();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    return data.consultations.some(c => {
      if (c.coach_id !== coachId || c.date !== date || c.time_slot !== timeSlot) {
        return false;
      }
      if (c.status === 'cancelled') return false;
      if (c.status === 'pending') {
        // Abandoned pending slot reservations expire after 15 minutes to prevent slot locking DOS
        return (c.created_at || '') > fifteenMinutesAgo;
      }
      return true;
    });
  },

  getCustomerActiveConsultation(customerId, coachId) {
    const data = readDb();
    const paid = data.consultations.find(
      c => c.customer_id === customerId && c.coach_id === coachId && (c.status === 'confirmed' || c.status === 'in_progress' || c.status === 'paid')
    );
    if (paid) return paid;
    return data.consultations.find(
      c => c.customer_id === customerId && c.coach_id === coachId && c.status === 'pending'
    );
  },

  getCustomerPaidConsultations(customerId) {
    const data = readDb();
    return data.consultations.filter(c => c.customer_id === customerId && (c.status === 'confirmed' || c.status === 'in_progress' || c.status === 'completed' || c.status === 'paid'));
  },

  getAllCustomerConsultations(customerId) {
    const data = readDb();
    return data.consultations.filter(c => c.customer_id === customerId);
  },

  getCoachPaidConsultations(coachId) {
    const data = readDb();
    return data.consultations.filter(c => (c.coach_id === coachId || c.coach_id === 'cch_' + coachId) && (c.status === 'confirmed' || c.status === 'in_progress' || c.status === 'completed' || c.status === 'paid'));
  },

  getAllConsultations() {
    const data = readDb();
    return data.consultations;
  },

  updateConsultation(id, updates) {
    const data = readDb();
    const index = data.consultations.findIndex(c => c.id === id);
    if (index === -1) return null;
    data.consultations[index] = { ...data.consultations[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.consultations[index];
  },

  markConsultationPaid(consultationId, paymentId) {
    const data = readDb();
    const c = data.consultations.find(x => x.id === consultationId);
    if (!c) return null;
    c.status = 'confirmed';
    c.payment_id = paymentId;
    c.paid_at = new Date().toISOString();
    writeDb(data);
    return c;
  },

  // ==========================================
  // PAYMENTS & TRANSACTIONS (MODULE 8)
  // ==========================================
  createPaymentRecord(paymentData) {
    const data = readDb();
    const newPayment = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      status: 'created', // 'created' | 'successful' | 'failed' | 'refunded'
      method: paymentData.method || 'Razorpay Online',
      refund_reason: null,
      refunded_at: null,
      ...paymentData,
      created_at: new Date().toISOString()
    };
    data.payments.push(newPayment);
    writeDb(data);
    return newPayment;
  },

  updatePaymentRecord(id, updates) {
    const data = readDb();
    const index = data.payments.findIndex(p => p.id === id || p.razorpay_order_id === id);
    if (index === -1) return null;
    data.payments[index] = { ...data.payments[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.payments[index];
  },

  getPaymentById(id) {
    const data = readDb();
    return data.payments.find(p => p.id === id || p.razorpay_order_id === id);
  },

  getAllPayments() {
    const data = readDb();
    return data.payments;
  },

  // ==========================================
  // MESSAGES & CHAT (MODULE 9)
  // ==========================================
  getMessagesByConsultation(consultationId) {
    const data = readDb();
    return (data.messages || []).filter(m => m.consultation_id === consultationId);
  },

  createMessage({ consultation_id, sender_id, sender_name, sender_role, receiver_id, text, attachment_url, attachment_name, attachment_type }) {
    const data = readDb();
    if (!data.messages) data.messages = [];
    const newMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      consultation_id,
      sender_id,
      sender_name,
      sender_role,
      receiver_id,
      text: text || '',
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null,
      timestamp: new Date().toISOString()
    };
    data.messages.push(newMessage);
    writeDb(data);
    return newMessage;
  },

  // ==========================================
  // HEALTH ASSESSMENT & REGISTRATION (MODULE 5)
  // ==========================================
  getHealthAssessmentByCustomer(customerId) {
    const data = readDb();
    return (data.health_assessments || []).find(h => h.customer_id === customerId);
  },

  saveHealthAssessment(customerId, assessmentData) {
    const data = readDb();
    if (!data.health_assessments) data.health_assessments = [];
    const index = data.health_assessments.findIndex(h => h.customer_id === customerId);

    // Auto-calculate BMI
    let bmi = null;
    let bmi_category = 'Normal';
    const heightM = Number(assessmentData.height_cm) / 100;
    const weightKg = Number(assessmentData.weight_kg);
    if (heightM > 0 && weightKg > 0) {
      bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
      if (bmi < 18.5) bmi_category = 'Underweight';
      else if (bmi < 24.9) bmi_category = 'Healthy';
      else if (bmi < 29.9) bmi_category = 'Overweight';
      else bmi_category = 'Obese';
    }

    const payload = {
      customer_id: customerId,
      ...assessmentData,
      bmi,
      bmi_category,
      consent_agreed: Boolean(assessmentData.consent_agreed),
      consent_timestamp: assessmentData.consent_agreed ? (assessmentData.consent_timestamp || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    };

    if (index >= 0) {
      data.health_assessments[index] = { ...data.health_assessments[index], ...payload };
    } else {
      payload.id = 'hlth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      payload.created_at = new Date().toISOString();
      data.health_assessments.push(payload);
    }

    writeDb(data);
    return index >= 0 ? data.health_assessments[index] : payload;
  },

  // ==========================================
  // WELLNESS PROGRESS TRACKING (MODULE 11)
  // ==========================================
  getProgressByCustomer(customerId) {
    const data = readDb();
    return (data.wellness_progress || [])
      .filter(p => p.customer_id === customerId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  addProgressRecord(recordData) {
    const data = readDb();
    if (!data.wellness_progress) data.wellness_progress = [];
    const heightM = Number(recordData.height_cm || 170) / 100;
    const weightKg = Number(recordData.weight_kg);
    const bmi = (heightM > 0 && weightKg > 0) ? Number((weightKg / (heightM * heightM)).toFixed(1)) : null;

    const newRecord = {
      id: 'prg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      customer_id: recordData.customer_id,
      coach_id: recordData.coach_id || null,
      date: recordData.date || new Date().toISOString().split('T')[0],
      weight_kg: Number(recordData.weight_kg) || 0,
      waist_inches: Number(recordData.waist_inches) || 0,
      chest_inches: Number(recordData.chest_inches) || 0,
      hips_inches: Number(recordData.hips_inches) || 0,
      bmi: bmi || recordData.bmi || null,
      water_liters: Number(recordData.water_liters) || 2.5,
      energy_level: Number(recordData.energy_level) || 7, // 1 to 10
      notes: recordData.notes || '',
      coach_feedback: recordData.coach_feedback || '',
      created_at: new Date().toISOString()
    };
    data.wellness_progress.push(newRecord);
    writeDb(data);
    return newRecord;
  },

  getProgressRecordById(id) {
    const data = readDb();
    return (data.wellness_progress || []).find(p => p.id === id);
  },

  updateProgressRecord(id, updates) {
    const data = readDb();
    if (!data.wellness_progress) data.wellness_progress = [];
    const index = data.wellness_progress.findIndex(p => p.id === id);
    if (index === -1) return null;
    data.wellness_progress[index] = { ...data.wellness_progress[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.wellness_progress[index];
  },

  // ==========================================
  // CUSTOMER ENQUIRIES (MODULE 1 & 13)
  // ==========================================
  getEnquiries() {
    const data = readDb();
    return (data.enquiries || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  createEnquiry(enquiryData) {
    const data = readDb();
    if (!data.enquiries) data.enquiries = [];
    const newEnquiry = {
      id: 'enq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: enquiryData.name,
      email: enquiryData.email,
      phone: enquiryData.phone,
      service_interest: enquiryData.service_interest || 'General Wellness',
      message: enquiryData.message,
      status: 'new', // 'new' | 'contacted' | 'resolved'
      admin_note: '',
      created_at: new Date().toISOString()
    };
    data.enquiries.push(newEnquiry);
    writeDb(data);
    return newEnquiry;
  },

  updateEnquiry(id, updates) {
    const data = readDb();
    if (!data.enquiries) data.enquiries = [];
    const index = data.enquiries.findIndex(e => e.id === id);
    if (index === -1) return null;
    data.enquiries[index] = { ...data.enquiries[index], ...updates, updated_at: new Date().toISOString() };
    writeDb(data);
    return data.enquiries[index];
  },

  // ==========================================
  // NOTIFICATIONS (MODULE 12)
  // ==========================================
  getNotificationsByUser(userId) {
    const data = readDb();
    return (data.notifications || [])
      .filter(n => n.user_id === userId || n.user_id === 'all')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  createNotification({ user_id, title, message, type = 'system' }) {
    const data = readDb();
    if (!data.notifications) data.notifications = [];
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id,
      title,
      message,
      type, // 'otp' | 'booking' | 'payment' | 'reminder' | 'system'
      read: false,
      created_at: new Date().toISOString()
    };
    data.notifications.push(newNotif);
    writeDb(data);
    return newNotif;
  },

  markNotificationRead(id) {
    const data = readDb();
    if (!data.notifications) return null;
    const index = data.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;
    data.notifications[index].read = true;
    writeDb(data);
    return data.notifications[index];
  },

  markAllNotificationsRead(userId) {
    const data = readDb();
    if (!data.notifications) return;
    data.notifications.forEach(n => {
      if (n.user_id === userId || n.user_id === 'all') {
        n.read = true;
      }
    });
    writeDb(data);
  },

  // ==========================================
  // AUDIT LOGS & SYSTEM SETTINGS (MODULE 14)
  // ==========================================
  getAuditLogs() {
    const data = readDb();
    return (data.audit_logs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  addAuditLog(userId, action, details, ip = '127.0.0.1') {
    const data = readDb();
    if (!data.audit_logs) data.audit_logs = [];
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      action,
      details,
      ip,
      timestamp: new Date().toISOString()
    };
    data.audit_logs.push(log);
    // Keep max 200 logs
    if (data.audit_logs.length > 200) {
      data.audit_logs = data.audit_logs.slice(-200);
    }
    writeDb(data);
    return log;
  },

  getSystemSettings() {
    const data = readDb();
    return data.system_settings || defaultData.system_settings;
  },

  updateSystemSettings(newSettings) {
    const data = readDb();
    data.system_settings = { ...data.system_settings, ...newSettings };
    writeDb(data);
    return data.system_settings;
  },

  // ==========================================
  // INITIAL SEEDING (ALL MODULES)
  // ==========================================
  async seedInitialData() {
    const data = readDb();

    // 1. Seed Admin
    if (!data.users.some(u => u.role === 'admin')) {
      const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
      data.users.push({
        id: 'usr_admin_001',
        name: 'PV Admin',
        email: 'admin@pvnutrition.com',
        phone: '90477 93275',
        password_hash: adminPasswordHash,
        role: 'admin',
        gender: 'Male',
        age: 38,
        is_verified: true,
        is_active: true,
        created_at: new Date().toISOString()
      });
      console.log('Seeded Admin account: admin@pvnutrition.com / Admin@123');
    }

    // 2. Seed the 2 Coaches: Palani Manickam & Vijayashanthi
    const defaultCoaches = [
      {
        coach_id: 'cch_palani_01',
        user_id: 'usr_coach_palani',
        name: 'Palani Manickam',
        phone: '90477 93275',
        email: 'palani@pvnutrition.com',
        gender: 'Male',
        bio: 'Senior Wellness Coach specializing in Weight Management, Digestive & Bone Health, and Personalized 21 Days Wellness Transformation.',
        experience: '8+ Years Experience',
        consultation_fee: 200,
        working_hours: '08:00 AM - 08:30 PM (Mon - Sat)',
        expertise: ['Weight Management', 'Digestive & Gut Health', '21-Day Transformation', 'Vital Energy'],
        image_url: '/coach_palani.jpg',
        is_active: true
      },
      {
        coach_id: 'cch_vijayashanthi_02',
        user_id: 'usr_coach_vijaya',
        name: 'Vijayashanthi',
        phone: '74182 78569',
        email: 'vijayashanthi@pvnutrition.com',
        gender: 'Female',
        bio: 'Certified Wellness Coach dedicated to Skin Health, Children Nutrition, Family Fitness, and Lifestyle Wellness Coaching.',
        experience: '6+ Years Experience',
        consultation_fee: 200,
        working_hours: '08:30 AM - 07:30 PM (Mon - Sat)',
        expertise: ['Skin Vitality & Radiance', 'Children Nutrition', 'Family Fitness', 'Immunity Boost'],
        image_url: '/coach_vijaya.jpg',
        is_active: true
      }
    ];

    for (const coach of defaultCoaches) {
      if (!data.users.some(u => u.email.toLowerCase() === coach.email.toLowerCase())) {
        const coachPasswordHash = await bcrypt.hash('Coach@123', 10);
        data.users.push({
          id: coach.user_id,
          name: coach.name,
          email: coach.email,
          phone: coach.phone,
          password_hash: coachPasswordHash,
          role: 'coach',
          gender: coach.gender,
          is_verified: true,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }

      if (!data.coaches.some(c => c.id === coach.coach_id)) {
        data.coaches.push({
          id: coach.coach_id,
          user_id: coach.user_id,
          name: coach.name,
          phone: coach.phone,
          email: coach.email,
          gender: coach.gender,
          bio: coach.bio,
          experience: coach.experience,
          consultation_fee: coach.consultation_fee,
          working_hours: coach.working_hours,
          expertise: coach.expertise,
          image_url: coach.image_url,
          is_active: true,
          created_at: new Date().toISOString()
        });
        console.log(`Seeded Coach: ${coach.name}`);
      }
    }

    // 3. Seed Demo Customer
    if (!data.users.some(u => u.email === 'customer@pvnutrition.com')) {
      const custHash = await bcrypt.hash('Customer@123', 10);
      data.users.push({
        id: 'usr_customer_demo',
        name: 'Karthik Raja',
        email: 'customer@pvnutrition.com',
        phone: '98401 23456',
        password_hash: custHash,
        role: 'customer',
        gender: 'Male',
        age: 29,
        dob: '1997-04-15',
        is_verified: true,
        is_active: true,
        created_at: new Date().toISOString()
      });
      console.log('Seeded Customer: customer@pvnutrition.com / Customer@123');
    }

    // 4. Seed Homepage Posters (Module 2)
    if (!data.posters || data.posters.length === 0) {
      data.posters = [
        {
          id: 'post_01',
          title: 'HEALTH IS WEALTH',
          subtitle: 'Personalized Nutrition & Tailored 21 Days Wellness Transformation',
          image_url: '/wellness_hero.jpg',
          button_text: 'Book Consultation',
          button_link: 'coaches',
          order: 1,
          is_active: true,
          start_date: '2026-01-01',
          end_date: '2028-12-31',
          created_at: new Date().toISOString()
        },
        {
          id: 'post_02',
          title: 'Transform Your Everyday Energy',
          subtitle: 'Holistic Nutrition, Weight Balance & Cellular Vitality with Certified Advisors',
          image_url: '/banner.jpg',
          button_text: 'Explore Packages',
          button_link: 'services',
          order: 2,
          is_active: true,
          start_date: '2026-01-01',
          end_date: '2028-12-31',
          created_at: new Date().toISOString()
        },
        {
          id: 'post_03',
          title: 'Complete Family & Children Nutrition',
          subtitle: 'Science-backed guidance for balanced immunity, bone strength and natural glow',
          image_url: '/solutions.jpg',
          button_text: 'Meet Our Coaches',
          button_link: 'coaches',
          order: 3,
          is_active: true,
          start_date: '2026-01-01',
          end_date: '2028-12-31',
          created_at: new Date().toISOString()
        }
      ];
      console.log('Seeded Homepage Posters');
    }

    // 5. Seed Service Categories (Module 3)
    if (!data.categories || data.categories.length === 0) {
      data.categories = [
        {
          id: 'cat_weight',
          name: 'Weight Management',
          description: 'Tailored calorie, protein and metabolism balance for sustainable weight loss or healthy gain.',
          icon: 'Scale',
          order: 1,
          is_published: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'cat_skin',
          name: 'Skin & Cellular Health',
          description: 'Nutrient-rich internal cellular nourishment for radiant skin, anti-aging, and vital energy.',
          icon: 'Sparkles',
          order: 2,
          is_published: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'cat_children',
          name: 'Children & Family Nutrition',
          description: 'Wholesome immune-strengthening meals for growing kids, family stamina, and balanced lifestyle.',
          icon: 'HeartHandshake',
          order: 3,
          is_published: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'cat_gut',
          name: 'Digestive & Gut Health',
          description: 'Soothing gut-friendly meal planning for optimal digestion, metabolic absorption, and comfort.',
          icon: 'Activity',
          order: 4,
          is_published: true,
          created_at: new Date().toISOString()
        }
      ];
      console.log('Seeded Service Categories');
    }

    // 6. Seed Services & Packages (Module 3 & 7: ₹100, ₹200, ₹300 + Packages)
    if (!data.services || data.services.length === 0) {
      data.services = [
        {
          id: 'srv_quick_100',
          name: 'Quick Wellness Query',
          category_id: 'cat_weight',
          type: 'consultation',
          price: 100,
          duration: '15 Mins',
          sessions: 1,
          validity_days: 3,
          chat_access_days: 3,
          description: 'Quick focused session to address immediate dietary questions, routine checks, or quick lifestyle tips.',
          benefits: ['15-minute direct chat consultation', 'Instant diet checklist', '3 days chat validity'],
          is_published: true,
          order: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_std_200',
          name: 'Standard Nutrition Consultation',
          category_id: 'cat_weight',
          type: 'consultation',
          price: 200,
          duration: '30 Mins',
          sessions: 1,
          validity_days: 7,
          chat_access_days: 7,
          description: 'Comprehensive 1-on-1 assessment of your current eating habits, health goals, and preliminary meal roadmap.',
          benefits: ['30-minute in-depth consultation', 'Personalized daily habit guide', '7 days chat follow-up', 'Health assessment review'],
          is_published: true,
          order: 2,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_deep_300',
          name: 'Comprehensive Deep-Dive Consultation',
          category_id: 'cat_gut',
          type: 'consultation',
          price: 300,
          duration: '45 Mins',
          sessions: 1,
          validity_days: 14,
          chat_access_days: 14,
          description: 'Thorough holistic evaluation including body measurements, metabolic markers, and customized nutritional strategy.',
          benefits: ['45-minute comprehensive consultation', 'Complete customized meal schedule', '14 days direct chat support', 'Body composition breakdown'],
          is_published: true,
          order: 3,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_week_999',
          name: '7-Day Starter Wellness Kickstart',
          category_id: 'cat_weight',
          type: 'weekly_package',
          price: 999,
          duration: '7 Days',
          sessions: 3,
          validity_days: 10,
          chat_access_days: 10,
          description: 'Structured 7-day program with 3 dedicated review sessions, daily chat accountability, and hydration & activity tracking.',
          benefits: ['3 coach consultation sessions', 'Daily chat accountability', 'Hydration & routine tracking', 'Tailored starter meal plan'],
          is_published: true,
          order: 4,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_trans_2499',
          name: '21-Day Wellness Transformation',
          category_id: 'cat_skin',
          type: 'monthly_package',
          price: 2499,
          duration: '21 Days',
          sessions: 6,
          validity_days: 30,
          chat_access_days: 30,
          description: 'Signature 21-day program to reset digestion, shed stubborn fat, build muscle tone, and develop lasting lifestyle vitality.',
          benefits: ['6 one-on-one video/chat check-ins', 'Full personalized 21-day nutrition blueprint', 'Weekly measurement & BMI chart reviews', 'Continuous priority coach access'],
          is_published: true,
          order: 5,
          created_at: new Date().toISOString()
        },
        {
          id: 'srv_monthly_3999',
          name: '30-Day Complete Family Wellness',
          category_id: 'cat_children',
          type: 'monthly_package',
          price: 3999,
          duration: '30 Days',
          sessions: 8,
          validity_days: 45,
          chat_access_days: 45,
          description: 'Holistic month-long coaching covering both adults and children with balanced immunity meals and weekly family check-ins.',
          benefits: ['8 comprehensive coaching sessions', 'Family dietary plan & kids immunity guide', 'Unlimited private coach chat for 45 days', 'Custom progress tracking charts'],
          is_published: true,
          order: 6,
          created_at: new Date().toISOString()
        }
      ];
      console.log('Seeded Services & Pricing Options (₹100, ₹200, ₹300, Weekly & Monthly)');
    }

    // 7. Seed Demo Health Assessment (Module 5)
    if (!data.health_assessments || data.health_assessments.length === 0) {
      data.health_assessments = [
        {
          id: 'hlth_demo_01',
          customer_id: 'usr_customer_demo',
          height_cm: 175,
          weight_kg: 78,
          chest_in: 39,
          waist_in: 34,
          hips_in: 40,
          bmi: 25.5,
          bmi_category: 'Overweight',
          health_history: 'Occasional acidity and post-lunch lethargy. Family history of mild hypertension.',
          health_concerns: 'Weight management and improving energy levels throughout the workday.',
          allergies: 'Mild lactose sensitivity.',
          current_medications: 'None.',
          diet_type: 'Non-Vegetarian',
          meals_per_day: '3 meals + evening snack',
          water_liters: 2.5,
          junk_food_frequency: '1-2 times weekly',
          sleep_hours: 6.5,
          sleep_quality: 'Fair',
          exercise_habits: 'Brisk walking 3 days a week for 20 minutes',
          wellness_goals: 'Target 70 kg, improve stamina, reduce waist size to 32 inches',
          consent_agreed: true,
          consent_timestamp: '2026-10-06T10:00:00.000Z',
          created_at: '2026-10-06T10:00:00.000Z',
          updated_at: '2026-10-06T10:00:00.000Z'
        }
      ];
      console.log('Seeded Demo Health Assessment');
    }

    // 8. Seed Demo Wellness Progress (Module 11)
    if (!data.wellness_progress || data.wellness_progress.length === 0) {
      data.wellness_progress = [
        {
          id: 'prg_01',
          customer_id: 'usr_customer_demo',
          coach_id: 'cch_palani_01',
          date: '2026-09-15',
          weight_kg: 81.0,
          waist_inches: 35.5,
          chest_inches: 40.0,
          hips_inches: 41.0,
          bmi: 26.4,
          water_liters: 2.0,
          energy_level: 6,
          notes: 'Starting day of 21-day wellness challenge. Feeling motivated.',
          coach_feedback: 'Great start Karthik! Remember to maintain morning warm water and timely breakfast.',
          created_at: '2026-09-15T09:00:00.000Z'
        },
        {
          id: 'prg_02',
          customer_id: 'usr_customer_demo',
          coach_id: 'cch_palani_01',
          date: '2026-09-22',
          weight_kg: 79.5,
          waist_inches: 34.8,
          chest_inches: 39.5,
          hips_inches: 40.5,
          bmi: 25.9,
          water_liters: 2.8,
          energy_level: 7,
          notes: 'Week 1 complete. Reduced late night snacks. Digestion is much better.',
          coach_feedback: 'Excellent 1.5 kg reduction in week 1. Keep your daily water above 2.5L.',
          created_at: '2026-09-22T09:00:00.000Z'
        },
        {
          id: 'prg_03',
          customer_id: 'usr_customer_demo',
          coach_id: 'cch_palani_01',
          date: '2026-09-29',
          weight_kg: 78.2,
          waist_inches: 34.2,
          chest_inches: 39.0,
          hips_inches: 40.0,
          bmi: 25.5,
          water_liters: 3.0,
          energy_level: 8,
          notes: 'Week 2 complete. Feeling lighter and morning energy has visibly improved.',
          coach_feedback: 'Consistent progress! Waistline is trimming down nicely. Keep protein intake steady.',
          created_at: '2026-09-29T09:00:00.000Z'
        }
      ];
      console.log('Seeded Demo Wellness Progress Records');
    }

    // 9. Seed Initial Notifications (Module 12)
    if (!data.notifications || data.notifications.length === 0) {
      data.notifications = [
        {
          id: 'notif_welcome_admin',
          user_id: 'usr_admin_001',
          title: 'System Initialized',
          message: 'PV Nutrition Center 14-Module Software System is active and healthy.',
          type: 'system',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'notif_welcome_cust',
          user_id: 'usr_customer_demo',
          title: 'Welcome to PV Nutrition Center',
          message: 'Your wellness profile is activated. Explore consultation options from ₹100!',
          type: 'booking',
          read: false,
          created_at: new Date().toISOString()
        }
      ];
      console.log('Seeded Initial Notifications');
    }

    // 10. Seed Demo Enquiry (Module 1 & 13)
    if (!data.enquiries || data.enquiries.length === 0) {
      data.enquiries = [
        {
          id: 'enq_01',
          name: 'Meena Sundaram',
          email: 'meena.s@example.com',
          phone: '98412 87654',
          service_interest: 'Weight Management',
          message: 'Interested in the 21 days wellness transformation for weight loss and post-pregnancy fitness.',
          status: 'contacted',
          admin_note: 'Called customer, shared coach Palani Manickam profile.',
          created_at: new Date().toISOString()
        }
      ];
      console.log('Seeded Demo Enquiry');
    }

    writeDb(data);
  }
};

module.exports = db;
