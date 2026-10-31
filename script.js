(() => {
'use strict';
const $=id=>document.getElementById(id);
const names=['KICK','SNARE','HI-HAT','CLAP'];
const colors=['#a6ff68','#ff9874','#62d9ff','#f4a7ff'];
const patterns={basic:[[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],break:[[1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0],[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0]],minimal:[[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]};
let pattern=patterns.basic.map(a=>a.slice()),volumes=[.8,.65,.35,.5],step=0,playing=false,timer=null,audio=null,noise=null,noticeTimer=null;
const tracks=$('tracks');
function build(){
$('stepNumbers').innerHTML='<span></span>'+Array.from({length:16},(_,i)=>`<span>${String(i+1).padStart(2,'0')}</span>`).join('');
tracks.innerHTML='';
pattern.forEach((row,r)=>{const line=document.createElement('div');line.className='track';line.style.setProperty('--track',colors[r]);const label=document.createElement('div');label.className='track-label';label.innerHTML=`<i></i>${names[r]}`;line.append(label);row.forEach((on,i)=>{const b=document.createElement('button');b.className='step'+(on?' active':'');b.type='button';b.setAttribute('aria-label',names[r]+' step '+(i+1));b.setAttribute('aria-pressed',String(!!on));b.addEventListener('click',()=>{pattern[r][i]^=1;b.classList.toggle('active',!!pattern[r][i]);b.setAttribute('aria-pressed',String(!!pattern[r][i]));});line.append(b);});tracks.append(line);});
}
function buildVolumes(){const box=$('volumes');names.forEach((name,i)=>{const el=document.createElement('div');el.className='volume-row';el.style.setProperty('--track',colors[i]);el.innerHTML=`<label for="vol${i}">${name}</label><output id="volout${i}">${Math.round(volumes[i]*100)}%</output><input id="vol${i}" type="range" min="0" max="100" value="${Math.round(volumes[i]*100)}" aria-label="${name} volume">`;box.append(el);$('vol'+i).addEventListener('input',e=>{volumes[i]=Number(e.target.value)/100;$('volout'+i).textContent=e.target.value+'%';});});}
function initAudio(){if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){hint('AUDIO IS NOT SUPPORTED IN THIS BROWSER');return false;}audio=new AC();const length=audio.sampleRate;noise=audio.createBuffer(1,length,audio.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;}if(audio.state==='suspended')audio.resume();return true;}
function tone(freq,end,duration,type='sine',gain=.3,slide=0){const t=audio.currentTime;const osc=audio.createOscillator(),amp=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);amp.gain.setValueAtTime(Math.max(.0001,gain),t);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(amp);amp.connect(audio.destination);osc.start(t);osc.stop(t+duration+.02);}
function hiss(duration,gain,filterFreq){const t=audio.currentTime,src=audio.createBufferSource(),filter=audio.createBiquadFilter(),amp=audio.createGain();src.buffer=noise;filter.type='highpass';filter.frequency.value=filterFreq;amp.gain.setValueAtTime(gain,t);amp.gain.exponentialRampToValueAtTime(.0001,t+duration);src.connect(filter);filter.connect(amp);amp.connect(audio.destination);src.start(t);src.stop(t+duration+.02);}
function sound(r){if(!audio||!volumes[r])return;const v=volumes[r];if(r===0){tone(155,0,.22,'sine',v*.85,-120);tone(65,0,.12,'triangle',v*.35,-35);}if(r===1){hiss(.16,v*.4,1200);tone(190,0,.13,'triangle',v*.55,-90);}if(r===2){hiss(.045,v*.28,6500);}if(r===3){hiss(.19,v*.5,900);tone(500,0,.07,'square',v*.13,-250);}}
function hint(message){const el=$('hint');el.textContent=message;el.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),1700);}
function highlight(){const lines=tracks.querySelectorAll('.track');lines.forEach(line=>line.querySelectorAll('.step').forEach((b,i)=>b.classList.toggle('current',playing&&i===step)));$('position').textContent=playing?String(step+1).padStart(2,'0'):'--';}
function tick(){for(let r=0;r<4;r++)if(pattern[r][step])sound(r);highlight();step=(step+1)%16;}
function interval(){clearInterval(timer);timer=setInterval(tick,60000/Number($('tempo').value)/4);}
function play(){if(!initAudio())return;if(playing)return;playing=true;$('play').textContent='▶ PLAYING';$('play').classList.add('is-playing');tick();interval();hint('BEAT IS LIVE · EDIT STEPS ANYTIME');}
function stop(){playing=false;clearInterval(timer);timer=null;step=0;$('play').textContent='▶ PLAY';$('play').classList.remove('is-playing');highlight();}
$('play').addEventListener('click',play);$('stop').addEventListener('click',stop);
$('tempo').addEventListener('input',e=>{$('tempoValue').textContent=e.target.value;if(playing)interval();});
document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>{const name=btn.dataset.preset;if(name==='random'){pattern=pattern.map(()=>Array.from({length:16},()=>Math.random()<.3?1:0));}else pattern=patterns[name].map(row=>row.slice());build();hint(name==='random'?'CHAOS PATTERN GENERATED':'PATTERN LOADED');}));
build();buildVolumes();highlight();
})();
