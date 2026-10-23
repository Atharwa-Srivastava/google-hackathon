import {classifyWasteObject} from './waste-rules.js';
// Explicit names only: model prose cannot turn a person or a chair into a tag.
const aliases={'plastic bottle':'clear plastic bottle','cardboard box':'cardboard','drink can':'drink can','food tin':'food can','glass jar':'glass jar','glass bottle':'glass bottle','banana peel':'banana peel','orange peel':'orange peel','vegetable scraps':'vegetable scraps','eggshells':'eggshells','tea leaves':'tea leaves','coffee cup':'paper cup','plastic lid':'plastic lid','snack wrapper':'crisp packet','plastic bag':'single-use carrier bag','drink carton':'drink carton','used tissue':'tissues','battery':'battery','pizza box':'pizza box','newspaper':'normal paper','yogurt tub':'rigid plastic container','paper':'normal paper','plastic':'other plastic','metal can':'drink can','cardboard':'cardboard','food scraps':'food waste','paper bag':'paper bag','cardboard egg carton':'cardboard egg carton','rigid plastic container':'rigid plastic container','plastic bottle cap':'plastic bottle cap'};
export function normalizeLiveTags(objects,width,height){
 if(!Array.isArray(objects))return [];
 const tags=[];for(const p of objects.slice(0,30)){
  if(!p||typeof p.type!=='string')continue;const key=aliases[p.type.toLowerCase().trim()];if(!key)continue;
  const info=classifyWasteObject(key),b=p.box_2d;if(!info.recognized||!Array.isArray(b)||b.length!==4||!b.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000))continue;
  const [y1,x1,y2,x2]=b;if(x2-x1<5||y2-y1<5||(x2-x1)*(y2-y1)>980000)continue;
  tags.push({key,info,bbox:[x1/1000*width,y1/1000*height,(x2-x1)/1000*width,(y2-y1)/1000*height],score:p.certain===true?.78:.48,source:'gemini'});
 }return tags;
}
