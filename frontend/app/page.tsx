'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);




    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    if (loading) return <div className="wrapper">Loading...</div>;

    const roleName = user?.role?.role_name;



    return (
        <div style={{ padding: '30px 0px 0px 0px' }}>

            <div className="home-wrapper">
                <main className="hero">
                    <div className="hero-content">

                        {user ? (
                            <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold', marginBottom: '10px' }}>
                                Welcome back, {user.fullname}
                            </p>
                        ) : null}

                        <h1>Vision to Reality<br />Driven by Clarity</h1>
                        <p>Bring projects to life with a clear management system.</p>

                        <div className="hero-actions">
                            {!user ? (
                                <>
                                    <Link href="/login" className="btn-main-new">Get Started</Link>
                                </>
                            ) : (
                                <>
                                    {/* เงื่อนไขปุ่มตาม Role ที่ทำไว้ก่อนหน้า */}
                                    {roleName === 'User' && (
                                        <>
                                            <Link href="/user/creatproject" className="btn-main-new"><i className="fa-solid fa-plus"></i>&nbsp; NEW Project</Link>
                                            <Link href="/user/find_sponsor" className="btn-main-new secondary">Find Sponsor</Link>
                                        </>
                                    )}
                                    {roleName === 'Sponsor' && (
                                        <Link href="/Sponser/sponsor_dashboard" className="btn-main-new">Sponsor Dashboard</Link>
                                    )}
                                    {roleName === 'Admin' && (
                                        <Link href="/admin/admin_dashboard" className="btn-main-new">Admin Dashboard</Link>
                                    )}
                                </>
                            )}
                        </div>


                    </div>

                    <div className="hero-visual">
                        <div className="globe-container">
                            <div className="globe-bg"></div>
                            <div className="orbit"></div>
                        </div>
                    </div>
                </main>
            </div>
        </div>

    );
}