#!/usr/bin/env python3
"""
生活管理系统启动脚本
"""
import os
import sys
import uvicorn
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目路径到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # 获取配置
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
    ╔═══════════════════════════════════════════╗
    ║     🎯 生活管理系统 - Palantir 架构        ║
    ╠═══════════════════════════════════════════╣
    ║  基于 AI 的智能任务管理和时间优化系统        ║
    ║                                           ║
    ║  功能特性：                                ║
    ║  • AI 自动分类任务到时间域                  ║
    ║  • 智能预测任务所需时间                     ║
    ║  • 自动分配最佳时间槽                      ║
    ║  • 持续学习优化本体论                      ║
    ╚═══════════════════════════════════════════╝
    
    🚀 正在启动服务器...
    📍 访问地址: http://localhost:{port}
    📝 API 文档: http://localhost:{port}/docs
    
    按 Ctrl+C 停止服务器
    """)
    
    # 启动服务器
    uvicorn.run(
        "src.api.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )