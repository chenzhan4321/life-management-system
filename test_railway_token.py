#!/usr/bin/env python3
"""
Railway Token 验证脚本
用于测试提供的Railway token是否有效
"""

import requests
import json
import sys

def test_railway_token(token):
    """测试Railway token是否有效"""
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Token-Test'
    }
    
    # Railway GraphQL API端点
    url = 'https://backboard.railway.app/graphql/v2'
    
    # 简单的查询来测试token
    query = {
        "query": """
        query {
            me {
                id
                name
                email
            }
        }
        """
    }
    
    try:
        print("🔍 Testing Railway token...")
        print(f"Token (first 10 chars): {token[:10]}...")
        print()
        
        response = requests.post(url, json=query, headers=headers, timeout=10)
        
        print(f"HTTP Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'errors' in data:
                print("❌ Token Invalid - Authentication failed")
                print("Error details:", data['errors'])
                return False
            elif 'data' in data and data['data']['me']:
                user_info = data['data']['me']
                print("✅ Token Valid!")
                print(f"👤 User: {user_info.get('name', 'N/A')}")
                print(f"📧 Email: {user_info.get('email', 'N/A')}")
                print(f"🆔 ID: {user_info.get('id', 'N/A')}")
                
                # 尝试获取项目列表
                projects_query = {
                    "query": """
                    query {
                        projects {
                            edges {
                                node {
                                    id
                                    name
                                    description
                                }
                            }
                        }
                    }
                    """
                }
                
                print("\n🗂️ Fetching projects...")
                projects_response = requests.post(url, json=projects_query, headers=headers, timeout=10)
                
                if projects_response.status_code == 200:
                    projects_data = projects_response.json()
                    if 'data' in projects_data and projects_data['data']['projects']:
                        projects = projects_data['data']['projects']['edges']
                        print(f"📊 Found {len(projects)} projects:")
                        for project in projects[:5]:  # 只显示前5个
                            node = project['node']
                            print(f"  • {node['name']} (ID: {node['id']})")
                    else:
                        print("📊 No projects found or unable to fetch projects")
                        
                return True
            else:
                print("❌ Token Invalid - No user data returned")
                return False
                
        elif response.status_code == 401:
            print("❌ Token Invalid - 401 Unauthorized")
            return False
        elif response.status_code == 403:
            print("❌ Token Invalid - 403 Forbidden (insufficient permissions)")
            return False
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print("Response:", response.text)
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

def main():
    # 你提供的token
    test_token = "ef894814-f4f3-443c-b1b4-a6e90c327c57"
    
    print("=" * 50)
    print("Railway Token Validation Test")
    print("=" * 50)
    
    is_valid = test_railway_token(test_token)
    
    print("\n" + "=" * 50)
    if is_valid:
        print("✅ RESULT: Token is VALID and ready to use!")
        print("You can proceed with Railway deployment.")
    else:
        print("❌ RESULT: Token is INVALID or has issues.")
        print("Please check:")
        print("1. Token is correctly copied")
        print("2. Token has necessary permissions")
        print("3. Railway account is active")
    print("=" * 50)
    
    return 0 if is_valid else 1

if __name__ == "__main__":
    sys.exit(main())