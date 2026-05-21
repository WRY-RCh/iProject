"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
export default function ProjectResultPage() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [summary, setSummary] = useState("");
    const [obstacles, setObstacles] = useState("");
    const [fileList, setFileList] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/projects/${id}`);
                if (res.ok) setProject(await res.json());
            } catch (err) {
                console.error(err);
            }
        };
        if (id) fetchProject();
    }, [id]);

    // ฟังก์ชันรวมไฟล์ที่เลือกเข้ามาสะสมไว้ใน State (ไม่ให้ทับของเก่า)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const chosenFiles = Array.from(e.target.files);
            setFileList((prevFiles) => [...prevFiles, ...chosenFiles]);
        }
    };

    //  ฟังก์ชันคลิกเอาไฟล์บางไฟล์ออกจากลิสต์ก่อนกดส่ง
    const handleRemoveFile = (indexToRemove: number) => {
        setFileList((prevFiles) => prevFiles.filter((_, idx) => idx !== indexToRemove));
    };

    // วนลูป append ไฟล์ทั้งหมดลง FormData ยิงข้ามฝั่ง API
   const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    
    // 📌 1. เปิดกล่อง Toast แจ้งเตือนสถานะการส่งข้อมูลและไฟล์ดักรอไว้ก่อน
    const toastId = toast.loading("กำลังอัปโหลดไฟล์รายงานและประมวลผลปิดโครงการ...");

    const formData = new FormData();
    formData.append("summary", summary);
    formData.append("obstacles", obstacles);
    
    fileList.forEach((file) => {
        formData.append("files", file);
    });

    try {
        const res = await fetch(`http://localhost:8000/api/projects/${id}/close-report`, {
            method: "POST",
            body: formData,
        });

        if (res.ok) {
            toast.success("🎉 ส่งรายงานสรุปผลและบันทึกปิดโครงการเรียบร้อยแล้ว!", { id: toastId });
            
            router.push(`/user/projects/${id}`);
        } else {
            const errData = await res.json();
            const errorMessage = errData.detail ?? "ไม่สามารถส่งรายงานได้";
            
            toast.error(`เกิดข้อผิดพลาด: ${errorMessage}`, { id: toastId });
        }
    } catch (err) {
        console.error(err);
        toast.error("ระบบเน็ตเวิร์กขัดข้อง ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", { id: toastId });
    } finally {
        setSubmitting(false);
    }
};

    return (
        <div className="iproject-result-theme" style={{ padding: '80px 0px 0px 0px' }}>

            <div className="container-result-layout">
                <div className="success-banner">
                    <div className="success-icon-wrap"><i className="fa-solid fa-trophy" /></div>
                    <h1>Project Completed!</h1>
                    <p>กิจกรรมตามแผนดำเนินงานบรรลุเป้าหมาย 100% ครบถ้วนเสร็จสมบูรณ์แล้ว</p>
                    {project && <p className="project-title-badge">โครงการ:<strong> {project.projectInfo?.title}</strong></p>}
                </div>

                <form onSubmit={handleSubmitReport} className="iproject-modern-form">
                    <div className="result-card">
                        <h2 className="section-title"><span />สรุปผลการดำเนินงาน (Final Report Details)</h2>
                        <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="text-primary-label"><i className="fa-solid fa-file-contract mr-1" /> สรุปความสำเร็จตามวัตถุประสงค์โครงการ</label>
                            <textarea className="iproject-textarea" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="อธิบายข้อเท็จจริงหรือตัวชี้วัดที่โครงการสามารถทำได้สำเร็จลุล่วง..." required />
                        </div>
                        <div className="form-group">
                            <label className="text-warning-label"><i className="fa-solid fa-triangle-exclamation mr-1" /> ปัญหา อุปสรรค และแนวทางแก้ไข (ถ้ามี)</label>
                            <textarea className="iproject-textarea reason-textarea" rows={4} value={obstacles} onChange={(e) => setObstacles(e.target.value)} placeholder="พิมพ์อธิบายปัญหาที่พบเจอระหว่างการรันโปรเจกต์..." />
                        </div>
                    </div>

                    {/* โซนจัดการไฟล์แนบแบบหลายไฟล์ (Multiple Attachments) */}
                    <div className="result-card">
                        <h2 className="section-title"><span />เอกสารแนบและรูปภาพประกอบ (Project Attachments)</h2>
                        <p className="section-desc">สามารถเลือกอัปโหลดไฟล์รายงาน PDF หรือรูปภาพกิจกรรมได้มากกว่า 1 ไฟล์พร้อมกัน</p>
                        
                        <label htmlFor="final-report-files" className="result-upload-area">
                            <i className="fa-solid fa-cloud-arrow-up" />
                            <div>
                                <p><b>คลิกเพื่อเลือกไฟล์หลักฐานเพิ่ม</b> หรือลากไฟล์มาวาง</p>
                                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>เลือกได้หลายไฟล์พร้อมกัน (PDF, JPG, PNG)</p>
                            </div>
                            <input 
                                type="file" 
                                id="final-report-files" 
                                onChange={handleFileChange} 
                                accept="application/pdf,image/*"
                                multiple 
                                style={{ display: "none" }} 
                            />
                        </label>

                        {/*รายการไฟล์ที่เลือกไว้ (File Queue List) */}
                        {fileList.length > 0 && (
                            <div className="file-preview-list" style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>ไฟล์ที่เตรียมอัปโหลด ({fileList.length} ไฟล์):</p>
                                {fileList.map((file, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 15px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                            <i className="fa-solid fa-file-lines" style={{ color: "#2563eb" }} />
                                            <span style={{ color: "#334155", fontWeight: "600" }}>{file.name}</span>
                                            <span style={{ color: "#64748b", fontSize: "11px" }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveFile(idx)} 
                                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px" }}
                                            title="ลบไฟล์นี้ออก"
                                        >
                                            <i className="fa-solid fa-trash-can" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={submitting} className="btn-close-project">
                        {submitting ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-1" /> กำลังส่งข้อมูลและไฟล์ทั้งหมด...</>
                        ) : (
                            <><i className="fa-solid fa-circle-check mr-1" /> ส่งรายงานสรุปและปิดโครงการ (Submit Final Report)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}