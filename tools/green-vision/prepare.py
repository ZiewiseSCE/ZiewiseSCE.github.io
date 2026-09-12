import cv2, json, random, math, numpy as np
from pathlib import Path
base=Path(__file__).parent
cap=cv2.VideoCapture(str(base/'mountain-hd.mp4'))
cap.set(cv2.CAP_PROP_POS_MSEC,2000)
ok, first=cap.read()
first=cv2.resize(first,(1280,720))
cv2.imwrite(str(base/'plate.png'), first)
random.seed(2468)
points=[]; data=[]
# Sparse, irregular clusters on the bare foreground slopes. Leave a terrace for equipment.
for y in range(410,766,18):
 for x in range(-50,1360,20):
  xx=x+random.uniform(-14,14); yy=y+random.uniform(-11,11)
  ridge=355 + .22*xx + 25*math.sin(xx*.008)
  if yy<ridge+45 or random.random()<.12: continue
  if ((365<xx<600) or (676<xx<887)) and 619<yy<738: continue
  if xx<3 or xx>1277 or yy>718:continue
  points.append([xx,yy])
  size=(15+(yy-410)*.092)*(0.7+random.random()*.65)
  delay=1.4+abs(xx-570)/95+random.random()*5.2+(720-yy)*.012
  data.append({'x':xx,'y':yy,'size':size,'delay':delay,'variant':random.randrange(4),'turn':random.random()*6.28})
# The two facilities share the optical tracking pass with their surrounding ground.
for p in [[482,667],[773,678]]:points.append(p)
last=cv2.cvtColor(first,cv2.COLOR_BGR2GRAY)
last_points=np.array(points,dtype=np.float32).reshape(-1,1,2)
tracks=[last_points.reshape(-1,2).tolist()]
for i in range(1,109):
 cap.set(cv2.CAP_PROP_POS_MSEC,2000+i/12*1000)
 ok, frame=cap.read()
 if not ok:raise RuntimeError('Source video ended')
 gray=cv2.cvtColor(cv2.resize(frame,(1280,720)),cv2.COLOR_BGR2GRAY)
 new,status,err=cv2.calcOpticalFlowPyrLK(last,gray,last_points,None,winSize=(41,41),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,.01))
 valid=status[:,0].astype(bool)
 # Lost marginal points follow the robust local ground movement instead of jumping.
 displacement=np.median((new-last_points)[valid],axis=0)
 new[~valid]=last_points[~valid]+displacement
 tracks.append(new.reshape(-1,2).tolist())
 last,last_points=gray,new
(base/'tracking.json').write_text(json.dumps({'trees':data,'tracks':tracks},separators=(',',':')))
print(json.dumps({'trees':len(data),'trackingSamples':len(tracks),'sourceSize':[cap.get(3),cap.get(4)]}))
