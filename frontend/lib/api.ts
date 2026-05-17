import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getUsers = async () => {
  // ดึงข้อมูลจาก @app.get("/api/admin/users") ใน main.py
  const response = await api.get('/admin/users');
  return response.data;
};

export default api;