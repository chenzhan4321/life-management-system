# 数据管道和 macOS 集成设计

## 设计理念

基于 Palantir Pipeline Builder 的理念，构建一个智能的数据处理管道，无缝集成 macOS 原生应用，实现生活数据的自动收集、处理和分析。

### 核心组件

1. **数据收集器 (Collectors)**: 从各种源头收集数据
2. **数据转换器 (Transformers)**: 标准化和清洗数据
3. **数据处理器 (Processors)**: 实时处理和分析
4. **集成适配器 (Adapters)**: 与 macOS 系统集成

## Pipeline 架构设计

### 1. 数据收集层 (Data Collection Layer)

#### macOS 日历集成

```python
# backend/pipeline/collectors/macos_calendar.py
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import objc
from Foundation import NSBundle, NSString
from EventKit import EKEventStore, EKEntityTypeEvent, EKEventStoreAccessGranted

from ...ontology.models import TimeBlock, Task
from ...ontology.enums import TaskDomain, TimeBlockType
from ..transformers.normalizer import CalendarDataNormalizer

class MacOSCalendarCollector:
    """macOS 日历数据收集器"""
    
    def __init__(self):
        self.event_store = None
        self.normalizer = CalendarDataNormalizer()
        self.access_granted = False
        
    async def initialize(self) -> bool:
        """初始化日历访问权限"""
        try:
            self.event_store = EKEventStore.alloc().init()
            
            # 请求访问权限
            def completion_handler(granted, error):
                self.access_granted = granted
                if error:
                    print(f"日历访问权限请求失败: {error}")
            
            self.event_store.requestAccessToEntityType_completion_(
                EKEntityTypeEvent, completion_handler
            )
            
            # 等待权限响应
            await asyncio.sleep(1)
            return self.access_granted
            
        except Exception as e:
            print(f"日历初始化失败: {e}")
            return False
    
    async def collect_events(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict]:
        """收集指定时间范围的日历事件"""
        if not self.access_granted:
            await self.initialize()
            
        if not self.access_granted:
            return []
        
        try:
            # 创建时间范围谓词
            predicate = self.event_store.predicateForEventsWithStartDate_endDate_calendars_(
                start_date, end_date, None
            )
            
            # 获取事件
            events = self.event_store.eventsMatchingPredicate_(predicate)
            
            # 转换为标准格式
            collected_events = []
            for event in events:
                normalized_event = await self.normalizer.normalize_calendar_event(event)
                if normalized_event:
                    collected_events.append(normalized_event)
            
            return collected_events
            
        except Exception as e:
            print(f"日历事件收集失败: {e}")
            return []
    
    async def sync_events_to_timeblocks(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[TimeBlock]:
        """将日历事件同步为时间块"""
        events = await self.collect_events(start_date, end_date)
        time_blocks = []
        
        for event_data in events:
            # 创建时间块对象
            time_block = TimeBlock(
                title=event_data['title'],
                description=event_data.get('description', ''),
                start_time=event_data['start_time'],
                end_time=event_data['end_time'],
                location=event_data.get('location', ''),
                domain=self._infer_domain(event_data),
                block_type=self._infer_block_type(event_data),
                calendar_event_id=event_data['event_id'],
                status='planned'
            )
            
            time_blocks.append(time_block)
        
        return time_blocks
    
    def _infer_domain(self, event_data: Dict) -> str:
        """基于事件信息推断所属域"""
        title = event_data['title'].lower()
        description = event_data.get('description', '').lower()
        
        # 关键词匹配规则
        academic_keywords = ['学习', '课程', '讲座', '会议', '研究', 'study', 'class', 'lecture']
        income_keywords = ['工作', '项目', '客户', '会议', 'work', 'project', 'meeting', 'client']
        growth_keywords = ['锻炼', '运动', '学习', '培训', 'exercise', 'workout', 'training']
        life_keywords = ['约会', '聚餐', '家庭', '医院', 'dinner', 'family', 'doctor']
        
        text = f"{title} {description}"
        
        if any(keyword in text for keyword in academic_keywords):
            return TaskDomain.ACADEMIC.value
        elif any(keyword in text for keyword in income_keywords):
            return TaskDomain.INCOME.value
        elif any(keyword in text for keyword in growth_keywords):
            return TaskDomain.GROWTH.value
        elif any(keyword in text for keyword in life_keywords):
            return TaskDomain.LIFE.value
        else:
            return TaskDomain.LIFE.value  # 默认为生活域
    
    def _infer_block_type(self, event_data: Dict) -> str:
        """推断时间块类型"""
        title = event_data['title'].lower()
        
        if any(keyword in title for keyword in ['专注', 'focus', '工作', 'work']):
            return TimeBlockType.FOCUSED.value
        elif any(keyword in title for keyword in ['休息', 'break', '午餐', 'lunch']):
            return TimeBlockType.BREAK.value
        elif any(keyword in title for keyword in ['例行', 'routine', '日常']):
            return TimeBlockType.ROUTINE.value
        else:
            return TimeBlockType.FOCUSED.value

class MacOSRemindersCollector:
    """macOS 提醒事项收集器"""
    
    def __init__(self):
        self.event_store = None
        self.normalizer = ReminderDataNormalizer()
        self.access_granted = False
    
    async def initialize(self) -> bool:
        """初始化提醒事项访问权限"""
        try:
            from EventKit import EKEntityTypeReminder
            
            self.event_store = EKEventStore.alloc().init()
            
            def completion_handler(granted, error):
                self.access_granted = granted
                if error:
                    print(f"提醒事项访问权限请求失败: {error}")
            
            self.event_store.requestAccessToEntityType_completion_(
                EKEntityTypeReminder, completion_handler
            )
            
            await asyncio.sleep(1)
            return self.access_granted
            
        except Exception as e:
            print(f"提醒事项初始化失败: {e}")
            return False
    
    async def collect_reminders(
        self, 
        completed_since: Optional[datetime] = None
    ) -> List[Dict]:
        """收集提醒事项"""
        if not self.access_granted:
            await self.initialize()
            
        if not self.access_granted:
            return []
        
        try:
            # 获取所有日历
            calendars = self.event_store.calendarsForEntityType_(EKEntityTypeReminder)
            
            # 创建谓词
            if completed_since:
                predicate = self.event_store.predicateForCompletedRemindersWithCompletionDateStarting_ending_calendars_(
                    completed_since, datetime.now(), calendars
                )
            else:
                predicate = self.event_store.predicateForIncompleteRemindersWithDueDateStarting_ending_calendars_(
                    None, None, calendars
                )
            
            # 获取提醒事项
            reminders = []
            def completion_handler(reminder_list):
                reminders.extend(reminder_list or [])
            
            self.event_store.fetchRemindersMatchingPredicate_completion_(
                predicate, completion_handler
            )
            
            # 等待异步加载完成
            await asyncio.sleep(2)
            
            # 转换为标准格式
            collected_reminders = []
            for reminder in reminders:
                normalized_reminder = await self.normalizer.normalize_reminder(reminder)
                if normalized_reminder:
                    collected_reminders.append(normalized_reminder)
            
            return collected_reminders
            
        except Exception as e:
            print(f"提醒事项收集失败: {e}")
            return []
    
    async def sync_reminders_to_tasks(self) -> List[Task]:
        """将提醒事项同步为任务"""
        reminders = await self.collect_reminders()
        tasks = []
        
        for reminder_data in reminders:
            task = Task(
                title=reminder_data['title'],
                description=reminder_data.get('notes', ''),
                status='completed' if reminder_data['is_completed'] else 'pending',
                priority=self._infer_priority(reminder_data),
                domain=self._infer_domain(reminder_data),
                due_date=reminder_data.get('due_date'),
                completion_date=reminder_data.get('completion_date'),
                external_source='reminders',
                external_id=reminder_data['reminder_id']
            )
            
            tasks.append(task)
        
        return tasks
    
    def _infer_priority(self, reminder_data: Dict) -> int:
        """推断任务优先级"""
        priority_mapping = {
            0: 5,  # 无优先级 -> 未来
            1: 4,  # 低 -> 低
            5: 3,  # 中 -> 中  
            9: 2,  # 高 -> 高
        }
        
        reminder_priority = reminder_data.get('priority', 0)
        return priority_mapping.get(reminder_priority, 3)
    
    def _infer_domain(self, reminder_data: Dict) -> str:
        """推断任务所属域"""
        # 与日历收集器类似的逻辑
        return TaskDomain.LIFE.value  # 简化实现
```

