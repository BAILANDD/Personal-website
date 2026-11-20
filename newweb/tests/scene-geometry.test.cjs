const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../scene-geometry.js'),'utf8'),context);
const geometry=context.sceneGeometry;
test('arch coordinates track the same centered cover transform at desktop, tablet and phone sizes',()=>{
 for(const [w,h] of [[1672,941],[1512,802],[1920,1080],[2560,1080],[1024,768],[768,1024],[390,850],[430,932]]){
  const {scale,offsetX,offsetY,arch}=geometry(w,h);
  assert.ok(scale*1672>=w-1e-8&&scale*941>=h-1e-8);
  assert.ok(Math.abs((arch.x-offsetX)/scale-170)<1e-8);
  assert.ok(Math.abs((arch.y-offsetY)/scale-482)<1e-8);
  assert.ok(Math.abs(arch.width/scale-178)<1e-8);
  assert.ok(Math.abs(arch.height/scale-140)<1e-8);
  const clipped=arch.x<0||arch.x+arch.width>w||arch.y<0||arch.y+arch.height>h;
  if(w===1672)assert.equal(clipped,false);
  if(w===390||w===430)assert.equal(clipped,true);
 }
});
