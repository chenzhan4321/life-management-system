"""
DeepSeek AI 集成 - 智能任务管理
"""
import os
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class DeepSeekAgent:
    """DeepSeek API 智能代理"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 系统提示词 - 定义 AI 的角色和能力
        self.system_prompt = """你是一个智能生活管理助手，专门帮助用户管理日常任务和时间。

你的核心能力包括：
1. 任务分类：将任务自动分类到四个时间域（学术academic、收入income、成长growth、生活life）
2. 时间预测：根据任务描述预测所需时间（分钟）
3. 智能调度：找出最佳的空闲时间槽来安排任务
4. 本体论更新：学习用户习惯，优化分类和预测规则

时间域定义：
- academic（学术）：论文、研究、学习、阅读专业书籍
- income（收入）：工作、项目、挣钱相关活动
- growth（成长）：健身、学习新技能、个人发展
- life（生活）：家务、社交、娱乐、日常琐事

请用JSON格式回复。"""

    async def classify_task(self, task_description: str) -> Dict:
        """
        自动分类任务到相应时间域
        
        Returns:
            {
                "domain": "academic/income/growth/life",
                "confidence": 0.85,
                "reasoning": "分类理由"
            }
        """
        prompt = f"""请分析以下任务，并将其分类到合适的时间域：

任务描述：{task_description}

请返回JSON格式：
{{
    "domain": "选择：academic/income/growth/life",
    "confidence": 0-1之间的置信度,
    "reasoning": "简短的分类理由"
}}"""

        try:
            response = await self._call_api(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"任务分类失败: {e}")
            return {
                "domain": "life",
                "confidence": 0.5,
                "reasoning": "默认分类"
            }

    async def estimate_duration(self, task_description: str, historical_data: List[Dict] = None) -> Dict:
        """
        预测任务所需时间
        
        Returns:
            {
                "estimated_minutes": 30,
                "confidence": 0.8,
                "factors": ["复杂度", "类似任务历史"]
            }
        """
        history_context = ""
        if historical_data:
            history_context = f"\n历史参考数据：{json.dumps(historical_data, ensure_ascii=False)}"
        
        prompt = f"""请预测完成以下任务需要的时间（分钟）：

任务描述：{task_description}{history_context}

请返回JSON格式：
{{
    "estimated_minutes": 预计需要的分钟数,
    "confidence": 0-1之间的置信度,
    "factors": ["影响时间估算的因素列表"]
}}"""

        try:
            response = await self._call_api(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"时间预测失败: {e}")
            return {
                "estimated_minutes": 30,
                "confidence": 0.5,
                "factors": ["默认估算"]
            }

    async def find_optimal_slot(self, task: Dict, available_slots: List[Dict], user_preferences: Dict = None) -> Dict:
        """
        找出最佳时间槽安排任务
        
        Returns:
            {
                "slot_index": 0,
                "start_time": "2024-08-24T10:00:00",
                "reasoning": "选择理由",
                "alternatives": [...]
            }
        """
        preferences_context = ""
        if user_preferences:
            preferences_context = f"\n用户偏好：{json.dumps(user_preferences, ensure_ascii=False)}"
        
        prompt = f"""请为以下任务选择最佳时间槽：

任务信息：{json.dumps(task, ensure_ascii=False)}

可用时间槽：{json.dumps(available_slots, ensure_ascii=False)}{preferences_context}

考虑因素：
1. 任务优先级和紧急程度
2. 时间槽的能量水平（早上精力充沛适合复杂任务）
3. 任务类型与时间域匹配
4. 避免频繁切换上下文

请返回JSON格式：
{{
    "slot_index": 选择的时间槽索引,
    "start_time": "建议的开始时间",
    "reasoning": "选择理由",
    "alternatives": [备选时间槽索引列表]
}}"""

        try:
            response = await self._call_api(prompt)
            result = json.loads(response)
            return result
        except Exception as e:
            logger.error(f"时间槽选择失败: {e}")
            # 如果没有可用时间槽，返回默认值
            if not available_slots:
                return {
                    "slot_index": 0,
                    "start_time": None,
                    "reasoning": "没有可用时间槽",
                    "alternatives": []
                }
            
            # 使用第一个可用时间槽
            return {
                "slot_index": 0,
                "start_time": available_slots[0].get("start") or available_slots[0].get("start_time"),
                "reasoning": "默认选择第一个可用时间槽",
                "alternatives": []
            }

    async def update_ontology(self, learning_data: Dict) -> Dict:
        """
        基于用户行为更新本体论规则
        
        Returns:
            {
                "updates": [
                    {
                        "type": "classification_rule",
                        "old": "...",
                        "new": "...",
                        "confidence": 0.85
                    }
                ],
                "insights": ["发现的模式"]
            }
        """
        prompt = f"""基于以下用户行为数据，学习并更新任务管理规则：

学习数据：{json.dumps(learning_data, ensure_ascii=False)}

