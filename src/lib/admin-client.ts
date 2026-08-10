'use client'

// Client-side admin API helper
const API = '/api/admin'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

export function setToken(token: string) {
  localStorage.setItem('admin_token', token)
}

export function clearToken() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('admin_user')
  return data ? JSON.parse(data) : null
}

export function setAdminUser(user: Record<string, unknown>) {
  localStorage.setItem('admin_user', JSON.stringify(user))
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/admin/login'
    return
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const adminApi = {
  auth: {
    login: (email: string, password: string) =>
      adminFetch('/auth', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getSession: () => adminFetch('/auth'),
  },
  settings: {
    get: () => adminFetch('/settings'),
    update: (data: Record<string, unknown>) => adminFetch('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  navLinks: {
    get: () => adminFetch('/nav-links'),
    update: (links: Array<{ label: string; href: string; sortOrder: number; id?: string }>) =>
      adminFetch('/nav-links', { method: 'PUT', body: JSON.stringify({ links }) }),
  },
  rooms: {
    list: (published?: string) => adminFetch(`/rooms${published ? `?published=${published}` : ''}`),
    get: (id: string) => adminFetch(`/rooms/${id}`),
    create: (data: Record<string, unknown>) => adminFetch('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => adminFetch(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => adminFetch(`/rooms/${id}`, { method: 'DELETE' }),
  },
  experiences: {
    list: () => adminFetch('/experiences'),
    get: (id: string) => adminFetch(`/experiences/${id}`),
    create: (data: Record<string, unknown>) => adminFetch('/experiences', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => adminFetch(`/experiences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => adminFetch(`/experiences/${id}`, { method: 'DELETE' }),
  },
  gallery: {
    list: () => adminFetch('/gallery'),
    get: (id: string) => adminFetch(`/gallery/${id}`),
    create: (data: Record<string, unknown>) => adminFetch('/gallery', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => adminFetch(`/gallery/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => adminFetch(`/gallery/${id}`, { method: 'DELETE' }),
  },
  testimonials: {
    list: () => adminFetch('/testimonials'),
    get: (id: string) => adminFetch(`/testimonials/${id}`),
    create: (data: Record<string, unknown>) => adminFetch('/testimonials', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => adminFetch(`/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => adminFetch(`/testimonials/${id}`, { method: 'DELETE' }),
  },
  faq: {
    list: () => adminFetch('/faq'),
    get: (id: string) => adminFetch(`/faq/${id}`),
    create: (data: Record<string, unknown>) => adminFetch('/faq', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => adminFetch(`/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => adminFetch(`/faq/${id}`, { method: 'DELETE' }),
  },
  about: {
    get: () => adminFetch('/about'),
    update: (data: Record<string, unknown>) => adminFetch('/about', { method: 'PUT', body: JSON.stringify(data) }),
  },
  newsletter: {
    list: (page?: number) => adminFetch(`/newsletter?page=${page || 1}`),
  },
  contacts: {
    list: (params?: { page?: number; unread?: boolean }) =>
      adminFetch(`/contacts?page=${params?.page || 1}${params?.unread ? '&unread=true' : ''}`),
    markRead: (id: string) => adminFetch('/contacts', { method: 'PUT', body: JSON.stringify({ id, read: true }) }),
  },
  reservations: {
    list: (params?: { page?: number; status?: string }) =>
      adminFetch(`/reservations?page=${params?.page || 1}${params?.status ? `&status=${params.status}` : ''}`),
    updateStatus: (id: string, status: string, notes?: string) =>
      adminFetch('/reservations', { method: 'PUT', body: JSON.stringify({ id, status, notes }) }),
  },
  upload: async (file: File) => {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
  dashboard: () => adminFetch('/dashboard'),
}
