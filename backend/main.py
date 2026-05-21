from fastapi import FastAPI, Depends, HTTPException, Request, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from database import get_db, engine, SessionLocal
from sqlalchemy import or_, text
from sqlalchemy.orm import Session, joinedload
from models import BudgetMainCategory, User, Team, PublicHoliday   
from typing import List
from auth_utils import get_current_user
import os
import time
import models, database, auth_utils, schemas 

app = FastAPI()

# ตั้งค่า CORS เพื่อให้ Next.js เรียกใช้งานได้
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.3.21:3000", # เพิ่ม IP ของเครื่องตามที่ Next.js แจ้ง
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULT_UPLOAD_DIR = "uploads/results"
os.makedirs(RESULT_UPLOAD_DIR, exist_ok=True)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # ปริ้นข้อมูููลออกทาง Terminal ฝั่ง Backend เพื่อให้เห็นฟิลด์ที่ผิดพลาด
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
        
        # เช็คว่า username ซ้ำไหม 
        db_username = db.query(models.User).filter(models.User.username == user.username).first()
        if db_username:
            raise HTTPException(status_code=400, detail="Username นี้ถูกใช้งานแล้ว")

        # เข้ารหัสผ่าน
        hashed_pwd = auth_utils.hash_password(user.password)
        
        # โมเดลเตรียมบันทึก
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
        db.refresh(new_user) # ดึงค่า id ที่เพิ่ง Gen จาก DB กลับมาใส่ในตัวแปร

        # ส่งผลลัพธ์กลับหน้าบ้านแบบที่คุณชอบใช้งาน
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
    # ส่งออกเป็น ["2026-01-01", "2026-03-03", ...]
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


@app.get("/api/evaluation-options", response_model=List[schemas.EvaluationOptionOut])
def get_evaluation_options(db: Session = Depends(get_db)):
    return db.query(models.EvaluationOption).all()


@app.get("/api/search-users")
def search_users(q: str = "", db: Session = Depends(get_db)):
    users = db.query(User).filter(
        User.role_id == 3,
        User.fullname.ilike(f"%{q}%")
    ).limit(10).all()
    
    return [{"id": u.id, "name": u.fullname} for u in users]

@app.get("/api/teams")
def get_user_teams(db: Session = Depends(get_db)):
    # ในอนาคตควรดึงตาม user_id ที่ Login อยู่ แต่ตอนนี้ดึงทั้งหมดมาทดสอบก่อน
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
        # บันทึกข้อมูลโครงการหลัก
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

       # บันทึก Phases และ Tasks
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


        # บันทึก Installments
        for inst in data.installments:
            # บันทึกหัวข้องวดงานก่อน
            new_inst = models.ProjectInstallment(
                project_id=new_project.id,
                title=inst.title,
                main_category=inst.mainCategory,
                sub_category=inst.subCategory,
                is_approved=None
            )
            
            db.add(new_inst)
            db.flush()
            
            # บันทึกรายการค่าใช้จ่าย (Items) ภายใต้งวดงานนั้น
            for item in inst.items:
                new_item = models.BudgetItem(
                    installment_id=new_inst.id,
                    detail=item.detail,
                    category_id=item.category_id,
                    expense_date=item.date,
                    amount=float(item.amount),
                    
                )
                db.add(new_item)


        # บันทึกสิทธิ์ให้คนในทีม (Managers) สามารถเข้ามาแก้ไขได้
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
    project = (
        db.query(models.Project)
        .options(
            joinedload(models.Project.access_rights),
            joinedload(models.Project.phases).joinedload(models.ProjectPhase.tasks), 
            joinedload(models.Project.installments).joinedload(models.ProjectInstallment.budget_items)
        )
        .filter(models.Project.id == project_id)
        .filter(models.Project.is_deleted == False)
        .first()
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="โครงการนี้ไม่มีอยู่ในระบบ")

    evaluation_texts = []
    if project.evaluation_option_ids:
        options = db.query(models.EvaluationOption).filter(
            models.EvaluationOption.id.in_(project.evaluation_option_ids)
        ).all()
        
        evaluation_texts = [opt.name for opt in options]
    
    final_evaluation_list = list(evaluation_texts)
    if project.eval_other_text and project.eval_other_text.strip():
        final_evaluation_list.append(project.eval_other_text.strip())
        
    evaluation_display_text = " , ".join(final_evaluation_list) if final_evaluation_list else "-"


    return {
        "status": "success",
        "project_id": project.id,
        "owner_id": project.owner_id,
        "status": project.status, 
        "grand_total": float(project.grand_total) if project.grand_total else 0.0,
        
        "evaluation_text": evaluation_display_text, 
        
        "projectInfo": {
            "title": project.title,
            "rationale": project.rationale,
            "objectives": project.objectives,
            "target_group": project.target_group,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "location": project.location,
            "expectedBenefits": project.expected_benefits, 
            "status": True,
            "includeWeekend": True,
            "includePublicHoliday": False
        },
        "managers": [
            {
                "id": acc.id,
                "name": acc.user.fullname if acc.user and hasattr(acc.user, 'fullname') else f"User ID: {acc.user_id}", 
                "role": acc.role,
                "otherRole": ""
            } for acc in project.access_rights
        ],
        "phases": [
            {
                "id": p.id,
                "phase_name": p.phase_name,
                "tasks": [
                    {
                        "id": t.id,
                        "task_name": t.task_name,
                        "duration": t.duration,
                        "duration_unit": t.duration_unit,
                        "weight_percentage": float(t.weight_percentage) if t.weight_percentage else 0.0,
                        "status": t.status if hasattr(t, 'status') else False
                        
                    } for t in sorted(p.tasks, key=lambda x: x.id)
                ]
            } for p in sorted(project.phases, key=lambda x: getattr(x, 'id', 0))
        ],
        "installments": [
            {
                "id": inst.id,
                "title": inst.title,
                "mainCategory": inst.main_category,
                "subCategory": inst.sub_category,
                "is_approved": inst.is_approved if hasattr(inst, 'is_approved') else False,
                "items": [
                    {
                        "id": item.id,
                        "detail": item.detail,
                        "category_id": item.category_id, 
                        "date": item.expense_date.isoformat() if item.expense_date else None,
                        "amount": float(item.amount) if item.amount else 0.0,
                        "status": item.status if hasattr(item, 'status') else False
                    } for item in sorted(inst.budget_items, key=lambda x: x.id)
                ]
            } for inst in sorted(project.installments, key=lambda x: getattr(x, 'id', 0))
        ]
    }


