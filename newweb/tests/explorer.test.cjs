const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('explorer navigation keeps one shell, restores scroll and follows browser history',()=>{
 const handlers={};
 class Element{
  constructor(){this.nodes={};this.events={};this.open=false;this.scrollTop=0;this.innerHTML='';this.animations=0;}
  setAttribute(){} focus(){} append(){} querySelector(s){return this.nodes[s]??=new Element();} querySelectorAll(){return [];}
  addEventListener(n,f){this.events[n]=f;} getBoundingClientRect(){return {left:10,top:10,width:400,height:300};}
  showModal(){this.open=true;} close(){this.open=false;} animate(){this.animations++;return {cancel(){}};}
 }
 const dialog=new Element(),doc=new Element();doc.createElement=()=>dialog;doc.body=new Element();doc.activeElement=new Element();
 const location={hash:'',pathname:'/index.html',search:''};let at=0;const entries=[{hash:'',state:null}];
 const history={state:null,replaceState(s){this.state=s;entries[at].state=s;},pushState(s,_,url){entries.splice(++at);location.hash=url.startsWith('#')?url:'';entries.push({hash:location.hash,state:s});this.state=s;},back(){travel(-1)},forward(){travel(1)}};
 function travel(d){at+=d;Object.assign(location,{hash:entries[at].hash});history.state=entries[at].state;handlers.popstate();handlers.hashchange();}
 const window={addEventListener(n,f){handlers[n]=f;}};
 const context={window,document:doc,location,history,matchMedia:()=>({matches:false}),Map,decodeURIComponent};
 vm.createContext(context);vm.runInContext(fs.readFileSync('newweb/projects.js','utf8'),context);vm.runInContext(fs.readFileSync('newweb/operations.js','utf8'),context);vm.runInContext(fs.readFileSync('newweb/explorer.js','utf8'),context);
 const pane=dialog.querySelector('.explorer-scroll');
 window.openExplorer('Design');assert.equal(location.hash,'#design');assert.equal(dialog.open,true);assert.equal(dialog.animations,0);
 pane.scrollTop=450;pane.events.scroll();
 function click(route){dialog.events.click({target:{closest:s=>s==='[data-route]'?{dataset:{route}}:null},preventDefault(){}});}
 click('#design/tastoid');assert.match(pane.innerHTML,/TASTOID/);assert.equal(dialog.animations,0);assert.equal(pane.scrollTop,0);
 assert.match(pane.innerHTML,/class="explorer-detail explorer-detail--preview"/);
 history.back();assert.equal(location.hash,'#design');assert.equal(pane.scrollTop,450);
 history.forward();assert.equal(location.hash,'#design/tastoid');
 click('#design');assert.equal(pane.scrollTop,450);
 dialog.querySelector('.explorer-close').onclick();assert.equal(location.hash,'');assert.equal(dialog.open,false);
 history.back();assert.equal(dialog.open,true);assert.equal(location.hash,'#design');
 dialog.querySelector('.explorer-close').onclick();window.openExplorer('Operations');assert.match(pane.innerHTML,/Earlier Work/);
 pane.scrollTop=320;pane.events.scroll();
 for(const id of ['mimoon-party','merchant-operations','bar-events','jidaichufa']){
  click('#operations/'+id);
  assert.match(pane.innerHTML,/Project Overview/);
  assert.match(pane.innerHTML,/Gallery/);
  click('#operations');
  assert.equal(pane.scrollTop,320);
 }
});
