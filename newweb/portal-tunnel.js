(() => {
  const TAU = Math.PI * 2;
  const sides = 96;
  const slices = 104;
  const length = 56;
  const colors = ['#ff91d7', '#8ce8ff', '#ffdc86', '#b39aff'];

  function wallArt() {
    const art = document.createElement('canvas');
    art.width = 1024;
    art.height = 2048;
    const ctx = art.getContext('2d');

    function clock(i) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 1, 1, 0, 0, TAU);
      ctx.fillStyle = '#201635';
      ctx.fill();
      ctx.lineWidth = .12;
      ctx.stroke();
      ctx.beginPath();
      for (let j = 0; j < 12; j++) {
        const a = j * TAU / 12;
        ctx.moveTo(Math.cos(a) * .9, Math.sin(a) * .9);
        ctx.lineTo(Math.cos(a) * .74, Math.sin(a) * .74);
      }
      ctx.moveTo(Math.cos(i) * .65, Math.sin(i) * .65);
      ctx.lineTo(0, 0);
      ctx.lineTo(.39, .26);
      ctx.lineWidth = .085;
      ctx.stroke();
    }

    for (let i = 0; i < 150; i++) {
      const isClock = i < 42;
      const x = (i * .381966 % 1) * art.width;
      const y = (isClock ? .02 + i * .023 : i * .618034 % 1) * art.height;
      const size = (isClock ? 41 : 10) * (.8 + i % 5 * .12);
      const color = colors[i % colors.length];
      for (const offset of [-art.width, 0, art.width]) {
        ctx.save();
        ctx.translate(x + offset, y);
        ctx.scale(size, size * .63);
        ctx.rotate((i % 7 - 3) * .15);
        ctx.fillStyle = ctx.strokeStyle = color;
        if (isClock) clock(i);
        else {
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const a = j * TAU / 8, r = j % 2 ? .31 : 1;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
    return art;
  }

  window.createPortalTunnel = (canvas, {grid = false} = {}) => {
    const gl = canvas.getContext('webgl', {alpha: false, antialias: true});
    if (!gl) return null;
    canvas.width = Math.min(1050, Math.max(2, Math.round(innerWidth * .8)));
    canvas.height = Math.max(2, Math.round(canvas.width * innerHeight / innerWidth));
    const program = gl.createProgram();

    function shader(type, source) {
      const object = gl.createShader(type);
      gl.shaderSource(object, source);
      gl.compileShader(object);
      if (!gl.getShaderParameter(object, gl.COMPILE_STATUS)) return false;
      gl.attachShader(program, object);
      return true;
    }

    if (!shader(gl.VERTEX_SHADER, `
      attribute vec2 samplePoint;
      uniform float forward, roll;
      uniform vec2 scale;
      varying vec2 wall;
      varying float depth;
      void main() {
        float a = samplePoint.x * 6.2831853;
        float z = .22 + samplePoint.y * 24.0;
        float s = forward + z;
        float phase = a * 3.0 - s * .82;
        float r = 3.35 + .65 * sin(s * 1.25) + .56 * cos(phase) + .26 * sin(a * 5.0 + s * 1.4);
        vec2 p = vec2(1.78 * (sin(s*.37)-sin(forward*.37)), 1.22 * (sin(s*.51)-sin(forward*.51)));
        p += r * vec2(cos(a), sin(a));
        p = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * p;
        gl_Position = vec4(p.x * scale.x, -p.y * scale.y, z * 1.008 - .39, z);
        wall = vec2(samplePoint.x, s);
        depth = z;
      }
    `) || !shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D decals;
      varying vec2 wall;
      varying float depth;
      void main() {
        float a = wall.x * 6.2831853, s = wall.y;
        float fold = .5 + .5*cos(a*3.0-s*.82+1.15);
        float ripple = .5 + .5*sin(s*1.25+a*2.0+.5*sin(s*.7));
        float tint = .5 + .5*sin(a*2.0-s*.41);
        float light = .18 + .64*fold*fold + .18*ripple;
        vec3 base = vec3(.075,.095,.255);
        vec3 cyan = vec3(.27,.59,.96), periwinkle = vec3(.36,.36,.82);
        vec3 surface = mix(base,mix(cyan,periwinkle,tint),light) + vec3(.04,.12,.17)*pow(fold,8.0)*ripple;
        ${grid ? `
        vec2 mesh = vec2(wall.x * 28.0, s * 1.12);
        vec2 cell = abs(fract(mesh + .5) - .5);
        float line = 1.0 - smoothstep(.012, .054, min(cell.x, cell.y));
        surface = mix(surface, vec3(.53,.77,1.0), line * .55 * exp(-depth * .05));
        ` : ''}
        vec4 mark = texture2D(decals, vec2(wall.x,s/${length}.0));
        surface = mix(surface,mark.rgb,mark.a*.96);
        gl_FragColor = vec4(mix(base,surface,exp(-depth*.082)),1.0);
      }
    `)) return null;
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    const vertices = [];
    const indices = [];
    for (let i = 0; i <= slices; i++) {
      for (let j = 0; j <= sides; j++) {
        vertices.push(j / sides, i / slices);
        if (i < slices && j < sides) {
          const k = i * (sides + 1) + j;
          indices.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
        }
      }
    }
    function buffer(target, data) {
      gl.bindBuffer(target, gl.createBuffer());
      gl.bufferData(target, data, gl.STATIC_DRAW);
    }
    buffer(gl.ARRAY_BUFFER, new Float32Array(vertices));
    const point = gl.getAttribLocation(program, 'samplePoint');
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(point);
    buffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices));

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wallArt());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(.075, .095, .255, 1);
    const focal = Math.max(canvas.width, canvas.height) * .65;
    gl.uniform2f(gl.getUniformLocation(program, 'scale'), 2 * focal / canvas.width, 2 * focal / canvas.height);
    const forward = gl.getUniformLocation(program, 'forward');
    const roll = gl.getUniformLocation(program, 'roll');

    return progress => {
      const distance = 3.5 * progress + 27 * progress ** 2.9;
      gl.uniform1f(forward, distance);
      gl.uniform1f(roll, .17 * Math.sin(distance * .24) + .41 * progress ** 2);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    };
  };
})();
