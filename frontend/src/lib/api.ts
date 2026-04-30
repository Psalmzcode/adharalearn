import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api/v1';
const LEARN_BASE = '/api/v1';

export const api = axios.create({ baseURL: BASE });
export const learnApi = axios.create({ baseURL: LEARN_BASE });

// ── TOKEN HELPERS ─────────────────────────────────────────────────────────────
export const getAccessToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
export const setAccessToken = (t: string) => localStorage.setItem('accessToken', t);
export const setRefreshToken = (t: string) => localStorage.setItem('refreshToken', t);
export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
export const getRefreshToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

learnApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── RESPONSE INTERCEPTOR: silent refresh ─────────────────────────────────────
let refreshing = false;
let pending: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];
let learnRefreshing = false;
let learnPending: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

learnApi.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const orig = err.config as any;
    if (err.response?.status !== 401 || orig?._retry) return Promise.reject(err);
    if (learnRefreshing) {
      return new Promise((resolve, reject) => learnPending.push({ resolve, reject })).then((token) => {
        orig.headers.Authorization = `Bearer ${token}`;
        return learnApi(orig);
      });
    }
    orig._retry = true;
    learnRefreshing = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      const { data } = await learnApi.post('/auth/refresh', { refreshToken: rt });
      setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      learnPending.forEach((p) => p.resolve(data.accessToken));
      learnPending = [];
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return learnApi(orig);
    } catch {
      learnPending.forEach((p) => p.reject(err));
      learnPending = [];
      clearAuthTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      learnRefreshing = false;
    }
  },
);

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const orig = err.config as any;
    if (err.response?.status !== 401 || orig?._retry) return Promise.reject(err);
    if (refreshing) {
      return new Promise((resolve, reject) => pending.push({ resolve, reject })).then((token) => {
        orig.headers.Authorization = `Bearer ${token}`;
        return api(orig);
      });
    }
    orig._retry = true;
    refreshing = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
      setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      pending.forEach((p) => p.resolve(data.accessToken));
      pending = [];
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch {
      pending.forEach((p) => p.reject(err));
      pending = [];
      clearAuthTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  },
);

// ── TYPED HELPERS ─────────────────────────────────────────────────────────────
const r = <T>(p: Promise<{ data: T }>) => p.then((res) => res.data);
const g = <T>(url: string, params?: any) => r<T>(api.get(url, { params }));
const p = <T>(url: string, data?: any) => r<T>(api.post(url, data));
const u = <T>(url: string, data?: any) => r<T>(api.put(url, data));
const d = <T>(url: string) => r<T>(api.delete(url));

const lr = <T>(pp: Promise<{ data: T }>) => pp.then((res) => res.data);
const lg = <T>(url: string, params?: any) => lr<T>(learnApi.get(url, { params }));
const lp = <T>(url: string, data?: any) => lr<T>(learnApi.post(url, data));
const lu = <T>(url: string, data?: any) => lr<T>(learnApi.put(url, data));
const ld = <T>(url: string) => lr<T>(learnApi.delete(url));

// ══════════════════════════════════════════════════════════════════════════════
// API NAMESPACES — one per backend module
// ══════════════════════════════════════════════════════════════════════════════

export const authApi = {
  login: (email: string, password: string) =>
    lp<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password }),
  register: (data: any) => lp<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', data),
  me: () => lg<any>('/auth/me'),
  logout: () => lp('/auth/logout', { refreshToken: getRefreshToken() }),
  changePassword: (oldPassword: string, newPassword: string) =>
    lp('/auth/change-password', { currentPassword: oldPassword, newPassword }),
  requestEmailOtp: () => lp<{ ok: boolean; alreadyVerified?: boolean }>('/auth/email-otp/request'),
  verifyEmailOtp: (code: string) => lp<{ ok: boolean; user?: any; alreadyVerified?: boolean }>('/auth/email-otp/verify', { code }),
};

