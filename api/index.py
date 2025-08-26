# 生活管理系统 API - Vercel 版本
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        
        # 设置响应头
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # 路由处理
        if path == '/' or path == '/health':
            response = {
                "status": "ok",
                "version": "4.0.0",
                "message": "Life Management API is running!",
                "timestamp": datetime.now().isoformat()
            }
        elif path == '/tasks':
            # 返回任务列表
            response = {
                "success": True,
                "tasks": [
                    {
                        "id": "task_demo_1",
                        "title": "欢迎使用生活管理系统",
                        "domain": "life",
                        "status": "pending",
                        "priority": 3,
                        "estimated_minutes": 15,
                        "created_at": datetime.now().isoformat(),
                        "tags": ["系统", "演示"]
                    },
                    {
                        "id": "task_demo_2",
                        "title": "探索任务管理功能",
                        "domain": "growth",
                        "status": "pending",
                        "priority": 2,
                        "estimated_minutes": 30,
                        "created_at": datetime.now().isoformat(),
                        "tags": ["学习", "功能"]
                    }
                ],
                "total": 2,
                "timestamp": datetime.now().isoformat()
            }
        elif path == '/analytics/daily':
            # 返回分析数据
            response = {
                "success": True,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "summary": {
                    "total_tasks": 2,
                    "completed_tasks": 0,
                    "completion_rate": 0,
                    "productivity_score": 0,
                    "total_hours_planned": 0.75
                },
                "domain_usage": {
                    "academic": {"task_count": 0, "completed_count": 0, "completion_rate": 0},
                    "income": {"task_count": 0, "completed_count": 0, "completion_rate": 0},
                    "growth": {"task_count": 1, "completed_count": 0, "completion_rate": 0},
                    "life": {"task_count": 1, "completed_count": 0, "completion_rate": 0}
                },
                "insights": ["📊 开始你的第一天任务管理"]
            }
        else:
            response = {
                "status": "ok",
                "message": f"Endpoint {path} called",
                "timestamp": datetime.now().isoformat()
            }
        
        self.wfile.write(json.dumps(response).encode())
        return
    
    def do_POST(self):
        # 简单处理 POST 请求
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "✅ 操作成功"
        }
        
        self.wfile.write(json.dumps(response).encode())
        return
    
    def do_PATCH(self):
        # 处理任务更新
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "✅ 任务更新成功"
        }
        
        self.wfile.write(json.dumps(response).encode())
        return
    
    def do_DELETE(self):
        # 处理任务删除
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = {
            "success": True,
            "message": "🗑️ 任务删除成功"
        }
        
        self.wfile.write(json.dumps(response).encode())
        return
    
    def do_OPTIONS(self):
        # 处理 CORS 预检请求
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        return