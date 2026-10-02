import type { Design } from "./design";

const vertexSource = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
// Original domain-warped color fields. One full-screen draw; no textures or geometry.
export const fragmentSource = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time, u_scale, u_distortion, u_grain, u_seed, u_mode;
uniform vec3 u_c0, u_c1, u_c2, u_c3;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x/u_resolution.y, 1.0);
  float t = u_time * 0.22 + u_seed * 0.37;
  float s = 1.0 + u_scale * 2.0;
  float d = u_distortion;
  vec2 q = p * s;
  vec3 color;
  if (u_mode < 0.5) {
    for (int i = 1; i <= 4; i++) {
      float k = float(i);
      q += (0.35 + d * 0.42) / k * vec2(sin(q.y * k + t * 0.8 + k * 1.2), cos(q.x * k - t * 0.6 + k));
    }
    float f = sin(q.x * 1.7 + q.y * 1.9 + sin(q.y * 2.2 + t) * 0.5);
    float g = cos(q.y * 1.1 - q.x * 0.8 + t * 0.3);
    color = mix(u_c0, u_c1, smoothstep(-0.9, 0.4, f));
    color = mix(color, u_c2, smoothstep(-0.15, 0.9, g + f * 0.35));
    color = mix(color, u_c3, pow(max(0.0, sin(q.x * 1.3 + q.y + t * 0.12)), 10.0) * 0.85);
    color *= 0.84 + 0.16 * smoothstep(-1.0, 1.0, f);
  } else if (u_mode < 1.5) {
    vec2 a = vec2(sin(t)*0.55,cos(t*0.8)*0.45);
    vec2 b = vec2(cos(t*0.7)*0.5,sin(t*0.9)*0.45);
    float m = sin(q.x * 1.3 + sin(q.y * 2.0 + t) * d);
    color = mix(u_c0, u_c1, smoothstep(-1.0,1.0,m));
    color = mix(color,u_c2,exp(-length(p-a)* (1.7+s*0.35)));
    color = mix(color,u_c3,exp(-length(p-b)* (2.3+s*0.6)));
  } else if (u_mode < 2.5) {
    float radius = length(p * vec2(0.85, 1.0));
    float angle = atan(p.y,p.x);
    float ring = 0.29 + sin(angle*2.0+t)*0.04*d;
    float glow = exp(-abs(radius-ring)*(8.0+s*2.0));
    float core = exp(-radius*4.0);
    color = mix(u_c0,u_c1,core*0.7);
    color = mix(color,u_c2,glow*0.8);
    color = mix(color,u_c3,pow(glow,4.0)*(0.55+0.4*sin(angle+t)));
  } else {
    float wave = q.y + sin(q.x*1.4+t)*0.7*d + sin(q.x*2.5-t*0.5)*0.2;
    float band = sin(wave*5.0 + q.x*0.7);
    color = mix(u_c0,u_c1,smoothstep(-0.9,0.2,band));
    color = mix(color,u_c2,pow(max(0.0,band),2.0));
    color = mix(color,u_c3,pow(max(0.0,band),18.0)*0.7);
  }
  color += (hash(gl_FragCoord.xy + u_seed) - 0.5) * u_grain * 0.25;
  gl_FragColor = vec4(clamp(color,0.0,1.0),1.0);
}`;
const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export type Renderer = ReturnType<typeof createRenderer>;
export function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL is unavailable on this device.");
  const shaders: WebGLShader[] = [];
  let allocatedProgram: WebGLProgram | null = null;
  let allocatedBuffer: WebGLBuffer | null = null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Could not allocate a shader.");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log || "Shader compilation failed.");
    }
    return shader;
  };
  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource),
      fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    allocatedProgram = program;
    if (!program) throw new Error("Could not allocate the renderer.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Could not link the renderer.");
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    allocatedBuffer = buffer;
    if (!buffer) throw new Error("Could not allocate the renderer buffer.");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const names = [
      "u_resolution",
      "u_time",
      "u_scale",
      "u_distortion",
      "u_grain",
      "u_seed",
      "u_mode",
      "u_c0",
      "u_c1",
      "u_c2",
      "u_c3",
    ];
    const uniforms = Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program, name)]),
    );
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    const limit = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      viewport[0],
      viewport[1],
      4096,
    );
    function draw(design: Design, time: number, width: number, height: number) {
      const ratio = Math.min(1, limit / width, limit / height);
      const w = Math.max(1, Math.round(width * ratio)),
        h = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl!.viewport(0, 0, w, h);
      gl!.useProgram(program);
      gl!.uniform2f(uniforms.u_resolution, w, h);
      gl!.uniform1f(uniforms.u_time, time);
      gl!.uniform1f(uniforms.u_scale, design.scale / 100);
      gl!.uniform1f(uniforms.u_distortion, design.distortion / 100);
      gl!.uniform1f(uniforms.u_grain, design.grain / 100);
      gl!.uniform1f(uniforms.u_seed, design.seed);
      gl!.uniform1f(
        uniforms.u_mode,
        ["flow", "mesh", "halo", "ribbons"].indexOf(design.effect),
      );
      design.colors.forEach((c, i) =>
        gl!.uniform3fv(uniforms[`u_c${i}`], channels(c)),
      );
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    function dispose(releaseContext = false) {
      gl!.deleteBuffer(buffer);
      gl!.deleteProgram(program);
      if (releaseContext) gl!.getExtension("WEBGL_lose_context")?.loseContext();
    }
    return { draw, dispose, limit };
  } catch (error) {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteBuffer(allocatedBuffer);
    gl.deleteProgram(allocatedProgram);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw error;
  }
}
export async function exportImage(
  design: Design,
  time: number,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas);
  try {
    if (width > renderer.limit || height > renderer.limit)
      throw new Error(
        `This device supports exports up to ${renderer.limit} pixels. Choose a lower resolution.`,
      );
    renderer.draw(design, time, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image encoding failed."))),
        "image/png",
      ),
    );
    return blob;
  } finally {
    renderer.dispose(true);
  }
}
export function thumbnail(design: Design) {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas);
  try {
    renderer.draw(design, 0, 360, 220);
    return canvas.toDataURL("image/png");
  } finally {
    renderer.dispose(true);
  }
}
