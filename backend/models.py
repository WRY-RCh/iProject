from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    fullname = Column(String, nullable=False)
    displayname = Column(String)
    organization = Column(String)
    phone = Column(String)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    biography = Column(Text)
    status = Column(String, default="Active")
    role_id = Column(Integer, ForeignKey("roles.id"))
    position_id = Column(Integer, ForeignKey("positions.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = relationship("Role")
    position = relationship("Position")

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    role_name = Column(String, unique=True)

class Position(Base):
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True)
    position_name = Column(String, unique=True)


class BudgetMainCategory(Base):
    __tablename__ = "budget_main_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    # เชื่อมโยงไปยังหมวดย่อย
    sub_categories = relationship("BudgetSubCategory", back_populates="main_category", cascade="all, delete-orphan")

class BudgetSubCategory(Base):
    __tablename__ = "budget_sub_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    main_category_id = Column(Integer, ForeignKey("budget_main_categories.id"))

    main_category = relationship("BudgetMainCategory", back_populates="sub_categories")


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    team_name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # เชื่อมโยงไปยังสมาชิกในทีม
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")

class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # เชื่อมกับ User ในระบบ
    external_name = Column(String, nullable=True) # กรณีพิมพ์ชื่อคนนอก
    role = Column(String) 
    
    team = relationship("Team", back_populates="members")
    user = relationship("User") # สมมติว่ามี Class User อยู่แล้ว


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, nullable=False, unique=True) # เก็บวันที่หยุด
    description = Column(String(255)) # ชื่อวันหยุด เช่น "วันจักรี"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 1. ตารางโครงการหลัก
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    rationale = Column(Text)
    objectives = Column(Text)
    target_group = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)
    location = Column(String(255))
    evaluation_option_ids = Column(ARRAY(Integer), nullable=True) 
    eval_other_text = Column(Text, nullable=True)
    expected_benefits = Column(Text)
    status = Column(String(50), default="Planning")
    grand_total = Column(Numeric(12, 2))
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    phases = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan")
    installments = relationship("ProjectInstallment", back_populates="project", cascade="all, delete-orphan")
    access_rights = relationship("ProjectAccess", back_populates="project", cascade="all, delete-orphan")

class EvaluationOption(Base):
    __tablename__ = "evaluation_options"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True) 

# 2. ตารางกิจกรรมหลัก (Phases)
class ProjectPhase(Base):
    __tablename__ = "project_phases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    phase_name = Column(String(255))

    project = relationship("Project", back_populates="phases")
    tasks = relationship("PhaseTask", back_populates="phase", cascade="all, delete-orphan")

# 3. ตารางกิจกรรมย่อย (Tasks)
class PhaseTask(Base):
    __tablename__ = "phase_tasks"

    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("project_phases.id", ondelete="CASCADE"))
    task_name = Column(String(255))
    duration = Column(Integer)
    duration_unit = Column(String(50))
    weight_percentage = Column(Integer)

    phase = relationship("ProjectPhase", back_populates="tasks")

# 4. ตารางงวดงาน (Installments)
class ProjectInstallment(Base):
    __tablename__ = "project_installments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(255))
    main_category = Column(String(100))
    sub_category = Column(String(100))
    status = Column(String(50), default="Pending")

    project = relationship("Project", back_populates="installments")
    budget_items = relationship("BudgetItem", back_populates="installment", cascade="all, delete-orphan")

# 5. ตารางรายการงบประมาณ (Budget Items)
class BudgetItem(Base):
    __tablename__ = "budget_items"

    id = Column(Integer, primary_key=True, index=True)
    installment_id = Column(Integer, ForeignKey("project_installments.id", ondelete="CASCADE"))
    detail = Column(String(255))
    category_id = Column(Integer, ForeignKey("budget_categories.id"), nullable=False) 
    expense_date = Column(Date)
    amount = Column(Numeric(12, 2))

    
    category = relationship("BudgetCategory")
    installment = relationship("ProjectInstallment", back_populates="budget_items")
    

# 6. ตารางสิทธิ์การเข้าถึง (Project Access)
class ProjectAccess(Base):
    __tablename__ = "project_access"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(50)) # เช่น 'Owner', 'Editor'

    project = relationship("Project", back_populates="access_rights")

class BudgetCategory(Base):
    __tablename__ = "budget_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)



