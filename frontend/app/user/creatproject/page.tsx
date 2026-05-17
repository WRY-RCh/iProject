'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useRef } from 'react';


export default function CreateProject() {
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [grandTotal, setGrandTotal] = useState(0);
    const projectInfoRef = useRef<HTMLDivElement>(null);
    const phasesRef = useRef<HTMLDivElement>(null);
    const installmentsRef = useRef<HTMLDivElement>(null);
    const evaluationRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<HTMLDivElement>(null);
    const managerRef = useRef<HTMLDivElement>(null);




    // 1. ข้อมูลพื้นฐาน
    const [projectInfo, setProjectInfo] = useState({
        title: '',
        rationale: '',
        objectives: '',
        target_group: '',
        start_date: '',
        end_date: '',
        location: '',
        expectedBenefits: '',
        status: false,
        includeWeekend: false, // สำหรับ Checkbox รวมวันหยุดเสาร์-อาทิตย์
        includePublicHoliday: false // สำหรับ Checkbox รวมวันหยุดนักขัตฤกษ์
    });


    const [phases, setPhases] = useState([
        {
            id: 1,
            phase_name: '',
            tasks: [{ task_name: '', duration: 0, duration_unit: 'days', weight_percentage: 0 }]
        }
    ]);

    const [dbHolidays, setDbHolidays] = useState<string[]>([]);
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/holidays");
                setDbHolidays(res.data);
            } catch (err) {
                console.error("Failed to fetch holidays", err);
            }
        };
        fetchHolidays();
    }, []);

    // ฟังก์ชันคำนวณวันสิ้นสุด
    const calculateEndDate = useCallback(() => {
        if (!projectInfo.start_date) return '';

        let totalDurationDays = 0;
        phases.forEach(phase => {
            phase.tasks.forEach((task: any) => {
                const val = parseInt(task.duration) || 0;
                totalDurationDays += (task.duration_unit === 'weeks') ? val * 7 : val;
            });
        });

        if (totalDurationDays > 0) {
            let currentDate = new Date(projectInfo.start_date);
            let addedDays = 0;

            while (addedDays < totalDurationDays) {
                currentDate.setDate(currentDate.getDate() + 1);

                const dateString = currentDate.toISOString().split('T')[0];
                const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

                const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                const isHoliday = dbHolidays.includes(dateString);

                // Logic การข้ามวัน (Skip)
                if (!projectInfo.includeWeekend && isWeekend) continue;
                if (!projectInfo.includePublicHoliday && isHoliday) continue;

                addedDays++;
            }
            return currentDate.toISOString().split('T')[0];
        }
        return '';
    }, [projectInfo.start_date, projectInfo.includeWeekend, projectInfo.includePublicHoliday, phases, dbHolidays]);

    useEffect(() => {
        const newEndDate = calculateEndDate();
        if (newEndDate !== projectInfo.end_date) {
            setProjectInfo(prev => ({ ...prev, end_date: newEndDate }));
        }
    }, [calculateEndDate, projectInfo.end_date]);

    useEffect(() => {
        const resultDate = calculateEndDate();
        if (resultDate !== projectInfo.end_date) {
            setProjectInfo(prev => ({ ...prev, end_date: resultDate }));
        }
    }, [projectInfo.start_date, projectInfo.includeWeekend, projectInfo.includePublicHoliday, phases]);




    // 2. จัดการกิจกรรม (Phases & Tasks)
    useEffect(() => {
        const calculateEndDate = () => {
            if (!projectInfo.start_date) return '';

            // รวมจำนวนวันทั้งหมดจากทุก Phase และทุก Task
            let totalDays = 0;
            phases.forEach(p => p.tasks.forEach((t: any) => {
                const duration = parseInt(t.duration) || 0;
                totalDays += (t.duration_unit === 'weeks') ? duration * 7 : duration;
            }));

            if (totalDays === 0) return '';

            let d = new Date(projectInfo.start_date);
            let added = 0;

            // Logic วนลูปเพิ่มวันโดยตรวจสอบเงื่อนไขวันหยุด
            while (added < totalDays) {
                d.setDate(d.getDate() + 1);

                const dateString = d.toISOString().split('T')[0];
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                // ✅ ตรวจสอบวันหยุดจาก Database (dbHolidays)
                const isHoliday = dbHolidays.includes(dateString);

                // ถ้าไม่รวมเสาร์-อาทิตย์ และวันนี้เป็นวันหยุด ให้ข้ามไป (ไม่นับ added)
                if (!projectInfo.includeWeekend && isWeekend) continue;
                // ถ้าไม่รวมวันหยุดนักขัตฤกษ์ และวันนี้เป็นวันหยุด ให้ข้ามไป (ไม่นับ added)
                if (!projectInfo.includePublicHoliday && isHoliday) continue;

                added++;
            }
            return d.toISOString().split('T')[0];
        };

        const finalDate = calculateEndDate();
        // อัปเดต State เมื่อผลลัพธ์ใหม่ไม่ตรงกับค่าเดิม
        if (finalDate !== projectInfo.end_date) {
            setProjectInfo(prev => ({ ...prev, end_date: finalDate }));
        }

        // dependency array เฝ้าดูการเปลี่ยนแปลงของข้อมูลที่เกี่ยวข้องทั้งหมดรวมถึง dbHolidays
    }, [projectInfo.start_date, projectInfo.includeWeekend, projectInfo.includePublicHoliday, phases, dbHolidays]);


    // --- ฟังก์ชันจัดการ Phases/Tasks ---
    const addPhase = () => {
        setPhases([...phases, {
            id: Date.now(),
            phase_name: '',
            tasks: [{ task_name: '', duration: 0, duration_unit: 'days', weight_percentage: 0 }]
        }]);
    };


    const addSubTask = (phaseIndex: number) => {
        const newPhases = [...phases];
        newPhases[phaseIndex].tasks.push({ task_name: '', duration: 0, duration_unit: 'days', weight_percentage: 0 });
        setPhases(newPhases);
    };

    const handleWeightChange = (pIdx: number, tIdx: number, value: string) => {
        let num = parseFloat(value);

        if (value === "" || isNaN(num)) {
            num = 0;
        }

        else if (num > 100) {
            num = 100;
        }

        else if (num < 0) {
            num = 0;
        }

        const newPhases = [...phases];
        newPhases[pIdx].tasks[tIdx].weight_percentage = num;
        setPhases(newPhases);
    };

    const handledayChange = (pIdx: number, tIdx: number, value: string) => {
        let num = parseFloat(value);

        if (value === "" || isNaN(num)) {
            num = 0;
        }

        else if (num < 0) {
            num = 0;
        }

        const newPhases = [...phases];
        newPhases[pIdx].tasks[tIdx].duration = num;
        setPhases(newPhases);
    };

    const totalWeight = useMemo(() => {
        return phases.reduce((sum, phase) => {
            const phaseSum = phase.tasks.reduce((tSum, task) => tSum + Number(task.weight_percentage || 0), 0);
            return sum + phaseSum;
        }, 0);
    }, [phases]);



    // 3. จัดการงบประมาณ (Installments)
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    const [budgetMasterData, setBudgetMasterData] = useState<{ [key: string]: string[] }>({});
    const [installments, setInstallments] = useState([
        {
            id: Date.now(),
            title: '',
            mainCategory: '',
            subCategory: '',
            items: [{ id: Date.now() + 1, detail: '', category_id: '', date: '', amount: 0 }]
        }
    ]);


    useEffect(() => {
        const fetchBudgetData = async () => {
            try {
                const [categoriesRes, masterDataRes] = await Promise.all([
                    axios.get('http://localhost:8000/api/budget-categories-type'),
                    axios.get('http://localhost:8000/api/budget-categories')
                ]);

                setCategories(categoriesRes.data);
                setBudgetMasterData(masterDataRes.data);

            } catch (err) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลโครงสร้างงบประมาณ:", err);
            }
        };

        fetchBudgetData();
    }, []);


    const handleMainCategoryChange = (idx: number, value: string) => {
        const next = [...installments];
        next[idx].mainCategory = value;
        next[idx].subCategory = ''; // รีเซ็ตหมวดย่อยเมื่อเปลี่ยนหมวดหลัก
        setInstallments(next);
    };


    // State สำหรับงวดงบประมาณ



    // คำนวณงบรวมทั้งหมดอัตโนมัติ
    useEffect(() => {
        let total = 0;
        installments.forEach(inst => {
            inst.items.forEach(item => {
                total += Number(item.amount) || 0;
            });
        });
        setGrandTotal(total);
    }, [installments]);

    // --- ฟังก์ชันจัดการงวดงาน (Installments) ---
    const addInstallment = () => {
        setInstallments([...installments, {
            id: Date.now(),
            title: '',
            mainCategory: '',
            subCategory: '',
            items: [{ id: Date.now() + 1, detail: '', category_id: '', date: '', amount: 0 }]
        }]);
    };

    const removeInstallment = (id: number) => {
        if (installments.length > 1) {
            setInstallments(installments.filter(inst => inst.id !== id));
        }
    };

    // --- ฟังก์ชันจัดการรายการในงวด (Items) ---
    const addItem = (instIdx: number) => {
        const newInst = [...installments];
        newInst[instIdx].items.push({
            id: Date.now(),
            detail: '',
            category_id: '',
            date: '',
            amount: 0
        });
        setInstallments(newInst);
    };

    const updateItem = (instIdx: number, itemIdx: number, field: string, value: any) => {
        const newInst = [...installments];
        const item = newInst[instIdx].items[itemIdx];

        // ตรวจสอบวันที่ให้อยู่ในช่วงโครงการ (Logic จาก HTML เดิม)
        if (field === 'date') {
            if (projectInfo.start_date && value < projectInfo.start_date) {
                toast.error("วันที่ไม่ถูกต้อง", {
                    description: `วันที่ต้องไม่ก่อน ${projectInfo.start_date}`,
                });
                return; // หยุดการทำงาน ไม่บันทึกค่าลง State
            }
            if (projectInfo.end_date && value > projectInfo.end_date) {
                toast.error("วันที่ไม่ถูกต้อง", {
                    description: `วันที่ต้องไม่เกิน ${projectInfo.end_date}`,
                });
                return; // หยุดการทำงาน ไม่บันทึกค่าลง State
            }
        }

        (item as any)[field] = value;
        setInstallments(newInst);
    };

    const isDateInRange = (dateToCheck: string) => {
        const { start_date, end_date } = projectInfo;
        if (!start_date || !end_date) return true; // ถ้ายังกรอกไม่ครบ ไม่ต้องเช็ค
        return dateToCheck >= start_date && dateToCheck <= end_date;
    };


    useEffect(() => {
        // ฟังก์ชันช่วยแปลงฟอร์แมตวันที่ (ประกาศไว้ข้างนอกหรือข้างบน useEffect ก็ได้)
        const formatDate = (dateString: string) => {
            if (!dateString) return "-";
            const [year, month, day] = dateString.split("-");
            return `${month}/${day}/${year}`;
        };

        // ตรวจสอบวันในงวดงาน
        installments.forEach((inst, iIdx) => {
            inst.items.forEach((item: any) => {
                if (item.date && !isDateInRange(item.date)) {
                    toast.error(`งวดงานที่ ${iIdx + 1} มีวันที่ไม่สอดคล้อง`, {
                        description: `วันที่ ${formatDate(item.date)} อยู่นอกช่วงโครงการ`,
                    });
                }
            });
        });
    }, [projectInfo.start_date, projectInfo.end_date, installments]);
    // ^ อย่าลืมใส่ installments ใน dependency เพื่อให้มันเช็คตอนมีการเพิ่ม/ลดงวดงานด้วยครับ


    // 1. State สำหรับเก็บรายชื่อผู้รับผิดชอบ
    const [managers, setManagers] = useState([
        { id: Date.now(), name: '', role: 'Project Manager', otherRole: '' } // เพิ่ม otherRole
    ]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const handleSearch = async (idx: number, query: string) => {
        // อัปเดตค่าใน input ก่อน
        const next = [...managers];
        next[idx].name = query;
        setManagers(next);

        if (query.length > 1) { // พิมพ์มากกว่า 1 ตัวค่อยค้นหา
            setActiveIdx(idx); // บอกว่าตอนนี้กำลังพิมพ์อยู่ที่แถวไหน
            try {
                const res = await axios.get(`http://localhost:8000/api/search-users?q=${query}`);
                setSuggestions(res.data);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSuggestions([]);
        }
    };

    // ฟังก์ชันเมื่อคลิกเลือกชื่อจากรายการ
    const selectUser = (idx: number, selectedName: string) => {
        const next = [...managers];
        next[idx].name = selectedName;
        setManagers(next);
        setSuggestions([]); // ล้างรายการแนะนำออก
        setActiveIdx(null);
    };

    // ฟังก์ชันเพิ่มผู้ใช้ใหม่
    const addManager = () => {
        setManagers([...managers, { id: Date.now(), name: '', role: 'Project Manager', otherRole: '' }]);
    };

    // ฟังก์ชันลบผู้ใช้
    const removeManager = (id: number) => {
        if (managers.length > 1) {
            setManagers(managers.filter(m => m.id !== id));
        }
    };

    // ฟังก์ชันอัปเดตข้อมูลในแถว
    const updateManager = (id: number, field: string, value: string) => {
        setManagers(managers.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const [myTeams, setMyTeams] = useState<any>({});

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/teams");
                // นำค่าที่ได้จาก API ไปเก็บใน myTeams
                setMyTeams(res.data);
            } catch (error) {
                console.error("Error fetching teams:", error);
            }
        };
        fetchTeams();
    }, []);

    // ฟังก์ชันดึงข้อมูลทีมประจำ
    // 1. State สำหรับควบคุม Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTeamKey, setSelectedTeamKey] = useState<string | null>(null);
    // 2. ฟังก์ชันที่เรียกเมื่อ User เลือกทีมจาก Dropdown
    const handleSelectTeam = (teamKey: string) => {
        if (!teamKey) return;

        // เช็คว่ามีข้อมูลในฟอร์มอยู่แล้วหรือยัง (ถ้ามีให้เปิด Modal)
        const hasData = managers.some(m => m.name.trim() !== '');

        if (hasData) {
            setSelectedTeamKey(teamKey);
            setModalOpen(true); // เปิดป๊อปอัพแทน Alert
        } else {
            executeImport(teamKey); // ถ้าฟอร์มว่างก็นำเข้าได้เลย
        }
    };

    // 3. ฟังก์ชันนำเข้าข้อมูลจริงๆ (เรียกหลังกดยืนยันใน Modal)
    const executeImport = (teamKey: string) => {
        try {

            const teamData = myTeams[teamKey] || [];
            const formattedMembers = teamData.map((member: any) => ({
                id: Math.random(),
                name: member.name || '',
                role: ["Project Manager", "Project Team Members", "Project Coordinator", "Resource Manager", "Consultant"].includes(member.role) ? member.role : 'Other',
                otherRole: ["Project Manager", "Project Team Members", "Project Coordinator", "Resource Manager", "Consultant"].includes(member.role) ? '' : member.role
            }));

            setManagers(formattedMembers);
            setModalOpen(false); // ปิดป๊อปอัพ

            toast.success(`นำเข้าข้อมูลจากทีม ${teamKey} เรียบร้อยแล้ว`, {
                description: `เพิ่มสมาชิกทั้งหมด ${teamData.length} คนลงในโครงการ`,
            });

        } catch (error) {
            toast.error('ไม่สามารถนำเข้าข้อมูลทีมได้');
        }
    };


    // Responsibility & Results
    // const [evaluationMethods, setEvaluationMethods] = useState<string[]>([]);
    const [evalOtherText, setEvalOtherText] = useState('');
    const [isOtherChecked, setIsOtherChecked] = useState(false);
    const [dbOptions, setDbOptions] = useState<any[]>([]); // เก็บรายการจาก DB
    const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]); // เก็บ ID ที่ User เลือก

    // const handleCheckboxChange = (value: string) => {
    //     if (evaluationMethods.includes(value)) {
    //         setEvaluationMethods(evaluationMethods.filter(item => item !== value));
    //     } else {
    //         setEvaluationMethods([...evaluationMethods, value]);
    //     }
    // };

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await axios.get('http://localhost:8000/api/evaluation-options');
                setDbOptions(res.data); // ข้อมูลที่ได้จะมี { id, name }
            } catch (err) {
                console.error("ไม่สามารถดึงข้อมูลตัวเลือกได้:", err);
            }
        };
        fetchOptions();
    }, []);

    // ฟังก์ชันสลับการเลือก (Toggle Checkbox)
    const handleCheckboxChange = (id: number) => {
        setSelectedOptionIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };


    // Re-check
    const validateAndScroll = () => {

        // ==========================================
        // 1. เช็คข้อมูลพื้นฐานโครงการ (ใช้ requiredFields ก้อนเดิมที่เราทำไว้)
        // ==========================================
        const requiredProjectFields = [
            { key: 'title', message: "กรุณาระบุชื่อโครงการ", ref: projectInfoRef },
            { key: 'rationale', message: "กรุณาระบุหลักการและเหตุผล", ref: projectInfoRef },
            { key: 'objectives', message: "กรุณาระบุวัตถุประสงค์", ref: projectInfoRef },
            { key: 'target_group', message: "กรุณาระบุกลุ่มเป้าหมาย", ref: targetRef },
            { key: 'start_date', message: "กรุณาระบุวันเริ่มต้นโครงการ", ref: targetRef },
            { key: 'location', message: "กรุณาระบุสถานที่ดำเนินการ", ref: targetRef }
        ];

        for (const field of requiredProjectFields) {
            const value = projectInfo[field.key as keyof typeof projectInfo];
            if (!value || (typeof value === 'string' && !value.trim())) {
                toast.error(field.message);
                field.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
        }

        // ==========================================
        // 2. เช็คเปอร์เซ็นต์และรายละเอียดกิจกรรม (Phases & Tasks)
        // ==========================================
        const totalWeight = phases.reduce((sum, phase) => {
            const phaseSum = phase.tasks.reduce((tSum, task) => tSum + Number(task.weight_percentage || 0), 0);
            return sum + phaseSum;
        }, 0);

        if (totalWeight !== 100) {
            toast.error(`เปอร์เซ็นต์รวมน้ำหนักกิจกรรมต้องเท่ากับ 100% พอดี (ปัจจุบัน: ${totalWeight}%)`);
            phasesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        for (const phase of phases) {
            if (!phase.phase_name || !phase.phase_name.trim()) {
                toast.error("กรุณากรอกรายละเอียดกิจกรรมให้ครบ");
                phasesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            if (phase.tasks.some(t => !t.task_name || !t.task_name.trim() || t.duration <= 0)) {
                toast.error(`กรุณากรอกรายละเอียดงานและระยะเวลาในกิจกรรม "${phase.phase_name}" ให้ครบถ้วน`);
                phasesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
        }

        // ==========================================
        // 3. เชื่องวดงาน งบประมาณ และหมวดหมู่ค่าใช้จ่าย (Installments)
        // ==========================================
        for (let i = 0; i < installments.length; i++) {
            const inst = installments[i];

            // รวบเช็คข้อมูลหัวงวดงานด้วย Array สั้นๆ ภายในลูปได้ 🛠
            if (!inst.title?.trim() || !inst.mainCategory || !inst.subCategory) {
                const msg = !inst.title?.trim() ? `กรุณากรอกหัวข้อในการใช้จ่ายในงวดที่ ${i + 1}`
                    : !inst.mainCategory ? `กรุณากรอกหมวดหลักในงวดที่ ${i + 1}`
                        : `กรุณากรอกหมวดย่อยในงวดที่ ${i + 1}`;
                toast.error(msg);
                installmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }

            // เช็ครายการไอเทมย่อยข้างในตารางงวดงานนั้นๆ
            for (const item of inst.items) {
                if (!item.detail?.trim() || !item.category_id || !item.date) {
                    const itemMsg = !item.detail?.trim() ? `กรุณากรอกรายละเอียดค่าใช้จ่ายใน ${inst.title}`
                        : !item.category_id ? `กรุณาเลือกหมวดหมู่ค่าใช้จ่ายใน ${inst.title}`
                            : `กรุณาระบุวันที่ในรายการงบประมาณของ ${inst.title}`;
                    toast.error(itemMsg);
                    installmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
            }
        }

        // ==========================================
        // 4. เช็คผู้รับผิดชอบ (Managers)
        // ==========================================
        if (managers.length === 0 || managers.some(m => !m.name || !m.name.trim())) {
            toast.error(managers.length === 0 ? "กรุณาเพิ่มผู้รับผิดชอบโครงการอย่างน้อย 1 คน" : "กรุณากรอกชื่อผู้รับผิดชอบให้ครบถ้วน");
            managerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        // ==========================================
        // 5. เช็คผลที่คาดว่าจะได้รับและการประเมินผล
        // ==========================================
        const hasCheckedOptions = selectedOptionIds && selectedOptionIds.length > 0;
        const hasOtherText = evalOtherText && evalOtherText.trim() !== "";

        if (!hasCheckedOptions && !hasOtherText) {
            toast.error("กรุณาเลือกวิธีการติดตามและประเมินผล หรือระบุในคงอื่นๆ อย่างน้อย 1 อย่าง");
            evaluationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        if (!projectInfo.expectedBenefits || !projectInfo.expectedBenefits.trim()) {
            toast.error("กรุณาระบุผลที่คาดว่าจะได้รับ (Expected Benefits)");
            evaluationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        return true; // ผ่านทุกด่านอย่างสมบูรณ์
    };


    const checkBeforeSubmit = () => {
        if (validateAndScroll()) {
            setShowSubmitModal(true);
        }
    };




    // --- ฟังก์ชันส่งข้อมูล (Submit) ---
    const handleSubmit = async () => {
        setShowSubmitModal(false);
        const savedUser = localStorage.getItem('user');
        const user = savedUser ? JSON.parse(savedUser) : null;

        if (!user || !user.id) {
            toast.error("กรุณาล็อกอินก่อนบันทึกโครงการ");
            return;
        }

        if (!validateAndScroll()) return;

        for (const inst of installments) {
            for (const item of inst.items) {
                if (!item.date) {
                    toast.error("ข้อมูลไม่ครบถ้วน", {
                        description: `กรุณาระบุวันที่ในรายการงบประมาณของ ${inst.title}`
                    });
                    return;
                }
            }
        }

        for (const inst of installments) {
            for (const item of inst.items) {
                if (!item.category_id) {
                    toast.error("กรุณาเลือกหมวดหมู่ค่าใช้จ่ายให้ครบถ้วน");
                    return;
                }
            }
        }

        const payload = {
            projectInfo,
            managers,
            installments,
            phases,
            selectedOptionIds,
            evalOtherText,
            grandTotal,
            owner_id: user.id
        };

        const toastId = toast.loading("กำลังบันทึกข้อมูลโครงการ...");

        try {
            const response = await axios.post("http://localhost:8000/api/projects/create", payload);

            if (response.data.status === "success") {
                toast.success("บันทึกโครงการเรียบร้อยแล้ว!", {
                    description: `รหัสโครงการ: PRJ-${response.data.project_id}`
                });
                setTimeout(() => {
                    window.location.href = "/user/my-projects"; // หรือหน้า List โครงการ
                }, 2000);
            }
        } catch (error: any) {
            console.log("PAYLOAD:", payload);
            console.log(error.response?.data);
            toast.error("เกิดข้อผิดพลาดในการบันทึก", {
                id: toastId,// เปลี่ยนจาก Loading เป็น Error
                description: "กรุณาตรวจสอบการเชื่อมต่อ Database"
            });
        }
    };



    return (
        <div style={{ padding: '100px 0px 0px 0px' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '34px', fontWeight: 800, marginBottom: '20px' }}>Project Detail Planning</h1>
                <p style={{ color: 'var(--text-gray)' }}>กรอกข้อมูลให้ครบถ้วนเพื่อความสมบูรณ์ของโครงการ</p>
            </div>

            <div className="container" style={{ maxWidth: '1000px', margin: '40px auto' }}>


                <form>
                    {/* Section 1: Core Info */}
                    <div ref={projectInfoRef} className="form-card">
                        <h2 className="section-title"><span></span>ข้อมูลพื้นฐานและวัตถุประสงค์</h2>
                        <div className="form-group">
                            <label>ชื่อโครงการ</label>
                            <input type="text" placeholder="ระบุชื่อโครงการที่สื่อความหมายชัดเจน" required
                                onChange={(e) => setProjectInfo({ ...projectInfo, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>หลักการและเหตุผล</label>
                            <textarea rows={4} placeholder="อธิบายความจำเป็น ที่มา และปัญหาที่ต้องการแก้ไข"
                                onChange={(e) => setProjectInfo({ ...projectInfo, rationale: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>วัตถุประสงค์ (Objectives)</label>
                            <textarea rows={3} placeholder="ระบุสิ่งที่ต้องการทำและผลที่คาดหวัง"
                                onChange={(e) => setProjectInfo({ ...projectInfo, objectives: e.target.value })}></textarea>
                        </div>
                    </div>
                    {/* Section 2: target&location */}
                    <div ref={targetRef} className="form-card">
                        <h2 className="section-title"><span></span>กลุ่มเป้าหมายและสถานที่</h2>
                        <div className="form-group">
                            <label>เป้าหมาย/กลุ่มเป้าหมาย (Target Group)</label>
                            <input type="text" placeholder="ระบุกลุ่มเป้าหมายและจำนวน (เช่น นักศึกษา 50 คน)"
                                onChange={(e) => setProjectInfo({ ...projectInfo, target_group: e.target.value })} />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label>วันเริ่มต้นโครงการ</label>
                                <input
                                    type="date"
                                    value={projectInfo.start_date} // เชื่อมกับ State
                                    onChange={(e) => setProjectInfo({ ...projectInfo, start_date: e.target.value })} // เก็บค่าเมื่อเปลี่ยน
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>วันสิ้นสุดโครงการ</label>
                                <div className='checkholiday'>
                                    <input type="date" id="projectEndDate" value={projectInfo.end_date} readOnly className='projectEndDate'
                                        onChange={(e) => setProjectInfo({ ...projectInfo, end_date: e.target.value })} />
                                    <div className='holidaycard'>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={projectInfo.includeWeekend} // ดึงค่าจาก State มาแสดง
                                                onChange={(e) => setProjectInfo({ ...projectInfo, includeWeekend: e.target.checked })} // อัปเดต State
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            รวมวันเสาร์-อาทิตย์
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={projectInfo.includePublicHoliday} // ดึงค่าจาก State มาแสดง
                                                onChange={(e) => setProjectInfo({ ...projectInfo, includePublicHoliday: e.target.checked })} // อัปเดต State
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            รวมวันหยุดนักขัตฤกษ์ (ไทย)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>สถานที่ดำเนินการ (Location)</label>
                            <input type="text" placeholder="ระบุสถานที่จัดกิจกรรมหรือพื้นที่เป้าหมาย"
                                onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })} />
                        </div>
                    </div>

                    {/* Section 2: Phases & Tasks */}
                    <div ref={phasesRef} className="form-card">
                        <h2 className="section-title"><span></span>วิธีดำเนินการ / กิจกรรม (Project Phases & Tasks)</h2>
                        {phases.map((phase, pIdx) => (
                            <div key={pIdx} className="phase-card" style={{ position: 'relative', marginBottom: '30px', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>

                                {/* ส่วนหัวของ Phase */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var( --primary-blue)' }}>Phase {pIdx + 1}</h3>

                                    {/* ปุ่มลบ Phase*/}
                                    {phases.length > 1 && (
                                        <button className='btn-remove'
                                            type="button"
                                            onClick={() => {
                                                const newPhases = [...phases];
                                                newPhases.splice(pIdx, 1);
                                                setPhases(newPhases);
                                            }} >
                                            <i className="fa-solid fa-trash-can"></i> ลบ Phase นี้
                                        </button>
                                    )}
                                </div>

                                {/* ช่องกรอกชื่อ Phase */}
                                <input
                                    type="text"
                                    placeholder="ชื่อขั้นตอนหลัก (เช่น Phase 1: Analysis)"
                                    value={phase.phase_name}
                                    onChange={(e) => {
                                        const newPhases = [...phases];
                                        newPhases[pIdx].phase_name = e.target.value;
                                        setPhases(newPhases);
                                    }}
                                    style={{ width: '100%', marginBottom: '15px', fontWeight: 'bold' }}
                                />

                                {phase.tasks.map((task, tIdx) => (
                                    <div key={tIdx} className="dynamic-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        {/* 1. ชื่อกิจกรรมย่อย */}
                                        <input
                                            type="text"
                                            placeholder="ชื่อกิจกรรมย่อย"
                                            style={{ flex: 3 }}
                                            value={task.task_name} // อย่าลืมเชื่อม value ด้วยครับ
                                            onChange={(e) => {
                                                const newPhases = [...phases];
                                                newPhases[pIdx].tasks[tIdx].task_name = e.target.value;
                                                setPhases(newPhases);
                                            }}
                                            required
                                        />

                                        {/* 2. ส่วนคำนวณระยะเวลา */}
                                        <div style={{ flex: 2, display: 'flex', gap: '5px' }}>
                                            <input type="number" value={task.duration}
                                                onChange={(e) => handledayChange(pIdx, tIdx, e.target.value)}
                                                className="duration-val" placeholder="0" style={{ width: '80px' }}
                                            />
                                            <select value={task.duration_unit}
                                                onChange={(e) => {
                                                    const newPhases = [...phases];
                                                    newPhases[pIdx].tasks[tIdx].duration_unit = e.target.value;
                                                    setPhases(newPhases);
                                                }}
                                            >
                                                <option value="days">วัน</option>
                                                <option value="weeks">สัปดาห์</option>
                                            </select>
                                        </div>

                                        {/* 3. น้ำหนัก % */}
                                        <input value={task.weight_percentage}
                                            type="number" placeholder="น้ำหนัก (%)" style={{ flex: 1 }} min="0" max="100"
                                            onChange={(e) => handleWeightChange(pIdx, tIdx, e.target.value)} />

                                        {/* 4. ปุ่มลบ (เพิ่มเข้าไปใหม่) */}
                                        <button type="button" className="btn-remove-item"
                                            onClick={() => {
                                                const newPhases = [...phases];
                                                newPhases[pIdx].tasks.splice(tIdx, 1);
                                                setPhases(newPhases);
                                            }}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-item" onClick={() => addSubTask(pIdx)}><i className='fa-solid fa-plus'></i>&nbsp;&nbsp;เพิ่มหัวข้อย่อย</button>
                            </div>
                        ))}
                        <button type="button" className="btn-add-installment" onClick={addPhase}><i className="fa-solid fa-layer-group"></i>&nbsp; เพิ่มระยะใหม่ (New Phase)</button>
                        <div className="total-weight-display" style={{
                            marginTop: '20px',
                            padding: '20px',
                            background: totalWeight > 100 ? '#fef2f2' : '#f0f9ff',
                            borderRadius: '12px',
                            border: `2px solid ${totalWeight > 100 ? '#ef4444' : '#1e40af'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: totalWeight > 100 ? '#ef4444' : '#1e40af' }}>
                                    น้ำหนักรวมทั้งโครงการ (Total Project Weight)
                                </h3>
                                <span style={{ fontSize: '20px', fontWeight: '800', color: totalWeight > 100 ? '#ef4444' : '#1e40af' }}>
                                    {totalWeight.toFixed(2)}%
                                </span>
                            </div>

                            {/* แถบ Progress Bar แสดงผลรวม */}
                            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(totalWeight, 100)}%`,
                                    height: '100%',
                                    background: totalWeight > 100 ? '#ef4444' : '#1e40af',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>

                            {/* ข้อความแจ้งเตือนเมื่อค่าผิดปกติ */}
                            {totalWeight > 100 && (
                                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i> ตอนนี้เปอร์เซ็นต์รวมเกิน 100% กรุณาปรับลดน้ำหนักลง
                                </p>
                            )}
                            {totalWeight === 100 && (
                                <p style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                                    <i className="fa-solid fa-circle-check"></i> น้ำหนักโครงการครบ 100% สมบูรณ์
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Budget Installments (Dynamic) */}
                    <div ref={installmentsRef} className="container">
                        <h2 className="section-title"><span></span>รายละเอียดงบประมาณ (แยกตามงวดงาน)</h2>

                        <div id="installmentContainer">
                            {installments.map((inst, instIdx) => (
                                <div key={inst.id} className="budget-installment">
                                    <div className="installment-header">
                                        <h3>งวดที่ {instIdx + 1}</h3>
                                        <input
                                            type="text"
                                            style={{ width: '82%' }}
                                            placeholder={`หัวข้อในการใช้จ่ายในงวดที่ ${instIdx + 1}`}
                                            value={inst.title}
                                            onChange={(e) => {
                                                const next = [...installments];
                                                next[instIdx].title = e.target.value;
                                                setInstallments(next);
                                            }}
                                            required />

                                        {installments.length > 1 && (
                                            <button type="button" className="btn-remove" onClick={() => removeInstallment(inst.id)}>
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* การเลือกหมวดหมู่หลัก/ย่อย */}

                                    <div id="categoryContainer">
                                        <div className="category-select-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-end' }}>

                                            {/* 1. ส่วนเลือกหมวดหลัก */}
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px' }}>หมวดหลัก</label>
                                                <select
                                                    className="main-category-select"
                                                    value={inst.mainCategory}
                                                    onChange={(e) => handleMainCategoryChange(instIdx, e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                    <option value="">-- เลือกหมวดหลัก --</option>
                                                    {Object.keys(budgetMasterData).map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* 2. ส่วนเลือกหมวดย่อย */}
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: 'var(--text-gray)', display: 'block', marginBottom: '5px' }}>หมวดย่อย</label>
                                                <select
                                                    className="sub-category-select"
                                                    value={inst.subCategory}
                                                    onChange={(e) => {
                                                        const next = [...installments];
                                                        next[instIdx].subCategory = e.target.value; // เปลี่ยน idx เป็น instIdx
                                                        setInstallments(next);
                                                    }}
                                                    disabled={!inst.mainCategory}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-color)',
                                                        background: inst.mainCategory ? '#fff' : '#f8fafc'
                                                    }}>
                                                    <option value="">-- เลือกหมวดย่อย --</option>
                                                    {inst.mainCategory && budgetMasterData[inst.mainCategory]?.map(subName => (
                                                        <option key={subName} value={subName}>{subName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ตารางรายการค่าใช้จ่าย */}
                                    <table className="item-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40%' }}>รายละเอียดค่าใช้จ่าย</th>
                                                <th style={{ width: '20%' }}>หมวดหมู่ค่าใช้จ่าย</th>
                                                <th style={{ width: '20%' }}>ช่วงเวลา</th>
                                                <th style={{ width: '15%' }}>จำนวนเงิน (฿)</th>
                                                <th style={{ width: '5%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inst.items.map((item, itemIdx) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={item.detail}
                                                            onChange={(e) => updateItem(instIdx, itemIdx, 'detail', e.target.value)}
                                                            placeholder="เช่น ค่าวิทยากร" required
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={item.category_id || ''}
                                                            onChange={(e) => updateItem(instIdx, itemIdx, 'category_id', Number(e.target.value))}
                                                            required
                                                        >
                                                            <option value="">เลือกหมวดหมู่</option>
                                                            {Array.isArray(categories) && categories.map((cat) => (
                                                                <option key={cat.id} value={cat.id}>
                                                                    {cat.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="date"
                                                            value={item.date}
                                                            min={projectInfo.start_date}
                                                            max={projectInfo.end_date}
                                                            onChange={(e) => updateItem(instIdx, itemIdx, 'date', e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={item.amount}
                                                            onChange={(e) => updateItem(instIdx, itemIdx, 'amount', Number(e.target.value))}
                                                            placeholder="0.00" required
                                                        />
                                                    </td>
                                                    <td>
                                                        <button type="button" className="btn-remove-item" onClick={() => {
                                                            const next = [...installments];
                                                            next[instIdx].items.splice(itemIdx, 1);
                                                            setInstallments(next);
                                                        }}>
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button type="button" className="btn-add-item" onClick={() => addItem(instIdx)}>
                                        <i className="fa-solid fa-plus"></i> เพิ่มรายการในงวดนี้
                                    </button>

                                    <div className="subtotal-box">
                                        รวมงวดที่ {instIdx + 1}: <span className="subtotal-val">
                                            ฿ {inst.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="button" className="btn-add-installment" onClick={addInstallment}>
                            <i className="fa-solid fa-layer-group"></i> เพิ่มงวดงานใหม่
                        </button>

                        <div className="budget-summary">
                            <span style={{ fontWeight: 600, opacity: 0.8 }}>งบประมาณรวมทั้งสิ้นของโครงการ</span>
                            <span className="total-amount" >฿ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div ref={managerRef} className="form-card">
                        <h2 className="section-title"><span></span>ผู้รับผิดชอบโครงการ</h2>
                        {managers.map((m, idx) => ( // ใช้ 'm' เป็นตัวแทนข้อมูลแต่ละแถว
                            <div key={m.id} style={{ position: 'relative', marginBottom: '15px' }}>
                                <div className="user-list-item" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                                    {/* ช่องค้นหาชื่อ */}
                                    <div style={{ flex: 2, position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                                            value={m.name}
                                            onChange={(e) => handleSearch(idx, e.target.value)}
                                            autoComplete="off"
                                        />

                                        {/* รายการแนะนำ (Suggestions Dropdown) */}
                                        {activeIdx === idx && suggestions.length > 0 && (
                                            <ul style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                background: 'white', border: '1px solid #ccc', zIndex: 100,
                                                borderRadius: '8px', listStyle: 'none', padding: '5px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }}>
                                                {suggestions.map((user) => (
                                                    <li
                                                        key={user.id}
                                                        onClick={() => selectUser(idx, user.name)}
                                                        style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#f0f7ff'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                                    >
                                                        {user.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* ช่องเลือกตำแหน่ง */}
                                    <select
                                        style={{ flex: 1 }}
                                        value={m.role} // เปลี่ยนจาก manager.role เป็น m.role
                                        onChange={(e) => updateManager(m.id, 'role', e.target.value)}
                                    >
                                        <option>Project Manager</option>
                                        <option>Project Team Members</option>
                                        <option>Project Coordinator</option>
                                        <option>Resource Manager</option>
                                        <option>Consultant</option>
                                        <option value="Other">Other (อื่นๆ)</option>
                                    </select>

                                    {/* ปุ่มลบ */}
                                    {managers.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removeManager(m.id)}
                                            style={{ background: '#fee2e2', color: 'var(--danger)', border: 'none', width: '40px', height: '45px', borderRadius: '12px', cursor: 'pointer' }}
                                        >
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    )}
                                </div>

                                {/* แสดงช่องกรอกตำแหน่งอื่นๆ ถ้าเลือก Other */}
                                {m.role === 'Other' && (
                                    <div style={{ marginLeft: '10px', marginTop: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="โปรดระบุตำแหน่งของคุณ"
                                            value={(m as any).otherRole || ''}
                                            onChange={(e) => updateManager(m.id, 'otherRole', e.target.value)}
                                            style={{ width: '100%', borderStyle: 'dashed', padding: '10px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <button type="button" className="btn-add-item" onClick={addManager} style={{ marginTop: '10px' }}>
                            <i className="fa-solid fa-user-plus"></i> Add User
                        </button>

                        <div style={{ position: 'relative', marginTop: '15px' }}>

                            <select
                                onChange={(e) => handleSelectTeam(e.target.value)}
                                className='teamselector'
                            >
                                <option value="">-- เลือกทีม --</option>
                                {Object.keys(myTeams).map(name => <option key={name} value={name}>{name}</option>)}
                            </select>

                            <ConfirmModal
                                isOpen={modalOpen}
                                onClose={() => setModalOpen(false)}
                                onConfirm={() => selectedTeamKey && executeImport(selectedTeamKey)}
                                message={
                                    <div style={{ lineHeight: '1.8', textAlign: 'center' }}>
                                        การดึงข้อมูลทีมประจำจะเขียนทับ <br />
                                        <strong>รายชื่อผู้รับผิดชอบ</strong>&nbsp;&nbsp;
                                        ที่คุณกรอกไว้ในปัจจุบัน<br />
                                        <strong>คุณแน่ใจใช่ไหม?</strong>
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {/* Responsibility & Results */}
                    <div ref={evaluationRef} className="form-card">
                        <h2 className="section-title"><span></span>ผลลัพธ์</h2>

                        {/* หัวข้อ 10: การติดตามและประเมินผล */}
                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label style={{ marginBottom: '15px', display: 'block', fontWeight: 600 }}>
                                10. การติดตามและประเมินผล (Evaluation) - เลือกได้มากกว่า 1 ข้อ
                            </label>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                background: '#f8fafc',
                                padding: '20px',
                                borderRadius: '15px',
                            }}>
                                {/* วนลูปจากข้อมูลที่ดึงมาจาก Database โดยตรง */}
                                {dbOptions.map((item) => (
                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            //  เช็คจาก ID 
                                            checked={selectedOptionIds.includes(item.id)}
                                            onChange={() => handleCheckboxChange(item.id)}
                                            style={{ width: 'auto' }}
                                        />
                                        {/* แสดงชื่อจากคอลัมน์ name ช่องเดียวจบ */}
                                        {item.name}
                                    </label>
                                ))}

                                {/* ตัวเลือกอื่นๆ  */}
                                <div style={{ gridColumn: 'span 2', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isOtherChecked}
                                            onChange={(e) => setIsOtherChecked(e.target.checked)}
                                            style={{ width: 'auto' }}
                                        />
                                        อื่นๆ (ระบุ)
                                    </label>
                                    {isOtherChecked && (
                                        <input
                                            type="text"
                                            value={evalOtherText}
                                            onChange={(e) => setEvalOtherText(e.target.value)}
                                            placeholder="ระบุวิธีการติดตามและประเมินผลเพิ่มเติม"
                                            // ✅ เพิ่มคลาส error ถ้าลืมกรอกช่องอื่นๆ
                                            style={{ width: '100%', borderStyle: 'dashed', padding: '10px' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* หัวข้อ 11: ผลที่คาดว่าจะได้รับ */}
                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label style={{ fontWeight: 600 }}>11. ผลที่คาดว่าจะได้รับ (Expected Benefits)</label>
                            <textarea
                                rows={3}

                                placeholder="ประโยชน์ที่ได้เมื่อโครงการเสร็จสิ้น"
                                style={{ width: '100%', marginTop: '10px', padding: '12px' }}
                                onChange={(e) => setProjectInfo({ ...projectInfo, expectedBenefits: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={checkBeforeSubmit}
                        className="btn-submit">Submit Complete Plan</button>
                    <ConfirmModal
                        isOpen={showSubmitModal}
                        onClose={() => setShowSubmitModal(false)}
                        onConfirm={handleSubmit}
                        title="สรุปข้อมูลโครงการ"
                        message={
                            /* เปลี่ยนจาก div เป็น span และใช้ display: block เพื่อให้เว้นบรรทัดได้เหมือนเดิม */
                            <span style={{ lineHeight: '1.8' }}>
                                <strong>คุณกำลังจะบันทึกโครงการ:</strong><br />
                                {projectInfo.title || 'ไม่ได้ระบุชื่อ'}<br /><br />

                                <strong>ระยะเวลา:</strong><br />
                                เริ่ม: {projectInfo.start_date}<br />
                                สิ้นสุด: {projectInfo.end_date}<br /><br />

                                <strong>งวดงานทั้งหมด:</strong> {installments.length} งวด<br /><br />

                                <span style={{ textAlign: 'center', display: 'block', margin: "0px 0px 30px 0px" }} >กรุณาตรวจสอบข้อมูลด้านหลังให้ครบถ้วน <br />เพื่อความถูกต้องของโครงการอีกครั้ง
                                </span>
                            </span>
                        }
                    />

                </form>

            </div>
        </div>

    );


    function ConfirmModal({ isOpen, onClose, onConfirm, message }: any) {
        if (!isOpen) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-icon" style={{ color: '#2563eb', marginBottom: '1rem', fontSize: '1.5rem' }}>
                        <i className="fa-solid fa-circle-question"></i>
                    </div>

                    <h3>ยืนยันบันทึกข้อมูล</h3>
                    <div>{message}</div>

                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={onClose}>
                            ยกเลิก
                        </button>
                        <button className="btn-confirm" onClick={onConfirm}>
                            ตกลง
                        </button>
                    </div>
                </div>
            </div>
        );
    }


}