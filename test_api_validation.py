#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
import os

def validate_api_key(api_key):
    """验证 API 密钥格式"""
    if not api_key or api_key.strip() == "":
        return False, "API密钥不能为空"
    
    api_key = api_key.strip()
    
    # 检查是否还是占位符
    if api_key == "YOUR_API_KEY_HERE":
        return False, "请替换默认的API密钥占位符"
    
    # 检查基本格式（通常以 sk- 开头）
    if not api_key.startswith(('sk-', 'gsk_', 'API_')):
        return False, "API密钥格式可能不正确（通常以sk-、gsk_或API_开头）"
    
    # 检查长度（一般API密钥都比较长）
    if len(api_key) < 20:
        return False, "API密钥长度可能不正确"
    
    return True, "API密钥格式正确"

def test_current_agents():
    """测试当前 agents.json 中的 API 密钥"""
    try:
        with open('agents.json', 'r', encoding='utf-8') as f:
            agents = json.load(f)
        
        print("🔍 正在检查 agents.json 中的 API 密钥...")
        print("=" * 60)
        
        all_valid = True
        for i, agent in enumerate(agents, 1):
            name = agent.get('name', f'Agent {i}')
            api_key = agent.get('apiKeyVariableName', '')
            
            is_valid, message = validate_api_key(api_key)
            
            status = "✅ 有效" if is_valid else "❌ 无效"
            print(f"{i}. {name}")
            print(f"   状态: {status}")
            print(f"   密钥: {api_key[:20]}..." if len(api_key) > 20 else f"   密钥: {api_key}")
            print(f"   说明: {message}")
            print()
            
            if not is_valid:
                all_valid = False
        
        print("=" * 60)
        if all_valid:
            print("🎉 所有智能体的 API 密钥都是有效的！")
        else:
            print("⚠️  发现无效的 API 密钥，请检查并更新。")
        
        return all_valid
        
    except Exception as e:
        print(f"❌ 检查失败: {str(e)}")
        return False

def test_validation_function():
    """测试验证函数本身"""
    print("\n🧪 测试 API 密钥验证功能...")
    print("=" * 60)
    
    test_cases = [
        ("", "空字符串"),
        ("YOUR_API_KEY_HERE", "占位符"),
        ("sk-123", "太短的密钥"),
        ("invalid-key-format", "错误格式"),
        ("sk-T0nV0ou7yNLYfcVi4904572e5d354a40B968A0B53bEaFc8a", "有效密钥"),
        ("gsk_1234567890abcdefghijklmnopqrstuvwxyz", "Google API 密钥"),
        ("API_1234567890abcdefghijklmnopqrstuvwxyz", "其他格式 API 密钥")
    ]
    
    for api_key, description in test_cases:
        is_valid, message = validate_api_key(api_key)
        status = "✅ 有效" if is_valid else "❌ 无效"
        print(f"测试: {description}")
        print(f"密钥: {api_key}")
        print(f"结果: {status} - {message}")
        print()

if __name__ == "__main__":
    print("🔧 API 密钥验证工具")
    print("=" * 60)
    
    # 测试验证函数
    test_validation_function()
    
    # 测试当前文件
    if os.path.exists('agents.json'):
        test_current_agents()
    else:
        print("❌ 未找到 agents.json 文件") 