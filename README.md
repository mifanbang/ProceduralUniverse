#ProceduralUniverse

Realtime Perlin noise-based procedural textures for various celestial objects. Implemented with WebGL.

A live demo can be found at http://debug.tw/lab/proc_univ/

#### Introduction

This project is to demonstrate the idea of that by using a combination of several Perlin noise functions, we can approximate surfaces of many planets and stars. Everything rendered on the canvas is procedurally generated and no external texture is used.

The noise function is randomly generated every time the browser loads the page. So you can expect to see the shape of continents on Earth change after reloading.

The code requires WebGL support in your browser. I would recommend Chrome but FireFox also works well. The shaders are somewhat computationally intensive. They run at 20~30 fps on NVIDIA GTS 250 and 60 fps on GTX 560 Ti.

#### Instructions for Use

- First you must have a decent graphics processer and a WebGL-enabled browser.
- Press 0~9 or LEFT/RIGHT key to switch between celestial objects.
- Use mouse buttons and wheel to control the camera.
- Press L to switch auto self rotation on and off.
- Press Z to toggle fps profiler at the top-left corner of the canvas.

#### Building the Code

Since shaders are composed in fragments, listing and packaging all shader fragments into a single archive is needed based on performance consideration. Execute the script *BuildShaderArchive.pl* in the root directory and it will automatically find all files of extension *.shfr* within the directory *shaders/*. If nothing went wrong, you will find the output file at *js/ShaderArchive.js* as a RequireJS module.

#### Copyright

ProceduralUniverse - A WebGL renderer of procedural textures for various celestial objects.
Copyright (C) 2013-2014 Mifan Bang <http://debug.tw>.

This project stands on the shoulders of other great work. They can be found in the dep/ directory.

- three.js by three.js authors - http://threejs.org/
- stats.js by Mr.doob - http://mrdoob.com
- TrackBallControls.js by Eberhard Graether - http://egraether.com/
- Detector.js by alteredq - http://alteredqualia.com/
- RequireJS by The Dojo Foundation - http://requirejs.org/
