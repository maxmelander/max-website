import GlslCanvas from 'glslCanvas';

function component() {
  let body = document.getElementsByTagName('body')[0];
  body.style.margin = 0;
  body.style.overflow = "hidden";
  let canvas = document.createElement('canvas');
  canvas.width = window.innerWidth / 2;
  canvas.height = window.innerHeight / 2;
  let sandbox = new GlslCanvas(canvas);
  // Load only the Fragment Shader
  let shader = require('./fragment1.glsl');
  sandbox.load(shader);
  return canvas;
}

document.body.appendChild(component());
