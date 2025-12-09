import subprocess
import json
import os
import sys
import time

# Configuration
CMD = ["npx", "-y", "daisyui-blueprint@latest"]
ENV = os.environ.copy()
ENV["LICENSE"] = "SUV85-M5006-UP3DF-O4R8W-WP6JW"
ENV["EMAIL"] = "aitamokrane2004@gmail.com"

def run_client():
    process = subprocess.Popen(
        CMD,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        env=ENV,
        text=True,
        bufsize=1
    )

    def send_request(method, params=None, id=None):
        req = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
        }
        if id is not None:
            req["id"] = id
            
        json_req = json.dumps(req)
        # print(f"Sending: {json_req}", file=sys.stderr)
        process.stdin.write(json_req + "\n")
        process.stdin.flush()

    def read_response():
        while True:
            line = process.stdout.readline()
            if not line:
                return None
            # print(f"Received: {line.strip()}", file=sys.stderr)
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue


    # Read banner lines
    time.sleep(1)
    
    # 1. Initialize
    send_request("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "resources": {},
            "tools": {},
            "prompts": {}
        },
        "clientInfo": {"name": "manual-client", "version": "1.0"}
    }, id=1)

    resp = read_response() 
    print(f"DEBUG: Response 1: {resp}", file=sys.stderr)
    
    if resp and "error" not in resp:
        send_request("notifications/initialized")

    # 4. Try Listing Tools
    send_request("tools/list", {}, id=4)
    resp = read_response()
    
    # Call Tool to get Snippets
    tool_args = {
        "component-examples": {
            "modal.modal-using-dialog": True,
            "modal.modal-with-close-button": True
        }
    }
    
    send_request("tools/call", {
        "name": "daisyUI-Snippets",
        "arguments": tool_args
    }, id=5)
    
    resp = read_response()
    
    # Save to file
    with open("blueprint_components.json", "w") as f:
        json.dump(resp, f, indent=2)
        
    print("Saved components to blueprint_components.json")

    process.terminate()

if __name__ == "__main__":
    run_client()
