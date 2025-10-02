precision mediump float;

uniform sampler2D u_image;
uniform float u_time;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

// Noise function
float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

// VHS distortion
vec2 distort(vec2 uv, float time) {
  float wobble = sin(uv.y * 10.0 + time * 2.0) * 0.003;
  uv.x += wobble;
  return uv;
}

// Chromatic aberration
vec3 chromaticAberration(vec2 uv, sampler2D tex) {
  float aberration = 0.005;
  vec3 color;
  color.r = texture2D(tex, uv + vec2(aberration, 0.0)).r;
  color.g = texture2D(tex, uv).g;
  color.b = texture2D(tex, uv - vec2(aberration, 0.0)).b;
  return color;
}

// Tracking bands effect
vec2 trackingBands(vec2 uv, float time) {
  float bandHeight = 0.05; // Height of each tracking band
  float bandSpeed = 0.20; // Speed of band movement
  
  // Create multiple bands at different positions
  float band1 = sin(uv.y * 20.0 + time * bandSpeed) * 0.01;
  float band2 = sin(uv.y * 15.0 + time * bandSpeed * 0.7) * 0.008;
  float band3 = sin(uv.y * 25.0 + time * bandSpeed * 1.3) * 0.006;
  
  // Only apply bands occasionally
  float bandTrigger = sin(time * 0.5) * 0.5 + 0.5;
  if (bandTrigger > 0.7) {
    uv.x += band1 + band2 + band3;
  }
  
  return uv;
}

// Head switching effect - creates a sweeping black band
float headSwitching(vec2 uv, float time) {
  // Head switching occurs every few seconds
  float switchInterval = -12.0; // Time between head switches
  float switchTime = mod(time, switchInterval);
  
  // The band sweeps from top to bottom
  float bandPosition = switchTime / switchInterval;
  float bandWidth = 0.025; // Width of the black band
  
  // Check if current pixel is within the switching band
  float distance = abs(uv.y - bandPosition);
  
  if (distance < bandWidth) {
    // Within the band - make it black
    return 0.05;
  } else if (distance < bandWidth * 2.0) {
    // Edge of the band - smooth transition
    return smoothstep(bandWidth, bandWidth * 2.0, distance);
  }
  
  return 1.0;
}

void main() {
  vec2 uv = v_texCoord;

  // Apply distortion
  uv = distort(uv, u_time);

  // Apply tracking bands
  uv = trackingBands(uv, u_time);

  // Chromatic aberration
  vec3 color = chromaticAberration(uv, u_image);

  // Add scan lines
  float scanLine = sin(uv.y * u_resolution.y * 0.5 + u_time * 10.0) * 0.1 + 0.9;
  color *= scanLine;

  // Add noise
  float noise = rand(uv + u_time) * 0.1;
  color += noise;

  // Color bleeding effect
  vec3 bleed = vec3(0.0);
  for (int i = -2; i <= 2; i++) {
    float offset = float(i) * 0.002;
    bleed += texture2D(u_image, uv + vec2(offset, 0.0)).rgb * (1.0 - abs(float(i)) * 0.3);
  }
  bleed /= 5.0;
  color = mix(color, bleed, 0.3);

  // Slight desaturation and color shift for VHS look
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(gray), 0.1);

  // Apply head switching effect
  float headSwitch = headSwitching(uv, u_time);
  color *= headSwitch;

  // Add some flicker
  float flicker = sin(u_time * 50.0) * 0.02 + 0.98;
  color *= flicker;

  gl_FragColor = vec4(color, 1.0);
}
