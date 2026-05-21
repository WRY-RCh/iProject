"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { PhaseType, InstallmentType,TaskType ,BudgetSubItemType,ProjectManagerType  } from "@/types/project";


function formatDate(date?: string) {
    if (!date) return "-";
    return new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}

function formatMoney(value?: number | string) {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
}

function getInitials(name?: string) {
    if (!name) return "YR";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

export default function ProjectViewPage() {
    const params = useParams<{ id?: string }>();
    const projectId = params?.id ?? "1";
    const [project, setProject] = useState<any>({ phases: [], installments: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSection, setEditSection] = useState("");
    const [newData, setNewData] = useState("");
    const [editReason, setEditReason] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadProject() {
            try {
                setIsLoading(true);
                setError("");
                const response = await fetch(`http://localhost:8000/api/projects/${projectId}`, { cache: "no-store" });

                if (!response.ok) {
                    throw new Error("ไม่สามารถดึงข้อมูลโครงการได้");
                }

                const data = await response.json();
                if (!ignore) setProject(data);
            } catch (err) {
                if (!ignore) {
                    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
                    setProject({ phases: [], installments: [] });
                }
            } finally {
                if (!ignore) setIsLoading(false);
            }
        }

        loadProject();
        return () => {
            ignore = true;
        };
    }, [projectId]);


    const stepsOrder = ["Initiation", "Planning", "Execution", "completed"];
    const currentStatus = project?.status || project?.projectInfo?.status || "Initiation";
    const currentStepIndex = stepsOrder.indexOf(currentStatus);

    const allTasks = useMemo(() => {
        if (!project) return [];

        const phaseTasks = Array.isArray(project.phases)
            ? project.phases.flatMap((phase: any) => {
                const tasks = phase.tasks ?? phase.phase_tasks ?? [];
                return Array.isArray(tasks)
                    ? tasks.map((task: any) => ({ ...task, phase_name: phase.phase_name }))
                    : [];
            })
            : [];

        if (phaseTasks.length > 0) return phaseTasks;
        return Array.isArray(project.tasks) ? project.tasks : [];
    }, [project]);

    const installments = useMemo(() => {
        if (!project) return [];
        return Array.isArray(project.installments)
            ? project.installments
            : Array.isArray(project.project_installments)
                ? project.project_installments
                : [];
    }, [project]);

    // เช็ค project ก่อนคำนวณ progress และ dateRange
    const progress = (() => {
        if (!project || !project.phases) return 0;

        const allTasks = project.phases.flatMap((phase: any) => phase.tasks ?? []);

        if (allTasks.length === 0) return 0;

        const completedWeight = allTasks.reduce((sum: number, task: any) => {
            if (task.status === true) {
                return sum + (Number(task.weight_percentage) || 0);
            }
            return sum;
        }, 0);

        return Math.min(100, Math.round(completedWeight));
    })();
    const dateRange = project ? `${formatDate(project?.projectInfo?.start_date)} - ${formatDate(project?.projectInfo?.end_date)}` : "-";
    const evaluationText = project?.evaluation_text || "-";
    const budgetSummary = (() => {
        const grandTotal = project?.grand_total ? Number(project.grand_total) : 0;

        if (!project || !project.installments) {
            return { grandTotal, paidAmount: 0, remainingAmount: grandTotal };
        }

        const allBudgetItems = project.installments.flatMap((inst: any) => inst.budget_items ?? inst.items ?? []);

        const paidAmount = allBudgetItems.reduce((sum: number, item: any) => {
            if (item.status === true) {
                return sum + (Number(item.amount) || 0);
            }
            return sum;
        }, 0);

        const remainingAmount = Math.max(0, grandTotal - paidAmount);

        return { grandTotal, paidAmount, remainingAmount };
    })();

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    const getCurrentData = () => {
        if (!project) return "กำลังโหลดข้อมูลโครงการ...";
        if (!editSection) return "เลือกหัวข้อที่ต้องการแก้ไข";

        switch (editSection.trim()) {
            case "ชื่อโครงการ":
                return project.projectInfo?.title ?? "-";

            case "หลักการและเหตุผล":
                return project.projectInfo?.rationale ?? "-";

            case "วัตถุประสงค์":
                return project.projectInfo?.objectives ?? "-";

            case "กลุ่มเป้าหมาย":
                return project.projectInfo?.target_group ?? "-";

            case "วิธีดำเนินการ / กิจกรรม":
                const phases = project.phases ?? [];
                if (phases.length === 0) return "ไม่มีข้อมูลเฟสงานย่อย";
                return phases.map((p: any, i: number) => `Phase ${i + 1}: ${p.phase_name ?? p.phaseName}`).join("\n");

            case "ระยะเวลาดำเนินการ":
                const start = project.projectInfo?.start_date ?? "-";
                const end = project.projectInfo?.end_date ?? "-";
                return `เริ่ม: ${start} ถึง ${end}`;

            case "สถานที่ดำเนินการ":
                return project.projectInfo?.location ?? "-";

            case "งบประมาณ / งวดงาน":
                const total = project.grand_total ?? project.grandTotal;
                return total ? `งบรวมทั้งหมด: ฿${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-";

            case "ผู้รับผิดชอบโครงการ":
                const rights = project.access_rights ?? project.managers ?? [];
                if (rights.length === 0) return "ไม่มีข้อมูลผู้รับผิดชอบ";
                return rights.map((acc: any) => {
                    const name = acc.user?.fullname ?? acc.name ?? `User ID: ${acc.user_id}`;
                    return `- ${name} (${acc.role ?? "Team Member"})`;
                }).join("\n");

            case "การติดตามและประเมินผล":
                return project.evaluation_text ?? "-";

            case "ผลที่คาดว่าจะได้รับ":
                return project.projectInfo?.expected_benefits ?? project.projectInfo?.expectedBenefits ?? "-";

            default:
                return "-";
        }
    };


    function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        alert("ส่งคำขอแก้ไขเรียบร้อยแล้ว! รอการอนุมัติ");
        setIsEditModalOpen(false);
        setEditSection("");
        setNewData("");
        setEditReason("");
    }

    return (
        <>
            <div className="project-view-container" style={{ padding: '80px 0px 0px 0px' }} >
                

                <div className="stepper-card">
                    {stepsOrder.map((step, index) => {
                        const isActive = index <= currentStepIndex;

                        return (
                            <div key={step} className={`step-item ${isActive ? "active" : ""}`}>
                                <div className="step-dot" />
                                <div className="step-label">{step}</div>
                            </div>
                        );
                    })}
                </div>

                {error && <div className="project-alert">{error} — แสดงข้อมูลตัวอย่างแทนชั่วคราว</div>}
                <div className="project-grid-layout">
                    <main>
                        <div className="card">
                            <div className="meta-tags">
                                <span className="tag"><i className="fa-solid fa-calendar" /> {dateRange}</span>
                                <span className="tag"><i className="fa-solid fa-location-dot" /> {project?.projectInfo?.location || "-"}</span>
                                <span className="tag"><i className="fa-solid fa-circle-info" /> {isLoading ? "Loading..." : project?.status || "Planning"}</span>
                            </div>
                            <h1 className="project-title">{project?.projectInfo?.title || "ไม่มีชื่อโครงการ"}</h1>
                            <div className="desc-text">
                                <b>หลักการและเหตุผล:</b>
                                <p className="pre-line-text">
                                    {project?.projectInfo?.rationale || "-"}
                                </p>
                            </div>
                            <div className="desc-text">
                                <b>วัตถุประสงค์:</b>
                                <p className="pre-line-text">
                                    {project?.projectInfo?.objectives || "-"}
                                </p>
                            </div>
                            <div className="project-summary-grid">
                                <div><b>กลุ่มเป้าหมาย:</b> {project?.projectInfo?.target_group || "-"}</div>
                                <div><b>การประเมินผล:</b> {evaluationText}</div>
                            </div>
                        </div>

                        <div className="card">
                            <h2 className="section-title"><span></span>แผนการดำเนินงาน (Task Execution)</h2>
                            {project?.phases && project.phases.length > 0 ? (
                                [...project.phases]
                                    .sort((a, b) => {
                                        const numA = parseInt(a.phase_name.match(/\d+/)?.[0] || "0", 10);
                                        const numB = parseInt(b.phase_name.match(/\d+/)?.[0] || "0", 10);
                                        return numA - numB;
                                    })
                                    .map((phase: PhaseType, phaseIdx: number) => (
                                        <div key={phase.id ?? phaseIdx} className="iproject-phase-box">

                                            <div className="iproject-phase-header">
                                                <i className="fa-solid fa-folder-open icon-blueprint" />
                                                <span className="phase-title-text">
                                                    {/phase/i.test(phase.phase_name) ? "" : `Phase ${phaseIdx + 1}: `}
                                                    {phase.phase_name}
                                                </span>
                                            </div>

                                            <table className="iproject-task-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '8%', textAlign: 'center' }}>สถานะ</th>
                                                        <th style={{ width: '77%' }}>กิจกรรม / งานย่อย</th>
                                                        <th style={{ width: '15%', textAlign: 'right' }}>น้ำหนัก</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {phase.tasks && phase.tasks.length > 0 ? (
                                                        phase.tasks.map((task: TaskType, taskIdx: number) => {
                                                            const isCompleted = task.status === true;

                                                            return (
                                                                <tr key={`${task.id ?? taskIdx}-${task.task_name}`}>
                                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                        <span className={isCompleted ? "task-status-done" : "task-status-ongoing"}>
                                                                            <i className={`fa-solid ${isCompleted ? "fa-circle-check" : "fa-circle-dot"}`} />
                                                                        </span>
                                                                    </td>
                                                                    {/* ข้อมูลเนื้อหาแบบประหยัดพื้นที่ */}
                                                                    <td style={{ verticalAlign: 'middle' }}>
                                                                        <div className="task-title-inline">{task.task_name ?? "-"}</div>
                                                                        {task.duration && (
                                                                            <div className="task-meta-inline">
                                                                                <i className="fa-regular fa-clock" />
                                                                                <span>ระยะเวลา: {task.duration} {task.duration_unit ?? "วัน"}</span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    {/* เปอร์เซ็นต์น้ำหนักงาน */}
                                                                    <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: '600' }} className="task-weight-text">
                                                                        {Number(task.weight_percentage ?? 0).toFixed(2)}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="task-empty-row">
                                                                ยังไม่มีรายการงานย่อยในเฟสนี้
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))
                            ) : (
                                <div className="iproject-empty-state">ยังไม่มีข้อมูลแผนการดำเนินงาน</div>
                            )}
                        </div>

                        <div className="card">
                            <h2 className="section-title"><span></span>รายละเอียดงบประมาณ (Financials)</h2>

                            {installments && installments.length > 0 ? (
                                installments.map((installment: InstallmentType, index: number) => {
                                    const items = installment.budget_items ?? installment.items ?? [];


                                    return (
                                        <div key={`${installment.id ?? index}-${installment.title}`} className="iproject-installment-box">

                                            <div className="iproject-installment-header">
                                                <div className="installment-left">
                                                    <i className="fa-solid fa-wallet icon-wallet" />
                                                    <b className="installment-title-text">
                                                        {/งวด|installment/i.test(installment.title) ? "" : `งวดที่ ${index + 1}: `}
                                                        {installment.title ?? `งวดที่ ${index + 1}`}
                                                    </b>
                                                </div>

                                                <div className="iproject-meta-tags">
                                                    {installment.is_approved === true && (
                                                        <span className="inst-badge-approved">
                                                            <i className="fa-solid fa-circle-check mr-1" />&nbsp;&nbsp;&nbsp; อนุมัติงวดงานแล้ว
                                                        </span>
                                                    )}

                                                    {installment.is_approved === false && (
                                                        <span className="inst-badge-rejected">
                                                            <i className="fa-solid fa-circle-xmark mr-1" />&nbsp;&nbsp;&nbsp; ไม่อนุมัติงวดงาน
                                                        </span>
                                                    )}

                                                    {(installment.is_approved === null || installment.is_approved === undefined) && (
                                                        <span className="inst-badge-pending">
                                                            <i className="fa-solid fa-hourglass-half mr-1" /> รออนุมัติงวดงาน
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ตารางแสดงรายการค่าใช้จ่ายย่อย */}
                                            {items.length > 0 ? (
                                                <table className="iproject-budget-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '55%' }}>รายละเอียดค่าใช้จ่าย</th>
                                                            <th style={{ width: '20%', textAlign: 'center' }}>สถานะการจ่ายเงิน</th>
                                                            <th style={{ width: '25%', textAlign: 'right' }}>จำนวนเงิน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item, itemIndex) => {
                                                            const isPaid = item.status === true;

                                                            return (
                                                                <tr key={`${item.id ?? itemIndex}-${item.detail}`}>
                                                                    <td style={{ verticalAlign: 'middle' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <div className="budget-item-detail">{item.detail ?? "-"}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                        <span className={isPaid ? "budget-status-paid" : "budget-status-unpaid"}>
                                                                            <i className={`fa-solid ${isPaid ? "fa-circle-check" : "fa-clock"} mr-1`} />
                                                                            {isPaid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: '600' }} className="budget-item-amount">
                                                                        {formatMoney ? formatMoney(item.amount) : `฿${Number(item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="iproject-budget-empty-row">
                                                    <i className="fa-solid fa-circle-info mr-1" /> (ยังไม่มีการเบิกจ่าย / รออนุมัติจาก Sponsor)
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="iproject-empty-state">ยังไม่มีข้อมูลงวดงานและรายละเอียดงบประมาณ</div>
                            )}
                        </div>
                    </main>

                    <aside>
                        <div className="card iproject-progress-card">
                            <div className="progress-card-header">
                                <div className="icon-wrap">
                                    <i className="fa-solid fa-chart-line icon-chart" />
                                </div>
                                <div>
                                    <span className="widget-title">ภาพรวมความคืบหน้า (Overall Progress)</span>
                                    <p className="progress-sub-text">คำนวณจากสัดส่วนน้ำหนักงานที่เสร็จสิ้น</p>
                                </div>
                            </div>

                            <div className="progress-body">
                                {/* ตัวเลขความคืบหน้าขนาดใหญ่เด่นชัด */}
                                <div className="progress-number-block">
                                    <span className="big-progress">{progress}%</span>
                                    {!isMounted ? (
                                        <span className="progress-status-badge status-ongoing">
                                            <i className="fa-solid fa-spinner fa-spin mr-1" /> Loading...
                                        </span>
                                    ) : (
                                        <span className={`progress-status-badge ${progress === 100 ? 'status-success' : 'status-ongoing'}`}>
                                            <i className={`fa-solid ${progress === 100 ? 'fa-square-check' : (progress === 0 ? 'fa-circle-play' : 'fa-spinner fa-spin')} mr-1`} />&nbsp;&nbsp;&nbsp;
                                            {progress === 100 ? "Completed" : (progress === 0 ? "Will Start Soon" : "On Track")}
                                        </span>
                                    )}
                                </div>

                                {/* หลอด Progress Bar ดีไซน์เนียนตา Minimalist */}
                                <div className="iproject-progress-bar-bg">
                                    <div
                                        className={`iproject-progress-bar-fill ${progress === 100 ? 'fill-success' : 'fill-primary'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="iproject-financial-summary-grid">

                            <div className="budget-summary-card card-total">
                                <div className="card-header-flex">
                                    <span className="summary-label">งบประมาณรวมทั้งหมด</span>
                                    <i className="fa-solid fa-vault icon-total" />
                                </div>
                                <span className="summary-amount">{formatMoney ? formatMoney(budgetSummary.grandTotal) : `฿${budgetSummary.grandTotal.toLocaleString()}`}</span>
                                <div className="summary-note">* ยอดรวมที่ตั้งไว้ทุกงวดงาน</div>
                            </div>

                            <div className="budget-summary-card card-paid">
                                <div className="card-header-flex">
                                    <span className="summary-label">เบิกจ่ายไปแล้ว</span>
                                    <i className="fa-solid fa-circle-check icon-paid" />
                                </div>
                                <span className="summary-amount text-success">
                                    {formatMoney ? formatMoney(budgetSummary.paidAmount) : `฿${budgetSummary.paidAmount.toLocaleString()}`}
                                </span>
                                <div className="summary-note">
                                    คิดเป็น {budgetSummary.grandTotal > 0 ? Math.round((budgetSummary.paidAmount / budgetSummary.grandTotal) * 100) : 0}% ของงบทั้งหมด
                                </div>
                            </div>

                            <div className="budget-summary-card card-remaining">
                                <div className="card-header-flex">
                                    <span className="summary-label">งบประมาณคงเหลือ</span>
                                    <i className="fa-solid fa-wallet icon-remaining" />
                                </div>
                                <span className="summary-amount text-warning">
                                    {formatMoney ? formatMoney(budgetSummary.remainingAmount) : `฿${budgetSummary.remainingAmount.toLocaleString()}`}
                                </span>
                                <div className="summary-note">* ยอดที่รอการเคลียร์บิล</div>
                            </div>

                        </div>

                        <div className="iproject-team-card card">
                            <div className="team-card-header">
                                <div className="team-icon-wrap">
                                    <i className="fa-solid fa-users-gear icon-team" />
                                </div>
                                <div>
                                    <h2 className="section-title" style={{ margin: 0, padding: 0, border: 'none' }}>
                                        คณะผู้รับผิดชอบโครงการ (Project Team)
                                    </h2>
                                    <p className="team-sub-text">รายชื่อผู้มีสิทธิ์บริหารจัดการและผู้ร่วมดำเนินงาน</p>
                                </div>
                            </div>

                            <div className="iproject-member-grid">
                                {(project.managers?.length ? project.managers : [{ id: 0, name: "ยังไม่มีผู้รับผิดชอบ", role: "Team Member" }]).map((access: ProjectManagerType, index: number) => {
                                    const roleName = access.role ?? "Team Member";

                                    let roleClass = "role-badge-member";
                                    if (/manager|pm|owner/i.test(roleName)) {
                                        roleClass = "role-badge-manager";
                                    } else if (/developer|coder|engineer/i.test(roleName)) {
                                        roleClass = "role-badge-dev";
                                    } else if (/sponsor|admin|auditor/i.test(roleName)) {
                                        roleClass = "role-badge-admin";
                                    }

                                    return (
                                        <div key={access.id ?? index} className="iproject-member-item">
                                            <div className="iproject-member-avatar-wrap">
                                                <div className="iproject-member-avatar">
                                                    {getInitials ? getInitials(access.name) : (access.name?.slice(0, 2) ?? "MB")}
                                                </div>
                                            </div>

                                            <div className="iproject-member-info">
                                                <b className="member-fullname">{access.name ?? "สมาชิกโครงการ"}</b>
                                                <div>
                                                    <span className={`iproject-role-badge ${roleClass}`}>
                                                        <i className="fa-solid fa-id-badge mr-1" /> {roleName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="btn-group">
                                <Link href={`/user/projects/${project?.project_id}/update`} className="btn-action">Update Project</Link>
                                <button type="button" onClick={() => setIsEditModalOpen(true)} className="btn-request-edit">
                                    <i className="fa-solid fa-pen-to-square" /> Edit Project
                                </button>
                            </div>
                        </div>


                        <div className="card sidebar-card-top">
                            <span className="widget-title">Project Sponsors</span>
                            <div className="member-list">
                                <div className="member-item">
                                    <div className="member-avatar sponsor-orange"><i className="fa-solid fa-hand-holding-dollar" /></div>
                                    <div className="member-info"><b>TechVision Capital</b><span>Lead Sponsor</span></div>
                                </div>
                                <div className="member-item">
                                    <div className="member-avatar sponsor-green"><i className="fa-solid fa-building" /></div>
                                    <div className="member-info"><b>I-Corp Foundation</b><span>Co-Sponsor</span></div>
                                </div>
                            </div>
                            <div className="become-sponsor-box">
                                <Link href="/user/find-sponsor"><i className="fa-solid fa-plus-circle" /> Become a Sponsor</Link>
                            </div>
                        </div>

                        <div className="card">
                            <span className="widget-title">Expected Benefits</span>
                            <p className="benefits-text">{project.projectInfo?.expectedBenefits || "-"}</p>
                        </div>
                    </aside>
                </div>
            </div>

            {isEditModalOpen && (
                <div className="modal-overlay" onClick={(event) => event.currentTarget === event.target && setIsEditModalOpen(false)}>
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2><i className="fa-solid fa-code-pull-request" /> Project Edit Form</h2>
                            <button type="button" className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSubmitEdit} className="iproject-modern-form">
                            <div className="modal-body iproject-modal-scroll">

                                <div className="iproject-alert-instruction">
                                    <i className="fa-solid fa-circle-info icon-info-alert" />
                                    <p className="instruction">ระบุรายละเอียดที่คุณต้องการแก้ไขและเหตุผลความจำเป็น เพื่อระบบแจ้งเตือนไปยังผู้ดูแลและผู้สนับสนุนโครงการได้รับรู้</p>
                                </div>

                                <div className="form-group">
                                    <label><i className="fa-solid fa-list-check mr-1" /> หัวข้อที่ต้องการแก้ไข (Section to Edit)</label>
                                    <select className="iproject-select" value={editSection} onChange={(event) => setEditSection(event.target.value)} required>
                                        <option value="">-- เลือกหัวข้อที่คุณต้องการปรับปรุง --</option>
                                        {[
                                            "ชื่อโครงการ", "หลักการและเหตุผล", "วัตถุประสงค์",
                                            "กลุ่มเป้าหมาย", "วิธีดำเนินการ / กิจกรรม", "ระยะเวลาดำเนินการ",
                                            "สถานที่ดำเนินการ", "งบประมาณ / งวดงาน", "ผู้รับผิดชอบโครงการ",
                                            "การติดตามและประเมินผล", "ผลที่คาดว่าจะได้รับ"
                                        ].map((section) => (
                                            <option key={section} value={section}>{section}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* แสดงข้อมูลปัจจุบัน (Dynamic Value) */}
                                <div className="form-group">
                                    <label><i className="fa-solid fa-file-invoice mr-1" /> ข้อมูลปัจจุบันในระบบ (Current Data)</label>
                                    <textarea
                                        readOnly
                                        className="readonly-textarea iproject-textarea-disabled"
                                        value={getCurrentData()}
                                        placeholder="เลือกหัวข้อด้านบนเพื่อดูข้อมูลเดิม..."
                                        rows={3}
                                    />
                                </div>

                                {/* ช่องกรอกข้อมูลใหม่ */}
                                <div className="form-group">
                                    <label className="text-primary-label"><i className="fa-solid fa-file-pen mr-1" /> ข้อมูลใหม่ที่ต้องการเสนอเปลี่ยน (New Proposed Data)</label>
                                    <textarea
                                        className="iproject-textarea"
                                        value={newData}
                                        onChange={(event) => setNewData(event.target.value)}
                                        placeholder="พิมพ์เนื้อหาใหม่ที่ผ่านการปรับปรุงแก้ไขแล้วที่นี่..."
                                        required
                                        rows={4}
                                    />
                                </div>

                                {/* ระบุเหตุผล */}
                                <div className="form-group">
                                    <label className="text-warning-label"><i className="fa-solid fa-comment-dots mr-1" /> เหตุผลความจำเป็นในการขอแก้ไข (Reason for Request)</label>
                                    <textarea
                                        className="iproject-textarea reason-textarea"
                                        value={editReason}
                                        onChange={(event) => setEditReason(event.target.value)}
                                        placeholder="อธิบายเหตุผลหรือระบุปัญหาความจำเป็นที่ต้องมีการแก้ไขในครั้งนี้เพื่อประกอบการอนุมัติ..."
                                        required
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer iproject-modal-footer-flex">
                                <button type="button" className="btn-cancel-modern" onClick={() => setIsEditModalOpen(false)}>
                                    <i className="fa-solid fa-xmark mr-1" /> ยกเลิก (Cancel)
                                </button>
                                <button type="submit" className="btn-send-modern">
                                    <i className="fa-solid fa-paper-plane mr-1" /> อัปเดต (Submit update)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
