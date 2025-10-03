// VHS Shader Implementation
(function() {
  const canvas = document.getElementById('vhs-canvas');
  const fallbackImg = document.getElementById('background');
  const IMAGE_WIDTH = 1600;
  const IMAGE_HEIGHT = 1000;
  const IMAGE_ASPECT_RATIO = IMAGE_WIDTH / IMAGE_HEIGHT;
  
  // Check for WebGL support
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    console.warn('WebGL not supported, falling back to image');
    fallbackImg.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }
  
  // Set canvas size while preserving aspect ratio
  function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let canvasWidth, canvasHeight;
    
    if (containerAspectRatio > IMAGE_ASPECT_RATIO) {
      // Container is wider than image
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * IMAGE_ASPECT_RATIO;
    } else {
      // Container is taller than image
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / IMAGE_ASPECT_RATIO;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Compile shader
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  // Create program
  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }
  
  // Load shader sources from files
  async function loadShaderSource(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${url}`);
    }
    return await response.text();
  }
  
  // Initialize shaders
  async function initShaders() {
    try {
      const vertexShaderSource = await loadShaderSource('vertex-shader.glsl');
      const fragmentShaderSource = await loadShaderSource('fragment-shader.glsl');
      
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      const program = createProgram(gl, vertexShader, fragmentShader);
      
      return program;
    } catch (error) {
      console.error('Error loading shaders:', error);
      return null;
    }
  }
  
  // Main initialization
  initShaders().then(program => {
    
    if (!program) {
      fallbackImg.style.display = 'block';
      canvas.style.display = 'none';
      return;
    }
    
    // Set up geometry (two triangles forming a rectangle)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);
    
    // Set up texture coordinates
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]), gl.STATIC_DRAW);
    
    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    const imageLocation = gl.getUniformLocation(program, 'u_image');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    
    // Load and set up texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Load image
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      render();
    };
    image.onerror = function() {
      console.error('Failed to load image, showing fallback');
      fallbackImg.style.display = 'block';
      canvas.style.display = 'none';
    };
    image.src = 'labias-alt.jpg';
    
    // Render loop
    let startTime = Date.now();
    function render() {
      const currentTime = (Date.now() - startTime) * 0.001; // Convert to seconds
      
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      gl.useProgram(program);
      
      // Set up position attribute
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Set up texture coordinate attribute
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Set uniforms
      gl.uniform1i(imageLocation, 0);
      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      
      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      requestAnimationFrame(render);
    }
  });
})();