export const tracksApi = {
  list: (includeInactive = false) => g<any[]>('/tracks', { includeInactive }),
  get: (id: string) => g<any>(`/tracks/${id}`),
  create: (data: any) => p('/tracks', data),
  update: (id: string, data: any) => u(`/tracks/${id}`, data),
  remove: (id: string) => d(`/tracks/${id}`),
};

export const cohortsApi = {
  list: (status?: string) => g<any[]>('/cohorts', status ? { status } : undefined),
  get: (id: string) => g<any>(`/cohorts/${id}`),
  create: (data: any) => p('/cohorts', data),
  update: (id: string, data: any) => u(`/cohorts/${id}`, data),
  remove: (id: string) => d(`/cohorts/${id}`),
};

export const learnersApi = {
  list: (params?: { cohortId?: string; status?: string }) => g<any[]>('/learners', params),
  me: () => lg<any>('/learners/me'),
  getOne: (id: string) => g<any>(`/learners/${id}`),
  atRisk: (cohortId: string) => g<any[]>(`/learners/at-risk/${cohortId}`),
  incrementStreak: () => lu('/learners/streak/increment', {}),
  updateMe: (data: any) => lu('/learners/me', data),
  update: (id: string, data: any) => u(`/learners/${id}`, data),
  remove: (id: string) => d(`/learners/${id}`),
};

export const facilitatorsApi = {
  list: () => g<any[]>('/facilitators'),
  me: () => g<any>('/facilitators/me'),
  getOne: (id: string) => g<any>(`/facilitators/${id}`),
  stats: (id: string) => g<any>(`/facilitators/${id}/stats`),
  updateMe: (data: any) => u('/facilitators/me', data),
  update: (id: string, data: any) => u(`/facilitators/${id}`, data),
  remove: (id: string) => d(`/facilitators/${id}`),
};

export const enrollmentsApi = {
  list: (params?: { cohortId?: string; status?: string }) => g<any[]>('/enrollments', params),
  me: () => g<any[]>('/enrollments/me'),
  getOne: (id: string) => g<any>(`/enrollments/${id}`),
  create: (data: any) => p('/enrollments', data),
  approve: (id: string) => u(`/enrollments/${id}/approve`),
  withdraw: (id: string) => u(`/enrollments/${id}/withdraw`),
  complete: (id: string) => u(`/enrollments/${id}/complete`),
  updateProgress: (learnerId: string, cohortId: string, progress: number) =>
    u('/enrollments/progress', { learnerId, cohortId, progress }),
  remove: (id: string) => d(`/enrollments/${id}`),
};

export const assignmentsApi = {
  byCohort: (cohortId: string) => g<any[]>(`/assignments/cohort/${cohortId}`),
  mySubmissions: (cohortId?: string) =>
    g<any[]>('/assignments/submissions/me', cohortId ? { cohortId } : undefined),
  getOne: (id: string) => g<any>(`/assignments/${id}`),
  create: (data: any) => p('/assignments', data),
  update: (id: string, data: any) => u(`/assignments/${id}`, data),
  remove: (id: string) => d(`/assignments/${id}`),
  submit: (data: { assignmentId: string; repoUrl?: string; deployedUrl?: string; notes?: string }) =>
    p('/assignments/submit', data),
};

export const sessionsApi = {
  byCohort: (cohortId: string) => g<any[]>(`/sessions/cohort/${cohortId}`),
  myAttendance: () => g<any[]>('/sessions/attendance/me'),
  attendanceSummary: (cohortId: string) => g<any[]>(`/sessions/attendance/cohort/${cohortId}`),
  getOne: (id: string) => g<any>(`/sessions/${id}`),
  create: (data: any) => p('/sessions', data),
  update: (id: string, data: any) => u(`/sessions/${id}`, data),
  remove: (id: string) => d(`/sessions/${id}`),
  markAttendance: (sessionId: string, learnerId: string, present: boolean) =>
    p(`/sessions/${sessionId}/attendance`, { learnerId, present }),
  bulkAttendance: (sessionId: string, records: { learnerId: string; present: boolean }[]) =>
    p(`/sessions/${sessionId}/attendance/bulk`, { records }),
};

