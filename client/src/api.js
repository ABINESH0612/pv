const API_BASE = '/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('pv_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // ==========================================
  // Auth & Profile (Module 4)
  // ==========================================
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async verifyOtp(otp) {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ otp })
    });
    return res.json();
  },

  async resendOtp() {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async resetPassword(email, otp, newPassword) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  async deactivateAccount() {
    const res = await fetch(`${API_BASE}/auth/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Posters & Content (Module 2)
  // ==========================================
  async getPosters() {
    const res = await fetch(`${API_BASE}/posters`);
    return res.json();
  },

  async getAdminPosters() {
    const res = await fetch(`${API_BASE}/admin/posters`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createPoster(posterData) {
    const res = await fetch(`${API_BASE}/admin/posters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(posterData)
    });
    return res.json();
  },

  async updatePoster(id, posterData) {
    const res = await fetch(`${API_BASE}/admin/posters/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(posterData)
    });
    return res.json();
  },

  async deletePoster(id) {
    const res = await fetch(`${API_BASE}/admin/posters/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Categories & Services (Module 3 & 7)
  // ==========================================
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return res.json();
  },

  async getServices() {
    const res = await fetch(`${API_BASE}/services`);
    return res.json();
  },

  async createCategory(catData) {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(catData)
    });
    return res.json();
  },

  async updateCategory(id, catData) {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(catData)
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createService(srvData) {
    const res = await fetch(`${API_BASE}/admin/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(srvData)
    });
    return res.json();
  },

  async updateService(id, srvData) {
    const res = await fetch(`${API_BASE}/admin/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(srvData)
    });
    return res.json();
  },

  async deleteService(id) {
    const res = await fetch(`${API_BASE}/admin/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Coaches & Matching (Module 10)
  // ==========================================
  async getCoaches() {
    const res = await fetch(`${API_BASE}/coaches`);
    return res.json();
  },

  async getCoach(id) {
    const res = await fetch(`${API_BASE}/coaches/${id}`);
    return res.json();
  },

  async recommendCoach(preferences) {
    const res = await fetch(`${API_BASE}/coaches/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
    return res.json();
  },

  async getAvailableSlots(coachId, date) {
    const res = await fetch(`${API_BASE}/consultations/slots/${coachId}/${date}`);
    return res.json();
  },

  // ==========================================
  // Consultations & Payments (Module 6 & 8)
  // ==========================================
  async getConsultationStatus(coachId) {
    const res = await fetch(`${API_BASE}/consultations/status/${coachId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async createPaymentOrder({ coachId, serviceId, date, timeSlot }) {
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ coachId, serviceId, date, timeSlot })
    });
    return res.json();
  },

  async verifyPayment(verificationData) {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(verificationData)
    });
    return res.json();
  },

  async recordPaymentFailure(orderId, reason) {
    const res = await fetch(`${API_BASE}/payments/fail`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ razorpay_order_id: orderId, reason })
    });
    return res.json();
  },

  async getPaymentReceipt(paymentId) {
    const res = await fetch(`${API_BASE}/payments/receipt/${paymentId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async rescheduleConsultation(consultationId, newDate, newTimeSlot, reason) {
    const res = await fetch(`${API_BASE}/consultations/${consultationId}/reschedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newDate, newTimeSlot, reason })
    });
    return res.json();
  },

  async cancelConsultation(consultationId, reason) {
    const res = await fetch(`${API_BASE}/consultations/${consultationId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async updateConsultationStatus(consultationId, status, coach_notes) {
    const res = await fetch(`${API_BASE}/consultations/${consultationId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, coach_notes })
    });
    return res.json();
  },

  // ==========================================
  // Chat & Attachments (Module 9)
  // ==========================================
  async getChatHistory(consultationId) {
    const res = await fetch(`${API_BASE}/chat/history/${consultationId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async sendChatMessage(consultationId, text, attachment = null) {
    const res = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        consultationId,
        text,
        attachment_url: attachment?.url,
        attachment_name: attachment?.name,
        attachment_type: attachment?.type
      })
    });
    return res.json();
  },

  async endConsultation(consultationId) {
    const res = await fetch(`${API_BASE}/chat/end/${consultationId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Health Assessment Form (Module 5)
  // ==========================================
  async getHealthAssessment(customerId = null) {
    const url = customerId
      ? `${API_BASE}/health-assessment?customerId=${customerId}`
      : `${API_BASE}/health-assessment`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return res.json();
  },

  async getCustomerHealthAssessmentForCoach(customerId) {
    const res = await fetch(`${API_BASE}/health-assessment/customer/${customerId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async saveHealthAssessment(assessmentData) {
    const res = await fetch(`${API_BASE}/health-assessment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(assessmentData)
    });
    return res.json();
  },

  // ==========================================
  // Wellness Progress Tracking (Module 11)
  // ==========================================
  async getProgress(customerId) {
    const res = await fetch(`${API_BASE}/progress/${customerId}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async addProgressRecord(data) {
    const res = await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async addProgressFeedback(recordId, coach_feedback) {
    const res = await fetch(`${API_BASE}/progress/${recordId}/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ coach_feedback })
    });
    return res.json();
  },

  // ==========================================
  // Notifications (Module 12)
  // ==========================================
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Enquiries (Module 1 & 13)
  // ==========================================
  async submitEnquiry(enquiryData) {
    const res = await fetch(`${API_BASE}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiryData)
    });
    return res.json();
  },

  async getAdminEnquiries() {
    const res = await fetch(`${API_BASE}/admin/enquiries`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async updateEnquiry(id, data) {
    const res = await fetch(`${API_BASE}/admin/enquiries/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ==========================================
  // Dashboards (Customer, Coach, Admin)
  // ==========================================
  async getCustomerDashboard() {
    const res = await fetch(`${API_BASE}/dashboard/customer`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getCoachDashboard() {
    const res = await fetch(`${API_BASE}/dashboard/coach`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getAdminDashboard() {
    const res = await fetch(`${API_BASE}/dashboard/admin`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  // Admin Operations (Module 8, 10, 13, 14)
  // ==========================================
  async addCoach(coachData) {
    const res = await fetch(`${API_BASE}/admin/coaches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(coachData)
    });
    return res.json();
  },

  async updateCoach(id, coachData) {
    const res = await fetch(`${API_BASE}/admin/coaches/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(coachData)
    });
    return res.json();
  },

  async deactivateCoach(id) {
    const res = await fetch(`${API_BASE}/admin/coaches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async refundPayment(paymentId, reason) {
    const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  async getSystemSettings() {
    const res = await fetch(`${API_BASE}/admin/settings`);
    return res.json();
  },

  async updateSystemSettings(settings) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  getExportUrl(type) {
    return `${API_BASE}/admin/export/${type}`;
  },

  getBackupUrl() {
    return `${API_BASE}/admin/backup`;
  },

  async restoreDatabase(backupData) {
    const res = await fetch(`${API_BASE}/admin/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ backupData })
    });
    return res.json();
  }
};
