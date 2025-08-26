"""
任务语义编码器 - 基于预训练模型的语义理解
"""
import os
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
import json
import pickle
from datetime import datetime

logger = logging.getLogger(__name__)

class TaskSemanticEncoder:
    """任务语义编码器 - 使用预训练模型进行语义理解"""
    
    def __init__(self, model_name: str = "shibing624/text2vec-base-chinese"):
        """
        初始化语义编码器 - 使用中文优化的模型
        
        可选模型：
        - "shibing624/text2vec-base-chinese": 中文专用，效果最佳
        - "paraphrase-multilingual-MiniLM-L12-v2": 多语言通用
        - "distiluse-base-multilingual-cased": 大模型，效果好但较慢
        
        Args:
            model_name: 预训练模型名称，默认使用中文优化模型
        """
        self.model_name = model_name
        self.model = None
        self.domain_embeddings = {}  # 存储各域的典型任务嵌入
        self.user_task_history = []  # 用户任务历史
        self.model_cache_dir = "data/models"
        
        self._ensure_model_cache_dir()
        self._load_model()
        self._initialize_domain_templates()
    
    def _ensure_model_cache_dir(self):
        """确保模型缓存目录存在"""
        os.makedirs(self.model_cache_dir, exist_ok=True)
    
    def _load_model(self):
        """加载预训练模型"""
        try:
            logger.info(f"加载语义编码模型: {self.model_name}")
            
            # 设置缓存目录
            cache_folder = os.path.join(self.model_cache_dir, "sentence_transformers")
            
            self.model = SentenceTransformer(
                self.model_name, 
                cache_folder=cache_folder
            )
            logger.info("语义编码模型加载成功")
            
        except Exception as e:
            logger.error(f"加载语义编码模型失败: {e}")
            logger.info("将使用降级模式")
            self.model = None
    
    def _initialize_domain_templates(self):
        """初始化各时间域的典型任务模板"""
        domain_templates = {
            "academic": [
                "写论文", "阅读文献", "做研究", "准备考试", "学习课程",
                "参加学术会议", "写代码", "数据分析", "实验设计", "文献综述"
            ],
            "income": [
                "工作会议", "项目开发", "客户沟通", "报告撰写", "任务分配",
                "业务洽谈", "财务处理", "团队协作", "产品设计", "市场调研"
            ],
            "growth": [
                "健身锻炼", "学习新技能", "阅读书籍", "冥想练习", "语言学习",
                "职业规划", "个人反思", "兴趣爱好", "社交活动", "能力提升"
            ],
            "life": [
                "购买日用品", "打扫卫生", "做饭", "洗衣服", "缴费",
                "约医生", "家庭时光", "休闲娱乐", "旅行计划", "维修保养"
            ]
        }
        
        # 为每个域生成嵌入向量
        if self.model:
            for domain, templates in domain_templates.items():
                embeddings = self.model.encode(templates)
                # 计算平均嵌入作为该域的原型
                domain_prototype = np.mean(embeddings, axis=0)
                self.domain_embeddings[domain] = {
                    'prototype': domain_prototype,
                    'examples': templates,
                    'example_embeddings': embeddings
                }
        
        logger.info("时间域模板初始化完成")
    
    def encode_task(self, task_text: str) -> np.ndarray:
        """
        将任务文本编码为语义向量
        
        Args:
            task_text: 任务描述文本
            
        Returns:
            numpy.ndarray: 语义向量
        """
        if not self.model:
            # 降级模式：返回简单特征向量
            return self._fallback_encoding(task_text)
        
        try:
            # 预处理文本
            cleaned_text = self._preprocess_text(task_text)
            
            # 生成嵌入向量
            embedding = self.model.encode(cleaned_text)
            
            return embedding
            
        except Exception as e:
            logger.error(f"任务编码失败: {e}")
            return self._fallback_encoding(task_text)
    
    def _preprocess_text(self, text: str) -> str:
        """预处理任务文本"""
        # 去除多余空格
        text = " ".join(text.split())
        
        # 如果文本过短，尝试扩展上下文
        if len(text) < 10:
            # 可以在这里添加上下文扩展逻辑
            pass
        
        return text
    
    def _fallback_encoding(self, task_text: str) -> np.ndarray:
        """降级编码方案 - 简单特征工程"""
        features = []
        
        # 文本长度特征
        features.append(len(task_text) / 100)  # 归一化
        features.append(len(task_text.split()) / 20)  # 词数归一化
        
        # 关键词特征 - 简单的 one-hot 编码
        academic_keywords = ["学", "研究", "论文", "阅读", "考试", "课程"]
        income_keywords = ["工作", "项目", "会议", "客户", "报告", "任务"]
        growth_keywords = ["健身", "学习", "技能", "阅读", "锻炼", "提升"]
        life_keywords = ["购买", "打扫", "做饭", "缴费", "家庭", "娱乐"]
        
        all_keywords = [academic_keywords, income_keywords, growth_keywords, life_keywords]
        
        for keywords in all_keywords:
            score = sum(1 for kw in keywords if kw in task_text) / len(keywords)
            features.append(score)
        
        # 填充到固定长度（模拟embedding维度）
        while len(features) < 384:  # 常见的embedding维度
            features.append(0.0)
        
        return np.array(features[:384])
    
    def classify_task_semantic(self, task_text: str, user_history: List[Dict] = None) -> Dict:
        """
        基于语义相似度分类任务
        
        Args:
            task_text: 任务描述
            user_history: 用户历史任务数据 [{'title': str, 'domain': str, 'feedback': bool}]
            
        Returns:
            Dict: {
                'domain': str,
                'confidence': float,
                'reasoning': str,
                'similar_tasks': List[str]
            }
        """
        # 编码当前任务
        task_embedding = self.encode_task(task_text)
        
        # 如果有用户历史，优先使用个人化分类
        if user_history and len(user_history) > 5:
            return self._personalized_classification(task_embedding, task_text, user_history)
        
        # 否则使用域原型分类
        return self._prototype_classification(task_embedding, task_text)
    
    def _prototype_classification(self, task_embedding: np.ndarray, task_text: str) -> Dict:
        """基于域原型的分类"""
        if not self.domain_embeddings:
            # 回退到关键词分类
            return self._keyword_classification(task_text)
        
        similarities = {}
        similar_examples = {}
        
        for domain, domain_data in self.domain_embeddings.items():
            # 与域原型的相似度
            prototype_sim = cosine_similarity([task_embedding], [domain_data['prototype']])[0][0]
            
            # 与域内示例的最大相似度
            example_sims = cosine_similarity([task_embedding], domain_data['example_embeddings'])[0]
            max_example_sim = np.max(example_sims)
            best_example_idx = np.argmax(example_sims)
            
            # 综合相似度（加权平均）
            combined_sim = 0.6 * prototype_sim + 0.4 * max_example_sim
            similarities[domain] = combined_sim
            
            similar_examples[domain] = domain_data['examples'][best_example_idx]
        
        # 选择最佳域
        best_domain = max(similarities, key=similarities.get)
        confidence = similarities[best_domain]
        
        # 生成推理说明
        reasoning = f"与'{similar_examples[best_domain]}'相似度最高"
        
        return {
            'domain': best_domain,
            'confidence': confidence,
            'reasoning': reasoning,
            'similar_tasks': [similar_examples[best_domain]],
            'all_similarities': similarities
        }
    
    def _personalized_classification(self, task_embedding: np.ndarray, task_text: str, 
                                   user_history: List[Dict]) -> Dict:
        """基于用户历史的个性化分类"""
        # 计算与历史任务的相似度
        history_similarities = []
        history_embeddings = []
        
        for hist_task in user_history[-50]:  # 只考虑最近50个任务
            hist_embedding = self.encode_task(hist_task['title'])
            similarity = cosine_similarity([task_embedding], [hist_embedding])[0][0]
            
            history_similarities.append({
                'similarity': similarity,
                'domain': hist_task['domain'],
                'title': hist_task['title'],
                'feedback_correct': hist_task.get('feedback', True)
            })
            
            history_embeddings.append(hist_embedding)
        
        # 按相似度排序
        history_similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # 加权投票（相似度越高权重越大，用户反馈正确的权重更大）
        domain_votes = {}
        top_similar_tasks = []
        
        for i, hist in enumerate(history_similarities[:10]):  # 考虑前10个最相似的
            domain = hist['domain']
            weight = hist['similarity'] * (1.2 if hist['feedback_correct'] else 0.8)  # 反馈权重
            weight *= (1.0 - i * 0.1)  # 排名权重衰减
            
            domain_votes[domain] = domain_votes.get(domain, 0) + weight
            
            if i < 3:
                top_similar_tasks.append(hist['title'])
        
        # 选择得票最高的域
        if domain_votes:
            best_domain = max(domain_votes, key=domain_votes.get)
            confidence = domain_votes[best_domain] / sum(domain_votes.values())
        else:
            # 回退到原型分类
            return self._prototype_classification(task_embedding, task_text)
        
        return {
            'domain': best_domain,
            'confidence': confidence,
            'reasoning': f"基于个人历史，与 {len(top_similar_tasks)} 个相似任务匹配",
            'similar_tasks': top_similar_tasks,
            'personalized': True
        }
    
    def _keyword_classification(self, task_text: str) -> Dict:
        """关键词回退分类"""
        domain_keywords = {
            "academic": ["学", "研究", "论文", "阅读", "考试", "课程", "学习", "study"],
            "income": ["工作", "项目", "会议", "客户", "报告", "任务", "work", "meeting"],
            "growth": ["健身", "锻炼", "技能", "提升", "学习", "阅读", "growth", "exercise"],
            "life": ["购买", "打扫", "做饭", "缴费", "家庭", "娱乐", "shopping", "clean"]
        }
        
        scores = {}
        matched_keywords = {}
        
        for domain, keywords in domain_keywords.items():
            score = 0
            matches = []
            for keyword in keywords:
                if keyword.lower() in task_text.lower():
                    score += 1
                    matches.append(keyword)
            
            scores[domain] = score / len(keywords)
            matched_keywords[domain] = matches
        
        best_domain = max(scores, key=scores.get)
        confidence = scores[best_domain]
        
        if confidence == 0:
            best_domain = "life"  # 默认域
            confidence = 0.3
        
        return {
            'domain': best_domain,
            'confidence': confidence,
            'reasoning': f"匹配关键词: {', '.join(matched_keywords[best_domain])}",
            'similar_tasks': [],
            'fallback_method': 'keyword'
        }
    
    def find_similar_tasks(self, task_text: str, user_history: List[Dict], 
                          top_k: int = 5) -> List[Dict]:
        """找到相似的历史任务"""
        if not user_history:
            return []
        
        task_embedding = self.encode_task(task_text)
        similarities = []
        
        for hist_task in user_history:
            hist_embedding = self.encode_task(hist_task['title'])
            similarity = cosine_similarity([task_embedding], [hist_embedding])[0][0]
            
            similarities.append({
                'task': hist_task,
                'similarity': similarity
            })
        
        # 排序并返回前k个
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        return [item['task'] for item in similarities[:top_k]]
    
    def add_user_feedback(self, task_text: str, predicted_domain: str, 
                         actual_domain: str, user_corrected: bool):
        """添加用户反馈，用于改进分类"""
        feedback_data = {
            'task_text': task_text,
            'predicted_domain': predicted_domain,
            'actual_domain': actual_domain,
            'user_corrected': user_corrected,
            'timestamp': datetime.now().isoformat(),
            'embedding': self.encode_task(task_text).tolist()  # 转换为list以便序列化
        }
        
        self.user_task_history.append(feedback_data)
        
        # 如果历史记录太多，只保留最近的500个
        if len(self.user_task_history) > 500:
            self.user_task_history = self.user_task_history[-500:]
        
        # 定期保存反馈数据
        self._save_feedback_data()
    
    def _save_feedback_data(self):
        """保存用户反馈数据"""
        try:
            feedback_file = os.path.join(self.model_cache_dir, "user_feedback.json")
            with open(feedback_file, 'w', encoding='utf-8') as f:
                json.dump(self.user_task_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存反馈数据失败: {e}")
    
    def _load_feedback_data(self):
        """加载用户反馈数据"""
        try:
            feedback_file = os.path.join(self.model_cache_dir, "user_feedback.json")
            if os.path.exists(feedback_file):
                with open(feedback_file, 'r', encoding='utf-8') as f:
                    self.user_task_history = json.load(f)
                logger.info(f"加载了 {len(self.user_task_history)} 条用户反馈记录")
        except Exception as e:
            logger.error(f"加载反馈数据失败: {e}")
    
    def get_model_info(self) -> Dict:
        """获取模型信息"""
        return {
            'model_name': self.model_name,
            'model_loaded': self.model is not None,
            'domain_count': len(self.domain_embeddings),
            'feedback_count': len(self.user_task_history),
            'cache_dir': self.model_cache_dir
        }