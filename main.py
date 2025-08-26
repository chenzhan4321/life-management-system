from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
from datetime import datetime
import os
import uuid
import json
import requests

app = FastAPI(
    title="生活管理系统API",
    description="完整功能的生活管理系统后端API",
    version="1.0.0"
)

# CORS配置 - 允许GitHub Pages访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chenzhan4321.github.io",
        "http://localhost:3000",
        "http://localhost:8080",
        "*"  # 临时允许所有域名，生产环境建议限制
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 内存存储（简单实现，重启后数据会丢失）
tasks_db = []

@app.get("/")
def read_root():
    return {
        "message": "生活管理系统API正在运行",
        "status": "success", 
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# 任务相关API
@app.get("/tasks")
def get_tasks():
    """获取任务列表"""
    return {"tasks": tasks_db, "total": len(tasks_db)}

@app.post("/tasks")
def create_task(task_data: Dict):
    """创建任务"""
    task = {
        "id": f"task_{uuid.uuid4()}",
        "title": task_data.get("title", ""),
        "domain": task_data.get("domain", "life"),
        "status": task_data.get("status", "pending"),
        "priority": task_data.get("priority", 3),
        "estimated_minutes": task_data.get("estimated_minutes", 30),
        "created_at": datetime.now().isoformat(),
        "scheduled_start": task_data.get("scheduled_start"),
        "scheduled_end": task_data.get("scheduled_end"),
        "actual_minutes": None,
        "completed_at": None
    }
    tasks_db.append(task)
    return {"success": True, "task": task}

@app.patch("/tasks/{task_id}")
def update_task(task_id: str, task_data: Dict):
    """更新任务"""
    for i, task in enumerate(tasks_db):
        if task["id"] == task_id:
            # 更新任务字段
            for key, value in task_data.items():
                if key in ["title", "domain", "status", "priority", "estimated_minutes", "actual_minutes", "scheduled_start", "scheduled_end", "completed_at"]:
                    task[key] = value
            
            # 如果状态变为completed，设置完成时间
            if task_data.get("status") == "completed" and not task.get("completed_at"):
                task["completed_at"] = datetime.now().isoformat()
            
            tasks_db[i] = task
            return {"success": True, "task": task}
    
    raise HTTPException(status_code=404, detail="任务不存在")

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    """删除任务"""
    for i, task in enumerate(tasks_db):
        if task["id"] == task_id:
            deleted_task = tasks_db.pop(i)
            return {"success": True, "message": f"任务 {deleted_task['title']} 已删除"}
    
    raise HTTPException(status_code=404, detail="任务不存在")

# Analytics API
@app.get("/analytics/daily")
def get_daily_analytics(date: Optional[str] = None):
    """获取每日分析数据"""
    today_tasks = tasks_db  # 简化版：返回所有任务
    completed_tasks = [t for t in today_tasks if t.get("status") == "completed"]
    
    # 按域分组统计
    domain_stats = {
        "academic": {"allocated_hours": 4, "used_hours": 0, "task_count": 0, "completion_rate": 0},
        "income": {"allocated_hours": 4, "used_hours": 0, "task_count": 0, "completion_rate": 0},
        "growth": {"allocated_hours": 4, "used_hours": 0, "task_count": 0, "completion_rate": 0},
        "life": {"allocated_hours": 4, "used_hours": 0, "task_count": 0, "completion_rate": 0}
    }
    
    for task in today_tasks:
        domain = task.get("domain", "life")
        if domain in domain_stats:
            domain_stats[domain]["task_count"] += 1
            if task.get("actual_minutes"):
                domain_stats[domain]["used_hours"] += task["actual_minutes"] / 60
            elif task.get("estimated_minutes"):
                domain_stats[domain]["used_hours"] += task["estimated_minutes"] / 60
    
    # 计算完成率
    for domain in domain_stats:
        domain_tasks = [t for t in today_tasks if t.get("domain") == domain]
        completed_domain_tasks = [t for t in completed_tasks if t.get("domain") == domain]
        if domain_tasks:
            domain_stats[domain]["completion_rate"] = len(completed_domain_tasks) / len(domain_tasks)
    
    return {
        "date": date or datetime.now().isoformat()[:10],
        "summary": {
            "total_tasks": len(today_tasks),
            "completed_tasks": len(completed_tasks),
            "completion_rate": len(completed_tasks) / max(len(today_tasks), 1),
            "total_hours_planned": sum(s["used_hours"] for s in domain_stats.values()),
            "productivity_score": 85.0  # 示例值
        },
        "domain_usage": domain_stats,
        "recommendations": [
            "💡 建议合理分配各个时间域的任务",
            "📈 保持良好的工作节奏"
        ]
    }

# DeepSeek API 配置
DEEPSEEK_API_KEY = "sk-caaa6d9b2c2b43e6a5cccca712c73fc9"
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

def call_deepseek_api(user_input: str) -> Dict:
    """调用 DeepSeek API 进行智能任务分析"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""解析以下任务为JSON格式，每个任务包含title、domain、priority(1-5)、estimated_minutes。domain选择academic/income/growth/life之一。

用户输入：{user_input}

直接返回JSON数组："""
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1000,
        "temperature": 0.3
    }
    
    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        ai_response = result["choices"][0]["message"]["content"].strip()
        
        # 尝试解析 JSON 响应
        try:
            # 清理可能的格式问题
            if ai_response.startswith("```json"):
                ai_response = ai_response[7:-3]
            elif ai_response.startswith("```"):
                ai_response = ai_response[3:-3]
            
            tasks_data = json.loads(ai_response)
            return {
                "success": True,
                "tasks_data": tasks_data,
                "raw_response": ai_response
            }
        except json.JSONDecodeError:
            # 如果解析失败，返回原始响应
            return {
                "success": False,
                "error": "AI响应格式错误",
                "raw_response": ai_response
            }
            
    except requests.exceptions.RequestException as e:
        # print(f"DeepSeek API request error: {str(e)}")
        return {
            "success": False,
            "error": f"API调用失败: {str(e)}"
        }
    except Exception as e:
        # print(f"DeepSeek API general error: {str(e)}")
        return {
            "success": False,
            "error": f"处理错误: {str(e)}"
        }

