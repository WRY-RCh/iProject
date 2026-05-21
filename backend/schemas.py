from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime,date

# รูปแบบข้อมูลพื้นฐานของ Role และ Position
class RoleBase(BaseModel):
    id: int
    name: str # เช่น "Admin", "User", "Sponsor"

    class Config:
        from_attributes = True

class PositionBase(BaseModel):
    position_name: str
    class Config: from_attributes = True

# รูปแบบข้อมูล User ตอนส่งออก (Response)
class UserResponse(BaseModel):
    id: int
    username: str
    fullname: str
    displayname: Optional[str]
    email: EmailStr
    role: Optional[RoleBase] # จะแสดงชื่อ Role แทนแค่ ID
    position: Optional[PositionBase] # จะแสดงชื่อตำแหน่งแทนแค่ ID
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# รูปแบบข้อมูลตอนสมัครสมาชิกหรือเพิ่ม User ใหม่
class UserCreate(BaseModel):
    username: str
    fullname: str
    email: EmailStr
    password: str
    role_id: int
    position_id: Optional[int] = None
    organization: Optional[str] = None
    phone: Optional[str] = None


# Projects Table
class TaskCreate(BaseModel):
    phase_name: str
    task_name: str
    duration: int
    duration_unit: str
    weight_percentage: int

class BudgetItemCreate(BaseModel):
    detail: str
    category: str
    expense_date: date
    amount: float

class InstallmentCreate(BaseModel):
    installment_number: int
    title: str
    items: List[BudgetItemCreate]

class ProjectCreate(BaseModel):
    title: str
    rationale: Optional[str]
    objectives: Optional[str]
    target_group: Optional[str]
    start_date: date
    end_date: date
    location: Optional[str]
    evaluation_option_ids: List[int]
    eval_other_text: Optional[str] = None
    expected_benefits: Optional[str]
    tasks: List[TaskCreate]
    installments: List[InstallmentCreate]

# สำหรับแสดงผลตัวเลือก (Evaluation Option)
class EvaluationOptionOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    title: str
    rationale: Optional[str]
    objectives: Optional[str]
    target_group: Optional[str]
    start_date: date
    end_date: date
    location: Optional[str]
    evaluation_option_ids: List[int]
    eval_other_text: Optional[str]
    expected_benefits: Optional[str]
    tasks: List[TaskCreate]
    installments: List[InstallmentCreate]


    class Config:
        from_attributes = True



    # สำหรับดึงข้อมูลหมวดย่อย
class BudgetSubCategoryBase(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# สำหรับดึงข้อมูลหมวดหลัก (ที่จะมีหมวดย่อยติดไปด้วย)
class BudgetMainCategorySchema(BaseModel):
    id: int
    name: str
    sub_categories: List[BudgetSubCategoryBase] = []

    class Config:
        from_attributes = True

# สำหรับส่งข้อมูลรูปแบบ Object/Dictionary
class BudgetMasterData(BaseModel):
    categories: dict[str, List[str]]

# กิจกรรมย่อย (Tasks)
class TaskSchema(BaseModel):
    task_name: str
    duration: int
    duration_unit: str
    weight_percentage: int
    status: Optional[bool] = False

# ขั้นตอนหลัก (Phases)
class PhaseSchema(BaseModel):
    id: Optional[int] = None
    phase_name: str
    tasks: List[TaskSchema]

# รายการงบประมาณย่อย (Items)
class BudgetItemSchema(BaseModel):
    id: Optional[int] = None
    detail: str
    category_id: int
    date: date
    amount: float

# งวดงาน (Installments)
class InstallmentSchema(BaseModel):
    id: Optional[int] = None
    title: str
    mainCategory: str
    subCategory: str
    is_approved: Optional[bool] = False
    items: List[BudgetItemSchema]

# ข้อมูลโครงการหลัก
class ProjectInfoSchema(BaseModel):
    title: str
    rationale: str
    objectives: str
    target_group: str
    start_date: date
    end_date: date
    location: str
    expectedBenefits: str
    status: bool
    includeWeekend: bool
    includePublicHoliday: bool
    is_deleted: Optional[bool] = False

# ก้อนใหญ่ที่รับมาจาก Frontend (The Payload)
class ProjectCreateRequest(BaseModel):
    projectInfo: ProjectInfoSchema
    managers: List[ManagerSchema]
    installments: List[InstallmentSchema]
    phases: List[PhaseSchema]
    selectedOptionIds: List[int]       
    evalOtherText: Optional[str] = None
    grandTotal: float
    owner_id: int


class ManagerSchema(BaseModel):
    id: Optional[int] = None
    name: str
    role: str
    otherRole: Optional[str] = ""

# สำหรับส่งหมวดหมู่ออกไปให้หน้าบ้านทำ Option
class BudgetCategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# ตัวไอเทมค่าใช้จ่าย 
class BudgetItemSchema(BaseModel):
    id: Optional[int] = None
    detail: str
    category_id: int 
    date: date
    amount: float
    status: Optional[bool] = False