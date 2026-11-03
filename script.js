(function () {
  'use strict';
  const canvas = document.getElementById('canvas');
  const bubble = document.getElementById('speech-bubble');
  const hint = document.getElementById('hint');
  const gl = canvas && canvas.getContext('webgl', { alpha: false, antialias: true });
  if (!gl) { if (hint) hint.textContent = 'WebGL is not available'; return; }

  let width = 0, height = 0, dpr = 1, waterTime = 0, bearTime = 0;
  let sunAngle = Math.PI * .25, renderStyle = 0, taps = 0, lastTap = 0;
  let bearPos = { x: 0, y: 0, radius: 25 }, splashes = [], audioCtx = null;

  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform float daylight;
    uniform float style;
    uniform vec2 bear;
    uniform float heading;
    uniform float splash;
    #define PI 3.14159265359
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                 mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
    }
    float circle(vec2 p, vec2 c, float r) { return length(p-c)-r; }
    float ellipse(vec2 p, vec2 c, vec2 r) { return (length((p-c)/r)-1.0)*min(r.x,r.y); }
    float mountainLine(float x) {
      float farRidge=.405+.035*sin(x*8.0)+.022*sin(x*17.0)+.012*sin(x*31.0);
      float peak=.30+.27*exp(-pow((x-.5)*4.0,2.0))+.025*sin(x*13.0);
      return min(farRidge,peak);
    }
    vec3 skyColor(vec2 uv) {
      vec3 night=vec3(.018,.035,.075), day=vec3(.25,.57,.79);
      vec3 sky=mix(night,day,daylight);
      float dusk=1.0-abs(daylight-.48)*2.0;
      sky=mix(sky,vec3(.83,.39,.28),clamp(dusk,0.0,1.0)*.42);
      float stars=(1.0-smoothstep(.08,.65,daylight))*step(.996,hash(floor(uv*vec2(150.,95.))));
      sky+=stars*.8;
      vec2 sun=vec2(.5+cos(time*.035)*.42,.44+sin(time*.035)*.38);
      float sd=length((uv-sun)*vec2(resolution.x/resolution.y,1.0));
      sky+=vec3(1.0,.62,.32)*exp(-sd*20.0)*.36;
      sky=mix(sky,vec3(1.0,.91,.72),1.0-smoothstep(.009,.014,sd));
      return sky;
    }
    vec3 terrain(vec2 uv) {
      float ridge=mountainLine(uv.x);
      if (uv.y<ridge) return skyColor(uv);
      float peak=.30+.27*exp(-pow((uv.x-.5)*4.0,2.0))+.025*sin(uv.x*13.0);
      float snowline=peak+.105*exp(-pow((uv.x-.5)*4.0,2.0));
      vec3 rock=mix(vec3(.075,.11,.15),vec3(.38,.45,.47),daylight);
      vec3 snow=mix(vec3(.34,.40,.51),vec3(.91,.94,.92),daylight);
      float grain=noise(uv*vec2(115.,90.))-.5;
      vec3 col=uv.y>snowline?snow:rock;
      col+=grain*(style>.5&&style<1.5?.10:.025);
      if (style>1.5) {
        vec2 px=floor(uv*vec2(110.,72.));
        col=mix(col,col+vec3(.12,.14,.16),step(.79,hash(px))*.55);
      }
      return col;
    }
    vec3 water(vec2 uv) {
      float depth=(.42-uv.y)/.42;
      vec3 col=mix(vec3(.045,.12,.17),vec3(.12,.36,.42),daylight);
      col=mix(col,vec3(.018,.055,.09),smoothstep(.1,1.0,depth)*.42);
      float wave=sin(uv.y*185.0+time*2.1+sin(uv.x*17.0)*2.2);
      float shimmer=step(.68,.5+.5*wave);
      float reflection=exp(-abs(uv.x-(.5+cos(time*.035)*.42))*5.0);
      col+=vec3(.10,.18,.19)*shimmer*(.12+depth*.35);
      col+=vec3(.27,.30,.24)*reflection*(.08+.12*sin(uv.y*105.0+time*2.8));
      if (style>1.5) {
        vec2 px=floor(uv*vec2(145.,90.));
        float n=hash(px);
        col=mix(col,col+vec3(.13,.19,.17),step(.76,n)*.48);
      } else if (style<.5) {
        col+=vec3(.025,.07,.08)*smoothstep(.45,.95,wave);
      } else {
        col+=(noise(uv*resolution*.65)-.5)*.045;
      }
      return col;
    }
    vec3 bearColor(vec2 uv) {
      vec2 p=(uv-bear)*vec2(resolution.x/resolution.y,1.0);
      float a=heading;
      p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
      float body=ellipse(p,vec2(-.017,0.),vec2(.054,.026));
      float head=circle(p,vec2(.016,0.),.034);
      float ears=min(circle(p,vec2(.002,.031),.012),circle(p,vec2(.002,-.031),.012));
      float shape=min(min(body,head),ears);
      float mask=1.0-smoothstep(-.0015,.0015,shape);
      float furNoise=noise(p*vec2(850.,700.));
      vec3 fur=vec3(.29,.16,.085);
      if (style>.5&&style<1.5) {
        fur=mix(vec3(.10,.05,.025),vec3(.66,.40,.22),smoothstep(-.04,.05,p.y+p.x*.4));
        fur+=(furNoise-.5)*.12;
      }
      if (style>1.5) fur=vec3(.34,.19,.10);
      float muzzle=1.0-smoothstep(.002,.006,ellipse(p,vec2(.041,0.),vec2(.019,.012)));
      float eyes=1.0-smoothstep(.001,.0035,min(circle(p,vec2(.027,.012),.0035),circle(p,vec2(.027,-.012),.0035)));
      float nose=1.0-smoothstep(.001,.0035,circle(p,vec2(.057,0.),.004));
      vec3 col=mix(fur,vec3(.60,.40,.26),muzzle*.85);
      col=mix(col,vec3(.012,.008,.006),max(eyes,nose));
      float paws=1.0-smoothstep(.002,.006,min(ellipse(p,vec2(.032,.039),vec2(.019,.009)),ellipse(p,vec2(.032,-.039),vec2(.019,.009))));
      col=mix(col,fur*.78,paws);
      if (style>1.5) {
        vec2 pixel=floor(p*vec2(390.,390.));
        col=mix(col,col*.68,step(.5,fract(pixel.x*.5+pixel.y*.5))*.22);
      }
      return mix(vec3(0.),col,mask)*mask;
    }
    void main() {
      vec2 uv=gl_FragCoord.xy/resolution;
      float horizon=.42;
      vec3 col=terrain(uv);
      if (uv.y<horizon) col=water(uv);
      vec2 sun=vec2(.5+cos(time*.035)*.42,.44+sin(time*.035)*.38);
      float sunDist=length((uv-sun)*vec2(resolution.x/resolution.y,1.0));
      col=mix(col,vec3(.96,.72,.47),exp(-sunDist*13.0)*.08);
      vec2 bp=bear;
      float shadow=1.0-smoothstep(.0,.018,length((uv-bp)*vec2(resolution.x/resolution.y,1.0)*vec2(1.,2.)));
      col=mix(col,col*.62,shadow*.25);
      vec3 bearCol=bearColor(uv);
      float bearMask=step(.0001,dot(bearCol,bearCol));
      col=mix(col,bearCol,bearMask);
      float ripple=abs(length((uv-bp)*vec2(resolution.x/resolution.y,.5))-.073-sin(time*3.0)*.003);
      col=mix(col,vec3(.72,.87,.88),(1.0-smoothstep(.0015,.0035,ripple))*.28);
      float sp=abs(length((uv-bp)*vec2(resolution.x/resolution.y,.65))-splash);
      col=mix(col,vec3(.83,.94,.95),(1.0-smoothstep(.001,.003,sp))*.35);
      if (style>.5&&style<1.5) {
        float vignette=1.0-smoothstep(.35,.85,length((uv-.5)*vec2(1.,.8)));
        col*=mix(.72,1.0,vignette);
        col+=(noise(uv*resolution*.8)-.5)*.035;
      }
      if (style>1.5) {
        vec2 pix=floor(uv*vec2(160.,100.));
        col*=.96+.04*hash(pix);
      }
      gl_FragColor=vec4(col,1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    if (hint) hint.textContent = 'WebGL renderer error';
    return;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = {};
  ['resolution','time','daylight','style','bear','heading','splash'].forEach(name => uniform[name] = gl.getUniformLocation(program, name));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function speakRelax() {
    try {
      initAudio();
      if (audioCtx) {
        const t = audioCtx.currentTime;
        [220,277.18,329.63,440].forEach((freq,i) => {
          const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
          osc.type='sine';
          osc.frequency.setValueAtTime(freq,t+i*.15);
          gain.gain.setValueAtTime(0,t+i*.15);
          gain.gain.linearRampToValueAtTime(.08,t+i*.15+.1);
          gain.gain.exponentialRampToValueAtTime(.001,t+i*.15+1.2);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(t+i*.15); osc.stop(t+i*.15+1.3);
        });
      }
    } catch (error) {}
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance('relax, relax');
      utter.rate=.75; utter.pitch=.85; utter.volume=1;
      const voice=window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));
      if (voice) utter.voice=voice;
      window.speechSynthesis.speak(utter);
    }
  }
  function interact() {
    speakRelax();
    splashes.push({life:0});
    if (bubble) {
      bubble.classList.add('visible');
      bubble.style.left=bearPos.x+'px';
      bubble.style.top=(bearPos.y-35)+'px';
      clearTimeout(bubble.timer);
      bubble.timer=setTimeout(()=>bubble.classList.remove('visible'),2800);
    }
    const now=Date.now();
    taps=now-lastTap>2600?1:taps+1;
    lastTap=now;
    if (taps>=3) { renderStyle=(renderStyle+1)%3; taps=0; }
  }
  canvas.addEventListener('pointerdown', event => {
    initAudio();
    const rect=canvas.getBoundingClientRect();
    if (Math.hypot(event.clientX-rect.left-bearPos.x,event.clientY-rect.top-bearPos.y)<bearPos.radius*2.8) interact();
  });

  function render() {
    waterTime+=.03;
    bearTime+=.008;
    sunAngle=(sunAngle+.0008)%(Math.PI*2);
    const horizon=height*.58, lakeHeight=height-horizon;
    const sunY=horizon-height*.05-Math.sin(sunAngle)*height*.38;
    const daylight=Math.max(0,Math.min(1,((horizon-sunY)/(height*.38)+.2)/1.2));
    const cx=width*.5, cy=horizon+lakeHeight*.55;
    const rx=width*.28, ry=lakeHeight*.28;
    const bx=cx+Math.cos(bearTime)*rx+Math.sin(bearTime*2)*20;
    const by=cy+Math.sin(bearTime)*ry;
    const nx=cx+Math.cos(bearTime+.02)*rx+Math.sin((bearTime+.02)*2)*20;
    const ny=cy+Math.sin(bearTime+.02)*ry;
    const heading=Math.atan2(ny-by,nx-bx);
    bearPos={x:bx,y:by,radius:Math.min(width,height)*.052};
    if (bubble&&bubble.classList.contains('visible')) {
      bubble.style.left=bx+'px';
      bubble.style.top=(by-35)+'px';
    }
    let splash=0;
    if (splashes.length) {
      splashes=splashes.filter(s=>s.life<1);
      if (splashes.length) {
        splashes.forEach(s=>s.life+=.018);
        splash=.075+Math.sin(splashes[0].life*Math.PI)*.025;
      }
    }
    gl.uniform2f(uniform.resolution,canvas.width,canvas.height);
    gl.uniform1f(uniform.time,waterTime);
    gl.uniform1f(uniform.daylight,daylight);
    gl.uniform1f(uniform.style,renderStyle);
    gl.uniform2f(uniform.bear,bx/width,1-by/height);
    gl.uniform1f(uniform.heading,-heading);
    gl.uniform1f(uniform.splash,splash);
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(render);
  }
  setTimeout(()=>{if(hint)hint.style.opacity='0';},6000);
  render();
})();