请分析：
1. 用户的任务分类模式
2. 实际花费时间 vs 预估时间的偏差
3. 不同时间段的生产力模式
4. 任务完成率与安排时间的关系

请返回JSON格式：
{{
    "updates": [
        {{
            "type": "分类规则/时间预测/调度策略",
            "pattern": "发现的模式",
            "suggestion": "改进建议",
            "confidence": 置信度
        }}
    ],
    "insights": ["关键洞察列表"],
    "recommendations": ["给用户的建议"]
}}"""

        try:
            response = await self._call_api(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"本体论更新失败: {e}")
            return {
                "updates": [],
                "insights": [],
                "recommendations": []
            }

    async def batch_process_tasks(self, tasks: List[str]) -> List[Dict]:
        """
        批量处理任务：分类、预测时间、建议优先级
        """
        # 如果任务列表为空，直接返回
        if not tasks:
            logger.warning("批量处理：任务列表为空")
            return []
            
        prompt = f"""请批量处理以下任务，为每个任务提供分类、时间预测和优先级建议：

任务列表：
{chr(10).join(f"{i+1}. {task}" for i, task in enumerate(tasks))}

分类原则：
- academic: 学术研究、论文、学习、阅读、考试等
- income: 工作、兼职、业务、挣钱相关
- growth: 个人成长、技能学习、锻炼、爱好等
- life: 日常生活、家务、社交、娱乐等

优先级判断标准：
5 - 紧急重要：死线今天、影响巨大、别人在等待
4 - 重要：近期需要完成、有明确期限、工作相关
3 - 中等：常规任务、没有紧急性、计划内任务
2 - 低：可以推迟、非必须、个人事务
1 - 最低：娱乐、随意、没有时间限制

时间预估原则：
- 邮件/消息回复: 5-15分钟
- 文档整理: 30-60分钟
- 会议/讨论: 30-90分钟
- 研究/学习: 60-120分钟
- 编程/写作: 90-180分钟

请返回JSON格式：
{{
    "tasks": [
        {{
            "index": 任务索引,
            "title": "任务标题",
            "domain": "时间域",
            "estimated_minutes": 预计分钟,
            "priority": 1-5优先级,
            "confidence": 置信度,
            "priority_reasoning": "优先级判断理由"
        }}
    ]
}}"""

        try:
            response = await self._call_api(prompt)
            result = json.loads(response)
            
            # 确保返回的格式正确
            if isinstance(result, dict) and "tasks" in result:
                return result["tasks"]
            elif isinstance(result, list):
                # 如果直接返回列表，包装成正确的格式
                return result
            else:
                logger.error(f"批量处理返回格式错误: {result}")
                # 返回模拟数据
                return self._generate_mock_batch_tasks(tasks)
        except Exception as e:
            logger.error(f"批量处理失败: {e}")
            # 使用模拟数据
            return self._generate_mock_batch_tasks(tasks)
    
    def _generate_mock_batch_tasks(self, tasks: List[str]) -> List[Dict]:
        """生成模拟的批量任务数据"""
        import random
        result = []
        for i, task in enumerate(tasks):
            # 简单的规则分类
            domain = "life"  # 默认域
            if any(word in task.lower() for word in ["学", "study", "研究", "论文", "paper", "学习"]):
                domain = "academic"
            elif any(word in task.lower() for word in ["工作", "work", "项目", "project", "会议", "meeting", "工资", "费用"]):
                domain = "income"
            elif any(word in task.lower() for word in ["健身", "运动", "exercise", "跑步", "瑜伽"]):
                domain = "growth"
            
            # 根据任务描述估算时间
            estimated_minutes = 30  # 默认30分钟
            # 检查任务中是否包含时间信息
            import re
            time_match = re.search(r'(\d+)\s*[mM分]', task)
            if time_match:
                estimated_minutes = int(time_match.group(1))
            elif "小时" in task or "h" in task.lower():
                hour_match = re.search(r'(\d+)\s*[小时hH]', task)
                if hour_match:
                    estimated_minutes = int(hour_match.group(1)) * 60
            
            result.append({
                "index": i,
                "title": task.strip(),
                "domain": domain,
                "estimated_minutes": estimated_minutes,
                "priority": 3,  # 默认中等优先级
                "confidence": 0.7
            })
        return result

    async def generate_daily_schedule(self, tasks: List[Dict], constraints: Dict) -> Dict:
        """
        生成每日日程安排
        """
        prompt = f"""请根据以下任务和约束条件，生成优化的日程安排：

任务列表：{json.dumps(tasks, ensure_ascii=False)}

约束条件：{json.dumps(constraints, ensure_ascii=False)}

要求：
1. 遵守4x4小时时间域分配（学术、收入、成长、生活各4小时）
2. 考虑任务优先级和截止时间
3. 合理安排休息时间
4. 避免频繁的上下文切换

