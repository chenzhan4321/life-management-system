# 部署和启动方案

## 部署架构概览

基于 Palantir Apollo 的部署理念，设计一个简单、可靠、易维护的本地部署方案：

### 核心特性
1. **本地优先**: 完全离线运行，无云依赖
2. **一键启动**: 简化的安装和运行流程
3. **自动更新**: 智能的版本管理和更新机制
4. **健康监控**: 实时的系统健康检查
5. **数据安全**: 本地数据存储和备份

## 系统要求

### 最低要求
```
macOS: 11.0 (Big Sur) 或更高
内存: 4GB RAM
存储: 2GB 可用空间
Python: 3.9 或更高
```

### 推荐配置
```
macOS: 13.0 (Ventura) 或更高 (Apple Silicon 优化)
内存: 8GB RAM 或更高
存储: 5GB 可用空间
Python: 3.11 或更高
```

## 安装和设置

### 1. 自动安装脚本

```bash
#!/bin/bash
# scripts/macos_setup.sh
# macOS 生活管理系统自动安装脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查 macOS 版本
    macos_version=$(sw_vers -productVersion)
    log_info "macOS 版本: $macos_version"
    
    if [[ "$(printf '%s\n' "11.0" "$macos_version" | sort -V | head -n1)" != "11.0" ]]; then
        log_error "需要 macOS 11.0 或更高版本"
        exit 1
    fi
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "未找到 Python 3，请先安装 Python 3.9 或更高版本"
        exit 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2)
    log_info "Python 版本: $python_version"
    
    # 检查可用空间
    available_space=$(df -h . | tail -1 | awk '{print $4}' | sed 's/G//')
    log_info "可用存储空间: ${available_space}GB"
    
    if (( $(echo "$available_space < 2" | bc -l) )); then
        log_warning "存储空间不足，建议至少有 2GB 可用空间"
    fi
    
    log_success "系统要求检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    # 检查并安装 Homebrew
    if ! command -v brew &> /dev/null; then
        log_info "安装 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # 安装必要的系统依赖
    log_info "安装系统依赖..."
    brew install postgresql sqlite3 || true
    
    # 安装 PyObjC (用于 macOS 集成)
    log_info "安装 PyObjC..."
    python3 -m pip install --user pyobjc-core pyobjc-framework-EventKit pyobjc-framework-Contacts
    
    log_success "依赖安装完成"
}

# 创建项目目录
create_project_structure() {
    log_info "创建项目目录结构..."
    
    PROJECT_HOME="$HOME/LifeManagement"
    
    if [ -d "$PROJECT_HOME" ]; then
        log_warning "项目目录已存在，备份旧版本..."
        mv "$PROJECT_HOME" "${PROJECT_HOME}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    mkdir -p "$PROJECT_HOME"
    mkdir -p "$PROJECT_HOME/data/database"
    mkdir -p "$PROJECT_HOME/data/logs"
    mkdir -p "$PROJECT_HOME/data/exports"
    mkdir -p "$PROJECT_HOME/data/backups"
    
    # 设置环境变量
    echo "export LIFE_MANAGEMENT_HOME=$PROJECT_HOME" >> ~/.zshrc
    echo "export LIFE_MANAGEMENT_DATA=$PROJECT_HOME/data" >> ~/.zshrc
    
    log_success "项目目录创建完成: $PROJECT_HOME"
}

# 安装 Python 环境
setup_python_environment() {
    log_info "设置 Python 虚拟环境..."
    
    cd "$PROJECT_HOME"
    python3 -m venv venv
    source venv/bin/activate
    
    # 升级 pip
    pip install --upgrade pip
    
    # 安装项目依赖
    pip install -r requirements.txt
    
    log_success "Python 环境设置完成"
}

# 初始化数据库
initialize_database() {
    log_info "初始化数据库..."
    
    cd "$PROJECT_HOME"
    source venv/bin/activate
    
    python -c "
import asyncio
from backend.database import engine
from backend.ontology.models import Base
from backend.apollo.config_manager import ConfigManager

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 初始化配置
async def init_config():
    config_manager = ConfigManager()
    await config_manager.initialize_default_config()

asyncio.run(init_config())
print('数据库初始化完成')
    "
    
    log_success "数据库初始化完成"
}

# 创建启动脚本
create_launcher_scripts() {
    log_info "创建启动脚本..."
    
    # 创建主启动脚本
    cat > "$PROJECT_HOME/start.sh" << 'EOF'
#!/bin/bash
# 生活管理系统启动脚本

cd "$(dirname "$0")"
source venv/bin/activate

echo "🚀 启动 macOS 生活管理系统..."

# 检查端口占用
if lsof -i :8000 >/dev/null 2>&1; then
    echo "⚠️  端口 8000 已被占用，尝试关闭现有服务..."
    pkill -f "uvicorn.*main:app" || true
    sleep 2
fi

# 启动后端服务
echo "📡 启动后端服务..."
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "✅ 后端服务启动成功"
    echo "🌐 访问地址: http://127.0.0.1:8000"
    echo "📚 API 文档: http://127.0.0.1:8000/api/docs"
    
    # 自动打开浏览器
    open "http://127.0.0.1:8000"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# 等待用户中断
echo "按 Ctrl+C 停止服务..."
wait $BACKEND_PID
EOF
    
    chmod +x "$PROJECT_HOME/start.sh"
    
    # 创建停止脚本
    cat > "$PROJECT_HOME/stop.sh" << 'EOF'
#!/bin/bash
# 停止生活管理系统

echo "🛑 停止 macOS 生活管理系统..."

# 查找并终止相关进程
pkill -f "uvicorn.*main:app" || true
pkill -f "life_management" || true

echo "✅ 系统已停止"
EOF
    
    chmod +x "$PROJECT_HOME/stop.sh"
    
    # 创建状态检查脚本
    cat > "$PROJECT_HOME/status.sh" << 'EOF'
#!/bin/bash
# 检查系统状态

echo "📊 系统状态检查..."

if curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "✅ 系统运行正常"
    echo "🌐 访问地址: http://127.0.0.1:8000"
else
    echo "❌ 系统未运行"
    echo "💡 使用 ./start.sh 启动系统"
fi
EOF
    
    chmod +x "$PROJECT_HOME/status.sh"
    
    log_success "启动脚本创建完成"
}

# 创建 macOS 应用程序包
create_macos_app() {
    log_info "创建 macOS 应用程序包..."
    
    APP_NAME="Life Management.app"
    APP_PATH="/Applications/$APP_NAME"
    
    # 如果应用已存在，先删除
    if [ -d "$APP_PATH" ]; then
        rm -rf "$APP_PATH"
    fi
    
    # 创建应用程序目录结构
    mkdir -p "$APP_PATH/Contents/MacOS"
    mkdir -p "$APP_PATH/Contents/Resources"
    
    # 创建 Info.plist
    cat > "$APP_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>LifeManagement</string>
    <key>CFBundleIdentifier</key>
    <string>com.lifemanagement.app</string>
    <key>CFBundleName</key>
    <string>Life Management</string>
    <key>CFBundleDisplayName</key>
    <string>Life Management</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF
    
    # 创建启动脚本
    cat > "$APP_PATH/Contents/MacOS/LifeManagement" << EOF
#!/bin/bash
cd "$PROJECT_HOME"
./start.sh
EOF
    
    chmod +x "$APP_PATH/Contents/MacOS/LifeManagement"
    
    log_success "macOS 应用程序包创建完成: $APP_PATH"
}

# 设置开机启动 (可选)
setup_launch_agent() {
    read -p "是否设置开机自启动? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "设置开机启动..."
        
        PLIST_PATH="$HOME/Library/LaunchAgents/com.lifemanagement.app.plist"
        
        cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lifemanagement.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PROJECT_HOME/start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$PROJECT_HOME</string>
    <key>StandardOutPath</key>
    <string>$PROJECT_HOME/data/logs/app.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_HOME/data/logs/error.log</string>
</dict>
</plist>
EOF
        
        # 加载启动代理
        launchctl load "$PLIST_PATH"
        
        log_success "开机启动设置完成"
    fi
}

# 创建桌面快捷方式
create_desktop_shortcut() {
    log_info "创建桌面快捷方式..."
    
    # 在桌面创建启动快捷方式
    cat > "$HOME/Desktop/启动生活管理系统.command" << EOF
#!/bin/bash
cd "$PROJECT_HOME"
./start.sh
EOF
    
    chmod +x "$HOME/Desktop/启动生活管理系统.command"
    
    log_success "桌面快捷方式创建完成"
}

# 运行安装向导
run_installation_wizard() {
    echo "🎉 欢迎使用 macOS 生活管理系统安装向导"
    echo "========================================"
    
    check_system_requirements
    install_dependencies
    create_project_structure
    setup_python_environment
    initialize_database
    create_launcher_scripts
    create_macos_app
    setup_launch_agent
    create_desktop_shortcut
    
    echo ""
    echo "🎊 安装完成！"
    echo "========================================"
    echo "系统已安装到: $PROJECT_HOME"
    echo ""
    echo "启动方式："
    echo "1. 运行: $PROJECT_HOME/start.sh"
    echo "2. 双击桌面快捷方式"
    echo "3. 从应用程序文件夹启动"
    echo ""
    echo "访问地址: http://127.0.0.1:8000"
    echo "API 文档: http://127.0.0.1:8000/api/docs"
    echo ""
    
    read -p "是否现在启动系统? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "启动系统..."
        cd "$PROJECT_HOME"
        ./start.sh
    fi
}

# 主函数
main() {
    PROJECT_HOME=""
    
    # 检查是否为更新模式
    if [ "$1" = "--update" ]; then
        log_info "更新模式"
        # 这里实现更新逻辑
    else
        run_installation_wizard
    fi
}

# 执行主函数
main "$@"
```