#### macOS 通知集成

```python
# backend/integrations/notifications.py
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import objc
from Foundation import NSUserNotification, NSUserNotificationCenter, NSBundle

class MacOSNotificationManager:
    """macOS 通知管理器"""
    
    def __init__(self):
        self.notification_center = NSUserNotificationCenter.defaultUserNotificationCenter()
        
    async def send_notification(
        self,
        title: str,
        subtitle: str = "",
        informative_text: str = "",
        sound_name: str = "default",
        user_info: Optional[Dict] = None
    ) -> bool:
        """发送系统通知"""
        try:
            notification = NSUserNotification.alloc().init()
            notification.setTitle_(title)
            notification.setSubtitle_(subtitle)
            notification.setInformativeText_(informative_text)
            
            if sound_name == "default":
                notification.setSoundName_("NSUserNotificationDefaultSoundName")
            else:
                notification.setSoundName_(sound_name)
            
            if user_info:
                notification.setUserInfo_(user_info)
            
            # 设置交互按钮
            notification.setHasActionButton_(True)
            notification.setActionButtonTitle_("查看")
            
            self.notification_center.deliverNotification_(notification)
            return True
            
        except Exception as e:
            print(f"发送通知失败: {e}")
            return False
    
    async def send_task_reminder(self, task_data: Dict) -> bool:
        """发送任务提醒通知"""
        return await self.send_notification(
            title=f"任务提醒: {task_data['title']}",
            subtitle=f"优先级: {task_data.get('priority_label', '中')}",
            informative_text=task_data.get('description', ''),
            user_info={
                'type': 'task_reminder',
                'task_id': task_data['id']
            }
        )
    
    async def send_time_block_notification(self, time_block_data: Dict) -> bool:
        """发送时间块通知"""
        return await self.send_notification(
            title=f"时间块开始: {time_block_data['title']}",
            subtitle=f"域: {time_block_data.get('domain', '')}",
            informative_text=f"预计时长: {time_block_data.get('duration', 0)}分钟",
            user_info={
                'type': 'time_block_start',
                'time_block_id': time_block_data['id']
            }
        )

# macOS Shortcuts 集成
class MacOSShortcutsIntegration:
    """macOS Shortcuts 应用集成"""
    
    def __init__(self):
        pass
    
    async def create_quick_task_shortcut(self) -> bool:
        """创建快速添加任务的 Shortcuts"""
        try:
            # 这里需要使用 Shortcuts 的 URL Scheme 或者生成 .shortcut 文件
            shortcut_config = {
                "name": "快速添加生活任务",
                "actions": [
                    {
                        "type": "ask_input",
                        "prompt": "任务标题是什么？"
                    },
                    {
                        "type": "choose_from_menu",
                        "prompt": "选择任务域:",
                        "options": ["学术", "收入", "成长", "生活"]
                    },
                    {
                        "type": "http_request",
                        "method": "POST",
                        "url": "http://localhost:8000/api/v1/tasks",
                        "body": {
                            "title": "{{input_result}}",
                            "domain": "{{menu_result}}",
                            "priority": 3
                        }
                    }
                ]
            }
            
            # 实际实现需要调用 Shortcuts 的 API 或生成配置文件
            return True
            
        except Exception as e:
            print(f"创建 Shortcuts 失败: {e}")
            return False
```

