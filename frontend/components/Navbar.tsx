'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';


export default function Navbar() {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        // ดึงข้อมูล User จาก LocalStorage ที่เก็บไว้ตอน Login
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        Cookies.remove('remembered_user');
        window.location.href = '/login';
    };

    // ไม่แสดง Navbar ในหน้า Login หรือ Register
    if (pathname === '/login' || pathname === '/register') return null;

    // เข้าถึงชื่อ Role จากโครงสร้าง Nested Object ตามข้อมูลที่คุณส่งมา
    const roleName = user?.role?.role_name;

    return (
        <nav className="home-nav">
            <Link href="/" className="logo">
                iProject {roleName === 'Admin' && <span style={{ color: 'var(--primary-blue)', fontSize: '14px', marginLeft: '5px' }}>Admin</span>}
            </Link>

            <div className="nav-links">
                {/* --- 1. เมนูสำหรับ ROLE: USER (อิงจาก my_projects.html) --- */}
                {roleName === 'User' && (
                    <>
                        <Link href="/user/creatproject" className="btn-nav-new"><i className="fa-solid fa-plus"></i>&nbsp; NEW Project</Link>
                        <Link href="/user/my-projects">My Projects</Link>
                    </>
                )}

                {/* --- 2. เมนูสำหรับ ROLE: SPONSOR (อิงจาก sponsor_dashboard.html) --- */}
                {roleName === 'Sponsor' && (
                    <>
                        <Link href="/Sponser/sponsor_dashboard">Dashboard</Link>
                    </>
                )}

                {/* --- 3. เมนูสำหรับ ROLE: ADMIN (อิงจาก admin_dashboard.html) --- */}
                {roleName === 'Admin' && (
                    <>
                        <Link href="/admin/admin_dashboard">Overview</Link>
                        <Link href="/admin/admin_users">User Management</Link>
                    </>
                )}

                {/* --- ส่วนขวามือ: ข้อมูลผู้ใช้ & Dropdown (ใช้ดีไซน์ร่วมกัน) --- */}
                {user ? (
                    <div className="user-dropdown" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="user-info-btn"
                        >
                            <div className="user-avatar">
                                {user.fullname?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-text-label">
                                <p className="user-fullname-text">{user.fullname || 'Unknown User'}</p>
                                <p className="user-role-text">{roleName} Account</p>
                            </div>
                            <i className={`fa-solid fa-chevron-down ${isDropdownOpen ? 'rotate' : ''}`}></i>
                        </button>

                        {isDropdownOpen && (
                            <div className="dropdown-menu-content">
                                <Link href={roleName === 'Admin' ? "/admin/settings" : "/user/profile"}>
                                    <i className="fa-solid fa-user-gear"></i> Profile Settings
                                </Link>
                                <hr />
                                <button onClick={handleLogout} className="logout-btn">
                                    <i className="fa-solid fa-right-from-bracket"></i> Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <Link href="/login" className="btn-nav-new"><i className="fa-solid fa-plus"></i>&nbsp;NEW Project</Link>
                        <Link href="/login">My Projects</Link>
                        <Link href="/login" className="login-link-nav">Login</Link>
                    </>
                )}
            </div>
        </nav>
    );
}