#!/usr/bin/env python3
"""
Railway 直接部署脚本
使用Railway API直接创建和部署项目
"""

import requests
import json
import time
import os
import subprocess
import zipfile
from pathlib import Path

class RailwayDeployer:
    def __init__(self, token):
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        self.api_url = 'https://backboard.railway.app/graphql/v2'
    
    def graphql_query(self, query, variables=None):
        """执行GraphQL查询"""
        payload = {'query': query}
        if variables:
            payload['variables'] = variables
            
        response = requests.post(self.api_url, json=payload, headers=self.headers)
        
        if response.status_code != 200:
            raise Exception(f"GraphQL request failed: {response.status_code} - {response.text}")
            
        data = response.json()
        if 'errors' in data:
            raise Exception(f"GraphQL errors: {data['errors']}")
            
        return data['data']
    
    def create_project(self, name):
        """创建新项目"""
        print(f"🎯 Creating project: {name}")
        
        query = """
        mutation ProjectCreate($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
                id
                name
            }
        }
        """
        
        variables = {
            "input": {
                "name": name,
                "description": "Life Management System - AI-powered task management with Palantir architecture",
                "isPublic": False
            }
        }
        
        try:
            result = self.graphql_query(query, variables)
            project = result['projectCreate']
            print(f"✅ Project created: {project['name']} (ID: {project['id']})")
            return project['id']
        except Exception as e:
            print(f"❌ Failed to create project: {e}")
            # 尝试查找现有项目
            return self.find_existing_project(name)
    
    def find_existing_project(self, name):
        """查找现有项目"""
        print(f"🔍 Looking for existing project: {name}")
        
        query = """
        query {
            projects {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
        """
        
        try:
            result = self.graphql_query(query)
            projects = result['projects']['edges']
            
            for project in projects:
                if project['node']['name'] == name:
                    print(f"✅ Found existing project: {name}")
                    return project['node']['id']
                    
            print(f"❌ Project {name} not found")
            return None
        except Exception as e:
            print(f"❌ Failed to find project: {e}")
            return None
    
    def create_service(self, project_id, name):
        """在项目中创建服务"""
        print(f"🚀 Creating service: {name}")
        
        query = """
        mutation ServiceCreate($input: ServiceCreateInput!) {
            serviceCreate(input: $input) {
                id
                name
            }
        }
        """
        
        variables = {
            "input": {
                "projectId": project_id,
                "name": name,
                "source": {
                    "repo": "chenzhan4321/life-management-system",
                    "branch": "main"
                }
            }
        }
        
        try:
            result = self.graphql_query(query, variables)
            service = result['serviceCreate']
            print(f"✅ Service created: {service['name']} (ID: {service['id']})")
            return service['id']
        except Exception as e:
            print(f"❌ Failed to create service: {e}")
            return None
    
    def deploy(self):
        """执行完整部署流程"""
        try:
            print("🚀 Starting Railway deployment...")
            print("=" * 50)
            
            # 1. 创建项目
            project_id = self.create_project("life-management-system")
            if not project_id:
                raise Exception("Failed to create or find project")
            
            # 2. 创建服务
            service_id = self.create_service(project_id, "life-management")
            if not service_id:
                raise Exception("Failed to create service")
            
            print("=" * 50)
            print("✅ Deployment initiated successfully!")
            print(f"📊 Project ID: {project_id}")
            print(f"🔧 Service ID: {service_id}")
            print()
            print("🌐 Your app will be available at:")
            print("https://railway.app/dashboard")
            print("Check the deployment progress in Railway dashboard!")
            
            return True
            
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            return False

def main():
    token = "ef894814-f4f3-443c-b1b4-a6e90c327c57"
    
    print("Railway Deployment Script")
    print("=" * 30)
    
    deployer = RailwayDeployer(token)
    success = deployer.deploy()
    
    if success:
        print("\n🎉 Deployment completed!")
        print("Visit https://railway.app/dashboard to see your live app!")
    else:
        print("\n❌ Deployment failed. Check the errors above.")
        
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())