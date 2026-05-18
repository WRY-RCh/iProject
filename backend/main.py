from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, database, auth_utils, schemas 
from sqlalchemy import or_
from database import get_db, engine, SessionLocal
from models import BudgetMainCategory, User, Team, PublicHoliday   
from sqlalchemy import text
from auth_utils import get_current_user
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

# ตั้งค่า CORS เพื่อให้ Next.js เรียกใช้งานได้
# ในไฟล์ main.py

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.3.21:3000", # เพิ่ม IP ของเครื่องคุณตามที่ Next.js แจ้ง
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # ปริ้นข้อมูููลออกทาง Terminal ฝั่ง Backend เพื่อให้คุณเห็นฟิลด์ที่ผิดพลาดชัดๆ
    print("--- FastAPI Validation Error Details ---")
    print(exc.errors())
    print("-----------------------------------------")
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()

@app.post("/api/register") 
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    try:
        # เช็คว่า email ซ้ำในระบบไหมก่อนสมัคร
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")
        
        # ช็คว่า username ซ้ำไหม (ป้องกันไว้เผื่อระบบคุณล็อกไม่ให้ชื่อซ้ำ)
        db_username = db.query(models.User).filter(models.User.username == user.username).first()
        if db_username:
            raise HTTPException(status_code=400, detail="Username นี้ถูกใช้งานแล้ว")

        # เข้ารหัสผ่าน
        hashed_pwd = auth_utils.hash_password(user.password)
        
        # ประกอบร่างโมเดลเตรียมบันทึก
        new_user = models.User(
            username=user.username,
            fullname=user.fullname,
            email=user.email,
            password=hashed_pwd,
            role_id=user.role_id,
            position_id=user.position_id, 
            status="Active"              
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {
            "status": "success",
            "user_id": new_user.id
        }

    except HTTPException as http_exc:
        # ถ้าติดเงื่อนไขอีเมล/Username ซ้ำ ให้โยน Error ออกไปตามปกติ
        raise http_exc
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดภายในระบบ: {str(e)}")

@app.post("/api/login")
def login(user_data: dict, db: Session = Depends(database.get_db)):
    # รับค่าจากฟิลด์ identity (ซึ่งอาจเป็น email หรือ username)
    identity = user_data.get('identity')
    password = user_data.get('password')

    # ค้นหา user ที่มี email ตรงกัน หรือ username ตรงกัน
    user = db.query(models.User).filter(
        or_(models.User.email == identity, models.User.username == identity)
    ).first()
    
    if not user or not auth_utils.verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="ข้อมูลประจำตัวหรือรหัสผ่านไม่ถูกต้อง")
    
    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "fullname": user.fullname,
            "email": user.email,
            "username": user.username,
            "role": user.role
        }
    }

@app.get("/api/holidays")
def get_holidays(db: Session = Depends(get_db)):
    holidays = db.query(PublicHoliday).all()
    return [h.holiday_date.strftime("%Y-%m-%d") for h in holidays]


@app.get("/api/budget-categories")
def get_categories(db: Session = Depends(get_db)):
    main_categories = db.query(BudgetMainCategory).all()
    result = {}
    for main in main_categories:
        result[main.name] = [sub.name for sub in main.sub_categories]
    return result


@app.get("/api/budget-categories-type", response_model=List[schemas.BudgetCategoryOut])
def get_budget_categories(db: Session = Depends(get_db)):
    return db.query(models.BudgetCategory).all()



@app.get("/api/search-users")
def search_users(q: str = "", db: Session = Depends(get_db)):
    users = db.query(User).filter(
        User.role_id == 3,
        User.fullname.ilike(f"%{q}%")
    ).limit(10).all()
    
    return [{"id": u.id, "name": u.fullname} for u in users]

@app.get("/api/teams")
def get_user_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    
    result = {}
    for team in teams:
        result[team.team_name] = [
            {
                "name": m.user.fullname if m.user else m.external_name, 
                "role": m.role
            } for m in team.members
        ]
    return result


