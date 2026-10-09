// All image processing stays in the browser. The attachment itself is unchanged.
export async function photoCanvas(source, angle = 0) {
  const image = new Image(); image.src = source; await image.decode();
  const canvas = document.createElement('canvas');
  const radians = angle * Math.PI / 180;
  canvas.width = Math.ceil(Math.abs(image.width * Math.cos(radians)) + Math.abs(image.height * Math.sin(radians)));
  canvas.height = Math.ceil(Math.abs(image.height * Math.cos(radians)) + Math.abs(image.width * Math.sin(radians)));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  return canvas;
}

export async function prepareOcrImage(source, {angle = 0, crop, threshold = false} = {}) {
  const original = await photoCanvas(source, angle);
  const area = crop || {x:0,y:0,width:1,height:1};
  const width = original.width * area.width, height = original.height * area.height;
  const scale = Math.min(3, 3000 / Math.max(width,height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(width * scale)); canvas.height = Math.max(1,Math.round(height * scale));
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  ctx.drawImage(original, area.x * original.width, area.y * original.height,width,height,0,0,canvas.width,canvas.height);
  const pixels = ctx.getImageData(0,0,canvas.width,canvas.height), data = pixels.data;
  const gray = new Uint8Array(canvas.width * canvas.height);
  const histogram = new Uint32Array(256);
  for(let i=0;i<gray.length;i++){gray[i]=Math.round(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114);histogram[gray[i]]++;}
  let low=0,high=255,count=0;
  while(low<254 && count<gray.length*.02)count+=histogram[low++];
  count=0;while(high>low+1 && count<gray.length*.02)count+=histogram[high--];
  // Local threshold compensates for uneven illumination on paper receipts.
  const stride=canvas.width+1;
  const integral=threshold ? new Float64Array(stride*(canvas.height+1)) : null;
  if(integral)for(let y=0;y<canvas.height;y++){let sum=0;for(let x=0;x<canvas.width;x++){sum+=gray[y*canvas.width+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=y*canvas.width+x;let value=(gray[i]-low)*255/Math.max(1,high-low);
    if(integral){const x1=Math.max(0,x-25),x2=Math.min(canvas.width,x+26),y1=Math.max(0,y-25),y2=Math.min(canvas.height,y+26);const mean=(integral[y2*stride+x2]-integral[y1*stride+x2]-integral[y2*stride+x1]+integral[y1*stride+x1])/((x2-x1)*(y2-y1));value=gray[i]<mean-12 ? 0 : 255;}
    data[i*4]=data[i*4+1]=data[i*4+2]=value;
  }
  ctx.putImageData(pixels,0,0);
  return canvas.toDataURL('image/png');
}
