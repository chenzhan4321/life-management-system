"""
Vercel部署入口文件
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main_simple import app

# Vercel需要导出app变量
handler = app