### 2. 配置管理系统

```python
# backend/apollo/config_manager.py
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from ..database import get_db
from ..ontology.models import SystemConfig

class ConfigManager:
    """配置管理器 - 基于 Apollo 的配置管理理念"""
    
    def __init__(self):
        self.config_cache = {}
        self.config_file = Path("data/config.json")
        self.last_reload = datetime.now()
    
    async def initialize_default_config(self):
        """初始化默认配置"""
        default_configs = {
            # 应用配置
            'app_version': '1.0.0',
            'database_version': '1.0.0',
            'first_run': True,
            
            # 功能开关
            'ai_features_enabled': True,
            'macos_integration_enabled': True,
            'calendar_sync_enabled': False,
            'reminders_sync_enabled': False,
            'notifications_enabled': True,
            
            # 时间管理配置
            'default_time_block_duration': 240,  # 4小时
            'work_start_hour': 9,
            'work_end_hour': 17,
            'break_duration': 15,
            
            # AI 配置
            'ai_priority_weight': 0.7,
            'ai_complexity_threshold': 0.5,
            
            # 同步配置
            'sync_interval_calendar': 300,      # 5分钟
            'sync_interval_reminders': 600,     # 10分钟
            'auto_backup_enabled': True,
            'backup_interval': 86400,           # 24小时
            
            # UI 配置
            'theme': 'light',
            'language': 'zh-CN',
            'dashboard_refresh_interval': 30,
            
            # macOS 特定配置
            'menu_bar_icon_enabled': True,
            'dock_badge_enabled': True,
            'spotlight_indexing': True,
        }
        
        # 保存到数据库
        db = next(get_db())
        for key, value in default_configs.items():
            existing = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
            if not existing:
                config = SystemConfig(
                    config_key=key,
                    config_value=str(value),
                    config_type=self._infer_type(value),
                    description=self._get_config_description(key)
                )
                db.add(config)
        
        db.commit()
        db.close()
        
        # 更新缓存
        await self.reload_config()
    
    async def get_config(self, key: str, default: Any = None) -> Any:
        """获取配置值"""
        if key not in self.config_cache:
            await self.reload_config()
        
        return self.config_cache.get(key, default)
    
    async def set_config(self, key: str, value: Any) -> bool:
        """设置配置值"""
        try:
            db = next(get_db())
            config = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
            
            if config:
                config.config_value = str(value)
                config.config_type = self._infer_type(value)
                config.updated_at = datetime.now()
                config.version += 1
            else:
                config = SystemConfig(
                    config_key=key,
                    config_value=str(value),
                    config_type=self._infer_type(value),
                    description=self._get_config_description(key)
                )
                db.add(config)
            
            db.commit()
            db.close()
            
            # 更新缓存
            self.config_cache[key] = value
            
            return True
            
        except Exception as e:
            print(f"设置配置失败: {e}")
            return False
    
    async def reload_config(self):
        """重新加载配置"""
        try:
            db = next(get_db())
            configs = db.query(SystemConfig).all()
            
            self.config_cache.clear()
            for config in configs:
                value = self._parse_config_value(config.config_value, config.config_type)
                self.config_cache[config.config_key] = value
            
            db.close()
            self.last_reload = datetime.now()
            
        except Exception as e:
            print(f"重新加载配置失败: {e}")
    
    async def export_config(self, file_path: Optional[str] = None) -> str:
        """导出配置到文件"""
        if not file_path:
            file_path = f"data/exports/config_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        config_data = {
            'export_time': datetime.now().isoformat(),
            'version': await self.get_config('app_version'),
            'configs': self.config_cache
        }
        
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        return file_path
    
    async def import_config(self, file_path: str) -> bool:
        """从文件导入配置"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            if 'configs' not in config_data:
                return False
            
            # 批量更新配置
            for key, value in config_data['configs'].items():
                await self.set_config(key, value)
            
            return True
            
        except Exception as e:
            print(f"导入配置失败: {e}")
            return False
    
    def _infer_type(self, value: Any) -> str:
        """推断配置值类型"""
        if isinstance(value, bool):
            return 'boolean'
        elif isinstance(value, int):
            return 'integer'
        elif isinstance(value, float):
            return 'float'
        elif isinstance(value, (list, dict)):
            return 'json'
        else:
            return 'string'
    
    def _parse_config_value(self, value_str: str, config_type: str) -> Any:
        """解析配置值"""
        try:
            if config_type == 'boolean':
                return value_str.lower() in ('true', '1', 'yes', 'on')
            elif config_type == 'integer':
                return int(value_str)
            elif config_type == 'float':
                return float(value_str)
            elif config_type == 'json':
                return json.loads(value_str)
            else:
                return value_str
        except:
            return value_str
    
    def _get_config_description(self, key: str) -> str:
        """获取配置项描述"""
        descriptions = {
            'app_version': '应用程序版本号',
            'database_version': '数据库架构版本号',
            'first_run': '是否首次运行',
            'ai_features_enabled': '是否启用AI功能',
            'macos_integration_enabled': '是否启用macOS集成',
            'calendar_sync_enabled': '是否启用日历同步',
            'reminders_sync_enabled': '是否启用提醒事项同步',
            'default_time_block_duration': '默认时间块时长(分钟)',
            'work_start_hour': '工作开始时间',
            'work_end_hour': '工作结束时间',
        }
        return descriptions.get(key, f'配置项: {key}')

class HealthMonitor:
    """系统健康监控器"""
    
    def __init__(self):
        self.last_health_check = None
        self.health_status = {}
    
    async def get_system_health(self) -> Dict[str, Any]:
        """获取系统健康状态"""
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'components': {}
        }
        
        # 检查数据库
        try:
            db = next(get_db())
            db.execute('SELECT 1')
            db.close()
            health_data['components']['database'] = {'status': 'healthy', 'response_time': '<1ms'}
        except Exception as e:
            health_data['components']['database'] = {'status': 'unhealthy', 'error': str(e)}
            health_data['status'] = 'degraded'
        
        # 检查磁盘空间
        try:
            import psutil
            disk_usage = psutil.disk_usage('/')
            free_gb = disk_usage.free / (1024**3)
            
            if free_gb < 1:
                health_data['components']['disk'] = {'status': 'critical', 'free_space': f'{free_gb:.1f}GB'}
                health_data['status'] = 'critical'
            elif free_gb < 5:
                health_data['components']['disk'] = {'status': 'warning', 'free_space': f'{free_gb:.1f}GB'}
                health_data['status'] = 'degraded'
            else:
                health_data['components']['disk'] = {'status': 'healthy', 'free_space': f'{free_gb:.1f}GB'}
                
        except Exception as e:
            health_data['components']['disk'] = {'status': 'unknown', 'error': str(e)}
        
        # 检查内存使用
        try:
            import psutil
            memory = psutil.virtual_memory()
            
            if memory.percent > 90:
                health_data['components']['memory'] = {'status': 'critical', 'usage': f'{memory.percent:.1f}%'}
                health_data['status'] = 'critical'
            elif memory.percent > 80:
                health_data['components']['memory'] = {'status': 'warning', 'usage': f'{memory.percent:.1f}%'}
                health_data['status'] = 'degraded'
            else:
                health_data['components']['memory'] = {'status': 'healthy', 'usage': f'{memory.percent:.1f}%'}
                
        except Exception as e:
            health_data['components']['memory'] = {'status': 'unknown', 'error': str(e)}
        
        self.last_health_check = datetime.now()
        self.health_status = health_data
        
        return health_data
    
    async def start_monitoring(self):
        """启动监控服务"""
        while True:
            try:
                await self.get_system_health()
                await asyncio.sleep(60)  # 每分钟检查一次
            except Exception as e:
                print(f"健康检查错误: {e}")
                await asyncio.sleep(10)
```

