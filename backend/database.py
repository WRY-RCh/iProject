from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# เปลี่ยน password ให้ตรงกับที่คุณตั้งใน Postgres
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:141101@localhost:5432/iproject_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
