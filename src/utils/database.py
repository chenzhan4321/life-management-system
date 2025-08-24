"""
数据库工具函数
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from src.core.models import Base

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/life_management.db")

# 创建引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """初始化数据库"""
    # 确保数据目录存在
    os.makedirs("data", exist_ok=True)
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库初始化完成")

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()