### 2. 数据转换层 (Data Transformation Layer)

```python
# backend/pipeline/transformers/normalizer.py
import re
from datetime import datetime
from typing import Dict, Optional, List, Any
import spacy

class DataNormalizer:
    """数据标准化器基类"""
    
    def __init__(self):
        # 加载 NLP 模型（如果需要的话）
        try:
            self.nlp = spacy.load("zh_core_web_sm")
        except OSError:
            self.nlp = None
            print("未找到中文 NLP 模型，某些功能可能受限")
    
    def extract_keywords(self, text: str) -> List[str]:
        """从文本中提取关键词"""
        if not self.nlp:
            # 简单的关键词提取
            words = re.findall(r'\w+', text.lower())
            return [w for w in words if len(w) > 2]
        
        doc = self.nlp(text)
        keywords = []
        for token in doc:
            if token.pos_ in ['NOUN', 'ADJ', 'VERB'] and not token.is_stop:
                keywords.append(token.lemma_)
        
        return keywords
    
    def infer_duration(self, text: str) -> Optional[int]:
        """从文本中推断时长（分钟）"""
        # 匹配时长模式
        patterns = [
            r'(\d+)\s*小时',
            r'(\d+)\s*分钟',
            r'(\d+)\s*h',
            r'(\d+)\s*min',
            r'(\d+)\s*hours?',
            r'(\d+)\s*minutes?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                duration = int(match.group(1))
                if '小时' in pattern or 'h' in pattern or 'hour' in pattern:
                    return duration * 60
                else:
                    return duration
        
        return None

class CalendarDataNormalizer(DataNormalizer):
    """日历数据标准化器"""
    
    async def normalize_calendar_event(self, event) -> Optional[Dict]:
        """标准化日历事件数据"""
        try:
            normalized = {
                'event_id': str(event.eventIdentifier()),
                'title': str(event.title() or ''),
                'description': str(event.notes() or ''),
                'location': str(event.location() or ''),
                'start_time': event.startDate(),
                'end_time': event.endDate(),
                'is_all_day': bool(event.isAllDay()),
                'calendar_title': str(event.calendar().title() or ''),
                'keywords': self.extract_keywords(
                    f"{event.title() or ''} {event.notes() or ''}"
                )
            }
            
            # 推断额外信息
            duration = self.infer_duration(normalized['title'] + ' ' + normalized['description'])
            if duration:
                normalized['estimated_duration'] = duration
            
            return normalized
            
        except Exception as e:
            print(f"日历事件标准化失败: {e}")
            return None

class ReminderDataNormalizer(DataNormalizer):
    """提醒事项数据标准化器"""
    
    async def normalize_reminder(self, reminder) -> Optional[Dict]:
        """标准化提醒事项数据"""
        try:
            normalized = {
                'reminder_id': str(reminder.calendarItemIdentifier()),
                'title': str(reminder.title() or ''),
                'notes': str(reminder.notes() or ''),
                'is_completed': bool(reminder.isCompleted()),
                'priority': int(reminder.priority()) if reminder.priority() else 0,
                'due_date': reminder.dueDateComponents().date() if reminder.dueDateComponents() else None,
                'completion_date': reminder.completionDate() if reminder.completionDate() else None,
                'creation_date': reminder.creationDate() if reminder.creationDate() else None,
                'calendar_title': str(reminder.calendar().title() or ''),
                'keywords': self.extract_keywords(
                    f"{reminder.title() or ''} {reminder.notes() or ''}"
                )
            }
            
            return normalized
            
        except Exception as e:
            print(f"提醒事项标准化失败: {e}")
            return None

class TaskClassifier:
    """任务分类器"""
    
    def __init__(self):
        # 定义分类规则
        self.domain_rules = {
            'academic': {
                'keywords': ['学习', '研究', '论文', '课程', '考试', '阅读', 'study', 'research', 'paper'],
                'patterns': [r'学.*', r'研究.*', r'.*课程', r'.*论文']
            },
            'income': {
                'keywords': ['工作', '项目', '客户', '会议', '报告', '收入', 'work', 'project', 'client'],
                'patterns': [r'.*工作', r'.*项目', r'.*会议', r'.*客户']
            },
            'growth': {
                'keywords': ['锻炼', '运动', '健身', '技能', '培训', '学习', 'exercise', 'training'],
                'patterns': [r'.*锻炼', r'.*运动', r'.*健身', r'.*培训']
            },
            'life': {
                'keywords': ['家庭', '朋友', '购物', '医院', '家务', '娱乐', 'family', 'shopping'],
                'patterns': [r'.*家.*', r'.*买.*', r'.*购.*']
            }
        }
    
    def classify_task(self, title: str, description: str = '') -> str:
        """分类任务到对应的域"""
        text = f"{title} {description}".lower()
        
        scores = {}
        for domain, rules in self.domain_rules.items():
            score = 0
            
            # 关键词匹配
            for keyword in rules['keywords']:
                if keyword in text:
                    score += 1
            
            # 模式匹配
            for pattern in rules['patterns']:
                if re.search(pattern, text):
                    score += 2
            
            scores[domain] = score
        
        # 返回得分最高的域
        best_domain = max(scores, key=scores.get)
        return best_domain if scores[best_domain] > 0 else 'life'
```