# AI智能处理任务 - DeepSeek 集成版本
@app.post("/tasks/ai-process")
def ai_process_tasks(request_data: Dict):
    """AI智能处理任务 - 使用 DeepSeek API"""
    input_text = request_data.get("input", "")
    
    if not input_text:
        raise HTTPException(status_code=400, detail="输入内容不能为空")
    
    # 调用 DeepSeek API
    ai_result = call_deepseek_api(input_text)
    
    if not ai_result["success"]:
        # API 调用失败，使用简单的备用逻辑
        return process_tasks_fallback(input_text, ai_result.get("error", "未知错误"))
    
    # 处理 AI 返回的任务数据
    try:
        tasks_data = ai_result["tasks_data"]
        processed_tasks = []
        insights = []
        
        for task_info in tasks_data:
            # 验证和处理任务数据
            task = {
                "id": f"task_{uuid.uuid4()}",
                "title": task_info.get("title", "").strip(),
                "domain": task_info.get("domain", "life"),
                "status": "pending",
                "priority": max(1, min(5, task_info.get("priority", 3))),
                "estimated_minutes": max(5, min(480, task_info.get("estimated_minutes", 30))),
                "created_at": datetime.now().isoformat(),
                "scheduled_start": None,
                "scheduled_end": None,
                "actual_minutes": None,
                "completed_at": None
            }
            
            if task["title"]:  # 只添加有效标题的任务
                tasks_db.append(task)
                processed_tasks.append(task)
        
        # 生成智能洞察
        domain_counts = {}
        total_time = 0
        for task in processed_tasks:
            domain = task["domain"]
            domain_counts[domain] = domain_counts.get(domain, 0) + 1
            total_time += task["estimated_minutes"]
        
        insights = [
            f"🤖 DeepSeek AI 成功解析了 {len(processed_tasks)} 个任务",
            f"⏰ 总预估时间：{total_time // 60}小时{total_time % 60}分钟"
        ]
        
        # 添加域分布洞察
        if domain_counts:
            main_domain = max(domain_counts.items(), key=lambda x: x[1])
            domain_names = {"academic": "学术", "income": "收入", "growth": "成长", "life": "生活"}
            insights.append(f"📊 主要关注{domain_names.get(main_domain[0], main_domain[0])}领域({main_domain[1]}个任务)")
        
        return {
            "success": True,
            "message": f"DeepSeek AI 成功处理了 {len(processed_tasks)} 个任务",
            "tasks": processed_tasks,
            "insights": insights,
            "ai_analysis": True
        }
        
    except Exception as e:
        # 数据处理失败，使用备用逻辑
        return process_tasks_fallback(input_text, f"AI数据处理失败: {str(e)}")

def process_tasks_fallback(input_text: str, error_msg: str) -> Dict:
    """备用任务处理逻辑"""
    lines = input_text.strip().split('\n')
    processed_tasks = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        # 简单的任务解析
        task_title = line
        domain = "life"  # 默认域
        priority = 3     # 默认优先级
        estimated_minutes = 30  # 默认估计时间
        
        # 简单的域识别
        if any(word in line.lower() for word in ['学习', '研究', '论文', '课程', '学术']):
            domain = "academic"
        elif any(word in line.lower() for word in ['工作', '赚钱', '收入', '项目', '客户']):
            domain = "income"
        elif any(word in line.lower() for word in ['锻炼', '阅读', '技能', '成长', '练习']):
            domain = "growth"
        elif any(word in line.lower() for word in ['生活', '购物', '清洁', '家务', '娱乐']):
            domain = "life"
            
        # 创建任务
        task = {
            "id": f"task_{uuid.uuid4()}",
            "title": task_title,
            "domain": domain,
            "status": "pending",
            "priority": priority,
            "estimated_minutes": estimated_minutes,
            "created_at": datetime.now().isoformat(),
            "scheduled_start": None,
            "scheduled_end": None,
            "actual_minutes": None,
            "completed_at": None
        }
        
        tasks_db.append(task)
        processed_tasks.append(task)
    
    return {
        "success": True,
        "message": f"备用模式处理了 {len(processed_tasks)} 个任务",
        "tasks": processed_tasks,
        "insights": [
            f"⚠️ AI处理失败：{error_msg}",
            "🔄 已使用备用逻辑处理任务",
            "💡 基于关键词自动分配了时间域"
        ],
        "ai_analysis": False
    }

# 本体论更新（简化实现）
@app.post("/ontology/update")
def update_ontology():
    """本体论更新"""
    return {
        "success": True,
        "updates": ["任务分类优化", "时间预测调整"],
        "insights": ["工作效率提升15%"],
        "recommendations": ["建议增加休息时间"],
        "message": "本体论更新成功"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)