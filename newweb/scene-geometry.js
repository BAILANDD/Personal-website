/* Shared mapping for the centered, cover-sized 1672 × 941 background. */
(function(root){
 function sceneGeometry(width,height){
  const scale=Math.max(width/1672,height/941);
  const offsetX=(width-1672*scale)/2,offsetY=(height-941*scale)/2;
  return {scale,offsetX,offsetY,arch:{x:offsetX+170*scale,y:offsetY+482*scale,width:178*scale,height:140*scale}};
 }
 if(typeof module!=='undefined')module.exports=sceneGeometry;
 else root.sceneGeometry=sceneGeometry;
})(globalThis);
