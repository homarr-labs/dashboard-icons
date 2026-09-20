from http.server import BaseHTTPRequestHandler,HTTPServer
import json
runs={}
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or '{}')
  if self.path=='/simulate':
   r=runs[str(body['id'])];r.update(status='completed',conclusion=body.get('conclusion','failure'));self.reply(r);return
  id=str(10000+len(runs)); batch=body['inputs']['batchId']
  runs[id]={'id':int(id),'status':'queued','conclusion':None,'display_title':'Publish '+batch,'html_url':'https://github.com/homarr-labs/dashboard-icons/actions/runs/'+id}
  self.reply({'workflow_run_id':int(id),'html_url':runs[id]['html_url']})
 def do_GET(self):
  if '/actions/runs/' in self.path:self.reply(runs[self.path.split('/')[-1]]);return
  if '/commits' in self.path:self.reply([]);return
  self.reply({'workflow_runs':list(runs.values())})
 def reply(self,body):
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(body).encode())
HTTPServer(('127.0.0.1',8096),Handler).serve_forever()