### 3. 实时处理层 (Real-time Processing Layer)

```python
# backend/pipeline/processors/task_processor.py
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from ...database import get_db
from ...ontology.models import Task, TimeBlock
from ...foundry.storage.repository import TaskRepository, TimeBlockRepository
from ...ai.prioritizer import TaskPrioritizer
from ...integrations.notifications import MacOSNotificationManager

class TaskProcessor:
    """任务处理器 - 负责任务的实时处理和优化"""
    
    def __init__(self):
        self.prioritizer = TaskPrioritizer()
        self.notification_manager = MacOSNotificationManager()
        self.processing_queue = asyncio.Queue()
        self.is_processing = False
    
    async def start_background_processing(self):
        """启动后台处理任务"""
        if not self.is_processing:
            self.is_processing = True
            asyncio.create_task(self._background_processor())
    
    async def _background_processor(self):
        """后台处理循环"""
        while self.is_processing:
            try:
                # 处理队列中的任务
                if not self.processing_queue.empty():
                    task_event = await self.processing_queue.get()
                    await self._process_task_event(task_event)
                
                # 检查即将到期的任务
                await self._check_due_tasks()
                
                # 休眠一段时间
                await asyncio.sleep(60)  # 每分钟检查一次
                
            except Exception as e:
                print(f"后台处理错误: {e}")
                await asyncio.sleep(5)
    
    async def process_new_task(self, task: Task):
        """处理新创建的任务"""
        await self.processing_queue.put({
            'type': 'new_task',
            'task': task
        })
    
    async def process_task_update(self, old_task: Task, new_task: Task):
        """处理任务更新"""
        await self.processing_queue.put({
            'type': 'task_update',
            'old_task': old_task,
            'new_task': new_task
        })
    
    async def process_task_completion(self, task: Task):
        """处理任务完成"""
        await self.processing_queue.put({
            'type': 'task_completed',
            'task': task
        })
    
    async def _process_task_event(self, task_event: Dict):
        """处理单个任务事件"""
        event_type = task_event['type']
        
        if event_type == 'new_task':
            await self._handle_new_task(task_event['task'])
        elif event_type == 'task_update':
            await self._handle_task_update(task_event['old_task'], task_event['new_task'])
        elif event_type == 'task_completed':
            await self._handle_task_completion(task_event['task'])
    
    async def _handle_new_task(self, task: Task):
        """处理新任务"""
        # 计算AI优先级
        if task.ai_priority_score is None:
            priority_score = await self.prioritizer.calculate_priority(task)
            # 这里需要更新任务的AI优先级分数
        
        # 寻找相似任务
        similar_tasks = await self.prioritizer.find_similar_tasks(task, limit=5)
        if similar_tasks:
            # 更新相似任务信息
            pass
        
        # 如果是高优先级任务，发送通知
        if task.priority <= 2:  # 关键或高优先级
            await self.notification_manager.send_task_reminder({
                'id': task.id,
                'title': task.title,
                'description': task.description,
                'priority_label': self._get_priority_label(task.priority)
            })
    
    async def _handle_task_completion(self, task: Task):
        """处理任务完成"""
        # 更新相关项目进度
        if task.project_id:
            # 计算项目完成进度
            pass
        
        # 记录生产力统计
        if task.actual_duration and task.estimated_duration:
            accuracy = abs(task.actual_duration - task.estimated_duration) / task.estimated_duration
            # 记录预估准确度
        
        # 发送完成通知
        await self.notification_manager.send_notification(
            title=f"任务完成: {task.title}",
            subtitle=f"用时: {task.actual_duration or '未知'}分钟",
            informative_text="恭喜！又完成了一个任务",
            user_info={'type': 'task_completed', 'task_id': task.id}
        )
    
    async def _check_due_tasks(self):
        """检查即将到期的任务"""
        try:
            # 获取即将到期的任务（24小时内）
            due_soon = datetime.now() + timedelta(hours=24)
            
            # 这里需要查询数据库获取即将到期的任务
            # 然后发送提醒通知
            
        except Exception as e:
            print(f"检查到期任务失败: {e}")
    
    def _get_priority_label(self, priority: int) -> str:
        """获取优先级标签"""
        labels = {1: '关键', 2: '高', 3: '中', 4: '低', 5: '未来'}
        return labels.get(priority, '未知')

class ScheduleProcessor:
    """日程处理器"""
    
    def __init__(self):
        self.notification_manager = MacOSNotificationManager()
    
    async def process_time_block_start(self, time_block: TimeBlock):
        """处理时间块开始"""
        # 发送开始通知
        await self.notification_manager.send_time_block_notification({
            'id': time_block.id,
            'title': time_block.title,
            'domain': time_block.domain,
            'duration': time_block.duration
        })
        
        # 如果有关联任务，更新任务状态
        if time_block.linked_task_id:
            # 将关联任务状态设为进行中
            pass
    
    async def process_time_block_end(self, time_block: TimeBlock):
        """处理时间块结束"""
        # 询问生产力评分
        await self.notification_manager.send_notification(
            title=f"时间块结束: {time_block.title}",
            subtitle="请为这个时间段的生产力打分",
            informative_text="1-5分，5分为最高",
            user_info={
                'type': 'productivity_rating',
                'time_block_id': time_block.id
            }
        )
```