export const gradesApi = {
  grade: (data: { submissionId: string; facilitatorId: string; score: number; feedback?: string }) =>
    p('/grades', data),
  bulkGrade: (grades: any[]) => p('/grades/bulk', { grades }),
  byAssignment: (assignmentId: string) => g<any[]>(`/grades/assignment/${assignmentId}`),
  mine: () => g<any[]>('/grades/me'),
};

export const cbtApi = {
  byCohort: (cohortId: string) => g<any[]>(`/cbt/cohort/${cohortId}`),
  myAttempts: () => g<any[]>('/cbt/attempts/me'),
  myResult: (sessionId: string) => g<any>(`/cbt/${sessionId}/result`),
  sessionResults: (sessionId: string) => g<any[]>(`/cbt/${sessionId}/results`),
  take: (id: string) => g<any>(`/cbt/${id}/take`),
  getSession: (id: string) => g<any>(`/cbt/${id}`),
  createSession: (data: any) => p('/cbt/sessions', data),
  addQuestions: (sessionId: string, questions: any[]) =>
    p(`/cbt/sessions/${sessionId}/questions`, { questions }),
  publish: (id: string) => u(`/cbt/sessions/${id}/publish`),
  unpublish: (id: string) => u(`/cbt/sessions/${id}/unpublish`),
  submit: (data: any) => p('/cbt/submit', data),
  deleteSession: (id: string) => d(`/cbt/sessions/${id}`),
};

export const scholarshipsApi = {
  list: () => g<any[]>('/scholarships'),
  apply: (data: any) => p('/scholarships', data),
  review: (id: string, status: 'APPROVED' | 'REJECTED') => u(`/scholarships/${id}/review`, { status }),
  disburse: (id: string) => u(`/scholarships/${id}/disburse`),
};

export const announcementsApi = {
  list: (params?: { cohortId?: string; audience?: string }) => g<any[]>('/announcements', params),
  create: (data: any) => p('/announcements', data),
  remove: (id: string) => d(`/announcements/${id}`),
};

export const messagesApi = {
  conversations: () => g<any[]>('/messages/conversations'),
  conversation: (otherId: string) => g<any[]>(`/messages/conversation/${otherId}`),
  send: (recipientUserId: string, text: string) => p('/messages', { recipientUserId, text }),
};

export const notificationsApi = {
  mine: () => g<any[]>('/notifications'),
};

export const certificatesApi = {
  mine: () => g<any[]>('/certificates/mine'),
  list: (cohortName?: string) => g<any[]>('/certificates', cohortName ? { cohortName } : undefined),
  issue: (data: any) => p('/certificates', data),
  revoke: (id: string) => d(`/certificates/${id}`),
};

export const paymentsApi = {
  list: (enrollmentId?: string) =>
    g<any[]>('/payments', enrollmentId ? { enrollmentId } : undefined),
  summary: () => g<any>('/payments/summary'),
  initiate: (data: any) => p('/payments/initiate', data),
  verify: (ref: string) => g<any>(`/payments/verify/${ref}`),
};

export const reportsApi = {
  submitWeekly: (data: any) => p('/reports/weekly', data),
  weekly: (cohortId?: string) => g<any[]>('/reports/weekly', cohortId ? { cohortId } : undefined),
  platform: () => g<any>('/reports/platform'),
};

export const curriculumApi = {
  modules: (trackId: string) => g<any[]>(`/curriculum/modules/${trackId}`),
  assignments: (cohortId: string) => g<any[]>(`/curriculum/assignments/${cohortId}`),
  mySubmissions: () => g<any[]>('/curriculum/submissions/me'),
  submit: (data: { assignmentId: string; learnerId: string; repoUrl?: string; deployedUrl?: string; notes?: string }) =>
    p('/curriculum/submit', data),
};

export const cohortChatApi = {
  messages: (cohortId: string) => g<any[]>(`/cohort-chat/${cohortId}`),
  send: (cohortId: string, text: string) => p(`/cohort-chat/${cohortId}`, { text }),
};

