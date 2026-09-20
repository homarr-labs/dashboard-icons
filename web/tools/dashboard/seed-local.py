import urllib.request,json,concurrent.futures
base='http://127.0.0.1:8095'
def request(path,data=None,token='',method=None):
 req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Authorization':token},method=method)
 try:
  with urllib.request.urlopen(req) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError(str(e.code)+' '+e.read().decode())
auth=request('/api/collections/_superusers/auth-with-password',{'identity':'dashboard-local@example.test','password':'LocalDashboardOnly2026'});token=auth['token']
users=[]
for name,admin in [('alex-admin',True),('manuel',True),('anna-user',False),('bellamy',False)]:
 found=request('/api/collections/users/records?filter=username%3D%22'+name+'%22',token=token)['items']
 if found:user=found[0]
 else:user=request('/api/collections/users/records',{'email':name+'@example.test','username':name,'password':'LocalDashboardOnly2026','passwordConfirm':'LocalDashboardOnly2026','admin':admin,'verified':True},token)
 users.append(user)
print('Local accounts ready')
svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect x="10" y="10" width="76" height="76" rx="22" fill="#e87970"/><path d="M30 30h20a18 18 0 0 1 0 36H30z" fill="none" stroke="white" stroke-width="9"/></svg>'
def create(i):
 status=['pending','approved','rejected','added_to_collection'][min(i//10,3)]
 name=['healthlog','siglent','patzer','kuvasz-uptime','candlr','openusage','deckvault','seatable','met-office','homarr'][i%10]+'-'+str(i+1)
 boundary='DASHBOARDLOCAL'
 fields={'name':name,'status':status,'created_by':users[2+i%2]['id'],'approved_by':users[i%2]['id'] if status!='pending' else '', 'description':'A carefully designed icon for a self-hosted application. Review its light and dark variants before approving.', 'extras':json.dumps({'base':'svg','categories':['Tools','Self-hosted'],'aliases':[name.split('-')[0]]}), 'admin_comment':'Please provide a cleaner vector asset with transparent edges. This feedback remains visible in submission history.' if status=='rejected' else ''}
 chunks=[]
 for key,value in fields.items():chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
 for file in ['icon.svg','dark.svg'] if i<12 else ['icon.svg']:
  chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="assets"; filename="{file}"\r\nContent-Type: image/svg+xml\r\n\r\n{svg}\r\n'.encode())
 chunks.append(f'--{boundary}--\r\n'.encode())
 req=urllib.request.Request(base+'/api/collections/submissions/records',data=b''.join(chunks),headers={'Authorization':token,'Content-Type':'multipart/form-data; boundary='+boundary})
 try:
  with urllib.request.urlopen(req) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError(str(e.code)+' '+e.read().decode())
count=request('/api/collections/submissions/records?perPage=1',token=token)['totalItems']
if count<1500:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for j,result in enumerate(pool.map(create,range(count,1500))):
   if j%250==0:print('Seeded',count+j+1,flush=True)
print('Seed complete')
