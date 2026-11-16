import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 5173
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure JavaScript modules have correct MIME type
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)

def run():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), CustomHTTPHandler) as httpd:
        print(f"=======================================================")
        print(f" TRSA Studio Enterprise Server Running")
        print(f" URL: http://localhost:{PORT}")
        print(f" Workspace: {DIRECTORY}")
        print(f" Press Ctrl+C to stop server")
        print(f"=======================================================")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == '__main__':
    run()
