import openpyxl, datetime, re, json, csv
from collections import defaultdict
P='/mnt/user-data/attachments/3ab7db07-7d8f-5b8f-b926-2213c300b28b/0eb5b5ae-_______________________________________.xlsm'
OUT='/home/claude/portal'
wb=openpyxl.load_workbook(P, data_only=True)
SLOTS=["11:00","12:30","14:00","15:30","17:00","18:30"]
ROOMS=[{"id":"nam","name":"Нам"},{"id":"eli","name":"Ели"},{"id":"noy","name":"НОЙ"}]
RID=[r["id"] for r in ROOMS]
DOW=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']
DOWS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

def clean(s):
    s=str(s or ""); note=None
    m=re.search(r'[«"]([^»"]+)[»"]',s)
    if m: note=m.group(1).strip()
    s=re.sub(r'[«"][^»"]*[»"]','',s)
    s=re.sub(r'\s+',' ',s).strip()
    plus = s.endswith('+')
    s=s.rstrip('+').strip()
    return s,note,plus

def tel(v):
    """Формат книги: +992 XXX XX XX XX — код оператора три цифры.
    Номера не из девяти цифр не достраиваются: возвращаются как есть
    и помечаются к проверке."""
    if v is None: return "", False
    d=re.sub(r'\D','',str(v))
    if len(d)==12 and d.startswith('992'): d=d[3:]
    if len(d)==9:
        return "+992 "+d[:3]+" "+d[3:5]+" "+d[5:7]+" "+d[7:], False
    return re.sub(r'\s+',' ',str(v)).strip(), True

def dt(v): return v.strftime('%Y-%m-%d') if isinstance(v,datetime.datetime) else ""

# ── клиенты ──
ws=wb['Учет клиентов Август']
GK=[('Альфа Групп','g_avesto','Альфа Групп','corporate',None),
    ('Бетаи нав','g_koyonot','Бета Трейд','corporate',80),
    ('ГЭМ','g_tgem','ГЭМ','corporate',40),
    ('Дети','g_deti','Дети','child',None),
    ('Сертификат','g_sert','Сертификат','certificate',None),
    ('Коенот Тичорат','g_tijorat','Бета Тиҷорат','corporate',None),
    ('Клиенты','g_private','Частные клиенты','private',None)]
cur=None; clients=[]; n=0
for r in ws.iter_rows(values_only=True):
    a,b=r[0],r[1]
    if a and isinstance(a,str):
        for g in GK:
            if a.strip().startswith(g[0]): cur=g; break
    if isinstance(a,(int,float)) and b and isinstance(b,str) and cur:
        name,note,plus=clean(b)
        if not name: continue
        n+=1
        clients.append({"id":"c%03d"%n,"name":name,"note":note,"flag":plus,
            "groupId":cur[1],"groupTitle":cur[2],"segment":cur[3],
            "nam":r[2] or 0,"eli":r[3] or 0,"noy":r[4] or 0,"total":r[5] or 0,
            "start":dt(r[6]),"end":dt(r[7]),"tel":tel(r[8])[0],"telCheck":tel(r[8])[1],"raw":b})

idx=defaultdict(list)
for c in clients: idx[c["name"].lower()].append(c)

