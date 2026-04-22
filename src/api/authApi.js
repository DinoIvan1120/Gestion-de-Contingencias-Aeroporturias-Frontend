import axiosClient from './axiosClient'

const BASE = '/api/v1/auth'

const authApi = {
  login: (body) => axiosClient.post(`${BASE}/login`, body),
  register: (body) => axiosClient.post(`${BASE}/register`, body),
  forgotPassword: (body) => axiosClient.post(`${BASE}/forgot-password`, body),
  resetPassword: (body) => axiosClient.post(`${BASE}/reset-password`, body),
  refreshToken: () => axiosClient.post(`${BASE}/refresh`),
}

export default authApi
