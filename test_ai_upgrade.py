#!/usr/bin/env python3
"""
测试AI升级效果 - 对比新旧分类方法
"""
import os
import sys
import asyncio
from typing import List, Dict
import json

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置环境变量
os.environ.setdefault("DEEPSEEK_API_KEY", "test_key")

class AIUpgradeTest:
    """AI升级效果测试"""
    
    def __init__(self):
        self.test_tasks = [
            # 学术域测试用例
            "写深度学习论文的相关章节",
            "阅读最新的机器学习文献综述",
            "准备明天的数据结构考试",
            "完成Python编程作业",
            "参加学术会议并做报告",
            
            # 收入域测试用例
            "开会讨论项目进度",
            "与客户确认需求细节",
            "完成月度工作总结报告",
            "处理邮件和消息回复",
            "制定下季度业务计划",
            
            # 成长域测试用例
            "去健身房锻炼1小时",
            "学习新的编程框架Vue.js",
            "练习英语口语30分钟",
            "阅读《原则》这本书",
            "参加线上职业发展讲座",
            
            # 生活域测试用例
            "去超市购买生活用品",
            "打扫房间和整理衣服",
            "和朋友约饭聚餐",
            "预约牙医检查",
            "看电影放松一下",
            
            # 边界模糊测试用例
            "学习如何做投资理财",  # growth vs income
            "阅读工作相关的技术书籍",  # academic vs income
            "和同事一起健身",  # growth vs life
            "在家办公处理文档"  # income vs life
        ]
        
        self.expected_domains = {
            "写深度学习论文的相关章节": "academic",
            "阅读最新的机器学习文献综述": "academic", 
            "准备明天的数据结构考试": "academic",
            "完成Python编程作业": "academic",
            "参加学术会议并做报告": "academic",
            
            "开会讨论项目进度": "income",
            "与客户确认需求细节": "income",
            "完成月度工作总结报告": "income",
            "处理邮件和消息回复": "income",
            "制定下季度业务计划": "income",
            
            "去健身房锻炼1小时": "growth",
            "学习新的编程框架Vue.js": "growth",
            "练习英语口语30分钟": "growth",
            "阅读《原则》这本书": "growth",
            "参加线上职业发展讲座": "growth",
            
            "去超市购买生活用品": "life",
            "打扫房间和整理衣服": "life",
            "和朋友约饭聚餐": "life", 
            "预约牙医检查": "life",
            "看电影放松一下": "life",
        }
    
    async def test_old_vs_new(self):
        """对比新旧分类方法的效果"""
        print("🚀 开始AI升级效果测试")
        print("=" * 60)
        
        # 导入AI模块
        try:
            from src.ai.deepseek_agent import DeepSeekAgent
            agent = DeepSeekAgent()
            print("✅ AI代理初始化成功")
            
            # 检查语义编码器状态
            if agent.semantic_encoder:
                model_info = agent.semantic_encoder.get_model_info()
                print(f"📊 语义编码器状态: {model_info}")
            else:
                print("⚠️  语义编码器未加载，将使用回退方案")
                
        except Exception as e:
            print(f"❌ AI代理初始化失败: {e}")
            return
        
        # 测试结果统计
        results = {
            'total': len(self.test_tasks),
            'correct': 0,
            'by_method': {'semantic': 0, 'llm': 0, 'keyword': 0, 'semantic+llm': 0},
            'by_domain': {'academic': 0, 'income': 0, 'growth': 0, 'life': 0},
            'confidence_avg': 0.0,
            'detailed_results': []
        }
        
        print(f"\n🧪 测试 {results['total']} 个任务...")
        print("-" * 60)
        
        for i, task in enumerate(self.test_tasks, 1):
            try:
                # 执行分类
                result = await agent.classify_task(task)
                
                # 获取期望结果
                expected = self.expected_domains.get(task, "unknown")
                is_correct = result['domain'] == expected
                
                # 统计结果
                if is_correct:
                    results['correct'] += 1
                
                method = result.get('method', 'unknown')
                results['by_method'][method] = results['by_method'].get(method, 0) + 1
                results['by_domain'][result['domain']] += 1
                results['confidence_avg'] += result['confidence']
                
                # 详细记录
                results['detailed_results'].append({
                    'task': task,
                    'predicted': result['domain'],
                    'expected': expected,
                    'correct': is_correct,
                    'confidence': result['confidence'],
                    'method': method,
                    'reasoning': result['reasoning']
                })
                
                # 输出测试结果
                status = "✅" if is_correct else "❌"
                print(f"{status} [{i:2d}] {task}")
                print(f"    预测: {result['domain']} | 期望: {expected} | 置信度: {result['confidence']:.2f} | 方法: {method}")
                print(f"    理由: {result['reasoning']}")
                print()
                
                # 避免API调用过快
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"❌ 任务 '{task}' 测试失败: {e}")
                continue
        
        # 计算平均置信度
        if results['total'] > 0:
            results['confidence_avg'] = results['confidence_avg'] / results['total']
        
        # 输出总结报告
        self.print_summary_report(results)
        
        # 保存测试结果
        self.save_test_results(results)
    
    def print_summary_report(self, results: Dict):
        """打印总结报告"""
        print("=" * 60)
        print("📊 测试总结报告")
        print("=" * 60)
        
        # 准确率统计
        accuracy = results['correct'] / results['total'] * 100 if results['total'] > 0 else 0
        print(f"🎯 总体准确率: {results['correct']}/{results['total']} ({accuracy:.1f}%)")
        print(f"🤖 平均置信度: {results['confidence_avg']:.2f}")
        print()
        
        # 方法统计
        print("📈 分类方法分布:")
        for method, count in results['by_method'].items():
            if count > 0:
                percentage = count / results['total'] * 100
                print(f"  {method:15}: {count:2d} ({percentage:4.1f}%)")
        print()
        
        # 域分布统计
        print("🏷️  预测域分布:")
        for domain, count in results['by_domain'].items():
            if count > 0:
                percentage = count / results['total'] * 100
                print(f"  {domain:10}: {count:2d} ({percentage:4.1f}%)")
        print()
        
        # 错误分析
        wrong_cases = [r for r in results['detailed_results'] if not r['correct']]
        if wrong_cases:
            print(f"❌ 错误案例分析 ({len(wrong_cases)} 个):")
            for case in wrong_cases:
                print(f"  任务: {case['task']}")
                print(f"  预测: {case['predicted']} | 期望: {case['expected']} | 置信度: {case['confidence']:.2f}")
                print(f"  方法: {case['method']} | 理由: {case['reasoning']}")
                print()
    
    def save_test_results(self, results: Dict):
        """保存测试结果"""
        try:
            # 确保目录存在
            os.makedirs("data/test_results", exist_ok=True)
            
            # 保存详细结果
            with open("data/test_results/ai_upgrade_test.json", 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            print(f"💾 测试结果已保存到 data/test_results/ai_upgrade_test.json")
            
        except Exception as e:
            print(f"❌ 保存测试结果失败: {e}")

async def main():
    """主测试函数"""
    test = AIUpgradeTest()
    await test.test_old_vs_new()

if __name__ == "__main__":
    asyncio.run(main())