# ── сетка ──
ws=wb['График на Август']
days={}; cells=[]
for r in ws.iter_rows(min_row=3, values_only=True):
    d=r[0]
    if not isinstance(d,datetime.datetime): continue
    key=d.strftime('%Y-%m-%d'); raw=list(r[2:20])[:18]
    closed=any(isinstance(c,str) and 'выходной' in c for c in raw if c)
    grid={rm["id"]:{s:{"client":None,"status":"closed" if closed else "free"} for s in SLOTS} for rm in ROOMS}
    days[key]={"date":key,"weekday":DOW[d.weekday()],"weekdayShort":DOWS[d.weekday()],
               "closed":closed,"grid":grid,"capacity":0 if closed else 18,
               "source":"excel"}
    if closed: continue
    for i,c in enumerate(raw):
        if isinstance(c,str) and c.strip() not in ('','0'):
            name,note,_=clean(c)
            cands=idx.get(name.lower(),[])
            pick=None
            if len(cands)==1: pick=cands[0]
            elif cands:
                m=[x for x in cands if note and x["note"]==note] or [x for x in cands if x["total"]>0]
                pick=m[0] if len(m)==1 else cands[0]
            cells.append({"date":key,"room":RID[i//6],"slot":SLOTS[i%6],"c":pick,"name":name,"note":note})

# нумерация сеансов внутри курса
seq=defaultdict(list)
for cl in cells:
    if cl["c"]: seq[cl["c"]["id"]].append(cl)
for cid,lst in seq.items():
    lst.sort(key=lambda x:(x["date"],SLOTS.index(x["slot"])))
    for i,cl in enumerate(lst): cl["n"]=i+1; cl["of"]=len(lst)

for cl in cells:
    c=cl["c"]
    days[cl["date"]]["grid"][cl["room"]][cl["slot"]]={
        "client": c["name"] if c else cl["name"],
        "clientId": c["id"] if c else None,
        "group": c["groupTitle"] if c else "",
        "segment": c["segment"] if c else "private",
        "tel": c["tel"] if c else "",
        "course": ("сеанс %d из %d"%(cl.get("n",1),cl.get("of",1))),
        "status":"booked"}
for k,v in days.items():
    v["booked"]=sum(1 for rm in RID for s in SLOTS if v["grid"][rm][s].get("client"))

# ── запись файлов ──
groups=defaultdict(list)
for c in clients:
    groups[c["groupId"]].append({k:c[k] for k in
        ("id","name","note","flag","nam","eli","noy","total","start","end","tel","telCheck")})
for g in GK:
    if g[1] not in groups: continue
    items=groups[g[1]]
    json.dump({"groupId":g[1],"title":g[2],"segment":g[3],"packageSessions":g[4],
               "count":len(items),"sessions":sum(i["total"] for i in items),
               "withPhone":sum(1 for i in items if i["tel"]),"items":items},
              open(f'{OUT}/seed2/clients_{g[1]}.json','w'), ensure_ascii=False, indent=1)
for k,v in days.items():
    json.dump(v, open(f'{OUT}/seed2/days_{k}.json','w'), ensure_ascii=False, indent=1)

wd=[v for v in days.values() if not v["closed"]]
cap=sum(v["capacity"] for v in wd); bk=sum(v["booked"] for v in wd)
settings=json.load(open(f'{OUT}/seed/settings_center.json'))
settings["baseline"]={"month":"2026-10","workdays":len(wd),"capacity":cap,"booked":bk,
  "occupancy":round(bk/cap*100,1),"clients":len(clients),
  "withPhone":sum(1 for c in clients if c["tel"]),
  "activeClients":len(seq)}
settings["source"]="Импорт из учётной книги Excel: имена нормализованы, пометки групп вынесены из ФИО, каждая запись связана с карточкой клиента"
json.dump(settings, open(f'{OUT}/seed2/settings_center.json','w'), ensure_ascii=False, indent=1)

# CSV
with open(f'{OUT}/export/schedule.csv','w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f,delimiter=';')
    w.writerow(["Дата","День","Кабинет","Время","Клиент","Пометка","Группа","Сегмент","Сеанс","Телефон","Статус"])
    for k in sorted(days):
        v=days[k]
        for rm in ROOMS:
            for s in SLOTS:
                c=v["grid"][rm["id"]][s]
                w.writerow([k,v["weekdayShort"],rm["name"],s,c.get("client") or "",
                    (next((x["note"] for x in clients if x["id"]==c.get("clientId")),"") or ""),
                    c.get("group") or "",c.get("segment") or "",c.get("course") or "",
                    c.get("tel") or "", "выходной" if v["closed"] else ("записан" if c.get("client") else "свободно")])
with open(f'{OUT}/export/clients.csv','w',newline='',encoding='utf-8-sig') as f:
    w=csv.writer(f,delimiter=';')
    w.writerow(["ID","Группа","Сегмент","ФИО","Пометка","Нам","Ели","НОЙ","Итого","Начало курса","Окончание курса","Телефон","Проверить номер"])
    for c in clients:
        w.writerow([c["id"],c["groupTitle"],c["segment"],c["name"],c["note"] or "",
                    c["nam"],c["eli"],c["noy"],c["total"],c["start"],c["end"],c["tel"],
                    "да" if c["telCheck"] else ""])

print("клиентов:",len(clients),"| активных:",len(seq),"| ячеек связано:",sum(1 for c in cells if c["c"]),"из",len(cells))
print("загрузка:",bk,"/",cap,"=",round(bk/cap*100,1),"%")
print("с пометкой в ФИО:",[(c['name'],c['note']) for c in clients if c['note']])
print("файлов:",len(__import__('os').listdir(f'{OUT}/seed2')))