export const moduleProgressApi = {
  mine: () => g<any[]>('/module-progress/mine'),
  badges: () => g<any[]>('/module-progress/badges/mine'),
  markComplete: (moduleId: string) => p(`/module-progress/complete/${moduleId}`),
  unmarkComplete: (moduleId: string) => api.delete(`/module-progress/complete/${moduleId}`).then(r => r.data),
};

export const jobsApi = {
  list: (skills?: string) => g<any[]>('/jobs', skills ? { skills } : undefined),
  create: (data: any) => p('/jobs', data),
  update: (id: string, data: any) => u(`/jobs/${id}`, data),
  remove: (id: string) => api.delete(`/jobs/${id}`).then(r => r.data),
};

export const coursesApi = {
  listPublic: () => lg<any[]>('/courses'),
  getPublic: (slug: string) => lg<any>(`/courses/${slug}`),
  mine: () => lg<any[]>('/courses/me/mine'),
  myCourseOutline: (slug: string) => lg<any>(`/courses/me/outline/${slug}`),
  adminAll: () => lg<any[]>('/courses/admin/all'),
  adminCreate: (data: any) => lp('/courses/admin', data),
  adminUpdate: (id: string, data: any) => lu(`/courses/admin/${id}`, data),
  adminRemove: (id: string) => ld(`/courses/admin/${id}`),
  adminModules: (courseId: string) => lg<any[]>(`/courses/admin/${courseId}/modules`),
  adminCreateModule: (data: any) => lp('/courses/admin/modules', data),
  adminUpdateModule: (id: string, data: any) => lu(`/courses/admin/modules/${id}`, data),
  adminRemoveModule: (id: string) => ld(`/courses/admin/modules/${id}`),
  adminModuleLessons: (moduleId: string) => lg<any[]>(`/courses/admin/modules/${moduleId}/lessons`),
  adminQuizQuestions: (moduleId: string) => lg<any[]>(`/courses/admin/modules/${moduleId}/quiz-questions`),
  adminGenerateQuizQuestions: (moduleId: string, data?: { count?: number }) =>
    lp<any>(`/courses/admin/modules/${moduleId}/quiz-questions/generate`, data ?? {}),
  adminCreateQuizQuestion: (moduleId: string, data: any) => lp(`/courses/admin/modules/${moduleId}/quiz-questions`, data),
  adminUpdateQuizQuestion: (id: string, data: any) => lu(`/courses/admin/quiz-questions/${id}`, data),
  adminRemoveQuizQuestion: (id: string) => ld(`/courses/admin/quiz-questions/${id}`),
  adminBundles: (courseId: string) => lg<any[]>(`/courses/admin/${courseId}/bundles`),
  adminCreateBundle: (data: any) => lp('/courses/admin/bundles', data),
  adminUpdateBundle: (id: string, data: any) => lu(`/courses/admin/bundles/${id}`, data),
  adminRemoveBundle: (id: string) => ld(`/courses/admin/bundles/${id}`),
  adminPurchases: () => lg<any[]>('/courses/admin/purchases'),
  adminCreateLesson: (data: any) => lp('/courses/admin/lessons', data),
  adminUpdateLesson: (id: string, data: any) => lu(`/courses/admin/lessons/${id}`, data),
  adminRemoveLesson: (id: string) => ld(`/courses/admin/lessons/${id}`),
};

export const coursePurchasesApi = {
  initiate: (data: { courseId: string; callbackUrl: string }) => lp<any>('/course-purchases/initiate', data),
  verify: (ref: string) => lg<any>(`/course-purchases/verify/${ref}`),
};

export const modulePurchasesApi = {
  initiate: (data: { moduleId: string; callbackUrl: string }) => lp<any>('/module-purchases/initiate', data),
  verify: (ref: string) => lg<any>(`/module-purchases/verify/${ref}`),
};