# อัปเดตสถานะ Task 
@app.put("/api/tasks/{task_id}/toggle")
def toggle_task_status(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.PhaseTask).filter(models.PhaseTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # สลับสถานะ Boolean (True <-> False)
    task.status = not task.status
    
    
    db.commit()
    db.refresh(task)
    return {"success": True, "new_status": task.status}


# กดเบิกจ่ายเงินงวดงาน (Update status การจ่ายเงิน)
@app.put("/api/budget-items/{item_id}/pay")
def pay_budget_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.BudgetItem).filter(models.BudgetItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found")
        
    # บังคับสถานะการจ่ายเงินให้กลายเป็น True (จ่ายแล้ว)
    item.status = True
    db.commit()
    db.refresh(item)
    return {"success": True, "message": "Paid successfully"}


@app.post("/api/projects/{project_id}/close-report")
async def submit_final_project_report(
    project_id: int,
    summary: str = Form(...),
    obstacles: str = Form(None),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    #  ตรวจสอบโครงการก่อน
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    #  บันทึกข้อมูลหรืออัปเดตลงตาราง project_results
    db_result = db.query(models.ProjectResult).filter(models.ProjectResult.project_id == project_id).first()
    if not db_result:
        db_result = models.ProjectResult(project_id=project_id, summary=summary, obstacles=obstacles)
        db.add(db_result)
    else:
        db_result.summary = summary
        db_result.obstacles = obstacles

    # วนลูปเซฟไฟล์แนบทั้งหมดลงตาราง project_attachments (กรณีส่งมาหลายไฟล์)
    if files:
        for idx, file in enumerate(files):
            # ดักจับชื่อไฟล์ว่าง
            if file.filename == "":
                continue
                
            file_ext = os.path.splitext(file.filename)[1]
            # ตั้งชื่อไฟล์แบบไม่ซ้ำ โดยพ่วงลำดับลูปเข้าไปด้วย
            unique_name = f"final_report_{project_id}_{int(time.time())}_{idx}{file_ext}"
            saved_path = os.path.join(RESULT_UPLOAD_DIR, unique_name)

            with open(saved_path, "wb") as buffer:
                buffer.write(await file.read())

            db_attachment = models.ProjectAttachment(
                project_id=project_id,
                file_name=file.filename,
                file_path=f"uploads/results/{unique_name}",
                file_type=file.content_type
            )
            db.add(db_attachment)

    project.status = "completed" 

    db.commit()
    return {"success": True, "message": "Project closed with multiple attachments!"}


# Run : python -m uvicorn main:app --reload --port 8000