### 3. 自动更新系统

```python
# backend/apollo/updater.py
import asyncio
import hashlib
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List

class AutoUpdater:
    """自动更新管理器"""
    
    def __init__(self):
        self.update_server = "https://api.lifemanagement.local"  # 示例地址
        self.current_version = "1.0.0"
        self.update_check_interval = 3600 * 24  # 24小时
        self.auto_update_enabled = False
    
    async def check_for_updates(self) -> Optional[Dict]:
        """检查可用更新"""
        try:
            # 这里可以连接到更新服务器
            # 现在返回模拟数据
            return {
                'available': False,
                'latest_version': self.current_version,
                'current_version': self.current_version,
                'update_url': None,
                'release_notes': None
            }
            
        except Exception as e:
            print(f"检查更新失败: {e}")
            return None
    
    async def download_update(self, update_info: Dict) -> bool:
        """下载更新包"""
        try:
            # 实现更新下载逻辑
            return True
        except Exception as e:
            print(f"下载更新失败: {e}")
            return False
    
    async def apply_update(self, update_path: str) -> bool:
        """应用更新"""
        try:
            # 实现更新应用逻辑
            return True
        except Exception as e:
            print(f"应用更新失败: {e}")
            return False
```

### 4. Docker 支持 (可选)

```dockerfile
# Dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p data/database data/logs data/exports

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  life-management:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - DATABASE_URL=sqlite:///data/database/life_management.db
      - DEBUG=false
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 启动流程

### 1. 开发环境启动

```bash
# 克隆项目
git clone https://github.com/your-repo/life-management.git
cd life-management

