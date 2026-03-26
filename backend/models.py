from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True) # 使用 8 位短 UUID
    name = Column(String, index=True)
    client = Column(String, default="")
    location = Column(String, default="")
    manager = Column(String, default="")
    start_date = Column(String, default="")
    end_date = Column(String, default="")
    note = Column(String, default="")
    classification_depth = Column(Integer, default=3)
    floor_area = Column(String, default="") # 樓地板面積 (顯示用，可能含單位)
    report_config = Column(JSON, default=dict) # 報表設定：折數、合計項、備註等
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    file_name = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON) # 存儲 mapping, rows, analysis 等解析後的資料

    project = relationship("Project", back_populates="files")
