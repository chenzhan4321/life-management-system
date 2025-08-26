from fastapi import FastAPI
import os

app = FastAPI()

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

@app.get("/api/tasks")
def get_tasks():
    return {"tasks": [], "total": 0}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)