### 4. 同步协调器

```python
# backend/pipeline/sync_coordinator.py
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict

from .collectors.macos_calendar import MacOSCalendarCollector
from .collectors.macos_reminders import MacOSRemindersCollector
from ..foundry.storage.repository import TaskRepository, TimeBlockRepository

class SyncCoordinator:
    """同步协调器 - 统一管理所有数据源的同步"""
    
    def __init__(self):
        self.calendar_collector = MacOSCalendarCollector()
        self.reminders_collector = MacOSRemindersCollector()
        self.last_sync_times = {}
        self.sync_intervals = {
            'calendar': 300,    # 5分钟
            'reminders': 600,   # 10分钟
        }
    
    async def start_auto_sync(self):
        """启动自动同步"""
        # 启动各种同步任务
        tasks = [
            asyncio.create_task(self._calendar_sync_loop()),
            asyncio.create_task(self._reminders_sync_loop()),
            asyncio.create_task(self._health_check_loop())
        ]
        
        await asyncio.gather(*tasks)
    
    async def _calendar_sync_loop(self):
        """日历同步循环"""
        while True:
            try:
                await self.sync_calendar_data()
                await asyncio.sleep(self.sync_intervals['calendar'])
            except Exception as e:
                print(f"日历同步错误: {e}")
                await asyncio.sleep(60)
    
    async def _reminders_sync_loop(self):
        """提醒事项同步循环"""
        while True:
            try:
                await self.sync_reminders_data()
                await asyncio.sleep(self.sync_intervals['reminders'])
            except Exception as e:
                print(f"提醒事项同步错误: {e}")
                await asyncio.sleep(60)
    
    async def sync_calendar_data(self):
        """同步日历数据"""
        try:
            # 获取未来7天的日历事件
            start_date = datetime.now()
            end_date = start_date + timedelta(days=7)
            
            time_blocks = await self.calendar_collector.sync_events_to_timeblocks(
                start_date, end_date
            )
            
            # 保存到数据库
            # 这里需要实现数据库保存逻辑
            
            self.last_sync_times['calendar'] = datetime.now()
            print(f"日历同步完成，同步了 {len(time_blocks)} 个事件")
            
        except Exception as e:
            print(f"日历同步失败: {e}")
    
    async def sync_reminders_data(self):
        """同步提醒事项数据"""
        try:
            tasks = await self.reminders_collector.sync_reminders_to_tasks()
            
            # 保存到数据库
            # 这里需要实现数据库保存逻辑
            
            self.last_sync_times['reminders'] = datetime.now()
            print(f"提醒事项同步完成，同步了 {len(tasks)} 个任务")
            
        except Exception as e:
            print(f"提醒事项同步失败: {e}")
    
    async def _health_check_loop(self):
        """健康检查循环"""
        while True:
            try:
                await self._check_sync_health()
                await asyncio.sleep(3600)  # 每小时检查一次
            except Exception as e:
                print(f"健康检查错误: {e}")
                await asyncio.sleep(300)
    
    async def _check_sync_health(self):
        """检查同步健康状态"""
        now = datetime.now()
        
        for service, last_sync in self.last_sync_times.items():
            if last_sync:
                time_since_sync = (now - last_sync).total_seconds()
                max_interval = self.sync_intervals[service] * 3  # 允许3倍的延迟
                
                if time_since_sync > max_interval:
                    print(f"警告: {service} 同步延迟 {time_since_sync/60:.1f} 分钟")
```

