export interface TaskType {
    id?: number;
    task_name: string;
    duration?: number;
    duration_unit?: string;
    weight_percentage?: number;
    status?: boolean;
}
export interface PhaseType {
    id?: number;
    phase_name: string;
    tasks: TaskType[];
}
export interface BudgetSubItemType {
    id?: number;
    detail: string;
    category?: string;
    type?: string;
    amount: number;
    status?: boolean;
}
export interface InstallmentType {
    id?: number;
    title: string;
    main_category?: string;
    mainCategory?: string;
    sub_category?: string;
    subCategory?: string;
    status?: string;
    is_approved?: boolean | null; // รองรับ True / False / Null สารพัดนึกตามที่เราเปลี่ยนกลับ
    budget_items?: BudgetSubItemType[];
    items?: BudgetSubItemType[];
}
export interface ProjectManagerType {
    id?: number;
    name: string;      // ดึง fullname หรือไอดีที่เราจัดพ่นมาจาก API
    role: string;      // บทบาทหน้าที่ เช่น Project Manager, Developer
    otherRole?: string;
}