请返回JSON格式的日程表。"""

        try:
            response = await self._call_api(prompt)
            return json.loads(response)
        except Exception as e:
            logger.error(f"日程生成失败: {e}")
            return {}

    async def _call_api(self, prompt: str, model: str = "deepseek-chat") -> str:
        """调用 DeepSeek API"""
        # 如果没有 API Key，使用模拟模式
        if not self.api_key or self.api_key == "your_deepseek_api_key_here":
            return await self._mock_api_response(prompt)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    },
                    timeout=30  # 增加超时时间以避免超时错误
                )
                
                if response.status_code != 200:
                    raise Exception(f"API 调用失败: {response.text}")
                
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"API 调用失败，使用模拟模式: {e}")
            return await self._mock_api_response(prompt)
    
    async def _mock_api_response(self, prompt: str) -> str:
        """模拟 API 响应（用于测试）"""
        import random
        import json
        
        # 根据提示词返回模拟响应
        # 批量处理优先判断（必须同时包含批量和任务列表的特征）
        if ("批量处理" in prompt or "任务列表" in prompt) and ("1." in prompt or "2." in prompt):
            # 解析任务列表
            tasks = []
            lines = prompt.split('\n')
            task_lines = []
            in_task_list = False
            for line in lines:
                if "任务列表" in line:
                    in_task_list = True
                    continue
                if in_task_list and line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-')):
                    # 提取任务内容
                    task_text = line.strip()
                    # 移除序号
                    import re
                    task_text = re.sub(r'^\d+\.\s*', '', task_text)
                    task_text = re.sub(r'^-\s*', '', task_text)
                    if task_text:
                        task_lines.append(task_text)
            
            # 为每个任务生成模拟数据
            for i, task_text in enumerate(task_lines):
                domain = "life"
                if any(word in task_text.lower() for word in ["学", "study", "研究", "论文", "paper"]):
                    domain = "academic"
                elif any(word in task_text.lower() for word in ["工作", "work", "项目", "会议", "邮件"]):
                    domain = "income"
                elif any(word in task_text.lower() for word in ["健身", "运动", "锻炼"]):
                    domain = "growth"
                
                tasks.append({
                    "index": i,
                    "title": task_text,
                    "domain": domain,
                    "estimated_minutes": random.randint(15, 60),
                    "priority": random.randint(2, 4),
                    "confidence": random.uniform(0.7, 0.9),
                    "priority_reasoning": "基于任务内容的模拟优先级"
                })
            
            return json.dumps({"tasks": tasks if tasks else [{"index": 0, "title": "默认任务", "domain": "life", "estimated_minutes": 30, "priority": 3, "confidence": 0.7}]})
        
        elif "分析以下任务" in prompt and "分类到合适的时间域" in prompt:
            domains = ["academic", "income", "growth", "life"]
            return json.dumps({
                "domain": random.choice(domains),
                "confidence": random.uniform(0.7, 0.95),
                "reasoning": "基于任务内容的模拟分类"
            })
        
        elif "预测完成以下任务需要的时间" in prompt:
            return json.dumps({
                "estimated_minutes": random.randint(15, 120),
                "confidence": random.uniform(0.6, 0.9),
                "factors": ["任务复杂度", "历史经验"]
            })
        
        elif "时间槽" in prompt or "slot" in prompt:
            return json.dumps({
                "slot_index": 0,
                "start_time": datetime.now().replace(hour=14, minute=0).isoformat(),
                "reasoning": "下午时段适合此任务",
                "alternatives": [1, 2]
            })
        
        else:
            return json.dumps({
                "result": "模拟响应",
                "status": "success"
            })

class TaskProcessor:
    """任务处理器 - 整合 AI 功能"""
    
    def __init__(self, deepseek_agent: DeepSeekAgent):
        self.ai = deepseek_agent
    
    async def process_new_task(self, task_input: str) -> Dict:
        """
        处理新任务输入：自动分类、预测时间、分配时间槽
        """
        # 1. 分类任务
        classification = await self.ai.classify_task(task_input)
        
        # 2. 预测所需时间
        duration = await self.ai.estimate_duration(task_input)
        
        # 3. 组合结果
        return {
            "title": task_input,
            "domain": classification["domain"],
            "estimated_minutes": duration["estimated_minutes"],
            "ai_confidence": (classification["confidence"] + duration["confidence"]) / 2,
            "classification_reasoning": classification["reasoning"],
            "time_factors": duration["factors"]
        }
    
    async def optimize_schedule(self, tasks: List[Dict], date: datetime) -> Dict:
        """
        优化日程安排
        """
        # 获取当天的时间约束
        constraints = {
            "date": date.isoformat(),
            "working_hours": "09:00-21:00",
            "domains": {
                "academic": 4,
                "income": 4,
                "growth": 4,
                "life": 4
            },
            "break_duration": 15,  # 任务间休息时间
            "lunch_time": "12:00-13:00",
            "dinner_time": "18:00-19:00"
        }
        
        # 生成优化的日程
        schedule = await self.ai.generate_daily_schedule(tasks, constraints)
        
        return schedule