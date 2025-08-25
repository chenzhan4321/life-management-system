"""
API认证模块
提供简单的Token认证机制
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
try:
    from jose import JWTError, jwt
except ImportError:
    # 如果jose未安装，使用简单的mock
    import json
    import base64
    from datetime import datetime
    
    class JWTError(Exception):
        pass
    
    class jwt:
        @staticmethod
        def encode(payload, secret, algorithm="HS256"):
            # 简单的Base64编码作为临时方案
            return base64.b64encode(json.dumps(payload).encode()).decode()
        
        @staticmethod
        def decode(token, secret, algorithms=None):
            # 简单的Base64解码
            try:
                return json.loads(base64.b64decode(token.encode()).decode())
            except:
                raise JWTError("Invalid token")
from passlib.context import CryptContext

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# API密钥（用于静态网站部署）
API_KEY = os.getenv("API_KEY", "")

# Bearer认证
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """验证JWT令牌"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="无效的认证凭据")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="无效的认证凭据")

def verify_api_key(x_api_key: str = Header(None)):
    """验证API密钥（用于静态部署）"""
    if not API_KEY:
        # 如果没有设置API密钥，跳过验证（开发模式）
        return True
    
    if not x_api_key:
        raise HTTPException(status_code=401, detail="缺少API密钥")
    
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="无效的API密钥")
    
    return True

def get_current_user(
    api_key_valid: bool = Depends(verify_api_key),
    token: Optional[str] = Header(None, alias="Authorization")
):
    """获取当前用户（支持API密钥和JWT两种方式）"""
    # 如果有API密钥且有效，直接返回
    if api_key_valid and API_KEY:
        return {"username": "api_user", "auth_type": "api_key"}
    
    # 否则尝试JWT验证
    if token:
        try:
            # 移除 "Bearer " 前缀
            if token.startswith("Bearer "):
                token = token[7:]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username:
                return {"username": username, "auth_type": "jwt"}
        except JWTError:
            pass
    
    # 如果都没有，在开发模式下允许访问
    if not API_KEY:
        return {"username": "dev_user", "auth_type": "dev"}
    
    raise HTTPException(status_code=401, detail="未授权访问")

# CORS配置（用于GitHub Pages部署）
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    # 添加你的GitHub Pages域名
    "https://yourusername.github.io",
]