"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PhaseType, InstallmentType } from "@/types/project"; // ถอยโฟลเดอร์หลบทางแกง
import { toast } from "sonner";


export default function UpdateProgressPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchProjectData = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/projects/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProject(data);
            }
        } catch (err) {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchProjectData();
    }, [id]);

    // ยิง API สลับสถานะ Task (ส่งผลต่อ % ใน Banner บน)
    const handleToggleTask = async (taskId: number) => {
        toast.promise(
            async () => {
                const res = await fetch(`http://localhost:8000/api/tasks/${taskId}/toggle`, {
                    method: "PUT",
                });

                if (!res.ok) {
                    throw new Error("Failed to update status");
                }

                // เมื่อเสร็จสมบูรณ์ ทำการดึงข้อมูลเพื่อดีด % ใหม่บนแบนเนอร์ทันที
                fetchProjectData();
            },
            {
                loading: "กำลังอัปเดตความคืบหน้ากิจกรรม...",
                success: "อัปเดตสถานะกิจกรรมสำเร็จ!",
                error: "ไม่สามารถสลับสถานะกิจกรรมงานได้",
            }
        );
    };

    // ยิง API บันทึกการจ่ายเงิน (สลับป้ายเป็น จ่ายแล้ว ทันที)
    const handlePayItem = async (itemId: number) => {
        const toastId = toast.loading("กำลังบันทึกข้อมูลการเบิกจ่ายเงินงวด...");

        try {
            const res = await fetch(`http://localhost:8000/api/budget-items/${itemId}/pay`, {
                method: "PUT",
            });

            if (res.ok) {
                toast.success("บันทึกการจ่ายเงินสำเร็จแล้ว!", { id: toastId });
                fetchProjectData();
            } else {
                toast.error("เกิดข้อผิดพลาดจากระบบหลังบ้าน", { id: toastId });
            }
        } catch (err) {
            toast.error("เน็ตเวิร์กขัดข้อง ไม่สามารถเชื่อมต่อฐานข้อมูลได้", { id: toastId });
        }
    };

    const calculateProgress = () => {
        let totalWeight = 0;
        let completedWeight = 0;
        project?.phases?.forEach((phase: PhaseType) => {
            phase.tasks?.forEach((task: any) => {
                totalWeight += task.weight_percentage;
                if (task.status) completedWeight += task.weight_percentage;
            });
        });
        return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
    };

    const calculateSpent = () => {
        let spent = 0;
        project?.installments?.forEach((inst: InstallmentType) => {
            const items = inst.budget_items ?? inst.items ?? [];
            items.forEach((item: any) => {
                if (item.status) spent += Number(item.amount);
            });
        });
        return spent;
    };

    const handleSaveAndRedirect = () => {
        const currentProgress = calculateProgress();

        if (currentProgress >= 100) {
            router.push(`/user/projects/${id}/result`);
        } else {
            router.push(`/user/projects/${id}`);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดระบบ iProject...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">ไม่พบข้อมูลโครงการ</div>;

    return (
        <div className="iproject-update-theme" style={{ padding: '80px 0px 0px 0px' }}>
            <div className="container-update-layout">

                <div className="summary-banner">
                    <div>
                        <p className="banner-sub">Project Health</p>
                        <h2>Current Progress: {calculateProgress().toFixed(2)}%</h2>
                    </div>
                    <div className="text-right">
                        <p className="banner-sub">Total Spent</p>
                        <h2>฿ {calculateSpent().toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                    </div>
                </div>

                {/* Tasks Execution */}
                <div className="update-card">
                    <h2 className="section-title"><span></span>อัปเดตความคืบหน้ากิจกรรม (Tasks Execution)</h2>
                    <p className="section-desc">ติ๊กเครื่องหมายถูกเมื่อกิจกรรมเสร็จสิ้น เพื่อคำนวณ % ความสำเร็จ</p>

                    <div className="task-list-stack">
                        {project.phases?.map((phase: PhaseType, pIdx: number) => (
                            <div key={phase.id ?? pIdx} className="phase-group-wrap">
                                <h4 className="phase-inner-title">Phase {pIdx + 1}: {phase.phase_name}</h4>
                                {phase.tasks?.map((task: any) => (
                                    <label key={task.id} className={`html-task-item ${task.status ? 'completed' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={task.status}
                                            onChange={() => handleToggleTask(task.id)}
                                        />
                                        <div className="task-info">
                                            <b>{task.task_name}</b>
                                            <span>น้ำหนักงาน: {task.weight_percentage}%</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/*Financial Tracking */}
                <div className="update-card">
                    <h2 className="section-title"><span></span>ติดตามการเบิกจ่ายงบประมาณ (Financial Tracking)</h2>

                    {project.installments?.map((inst: InstallmentType, iIdx: number) => (
                        <div key={inst.id ?? iIdx} className="inst-table-wrap">
                            <h4 className="inst-table-title">งวดที่ {iIdx + 1}: {inst.title}</h4>
                            <table className="html-budget-table">
                                <thead>
                                    <tr>
                                        <th>รายการค่าใช้จ่าย</th>
                                        <th>จำนวนเงิน</th>
                                        <th>สถานะ</th>
                                        <th>ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(inst.budget_items ?? inst.items ?? []).map((item: any) => (
                                        <tr key={item.id}>
                                            <td>{item.detail}</td>
                                            <td className="font-bold">฿ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td width="20%">
                                                <span className={`status-pill ${item.status ? 'paid' : 'unpaid'}`}>
                                                    {item.status ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                                                </span>
                                            </td>
                                            <td width="15%">
                                                {!item.status && (
                                                    <button type="button" className="btn-pay" onClick={() => handlePayItem(item.id)}>
                                                        จ่ายเงิน
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <button type="button" onClick={handleSaveAndRedirect} className="btn-save">
                    บันทึกความคืบหน้าโครงการ
                </button>
            </div>
        </div>
    );
}