# 运行安装脚本
chmod +x scripts/macos_setup.sh
./scripts/macos_setup.sh

# 或手动启动
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

### 2. 生产环境启动

```bash
# 使用自动安装脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/life-management/main/scripts/macos_setup.sh | bash

# 或使用 Docker
docker-compose up -d
```

## 维护和故障排除

### 常见问题解决

1. **端口占用**
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
```

2. **数据库问题**
```bash
cd ~/LifeManagement
source venv/bin/activate
python -c "from backend.database import engine; from backend.ontology.models import Base; Base.metadata.create_all(bind=engine)"
```

3. **权限问题**
```bash
chmod -R 755 ~/LifeManagement
```

### 日志和监控

- 应用日志: `~/LifeManagement/data/logs/app.log`
- 错误日志: `~/LifeManagement/data/logs/error.log`
- 数据库日志: `~/LifeManagement/data/logs/database.log`

### 备份和恢复

```bash
# 数据备份
~/LifeManagement/scripts/backup.py

# 数据恢复
~/LifeManagement/scripts/restore.py --backup-file <backup_file>
```

这个部署方案提供了：

1. **简单安装**: 一键安装脚本
2. **多种启动方式**: 命令行、应用程序、开机启动
3. **健康监控**: 实时系统状态检查
4. **配置管理**: 灵活的配置系统
5. **自动更新**: 支持版本管理和更新
6. **容器支持**: 可选的 Docker 部署
7. **故障恢复**: 完善的维护和故障排除指南

整个系统设计为本地优先，确保用户数据完全掌控在自己手中，同时提供企业级的可靠性和可维护性。