export const bundlePurchasesApi = {
  initiate: (data: { bundleId: string; callbackUrl: string }) => lp<any>('/bundle-purchases/initiate', data),
  verify: (ref: string) => lg<any>(`/bundle-purchases/verify/${ref}`),
};

export const moduleCompletionsApi = {
  complete: (moduleId: string, data?: { score?: number; passed?: boolean }) =>
    lp<any>(`/module-completions/${moduleId}/complete`, data ?? {}),
};

export const lessonProgressApi = {
  get: (lessonId: string) => lg<{ positionSeconds: number }>(`/lesson-progress/${lessonId}`),
  save: (lessonId: string, positionSeconds: number) => lp(`/lesson-progress/${lessonId}`, { positionSeconds }),
};

export const moduleQuizzesApi = {
  questions: (moduleId: string) => lg<any[]>(`/module-quizzes/${moduleId}/questions`),
  submit: (moduleId: string, answers: Array<{ questionId: string; answer: 'A' | 'B' | 'C' | 'D' }>) =>
    lp<any>(`/module-quizzes/${moduleId}/submit`, { answers }),
};

export const supportTicketsApi = {
  mineOrAll: () => lg<any[]>('/support-tickets'),
  create: (data: { moduleId: string; subject: string; body: string }) => lp<any>('/support-tickets', data),
  adminReply: (id: string, reply: string) => lp<any>(`/support-tickets/${id}/reply`, { reply }),
};

export const learnStatsApi = {
  streak: () => lg<{ count: number; lastDate: string | null }>('/learn/streak'),
  badges: () => lg<Array<{ key: string; earnedAt: string }>>('/learn/badges'),
};

export const practicalsApi = {
  moduleForLearner: (moduleId: string) => lg<any>(`/practicals/module/${moduleId}`),
  bundleForLearner: (bundleId: string) => lg<any>(`/practicals/bundle/${bundleId}`),
  trackForLearner: (courseId: string) => lg<any>(`/practicals/track/${courseId}`),
  submitForModule: (moduleId: string, data: { repoUrl?: string; liveUrl?: string; fileUrl?: string; submissionText?: string }) =>
    lp<any>(`/practicals/module/${moduleId}`, data),
  submitForBundle: (bundleId: string, data: { repoUrl?: string; liveUrl?: string; fileUrl?: string; submissionText?: string }) =>
    lp<any>(`/practicals/bundle/${bundleId}`, data),
  submitForTrack: (courseId: string, data: { repoUrl?: string; liveUrl?: string; fileUrl?: string; submissionText?: string }) =>
    lp<any>(`/practicals/track/${courseId}`, data),
  adminTemplates: (params?: { moduleId?: string; courseId?: string }) => lg<any[]>('/practicals/admin/templates', params),
  adminCreateTemplate: (data: any) => lp<any>('/practicals/admin/templates', data),
  adminSubmissions: (params?: { moduleId?: string; templateId?: string }) => lg<any[]>('/practicals/admin/submissions', params),
  adminReviewSubmission: (id: string, data: { status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'; feedback?: string; score?: number | null }) =>
    lp<any>(`/practicals/admin/submissions/${id}/review`, data),
};

export async function downloadLearnModuleCertificatePdf(moduleId: string) {
  const token = getAccessToken();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${origin}/api/v1/certificates/module/${moduleId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to download certificate');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AdharaEdu-certificate-${moduleId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const alumniApi = {
  list: (params?: { track?: string; hireable?: boolean }) => g<any[]>('/alumni', params),
  me: () => g<any>('/alumni/me'),
  save: (data: any) => p('/alumni/me', data),
  update: (data: any) => u('/alumni/me', data),
};

export const modulesApi = {
  byTrack: (trackId: string) => g<any[]>(`/modules/track/${trackId}`),
  create: (trackId: string, data: any) => p(`/modules/track/${trackId}`, data),
  update: (id: string, data: any) => u(`/modules/${id}`, data),
  remove: (id: string) => api.delete(`/modules/${id}`).then(r => r.data),
};
