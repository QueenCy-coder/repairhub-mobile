#!/bin/zsh
# Creates RepairHub's service categories on the live API.
# Run it yourself (needs an ADMIN account, which only the backend team can create):  zsh tools/seed-categories.sh
# It asks for an ADMIN email and password; the password is only sent to the API, never stored or printed.
set -e
API="${API:-https://repairhub-api-1.onrender.com/api}"

print -n "Admin email: "; read EMAIL
print -n "Admin password: "; read -s PASSWORD; echo

TOKEN=$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" API="$API" python3 - <<'PY'
import json, os, sys, urllib.request
req = urllib.request.Request(os.environ['API'] + '/users/login',
    data=json.dumps({'email': os.environ['EMAIL'], 'password': os.environ['PASSWORD']}).encode(),
    headers={'Content-Type': 'application/json'})
try:
    body = json.load(urllib.request.urlopen(req, timeout=90))
except urllib.error.HTTPError as e:
    sys.exit('Login failed: ' + e.read().decode()[:300])
d = body.get('data') or {}
tok = d.get('token') or d.get('accessToken') or body.get('token')
if not tok: sys.exit('Logged in, but no token found in the response: ' + json.dumps(body)[:300])
print(tok)
PY
)
unset PASSWORD

TOKEN="$TOKEN" API="$API" python3 - <<'PY'
import json, os, urllib.request
api, tok = os.environ['API'], os.environ['TOKEN']
def call(method, path, body=None):
    req = urllib.request.Request(api + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok})
    try: return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e: return {'success': False, 'message': e.read().decode()[:300]}

# Live in Lagos now (active) and coming soon (inactive), matching the app.
wanted = [('Smartphones', True), ('Laptops', True), ('Tablets', True), ('Desktops', True), ('Printers', True),
          ('TVs', False), ('Refrigerators', False)]
existing = {c.get('name'): c for c in (call('GET', '/service-categories').get('data') or [])}
for name, active in wanted:
    if name in existing:
        print(f'= {name} already exists'); continue
    r = call('POST', '/service-categories', {'name': name})
    if not r.get('success'): print(f'! {name}: {r.get("message")}'); continue
    cid = (r.get('data') or {}).get('_id') or (r.get('data') or {}).get('id')
    if not active and cid:
        call('PATCH', f'/service-categories/{cid}', {'isActive': False})
    print(f'+ {name}' + ('' if active else ' (coming soon, inactive)'))
print('Done. Active categories now:', [c.get('name') for c in (call('GET', '/service-categories').get('data') or [])])
PY
