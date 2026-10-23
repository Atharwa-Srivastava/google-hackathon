"""Train a small material head on the user's local images, without uploading images.

Requires onnxruntime==1.20.1, scikit-learn==1.5.2, Pillow and NumPy.
Use one dataset variant only. Exact duplicate image bytes never cross splits.
"""
import argparse, hashlib, json, time
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from scipy.optimize import minimize_scalar

p=argparse.ArgumentParser();p.add_argument('--dataset',required=True);p.add_argument('--model',required=True);p.add_argument('--work-dir',required=True);p.add_argument('--output',required=True);args=p.parse_args()
root=Path(args.dataset).resolve();work=Path(args.work_dir).resolve();work.mkdir(parents=True,exist_ok=True)
labels=sorted(d.name for d in root.iterdir() if d.is_dir())
records=[];seen={};duplicates=0;conflicts=0
for label in labels:
 for file in sorted((root/label).iterdir()):
  if file.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):continue
  digest=hashlib.sha256(file.read_bytes()).hexdigest()
  if digest in seen:
   duplicates+=1
   if seen[digest]!=label:conflicts+=1
   continue
  seen[digest]=label;records.append({'path':str(file.relative_to(root)),'label':label,'hash':digest})
fingerprint=hashlib.sha256(json.dumps({'records':records,'model':hashlib.sha256(Path(args.model).read_bytes()).hexdigest(),'preprocessing':'rgb-224-bilinear-v1'},sort_keys=True).encode()).hexdigest()
print(json.dumps({'phase':'dataset','classes':labels,'images':len(records),'duplicatesRemoved':duplicates,'conflictingDuplicates':conflicts}),flush=True)
opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
session=ort.InferenceSession(str(Path(args.model).resolve()),sess_options=opts,providers=['CPUExecutionProvider'])
input_name=session.get_inputs()[0].name
cache=work/'features.npz'
if cache.exists() and str(np.load(cache)['fingerprint'])==fingerprint:
 features=np.load(cache)['features'];timings=[]
else:
 features=[];timings=[];started=time.perf_counter()
 mean=np.array([.485,.456,.406],np.float32).reshape(1,3,1,1);std=np.array([.229,.224,.225],np.float32).reshape(1,3,1,1)
 for index,record in enumerate(records):
  image=ImageOps.exif_transpose(Image.open(root/record['path'])).convert('RGB').resize((224,224),Image.Resampling.BILINEAR)
  data=np.asarray(image,dtype=np.float32).transpose(2,0,1)[None]/255
  tick=time.perf_counter();result=session.run(None,{input_name:(data-mean)/std})[0].reshape(-1);timings.append((time.perf_counter()-tick)*1000);features.append(result)
  if (index+1)%500==0:print(json.dumps({'phase':'features','done':index+1,'total':len(records),'seconds':round(time.perf_counter()-started,1)}),flush=True)
 features=np.asarray(features,np.float32);np.savez_compressed(cache,features=features,fingerprint=fingerprint)
y=np.array([labels.index(r['label']) for r in records]);ids=np.arange(len(y))
train,held=train_test_split(ids,test_size=.30,random_state=413,stratify=y)
val,test=train_test_split(held,test_size=.5,random_state=414,stratify=y[held])
scaler=StandardScaler().fit(features[train]);x=scaler.transform(features)
best=None
for c in [.02,.1,.5]:
 classifier=LogisticRegression(C=c,class_weight='balanced',max_iter=500,solver='lbfgs',n_jobs=1).fit(x[train],y[train])
 score=accuracy_score(y[val],classifier.predict(x[val]));print(json.dumps({'phase':'head','C':c,'validationAccuracy':score}),flush=True)
 if best is None or score>best[0]:best=(score,classifier)
classifier=best[1]
val_logits=classifier.decision_function(x[val])
def softmax(logits):
 logits=logits-logits.max(axis=1,keepdims=True);e=np.exp(logits);return e/e.sum(axis=1,keepdims=True)
def loss(t):return -np.log(np.maximum(softmax(val_logits/t)[np.arange(len(val)),y[val]],1e-9)).mean()
temperature=float(minimize_scalar(loss,bounds=(.5,3),method='bounded').x)
val_probs=softmax(val_logits/temperature);test_probs=softmax(classifier.decision_function(x[test])/temperature)
thresholds={}
for i,label in enumerate(labels):
 threshold=1.01
 for candidate in np.arange(.88,1.001,.005):
  selected=(val_probs.argmax(axis=1)==i)&(val_probs[:,i]>=candidate)
  if selected.sum()>=15 and np.mean(y[val][selected]==i)>=.99:threshold=float(candidate);break
 thresholds[label]=round(threshold,4)
report={'datasetImages':len(records),'duplicatesRemoved':duplicates,'conflictingDuplicates':conflicts,'split':{'train':len(train),'validation':len(val),'test':len(test)},'seed':413,'testAccuracy':float(accuracy_score(y[test],test_probs.argmax(axis=1))),'classReport':classification_report(y[test],test_probs.argmax(axis=1),target_names=labels,output_dict=True,zero_division=0),'confusionMatrix':confusion_matrix(y[test],test_probs.argmax(axis=1)).tolist(),'classes':labels,'thresholds':thresholds,'temperature':temperature,'note':'Held-out image classification only. This does not measure webcam bin decisions, unseen object rejection, contamination or physical deposits. Exact byte duplicates removed; near-duplicate leakage remains possible.'}
if timings:report['nativeFeatureInferenceMs']={'median':float(np.median(timings)),'p95':float(np.percentile(timings,95))}
manifest={'version':1,'name':'DLC material head','classes':labels,'featureCount':int(features.shape[1]),'inputName':input_name,'inputSize':224,'normalization':{'mean':[.485,.456,.406],'std':[.229,.224,.225]},'featureMean':scaler.mean_.round(7).tolist(),'featureScale':scaler.scale_.round(7).tolist(),'weights':(classifier.coef_/temperature).round(7).tolist(),'bias':(classifier.intercept_/temperature).round(7).tolist(),'thresholds':thresholds,'backbone':{'revision':'4c46cd00fbdb7cd30b6c1c17ab54f2e1f4f7b177','sha256':hashlib.sha256(Path(args.model).read_bytes()).hexdigest(),'name':'MobileNetV2-12 QDQ (ImageNet)','license':'Apache-2.0'},'evaluation':{k:report[k] for k in ['datasetImages','split','testAccuracy','note']}}
unit=features/np.maximum(np.linalg.norm(features,axis=1,keepdims=True),1e-9)
centroids=np.array([unit[train][y[train]==i].mean(axis=0) for i in range(len(labels))]);centroids/=np.maximum(np.linalg.norm(centroids,axis=1,keepdims=True),1e-9)
manifest['centroids']=centroids.round(7).tolist();manifest['minSimilarity']={label:float(np.percentile(unit[val][y[val]==i]@centroids[i],1)) for i,label in enumerate(labels)}
manifest['backbone']['name']='MobileNetV2-12 QDQ pooled features (ImageNet)'
Path(args.output).write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
(work/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(work/'split-manifest.json').write_text(json.dumps({'records':records,'train':train.tolist(),'validation':val.tolist(),'test':test.tolist()},indent=2),encoding='utf-8')
print(json.dumps({'phase':'complete','testAccuracy':report['testAccuracy'],'thresholds':thresholds,'output':args.output}),flush=True)
