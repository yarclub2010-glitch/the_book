# Локальный сервер для игры: как python -m http.server, но браузер ничего не кэширует,
# поэтому после правок достаточно обычного обновления страницы. Отдаёт папку, где лежит сам.
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8016
root = os.path.dirname(os.path.abspath(__file__))
handler = functools.partial(NoCache, directory=root)
http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
