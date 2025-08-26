from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        response = {
            "status": "ok",
            "version": "4.0.0",
            "message": "Health check successful!"
        }
        
        self.wfile.write(json.dumps(response).encode('utf-8'))