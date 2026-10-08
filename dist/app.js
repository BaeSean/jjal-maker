'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
const palettes={mint:['#e7f6c9','#98be65'],purple:['#e3d4ff','#a28acc'],blue:['#d2edfa','#71b6d5'],white:['#ffffff','#e6e9e0']};
let bg='mint',photo=null,effect='none',selected=0,images=[],drag=null,uploadGeneration=0;
const newLayer=(text='텍스트를 입력하세요',y=50)=>({text,x:50,y,size:72,color:'#ffffff',font:'sans-serif',outline:true});
let layers=[newLayer('텍스트를 입력하세요',50)];
function announce(text){$('status').textContent=text;}
function sync(){const l=layers[selected];$('layers').replaceChildren(...layers.map((l,i)=>{const b=document.createElement('button');b.textContent=`문구 ${i+1}`;b.className=i===selected?'active':'';b.setAttribute('aria-pressed',i===selected);b.onclick=()=>{selected=i;sync();};return b;}));for(const key of ['text','font','color','size','outline']){ $(key).disabled=!l;if(l){if(key==='outline')$(key).checked=l[key];else $(key).value=l[key];}}$('delete').disabled=!l;$('add').disabled=layers.length>=8; $('size-out').textContent=l?`${l.size}px`:'';render();}
function lines(l){ctx.font=`900 ${l.size}px ${l.font}`;const result=[];for(const paragraph of l.text.split('\n')){let row='';for(const char of Array.from(paragraph)){if(ctx.measureText(row+char).width>canvas.width*.9&&row){result.push(row);row=char;}else row+=char;}result.push(row);}return result;}
function render(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.save();ctx.filter=({none:'none',mono:'grayscale(1)',warm:'sepia(.65) saturate(.8)',punch:'saturate(1.8) contrast(1.2)'})[effect];if(photo)ctx.drawImage(photo,0,0,w,h);else{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,palettes[bg][0]);g.addColorStop(1,palettes[bg][1]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}ctx.restore();if($('speed').checked){ctx.save();ctx.fillStyle='#14180eb3';for(let i=0;i<64;i++){const a=i*Math.PI/32,r=Math.max(w,h),inner=r*(.32+.13*(Math.sin(i*31)+1)/2);ctx.beginPath();ctx.moveTo(w/2+Math.cos(a)*inner,h/2+Math.sin(a)*inner);ctx.lineTo(w/2+Math.cos(a-.012)*r,h/2+Math.sin(a-.012)*r);ctx.lineTo(w/2+Math.cos(a+.012)*r,h/2+Math.sin(a+.012)*r);ctx.fill();}ctx.restore();}for(const l of layers){const rows=lines(l),lh=l.size*1.22;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,l.size*.095);ctx.strokeStyle='#171b13';ctx.fillStyle=l.color;rows.forEach((s,i)=>{const y=h*l.y/100+(i-(rows.length-1)/2)*lh;if(l.outline)ctx.strokeText(s,w*l.x/100,y);ctx.fillText(s,w*l.x/100,y);});}$('dimensions').textContent=`${w} × ${h} px`;}
for(const key of ['text','font','color','size','outline'])$(key).addEventListener('input',()=>{const l=layers[selected];if(!l)return;l[key]=key==='outline'?$(key).checked:key==='size'?Number($(key).value):$(key).value;render();$('size-out').textContent=`${l.size}px`;});
$('add').onclick=()=>{if(layers.length>=8)return;layers.push(newLayer());selected=layers.length-1;sync();};$('delete').onclick=()=>{layers.splice(selected,1);selected=Math.max(0,selected-1);sync();};
function setPhoto(img){photo=img;for(const el of $('presets').children){el.classList.remove('active');el.setAttribute('aria-pressed','false');}const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);render();}
$('presets').onclick=e=>{const b=e.target.closest('[data-bg]');if(!b)return;bg=b.dataset.bg;photo=null;canvas.width=canvas.height=900;for(const el of $('presets').children){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}render();};
function decodeImage(blob) {
  const url=URL.createObjectURL(blob), img=new Image();
  return new Promise((resolve,reject)=>{
    img.onload=()=>resolve({url,img});
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('이미지 읽기 실패'));};
    img.src=url;
  });
}
function showImage(item) {
  images.push(item);
  const card=document.createElement('div'), pick=document.createElement('button');
  const thumb=document.createElement('img'), remove=document.createElement('button');
  card.className='image-card';thumb.src=item.url;thumb.alt=item.name;
  pick.append(thumb);pick.onclick=()=>setPhoto(item.img);
  remove.className='image-remove';remove.textContent='삭제';
  remove.setAttribute('aria-label',`${item.name} 삭제`);
  remove.onclick=async()=>{
    if(!confirm('이 이미지를 브라우저 보관함에서 삭제할까요?'))return;
    remove.disabled=true;
    try {
      if(item.persisted)await imageStore.remove(item.id);
      images=images.filter(image=>image!==item);card.remove();
      if(photo===item.img)$('presets').querySelector(`[data-bg="${bg}"]`).click();
      URL.revokeObjectURL(item.url);announce('이미지를 삭제했습니다.');
    } catch {remove.disabled=false;announce('이미지 삭제에 실패했습니다. 다시 시도해 주세요.');}
  };
  card.append(pick,remove);$('images').append(card);
}
async function restoreImages() {
  $('upload').disabled=true;
  try {
    const records=await imageStore.list();
    let failed=0;
    for(const record of records.sort((a,b)=>a.createdAt-b.createdAt)) {
      try {showImage({...record,...await decodeImage(record.blob),persisted:true});}
      catch {failed++;}
    }
    if(failed)announce('일부 저장된 이미지를 읽지 못했습니다.');
  } catch {announce('브라우저 저장소를 사용할 수 없습니다. 업로드한 이미지는 현재 탭에서만 유지됩니다.');}
  finally {$('upload').disabled=false;}
}
const libraryReady=restoreImages();
let uploadQueue=Promise.resolve();
async function uploadFiles(files,generation) {
  await libraryReady;
  for(const f of files) {
    if(generation!==uploadGeneration)break;
    if(images.length>=12){announce('최대 12장까지 보관할 수 있습니다. 기존 이미지를 삭제한 뒤 추가해 주세요.');break;}
    if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)||f.size>20*1024*1024){announce('20MB 이하 JPG, PNG, WebP, GIF 파일을 선택해 주세요.');continue;}
    let decoded;
    try {decoded=await decodeImage(f);}
    catch {announce('이미지를 읽지 못했습니다. 다른 파일을 선택해 주세요.');continue;}
    if(generation!==uploadGeneration){URL.revokeObjectURL(decoded.url);break;}
    const record={id:crypto.randomUUID(),name:f.name,blob:f,createdAt:Date.now()};
    let persisted=false;
    try {await imageStore.put(record);persisted=true;}
    catch { /* Keep the usable image in this tab if persistence is unavailable. */ }
    showImage({...record,...decoded,persisted});
    if(generation===uploadGeneration)setPhoto(decoded.img);
    announce(persisted?'이미지를 브라우저에 저장했습니다.':'브라우저 저장에 실패했습니다. 이 이미지는 현재 탭에서만 사용할 수 있습니다.');
  }
}
function upload(files) {
  const selectedFiles=Array.from(files), generation=uploadGeneration;
  $('upload').value='';
  uploadQueue=uploadQueue.then(()=>uploadFiles(selectedFiles,generation)).catch(()=>announce('이미지 처리에 실패했습니다. 다시 시도해 주세요.'));
}
$('upload').onchange=e=>upload(e.target.files);
$('dropzone').ondragover=e=>e.preventDefault();
$('dropzone').ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files);};
$('effects').onclick=e=>{const b=e.target.closest('[data-effect]');if(!b)return;effect=b.dataset.effect;for(const el of $('effects').children){el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);}render();};$('speed').onchange=render;
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};}
canvas.onpointerdown=e=>{const p=point(e);for(let i=layers.length-1;i>=0;i--){const l=layers[i],rows=lines(l),width=Math.max(...rows.map(s=>ctx.measureText(s).width))/canvas.width*100;if(Math.abs(p.x-l.x)<width/2+3&&Math.abs(p.y-l.y)<rows.length*l.size*1.22/canvas.height*50+2){selected=i;drag={x:p.x-l.x,y:p.y-l.y};canvas.setPointerCapture(e.pointerId);sync();break;}}};canvas.onpointermove=e=>{if(!drag)return;const p=point(e),l=layers[selected];l.x=Math.max(5,Math.min(95,p.x-drag.x));l.y=Math.max(5,Math.min(95,p.y-drag.y));render();};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
let savedUrl=null;$('download').onclick=()=>{render();canvas.toBlob(blob=>{if(!blob){announce('저장에 실패했습니다. 다시 시도해 주세요.');return;}if(savedUrl)URL.revokeObjectURL(savedUrl);savedUrl=URL.createObjectURL(blob);const a=document.createElement('a');a.href=savedUrl;a.download=`짤만들기-${Date.now()}.png`;a.click();const img=document.createElement('img');img.src=savedUrl;img.alt='완성된 짤 — 길게 눌러 저장할 수 있습니다.';$('saved').replaceChildren(img);announce('PNG를 만들었습니다. 모바일에서는 아래 이미지를 길게 눌러 저장할 수 있습니다.');},'image/png');};
$('reset').onclick=()=>{if(!confirm('현재 작업을 지우고 처음부터 시작할까요?'))return;uploadGeneration++;photo=null;bg='mint';effect='none';canvas.width=canvas.height=900;layers=[newLayer('텍스트를 입력하세요',50)];selected=0;$('speed').checked=false;$('presets').firstElementChild.click();$('effects').firstElementChild.click();$('saved').replaceChildren();if(savedUrl)URL.revokeObjectURL(savedUrl);savedUrl=null;announce('새 작업을 시작합니다.');sync();};
sync();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_meme_caption',description:'현재 선택한 짤 문구를 수정합니다.',inputSchema:{type:'object',properties:{text:{type:'string',maxLength:240}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.text!=='string'||input.text.length>240||!layers[selected])throw new Error('선택된 문구와 240자 이하 텍스트가 필요합니다.');layers[selected].text=input.text;sync();return {text:layers[selected].text};}})).catch(()=>{});}catch{}}
