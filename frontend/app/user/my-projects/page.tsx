'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function MyProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            const savedUser = localStorage.getItem('user');
            const user = savedUser ? JSON.parse(savedUser) : null;

            if (user?.id) {
                try {
                    const response = await axios.get(`http://localhost:8000/api/my-projects?user_id=${user.id}`);
                    setProjects(response.data);
                } catch (error) {
                    console.error("Error fetching projects:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProjects();
    }, []);

    return (
        <div style={{ padding: '30px' }}>
            <div className="container wrapper">
                <div className="dashboard-header">
                    <div>
                        <p style={{ color: '#f472b6', fontWeight: 700, fontSize: '12px' }}>Workspace</p>
                        <h1>My Projects</h1>
                    </div>
                </div>

                <div className="project-grid">
                    {loading ? (
                        <p>กำลังโหลดข้อมูล...</p>
                    ) : projects.length > 0 ? (
                        projects.map((project: any) => (
                            <div key={project.id} className="project-card">
                                <div className="card-header">
                                    <span className={`status-badge status-${project.status.toLowerCase()}`}>
                                        {project.status}
                                    </span>
                                </div>
                                <h3>{project.title}</h3>
                                <p>{project.rationale}</p>

                                <div className="card-footer">
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="stat-item"><i className="fa-solid fa-wallet"></i> ฿ {Number(project.grand_total).toLocaleString()}</div>
                                    </div>
                                    <Link href={`/user/projects/${project.id}`} className="btn-view">
                                        View Details <i className="fa-solid fa-arrow-right"></i>
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>ยังไม่มีโครงการที่รับผิดชอบ</p>
                    )}
                </div>
            </div>
        </div>
    );
}