## macOS 集成特性

### 1. 权限管理

```python
# backend/integrations/permissions.py
import asyncio
from typing import Dict, List, Optional

class MacOSPermissionManager:
    """macOS 权限管理器"""
    
    def __init__(self):
        self.permission_status = {}
    
    async def request_all_permissions(self) -> Dict[str, bool]:
        """请求所有需要的权限"""
        permissions = {
            'calendar': await self._request_calendar_permission(),
            'reminders': await self._request_reminders_permission(),
            'notifications': await self._request_notification_permission(),
        }
        
        self.permission_status.update(permissions)
        return permissions
    
    async def _request_calendar_permission(self) -> bool:
        """请求日历权限"""
        try:
            from EventKit import EKEventStore, EKEntityTypeEvent
            
            event_store = EKEventStore.alloc().init()
            granted = await self._request_permission_async(
                event_store, EKEntityTypeEvent
            )
            return granted
            
        except Exception as e:
            print(f"请求日历权限失败: {e}")
            return False
    
    async def _request_reminders_permission(self) -> bool:
        """请求提醒事项权限"""
        try:
            from EventKit import EKEventStore, EKEntityTypeReminder
            
            event_store = EKEventStore.alloc().init()
            granted = await self._request_permission_async(
                event_store, EKEntityTypeReminder
            )
            return granted
            
        except Exception as e:
            print(f"请求提醒事项权限失败: {e}")
            return False
    
    async def _request_notification_permission(self) -> bool:
        """请求通知权限"""
        try:
            from Foundation import NSUserNotificationCenter
            
            center = NSUserNotificationCenter.defaultUserNotificationCenter()
            # 通知权限通常是自动授予的
            return True
            
        except Exception as e:
            print(f"请求通知权限失败: {e}")
            return False
    
    async def _request_permission_async(self, event_store, entity_type) -> bool:
        """异步请求权限"""
        result = {'granted': False}
        
        def completion_handler(granted, error):
            result['granted'] = granted
            
        event_store.requestAccessToEntityType_completion_(
            entity_type, completion_handler
        )
        
        # 等待权限响应
        for _ in range(50):  # 最多等待5秒
            await asyncio.sleep(0.1)
            if 'granted' in result:
                return result['granted']
        
        return False
```

