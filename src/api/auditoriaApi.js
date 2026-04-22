import axiosClient from './axiosClient'

const BASE = '/api/v1/auditoria'

const auditoriaApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
}

export default auditoriaApi
