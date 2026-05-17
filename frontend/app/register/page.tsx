'use client';
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';


export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'User'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน!");
      return;
    }

    try {
      // ส่งข้อมูลไปยัง API (ระบุ ID ตามลำดับในฐานข้อมูลของคุณ)
      const payload = {
        username: formData.username,
        fullname: formData.fullname,
        email: formData.email,
        password: formData.password,
        role_id: formData.role === 'Admin' ? 1 : (formData.role === 'Sponsor' ? 2 : 3),
        position_id: null // หรือตั้งค่าเริ่มต้นอื่นๆ
      };

      await axios.post('http://localhost:8000/api/register', payload);
      alert('สร้างบัญชีสำเร็จ!');
      window.location.href = '/admin/users';
    } catch (error: any) {
      alert('ข้อผิดพลาด: ' + (error.response?.data?.detail || 'ลองใหม่อีกครั้ง'));
    }
  };

  return (
    <div className="wrapper">
      <div className="register-container">
        <Link href="/" className="brand-logo">iProject</Link>
        <div className="header">
          <h1>Create Account</h1>
          <p>ร่วมเป็นส่วนหนึ่งของระบบจัดการโครงการอัจฉริยะ</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Full Name</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-id-card"></i>
                <input 
                  type="text" placeholder="ระบุชื่อ-นามสกุลจริง" required 
                  onChange={(e) => setFormData({...formData, fullname: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-user"></i>
                <input 
                  type="text" placeholder="ตั้งชื่อผู้ใช้งาน" required 
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-envelope"></i>
                <input 
                  type="email" placeholder="example@mail.com" required 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-shield"></i>
                <input 
                  type="password" placeholder="••••••••" required 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-shield"></i>
                <input 
                  type="password" placeholder="••••••••" required 
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Select Your Role</label>
              <div className="role-selector">
                <label className={`role-option ${formData.role === 'User' ? 'active' : ''}`}>
                  <input 
                    type="radio" name="role" value="User" 
                    checked={formData.role === 'User'}
                    onChange={() => setFormData({...formData, role: 'User'})}
                  />
                  <i className="fa-solid fa-user-pen"></i>
                  <span>Project User</span>
                </label>
                <label className={`role-option ${formData.role === 'Sponsor' ? 'active' : ''}`}>
                  <input 
                    type="radio" name="role" value="Sponsor" 
                    checked={formData.role === 'Sponsor'}
                    onChange={() => setFormData({...formData, role: 'Sponsor'})}
                  />
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                  <span>Sponsor</span>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-register">Create Account</button>
        </form>

        <div className="login-link">
          Already have an account? <Link href="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}