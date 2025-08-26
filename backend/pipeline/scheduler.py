"""
智能调度器 - 时间槽管理和优化
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import numpy as np

@dataclass
class TimeSlot:
    """时间槽"""
    start: datetime
    end: datetime
    domain: str
    available: bool = True
    energy_level: int = 5  # 1-10
    
    @property
    def duration_minutes(self) -> int:
        return int((self.end - self.start).total_seconds() / 60)
    
    def to_dict(self) -> Dict:
        return {
            "start": self.start.isoformat(),
            "start_time": self.start.isoformat(),  # 添加 start_time 键以兼容 API
            "end": self.end.isoformat(),
            "domain": self.domain,
            "available": self.available,
            "duration_minutes": self.duration_minutes,
            "energy_level": self.energy_level
        }

class TimeSlotFinder:
    """寻找可用时间槽"""
    
    def __init__(self):
        # 定义每日时间块模板
        self.daily_template = {
            "morning": {
                "start_hour": 6,
                "end_hour": 12,
                "domains": ["academic", "income"],
                "energy_level": 8
            },
            "afternoon": {
                "start_hour": 13,
                "end_hour": 18,
                "domains": ["income", "growth"],
                "energy_level": 6
            },
            "evening": {
                "start_hour": 19,
                "end_hour": 22,
                "domains": ["growth", "life"],
                "energy_level": 4
            }
        }
    
    def find_slots_for_date(self, date: datetime, existing_tasks: List[Dict] = None) -> List[TimeSlot]:
        """
        为指定日期寻找可用时间槽
        """
        slots = []
        
        # 生成当天的时间槽
        for period_name, period_config in self.daily_template.items():
            start = date.replace(hour=period_config["start_hour"], minute=0, second=0)
            end = date.replace(hour=period_config["end_hour"], minute=0, second=0)
            
            # 每30分钟一个槽
            current = start
            while current < end:
                slot_end = min(current + timedelta(minutes=30), end)
                
                # 检查是否与现有任务冲突
                is_available = True
                if existing_tasks:
                    for task in existing_tasks:
                        task_start = datetime.fromisoformat(task["scheduled_start"])
                        task_end = datetime.fromisoformat(task["scheduled_end"])
                        if not (slot_end <= task_start or current >= task_end):
                            is_available = False
                            break
                
                # 选择合适的域
                hour = current.hour
                if 6 <= hour < 10:
                    domain = "academic"
                elif 10 <= hour < 14:
                    domain = "income"
                elif 14 <= hour < 18:
                    domain = "growth"
                else:
                    domain = "life"
                
                slots.append(TimeSlot(
                    start=current,
                    end=slot_end,
                    domain=domain,
                    available=is_available,
                    energy_level=period_config["energy_level"]
                ))
                
                current = slot_end
        
        # 跳过午餐和晚餐时间
        slots = self._exclude_meal_times(slots)
        
        return slots
    
    def _exclude_meal_times(self, slots: List[TimeSlot]) -> List[TimeSlot]:
        """排除用餐时间"""
        filtered = []
        for slot in slots:
            # 午餐时间 12:00-13:00
            if slot.start.hour == 12:
                continue
            # 晚餐时间 18:00-19:00
            if slot.start.hour == 18:
                continue
            filtered.append(slot)
        return filtered
    
    def find_best_slot_for_task(
        self,
        task_duration: int,
        domain: str,
        available_slots: List[TimeSlot],
        priority: int = 3
    ) -> Optional[TimeSlot]:
        """
        为任务找到最佳时间槽
        """
        # 筛选合适的槽
        suitable_slots = [
            s for s in available_slots
            if s.available and s.duration_minutes >= task_duration
        ]
        
        if not suitable_slots:
            return None
        
        # 评分机制
        scored_slots = []
        for slot in suitable_slots:
            score = 0
            
            # 域匹配度
            if slot.domain == domain:
                score += 10
            
            # 能量水平匹配（高优先级任务需要高能量）
            if priority >= 4 and slot.energy_level >= 7:
                score += 5
            elif priority <= 2 and slot.energy_level <= 5:
                score += 3
            
            # 时间利用率（避免浪费）
            utilization = task_duration / slot.duration_minutes
            if 0.8 <= utilization <= 1.0:
                score += 8
            elif 0.6 <= utilization < 0.8:
                score += 5
            
            scored_slots.append((slot, score))
        
        # 返回得分最高的槽
        scored_slots.sort(key=lambda x: x[1], reverse=True)
        return scored_slots[0][0] if scored_slots else None

class ScheduleOptimizer:
    """日程优化器"""
    
    def __init__(self):
        self.slot_finder = TimeSlotFinder()
        
        # 域之间的切换成本（分钟）
        self.switch_cost = {
            ("academic", "income"): 10,
            ("academic", "growth"): 15,
            ("academic", "life"): 20,
            ("income", "growth"): 10,
            ("income", "life"): 15,
            ("growth", "life"): 10
        }
    
    async def find_free_slots(
        self,
        start_date: datetime,
        end_date: datetime,
        existing_tasks: List[Dict] = None
    ) -> List[Dict]:
        """
        查找日期范围内的空闲时间槽
        """
        all_slots = []
        current_date = start_date
        
        while current_date <= end_date:
            daily_slots = self.slot_finder.find_slots_for_date(current_date, existing_tasks)
            available_slots = [s for s in daily_slots if s.available]
            all_slots.extend([s.to_dict() for s in available_slots])
            current_date += timedelta(days=1)
        
        return all_slots
    
    def optimize_task_sequence(self, tasks: List[Dict]) -> List[Dict]:
        """
        优化任务序列以减少上下文切换
        """
        if len(tasks) <= 1:
            return tasks
        
        # 按域分组
        domain_groups = {}
        for task in tasks:
            domain = task.get("domain", "life")
            if domain not in domain_groups:
                domain_groups[domain] = []
            domain_groups[domain].append(task)
        
        # 在每个域内按优先级排序
        for domain in domain_groups:
            domain_groups[domain].sort(key=lambda x: x.get("priority", 3), reverse=True)
        
        # 构建优化的序列
        optimized = []
        domains_order = ["academic", "income", "growth", "life"]
        
        for domain in domains_order:
            if domain in domain_groups:
                optimized.extend(domain_groups[domain])
        
        return optimized
    
    def calculate_schedule_quality(self, schedule: List[Dict]) -> Dict:
        """
        计算日程质量指标
        """
        if not schedule:
            return {
                "quality_score": 0,
                "balance_score": 0,
                "efficiency_score": 0,
                "switch_cost_total": 0
            }
        
        # 计算域平衡度
        domain_times = {"academic": 0, "income": 0, "growth": 0, "life": 0}
        for item in schedule:
            domain = item.get("domain", "life")
            duration = item.get("duration_minutes", 0)
            domain_times[domain] += duration
        
        # 理想是每个域4小时（240分钟）
        target_minutes = 240
        balance_scores = []
        for domain, minutes in domain_times.items():
            if target_minutes > 0:
                deviation = abs(minutes - target_minutes) / target_minutes
                balance_scores.append(max(0, 1 - deviation))
        
        balance_score = np.mean(balance_scores) if balance_scores else 0
        
        # 计算切换成本
        switch_cost_total = 0
        for i in range(1, len(schedule)):
            prev_domain = schedule[i-1].get("domain", "life")
            curr_domain = schedule[i].get("domain", "life")
            if prev_domain != curr_domain:
                cost_key = tuple(sorted([prev_domain, curr_domain]))
                switch_cost_total += self.switch_cost.get(cost_key, 15)
        
        # 计算效率分数（切换成本越低越好）
        max_switches = len(schedule) - 1
        max_cost = max_switches * 20  # 假设最坏情况每次切换20分钟
        efficiency_score = max(0, 1 - switch_cost_total / max_cost) if max_cost > 0 else 1
        
        # 综合质量分数
        quality_score = (balance_score * 0.5 + efficiency_score * 0.5)
        
        return {
            "quality_score": round(quality_score, 2),
            "balance_score": round(balance_score, 2),
            "efficiency_score": round(efficiency_score, 2),
            "switch_cost_total": switch_cost_total,
            "domain_distribution": domain_times
        }
    
    def generate_time_blocks(self, date: datetime) -> List[Dict]:
        """
        生成当天的时间块分配
        """
        blocks = []
        
        # 睡眠块（22:00 - 6:00）
        sleep_start = date.replace(hour=22, minute=0, second=0) - timedelta(days=1)
        sleep_end = date.replace(hour=6, minute=0, second=0)
        blocks.append({
            "domain": "sleep",
            "start": sleep_start.isoformat(),
            "end": sleep_end.isoformat(),
            "hours": 8
        })
        
        # 学术块（6:00 - 10:00）
        blocks.append({
            "domain": "academic",
            "start": date.replace(hour=6, minute=0, second=0).isoformat(),
            "end": date.replace(hour=10, minute=0, second=0).isoformat(),
            "hours": 4
        })
        
        # 收入块（10:00 - 14:00）
        blocks.append({
            "domain": "income",
            "start": date.replace(hour=10, minute=0, second=0).isoformat(),
            "end": date.replace(hour=14, minute=0, second=0).isoformat(),
            "hours": 4
        })
        
        # 成长块（14:00 - 18:00）
        blocks.append({
            "domain": "growth",
            "start": date.replace(hour=14, minute=0, second=0).isoformat(),
            "end": date.replace(hour=18, minute=0, second=0).isoformat(),
            "hours": 4
        })
        
        # 生活块（18:00 - 22:00）
        blocks.append({
            "domain": "life",
            "start": date.replace(hour=18, minute=0, second=0).isoformat(),
            "end": date.replace(hour=22, minute=0, second=0).isoformat(),
            "hours": 4
        })
        
        return blocks