@app.post("/api/projects/create")
async def create_project(data: schemas.ProjectCreateRequest, db: Session = Depends(get_db)):
    try:
        # 1. บันทึกข้อมูลโครงการหลัก
        info = data.projectInfo
        owner_id = data.owner_id

        new_project = models.Project(
            title=info.title,
            rationale=info.rationale,
            objectives=info.objectives,
            target_group=info.target_group,
            start_date=info.start_date,
            end_date=info.end_date,
            location=info.location,
            evaluation_option_ids=data.selectedOptionIds,
            eval_other_text=data.evalOtherText,
            expected_benefits=info.expectedBenefits,
            grand_total=data.grandTotal,
            owner_id=owner_id,
            status="Planning"
        )

        db.add(new_project)
        db.flush()

        # 2. บันทึก Phases และ Tasks
        for p in data.phases:
            new_phase = models.ProjectPhase(
                project_id=new_project.id,
                phase_name=p.phase_name
            )

            db.add(new_phase)
            db.flush()

        for t in p.tasks:
            new_task = models.PhaseTask(
                phase_id=new_phase.id,
                task_name=t.task_name,
                duration=t.duration,
                duration_unit=t.duration_unit,
                weight_percentage=t.weight_percentage
            )

        db.add(new_task)


        # 3. บันทึก Installments
        for inst in data.installments:
            # 1. บันทึกหัวข้องวดงานก่อน
            new_inst = models.ProjectInstallment(
                project_id=new_project.id,
                title=inst.title,
                main_category=inst.mainCategory,
                sub_category=inst.subCategory,
                status='Pending'
            )
            
            db.add(new_inst)
            db.flush()
            
            # 2. บันทึกรายการค่าใช้จ่าย (Items) ภายใต้งวดงานนั้น
            for item in inst.items:
                new_item = models.BudgetItem(
                    installment_id=new_inst.id,
                    detail=item.detail,
                    category_id=item.category_id,
                    expense_date=item.date,
                    amount=float(item.amount)
                )
                db.add(new_item)


        # 4. บันทึกสิทธิ์ให้คนในทีม (Managers) สามารถเข้ามาแก้ไขได้
        # บันทึกเจ้าของลงในตารางสิทธิ์ก่อน
        owner_access = models.ProjectAccess(
            project_id=new_project.id,
            user_id=owner_id,
            role="Owner"
        )
        db.add(owner_access)

        # บันทึกคนในทีม
        team_members = data.managers or []

        for m in team_members:
            user_in_db = db.query(models.User).filter(
                models.User.fullname == m.name
            ).first()

            if user_in_db:
                new_access = models.ProjectAccess(
                    project_id=new_project.id,
                    user_id=user_in_db.id,
                    role="Editor"
                )
                db.add(new_access)

        db.commit()

        return {
            "status": "success",
            "project_id": new_project.id
        }

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()

        print("ERROR =", str(e))

        raise HTTPException(status_code=400, detail=str(e))
    

@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ดึงโปรเจกต์มาเช็ค
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    
    # เช็คว่าเป็นเจ้าของไหม
    is_owner = project.owner_id == current_user.id
    
    # เช็คว่าเป็นสมาชิกที่มีสิทธิ์แก้ไหม
    has_access = db.query(models.ProjectAccess).filter(
        models.ProjectAccess.project_id == project_id,
        models.ProjectAccess.user_id == current_user.id
    ).first()

    if not is_owner and not has_access:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์แก้ไขโปรเจกต์นี้")

    # ... ถ้าผ่านก็ทำการแก้ไขข้อมูล ...


@app.get("/api/my-projects")
async def get_my_projects(user_id: int, db: Session = Depends(get_db)):
    # ดึงโครงการที่ User เป็นเจ้าของ หรืออยู่ในทีม (ProjectAccess)
    projects = db.query(models.Project).join(
        models.ProjectAccess, models.Project.id == models.ProjectAccess.project_id
    ).filter(
        models.ProjectAccess.user_id == user_id
    ).all()
    
    return projects


@app.get("/api/projects/{project_id}")
async def get_project_details(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.get("/api/evaluation-options", response_model=List[schemas.EvaluationOptionOut])
def get_evaluation_options(db: Session = Depends(get_db)):
    return db.query(models.EvaluationOption).all()



#  RUN : python -m uvicorn main:app --reload --port 8000