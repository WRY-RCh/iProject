'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function LoginPage() {
    const [identity, setIdentity] = useState(''); // ใช้ชื่อ identity แทน email
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false); // สถานะ Checkbox

    // ตรวจสอบว่าเคยติ๊ก Remember me ไว้ไหมตอนโหลดหน้าเว็บ
    useEffect(() => {
        const savedIdentity = Cookies.get('remembered_user');
        if (savedIdentity) {
            setIdentity(savedIdentity);
            setRememberMe(true);
        }
    }, []);

    
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            window.location.href = '/';
        }
    }, []);



    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // ส่งค่า identity ไปให้ Backend
            const response = await axios.post('http://localhost:8000/api/login', {
                identity,
                password
            });

            if (rememberMe) {
                Cookies.set('remembered_user', identity, { expires: 30 });
            } else {
                Cookies.remove('remembered_user');
            }

            // เก็บข้อมูล User ลง Session (หายเมื่อปิดเบราว์เซอร์) หรือ LocalStorage
            localStorage.setItem('user', JSON.stringify(response.data.user));


            window.location.href = '/';
        } catch (error: any) {
            alert(error.response?.data?.detail || 'เข้าสู่ระบบล้มเหลว');
        }
    };

    return (
        <div className="wrapper">
            <div className="login-card">
                <div className="login-image">
                    <div className="globe-min"></div>
                    <div className="image-overlay">
                        <h2>Welcome</h2>
                        <p>เข้าสู่ระบบ iProject เพื่อจัดการโครงการ<br></br>และติดตามความโปร่งใสด้านงบประมาณของคุณ</p>
                    </div>
                </div>

                <div className="login-content">
                    <Link href="/" className="brand-logo">iProject</Link>
                    <div className="header">
                        <h1>Welcome Back</h1>
                        <p>ลงชื่อเข้าใช้เพื่อจัดการโครงการของคุณ</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email or Username</label>
                            <div className="input-wrapper">
                                <i className="fa-solid fa-envelope"></i>
                                <input
                                    type="text"
                                    placeholder="Enter your email or username"
                                    value={identity}
                                    required
                                    onChange={(e) => setIdentity(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <i className="fa-solid fa-lock"></i>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    required
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="options">
                            <label className="remember-me">
                                <input type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
                            </label>
                            <a href="#" className="forgot-pwd">Forgot password?</a>
                        </div>

                        <button type="submit" className="btn-register">Login to Dashboard</button>
                    </form>

                    <div className="login-link">
                        Don't have an account? <Link href="/register">Create Account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}