(function(){
'use strict';
var root=document.getElementById('dos');
if(!root)return;
var pre=document.createElement('pre'),inp=document.createElement('input');
inp.setAttribute('autocapitalize','off');inp.setAttribute('autocomplete','off');inp.setAttribute('spellcheck','false');
root.appendChild(pre);root.appendChild(inp);
var buf=[],cur='',busy=true,hist=[],hi=0,cwd='C:\\',skip=false,au=null,MAXL=200,prompting=false;
var now=new Date(),clr='';
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function draw(){
var h=buf.join('\n');
if(prompting)h+=(buf.length?'\n':'')+'<span class="w">'+esc(cwd)+'&gt;</span>'+esc(cur)+'<span class="cur"></span>';
else if(busy)h+='<span class="cur"></span>';
pre.innerHTML=h;
var rows=Math.floor((root.clientHeight-20)/(parseFloat(getComputedStyle(pre).lineHeight)||19));
var n=pre.innerHTML.split('\n').length;
if(n>rows){var drop=n-rows,lines=pre.innerHTML.split('\n');pre.innerHTML=lines.slice(drop).join('\n');
if(buf.length>MAXL)buf.splice(0,buf.length-MAXL)}}
function out(s,cls){var a=String(s).split('\n');for(var i=0;i<a.length;i++)buf.push(cls?'<span class="'+cls+'">'+esc(a[i])+'</span>':esc(a[i]));draw()}
function raw(s){buf.push(s);draw()}
function beep(f,d){try{if(!au){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;au=new AC()}
var o=au.createOscillator(),g=au.createGain();o.type='square';o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(au.destination);o.start();o.stop(au.currentTime+d)}catch(e){}}
var FS={'C:\\':{d:['DOS','GAMES','DOC'],f:[['COMMAND.COM',54619],['CONFIG.SYS',112],['AUTOEXEC.BAT',163],['IO.SYS',40774],['MSDOS.SYS',38138]]},
'C:\\DOS':{d:[],f:[['EDIT.COM',413],['FORMAT.COM',22974],['MEM.EXE',39482],['QBASIC.EXE',254],['HIMEM.SYS',29136]]},
'C:\\GAMES':{d:[],f:[['KEEN4.EXE',201824],['DOOM.EXE',709012],['MONKEY.EXE',86400],['PRINCE.EXE',123456]]},
'C:\\DOC':{d:[],f:[['README.TXT',512],['BRIEF.TXT',98]]}};
var TXT={'README.TXT':'cr34te.it DOS 6.22 emulation.\nNicht alles hier ist echt. Das meiste schon.\nTipp: tippe HELP.','BRIEF.TXT':'Hallo Raimund,\nder Kaffee ist alle. Bitte nachkaufen.\n-- Das Imperium','AUTOEXEC.BAT':'@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS\nSET BLASTER=A220 I5 D1 T4','CONFIG.SYS':'DEVICE=C:\\DOS\\HIMEM.SYS\nDOS=HIGH\nFILES=40'};
function pad(s,n){s=String(s);while(s.length<n)s+=' ';return s}
function lpad(s,n){s=String(s);while(s.length<n)s=' '+s;return s}
function num(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function dir(path,wide){
var e=FS[path];
out(' Datentraeger in Laufwerk C ist CR34TE\n Seriennummer: 1995-0A4F\n Verzeichnis von '+path+'\n');
var n=0,b=0,i,d=now.getDate()+'.'+(now.getMonth()+1)+'.'+String(now.getFullYear()).slice(2);
if(path!=='C:\\'){out(wide?'[.]  [..]':'.            <DIR>        '+d);if(!wide)out('..           <DIR>        '+d)}
for(i=0;i<e.d.length;i++){out(wide?'['+e.d[i]+']':pad(e.d[i],13)+'<DIR>        '+d)}
for(i=0;i<e.f.length;i++){out(wide?e.f[i][0]:pad(e.f[i][0],13)+lpad(num(e.f[i][1]),10)+'  '+d);n++;b+=e.f[i][1]}
out(lpad(n,10)+' Datei(en)'+lpad(num(b),14)+' Bytes\n'+lpad(e.d.length,10)+' Verzeichnis(se)  '+lpad('212.860.928',12)+' Bytes frei')}
function tree(){out('Ordnerliste\nC:.\n'+'+---DOS\n+---GAMES\n\\---DOC')}
function find(n){var e=FS[cwd],i,p;n=n.toUpperCase();if(n.indexOf('\\')>=0){p=n.split('\\');n=p.pop();p=p.join('\\');p=p.indexOf('C:')===0?p:(cwd==='C:\\'?'C:\\'+p:cwd+'\\'+p);if(p==='C:')p='C:\\';e=FS[p];if(!e)return null}for(i=0;i<e.f.length;i++)if(e.f[i][0]===n)return n;return null}
var CMD={
HELP:function(){out('Verfuegbare Befehle:\n\nDIR [/W]  CD  CLS  TYPE  ECHO  VER  DATE  TIME  VOL  MEM  TREE\nCOLOR  MD  DEL  COPY  FORMAT  CHKDSK  PROMPT  EXIT  HELP\nund einige Programme: DOOM  KEEN4  MONKEY  PRINCE  WIN  EDIT')},
VER:function(){out('\nMS-DOS Version 6.22')},
CLS:function(){buf=[];draw()},
DIR:function(a){dir(cwd,/\/W/i.test(a))},
TREE:tree,
CD:function(a){a=a.trim().toUpperCase();
if(!a||a==='.'){out(cwd);return}
if(a==='\\'||a==='..\\'){cwd='C:\\';return}
if(a==='..'){cwd='C:\\';return}
var p=cwd==='C:\\'?'C:\\'+a.replace(/^\\/,''):cwd+'\\'+a;
if(a.indexOf('C:')===0)p=a;
if(FS[p])cwd=p;else out('Ungueltiges Verzeichnis')},
TYPE:function(a){var n=find(a.trim());if(!a.trim()){out('Erforderlicher Parameter fehlt');return}
if(!n)out('Datei nicht gefunden - '+a.trim().toUpperCase());else if(TXT[n])out(TXT[n]);else out('\u0001\u0002\u0003 binaer, nicht lesbar '+n,'r')},
ECHO:function(a){out(a.trim()===''?'ECHO ist eingeschaltet':a)},
DATE:function(){out('Aktuelles Datum: '+['So','Mo','Di','Mi','Do','Fr','Sa'][now.getDay()]+' '+now.getDate()+'.'+(now.getMonth()+1)+'.'+now.getFullYear())},
TIME:function(){var t=new Date();out('Aktuelle Zeit: '+t.toTimeString().slice(0,8)+',00')},
VOL:function(){out(' Datentraeger in Laufwerk C ist CR34TE\n Seriennummer: 1995-0A4F')},
MEM:function(){out('Speichertyp        Gesamt     Belegt      Frei\n----------------  --------  --------  --------\nKonventionell         640K       48K      592K\nObere                  96K       96K        0K\nErweitert (XMS)    15.328K      384K   14.944K\n----------------  --------  --------  --------\nGesamtspeicher     16.064K      528K   15.536K\n\nGroesster ausfuehrbarer Programmteil     592K')},
COLOR:function(a){var m={'GREEN':'#5f5','AMBER':'#fa0','WHITE':'#b8b8b8','CYAN':'#5ff'},k=a.trim().toUpperCase();
if(m[k]){root.style.color=m[k];out('Farbe: '+k)}else out('Parameter: COLOR GREEN | AMBER | WHITE | CYAN')},
MD:function(a){a=a.trim().toUpperCase();if(!a){out('Erforderlicher Parameter fehlt');return}
var p=cwd==='C:\\'?'C:\\'+a:cwd+'\\'+a;if(FS[p]){out('Verzeichnis existiert bereits');return}
FS[p]={d:[],f:[]};FS[cwd].d.push(a)},
DEL:function(a){var n=find(a.trim());if(!n){out('Datei nicht gefunden');return}
var f=FS[cwd].f,i;for(i=0;i<f.length;i++)if(f[i][0]===n)f.splice(i,1);out('(simuliert, nichts wird wirklich geloescht)')},
COPY:function(a){out('        1 Datei(en) kopiert')},
FORMAT:function(a){out('WARNUNG: ALLE DATEN AUF LAUFWERK C: GEHEN VERLOREN!\nFormatiere 212,86M ...','y');
busy=true;var p=0,iv=setInterval(function(){p+=11+Math.random()*17;if(p>=100){clearInterval(iv);out('Haha. Nur ein Scherz. Alles noch da. Nimm das, Imperium.','g');busy=false;prompting=true;draw()}
else{buf[buf.length-1]='<span class="y">Formatiere '+Math.round(p)+'%</span>';draw()}},350);prompting=false;draw();return true},
CHKDSK:function(){out('\n 212.860.928 Bytes Gesamtspeicherplatz\n      40.774 Bytes in 1 versteckten Datei(en)\n 212.820.154 Bytes frei\n\nKeine Fehler gefunden. Ueberraschend.')},
PROMPT:function(){out('Prompt bleibt $P$G. Mehr Freiheit gabs 1995 auch nicht.')},
EXIT:function(){out('Tschuess.','y');setTimeout(closeDos,400)},
WIN:function(){out('Windows 3.1 wird gestartet ...\nFehler: Nicht genug Arbeitsspeicher fuer diese Nostalgie.','r')},
DOOM:function(){out('DOOM v1.9 wird geladen ...\nIDKFA\nSpeicher ist knapp. Rip and tear spaeter.','r')},
KEEN4:function(){out('Commander Keen: Geheimnis des Orakels\nBitte Joystick kalibrieren (es gibt keinen).')},
MONKEY:function(){out('Du bist ein maechtiger Pirat.\nDu hast keinen Zugriff auf die Grog-Maschine.','c')},
PRINCE:function(){out('Du hast 60 Minuten. Du hast 59 verschwendet.')},
EDIT:function(){out('EDIT.COM: Bildschirm zu klein fuer Ambitionen.')},
HELLO:function(){out('Hallo. soso.')},
SOSO:function(){out('aha.')},
DEBUG:function(){out('-q','g')}};
CMD.CHDIR=CMD.CD;CMD.MKDIR=CMD.MD;CMD.ERASE=CMD.DEL;
function run(line){
var t=line.trim();
if(!t){return}
var m=t.match(/^([A-Za-z.]+)(.*)$/),c=m?m[1].toUpperCase():'',a=m?m[2].replace(/^[ \/]/,function(x){return x==='/'?'/':''}):'';
if(c==='CD..'){CMD.CD('..');return}
var fn=CMD[c];
if(c.indexOf('.')>0){var b=c.split('.')[0];if(CMD[b]&&/\.(EXE|COM|BAT)$/.test(c))fn=CMD[b]}
if(!fn){out('Falscher Befehl oder Dateiname');return}
return fn(a)}
function key(line){
hist.push(line);hi=hist.length;
raw('<span class="w">'+esc(cwd)+'&gt;</span>'+esc(line));
var wait=run(line);
if(wait===true){return}
cur='';draw()}
function boot(){
var L=[
['Award Modular BIOS v4.51PG, An Energy Star Ally','w'],
['Copyright (C) 1984-95, Award Software, Inc.',''],
['',''],
['PENTIUM-S CPU at 133MHz',''],
['MEMTEST','mem'],
['',''],
['Award Plug and Play BIOS Extension v1.0A',''],
['Detecting IDE Primary Master ... QUANTUM FIREBALL 210MB','c'],
['Detecting IDE Primary Slave  ... None',''],
['',''],
['Press DEL to enter SETUP  (nicht jetzt)','y'],
['',''],
['Starting MS-DOS ...','w'],
['',''],
['HIMEM is testing extended memory ... done.',''],
['SoundBlaster 16 gefunden: A220 I5 D1 T4','g'],
['MSCDEX Version 2.23: Laufwerk D = CDR101',''],
['',''],
['Microsoft(R) MS-DOS(R) Version 6.22','w'],
['            (C)Copyright Microsoft Corp 1981-1994.',''],
['','']];
var i=0;
function next(){
if(i>=L.length){busy=false;prompting=true;draw();return}
var l=L[i++];
if(l[1]==='mem'){var k=0,iv=setInterval(function(){k+=skip?4096:512;
if(k>=16384){k=16384;clearInterval(iv);buf[buf.length-1]='Memory Test :  16384K OK';draw();setTimeout(next,skip?0:300);return}
buf[buf.length-1]='Memory Test :  '+k+'K';draw()},30);buf.push('Memory Test :  0K');draw();return}
if(l[0]===''){buf.push('')}else out(l[0],l[1]);
draw();
setTimeout(next,skip?0:(i<4?90:160+Math.random()*220))}
beep(1000,.15);
next()}
function focus(){try{inp.focus({preventScroll:true})}catch(e){}}
root.addEventListener('pointerdown',function(){focus()});
window.addEventListener('keydown',function(e){
if(root.style.display==='none')return;
if(busy&&!prompting){skip=true;return}
if(!prompting)return;
if(e.key==='Enter'){e.preventDefault();var l=cur;cur='';inp.value='';key(l);return}
if(e.key==='Backspace'){cur=cur.slice(0,-1);inp.value=cur;draw();e.preventDefault();return}
if(e.key==='ArrowUp'){if(hi>0){hi--;cur=hist[hi];inp.value=cur;draw()}e.preventDefault();return}
if(e.key==='ArrowDown'){if(hi<hist.length-1){hi++;cur=hist[hi]}else{hi=hist.length;cur=''}inp.value=cur;draw();e.preventDefault();return}
if(e.key==='Escape'){cur='';inp.value='';draw();return}
if(e.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){cur+=e.key;inp.value=cur;draw();e.preventDefault()}});
inp.addEventListener('input',function(){if(prompting){cur=inp.value;draw()}});
addEventListener('resize',draw);
var started=false,btn=document.getElementById('dosbtn'),x=document.createElement('button');
x.textContent='X  ZURUECK';x.style.cssText='position:absolute;right:8px;top:8px;font:inherit;color:#000;background:#b8b8b8;border:0;padding:2px 8px;cursor:pointer';
root.appendChild(x);
function closeDos(){root.style.display='none'}
function openDos(){root.style.display='block';if(!started){started=true;boot()}focus()}
x.addEventListener('click',function(e){e.stopPropagation();closeDos()});
if(btn)btn.addEventListener('click',openDos);
})();
