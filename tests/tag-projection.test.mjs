import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveARDetector} from '../dist/live-detector.js';
import {ObjectTracker} from '../dist/object-tracker.js';
function frame(dx,time,empty=false){const width=96,height=72,data=new Uint8Array(width*height).fill(35);if(!empty)for(let y=20;y<55;y++)for(let x=20;x<55;x++)data[y*width+x+dx]=(x*67+y*103+x*y*7)%220+25;return {width,height,data,time};}
function fixture(empty=false){const first=frame(0,0),latest=frame(4,100),ar=Object.assign(Object.create(LiveARDetector.prototype),{running:true,epoch:3,video:{videoWidth:96,videoHeight:72},tracker:new ObjectTracker(),history:[first,empty?frame(0,100,true):latest]});return {ar,reference:{frame:first,width:96,height:72,epoch:3}};}
const box={type:'Banana peel',certain:true,box_2d:[20/72*1000,20/96*1000,55/72*1000,55/96*1000]};
test('a delayed household box follows camera motion to the current position',()=>{const {ar,reference}=fixture();ar.addAssistedTags([box],reference);assert.equal(ar.tracker.tracks.length,1);assert.ok(Math.abs(ar.tracker.tracks[0].target[0]-24)<1);});
test('old AI boxes cannot attach after the object disappears',()=>{const {ar,reference}=fixture(true);ar.addAssistedTags([box],reference);assert.equal(ar.tracker.tracks.length,0);});
test('paused scans and replaced scan generations reject late household tags',()=>{const {ar,reference}=fixture();ar.epoch=4;ar.addAssistedTags([box],reference);assert.equal(ar.tracker.tracks.length,0);ar.epoch=3;ar.running=false;ar.addAssistedTags([box],reference);assert.equal(ar.tracker.tracks.length,0);});
test('responses older than the bounded motion history cannot paint stale tags',()=>{const {ar,reference}=fixture();ar.history.at(-1).time=15000;ar.addAssistedTags([box],reference);assert.equal(ar.tracker.tracks.length,0);});