### 2. 系统集成优化

```python
# backend/integrations/system_optimization.py
import os
import psutil
from typing import Dict, Optional

class MacOSSystemOptimizer:
    """macOS 系统优化器"""
    
    def __init__(self):
        self.system_info = self._get_system_info()
    
    def _get_system_info(self) -> Dict:
        """获取系统信息"""
        return {
            'cpu_count': psutil.cpu_count(),
            'memory_total': psutil.virtual_memory().total,
            'disk_usage': psutil.disk_usage('/').percent,
            'is_apple_silicon': self._is_apple_silicon()
        }
    
    def _is_apple_silicon(self) -> bool:
        """检查是否为 Apple Silicon Mac"""
        try:
            import platform
            return platform.processor() == 'arm'
        except:
            return False
    
    async def optimize_for_macos(self):
        """针对 macOS 进行优化"""
        optimizations = []
        
        # Apple Silicon 优化
        if self.system_info['is_apple_silicon']:
            optimizations.extend(await self._apple_silicon_optimizations())
        
        # 内存优化
        if self.system_info['memory_total'] < 8 * 1024**3:  # 小于8GB
            optimizations.extend(await self._low_memory_optimizations())
        
        # 磁盘空间优化
        if self.system_info['disk_usage'] > 80:
            optimizations.extend(await self._disk_space_optimizations())
        
        return optimizations
    
    async def _apple_silicon_optimizations(self) -> list:
        """Apple Silicon 特定优化"""
        return [
            "启用原生 ARM64 优化",
            "使用 Metal Performance Shaders 加速",
            "优化内存分配策略"
        ]
    
    async def _low_memory_optimizations(self) -> list:
        """低内存优化"""
        return [
            "减少缓存大小",
            "启用数据压缩",
            "优化后台任务频率"
        ]
    
    async def _disk_space_optimizations(self) -> list:
        """磁盘空间优化"""
        return [
            "清理临时文件",
            "压缩日志文件",
            "优化数据库文件大小"
        ]
```

这个数据管道和 macOS 集成设计提供了：

1. **无缝数据收集**: 自动从 macOS 原生应用收集数据
2. **智能数据处理**: 基于 AI 的数据分类和优化
3. **实时同步**: 持续的数据同步和更新
4. **原生集成**: 深度利用 macOS 系统功能
5. **权限管理**: 安全的权限请求和管理
6. **性能优化**: 针对不同 Mac 硬件的优化
7. **用户体验**: 通过通知和 Shortcuts 提升使用体验

这个设计确保了系统能够充分利用 macOS 生态系统的优势，同时保持高效和可靠的数据处理能力。