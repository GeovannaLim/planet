# Local preview server: same as `python3 -m http.server`, but tells the browser
# not to cache, so edits to modules and translations always show up on reload.
#   python3 serve.py [port]
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
root = os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(NoCacheHandler, directory=root)
http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
