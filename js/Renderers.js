// This file is a part of the ProceduralUniverse
// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


define(["ShaderArchive", "MaterialUtils"], function (ShaderArchive, MaterialUtils) {  // RequireJS API

// interface
return {
	'PlanetRenderer' : PlanetRenderer,
	'SpaceRenderer' : SpaceRenderer
};


function NumberRotater(maxNumber) {
	var currIndex = 0;
	var maxIndex = maxNumber - 1;
	
	return ({
		rotateForward: function () {
			if (++currIndex > maxIndex)
				currIndex = 0;
		},
		rotateBackward: function () {
			if (--currIndex < 0)
				currIndex = maxIndex;
		},
		getCurrentIndex: function () {
			return currIndex;
		},
		setCurrentIndex: function (index) {
			currIndex = Math.abs(index) % (maxIndex + 1);
		}
	});
}


function PlanetRenderer(param) {
	var planetDescList = param.planets;

	var texture;
	var uniformsPlanet;
	var uniformsAtmos;

	var surfaceMatMgr;
	var atmosMat;

	var geometryPlanet;
	var geometryAtmos;
	var meshPlanet;
	var meshAtmos;

	var scene;

	var planetRotator;
	var defaultIndex = 4;  // Earth by default
	var autoSelfRotation = true;

	var materialLoader;

	init();

	function init() {
		initNoisePerm();
		initUniforms();
		initMaterials();
		initRotator(surfaceMatMgr.getNumberOfMaterials());

		initGeometries();
		initScene();

		updateMaterial();
	}

	function evalGradient(noise) {
		noise &= 0x0F;
		var u = (noise<8 || noise==12 || noise==13 ? 1 : 2);
		var v = (noise<4 || noise==12 || noise==13 ? 2 : 3);
		u = ((noise & 1) ? -u : u);
		v = ((noise & 2) ? -v : v);

		var vecU = new THREE.Vector3(0, 0, 0);
		vecU.setComponent(Math.abs(u) - 1, (u > 0 ? 1 : -1));
		var vecV = new THREE.Vector3(0, 0, 0);
		vecV.setComponent(Math.abs(v) - 1, (v > 0 ? 1 : -1));

		vecU.add(vecV);
		vecU.addScalar(1);  // make negative elements positive
		return vecU;
	}

	function initNoisePerm() {
		// generate the noise permutation of no unique integers
		// both values within and indices to the array should form a close ring
		var noisePerm = new Uint8Array(256);
		for (var i = 0; i < 256; i++)
			noisePerm[i] = i;

		// randomly re-permute the array
		for (var i = 0; i < 256; i++) {
			var swappedIndex = Math.floor(Math.random() * 256);
			var tmpVal = noisePerm[i];
			noisePerm[i] = noisePerm[swappedIndex];
			noisePerm[swappedIndex] = tmpVal;
		}

		// pre-compute the texture of gradients for all (x, y, z) where x, y, and z are in [0, 256).
		// each gradient is of form (l, m, n) where l, m, and n are all integers in [-1, 1].
		// however to avoid negative numbers, before the gradient is written to a texel, each component is added by 1.
		var precompGradient3D = new Uint16Array(256 * 256 * 256);
		for (var iz = 0; iz < 256; iz++) {
			var blockX = (iz & 0x0F);
			var blockY = iz >> 4;
			for (var iy = 0; iy < 256; iy++) {
				for (var ix = 0; ix < 256; ix++) {
					var indexBase = ((4095 - blockY * 256 - iy) * 4096 + (blockX * 256 + ix));

					var hashedIndex = ix;
					hashedIndex = ((noisePerm[hashedIndex] + iy) & 0xFF);
					hashedIndex = ((noisePerm[hashedIndex] + iz) & 0xFF);

					var gradient = evalGradient(noisePerm[hashedIndex]);
					precompGradient3D[indexBase]   = (gradient.z << 12) + (gradient.y << 8) + (gradient.x << 4);
				}
			}
		}

		texture = new THREE.DataTexture(precompGradient3D, 4096, 4096, THREE.RGBAFormat, THREE.UnsignedShort4444Type);
		texture.unpackAlignment = 4;
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.magFilter = texture.minFilter = THREE.NearestFilter;
		texture.generateMipmaps = false;
		texture.needsUpdate = true;
	}

	function initUniforms() {
		uniformsPlanet = {
			t_gradients	: {type: "t", value: texture},
			u_radius	: {type: "f", value: 25},
			u_transform : {type: "m4", value: new THREE.Matrix4()},
			u_lightDir  : {type: "v3", value: new THREE.Vector3(-0.7071067, 0, -0.7071067)}
		};
		uniformsAtmos = {
			u_enableAtmos : {type: "f", value: 0},
			u_atmosColor  : {type: "v3", value: new THREE.Vector3(0, 0, 0)},
			u_transform   : {type: "m4", value: new THREE.Matrix4()},
			u_lightDir    : {type: "v3", value: new THREE.Vector3(-0.7071067, 0, -0.7071067)}
		};
	}

	function initMaterials() {
		surfaceMatMgr = new MaterialUtils.MaterialManager({
			uniforms: uniformsPlanet,
			descriptions: planetDescList,
		});

		atmosMat = new THREE.ShaderMaterial({
			transparent: true,
			uniforms: uniformsAtmos,
			vertexShader: ShaderArchive["vs_planet"],
			fragmentShader: ShaderArchive["fs_atmosphere"]
		});
	}

	function initRotator(numOfMat) {
		planetRotator = new NumberRotater(numOfMat);
		planetRotator.setCurrentIndex(defaultIndex);
	}

	function initGeometries() {
		// planet surface
		geometryPlanet = new THREE.SphereGeometry(25, 200, 200);
		meshPlanet = new THREE.Mesh(geometryPlanet, surfaceMatMgr.getMaterial(planetRotator.getCurrentIndex()));
		meshPlanet.rotation.x = 0.6;

		// atmosphere
		geometryAtmos = new THREE.SphereGeometry(1, 200, 200);
		meshAtmos = new THREE.Mesh(geometryAtmos, atmosMat);
	}

	function initScene() {
		scene = new THREE.Scene();
		scene.add(meshPlanet);
		scene.add(meshAtmos);
	}

	function updateMaterial() {
		meshPlanet.material = surfaceMatMgr.getMaterial(planetRotator.getCurrentIndex());

		meshAtmos.material.uniforms.u_enableAtmos.value = (planetDescList[planetRotator.getCurrentIndex()].hasAtmosphere ? 1.0 : -1.0);
		meshAtmos.material.uniforms.u_atmosColor.value = planetDescList[planetRotator.getCurrentIndex()].atmosphereColor;
		var radius = geometryPlanet.parameters.radius + planetDescList[planetRotator.getCurrentIndex()].atmosphereThickness;
		meshAtmos.material.uniforms.u_transform.value.identity();
		meshAtmos.material.uniforms.u_transform.value.scale(new THREE.Vector3(radius, radius, radius));
	}

	var loadingCounter = 0;

	return ({
		stepLoading: function (param) {
			if (loadingCounter < surfaceMatMgr.getNumberOfMaterials()) {
				this.setCurrentPlanet(loadingCounter);

				var material = surfaceMatMgr.getMaterial(planetRotator.getCurrentIndex());
				if (typeof materialLoader == "undefined")
					materialLoader = new MaterialUtils.MaterialLoader();
				materialLoader.load({
					target: param.target,
					material: material
				});

				loadingCounter++;
			}

			var loadedPercentage = (loadingCounter / surfaceMatMgr.getNumberOfMaterials());
			if (loadedPercentage >= 1)
				this.setCurrentPlanet(defaultIndex);  // set to default
			return loadedPercentage;
		},

		toggleAutoSelfRotation: function () {
			autoSelfRotation ^= true;
		},

		renderNextFrameTo: function (param) {
			if (autoSelfRotation)
				meshPlanet.rotation.y += 0.003;
			param.target.render(scene, param.camera);
		},

		rotateForward: function () {
			planetRotator.rotateForward();
			updateMaterial();
		},

		rotateBackward: function () {
			planetRotator.rotateBackward();
			updateMaterial();
		},

		setCurrentPlanet: function (index) {
			if (index != planetRotator.getCurrentIndex) {
				planetRotator.setCurrentIndex(index);
				updateMaterial();
			}
		},

		getCurrentPlanet: function () {
			return planetRotator.getCurrentIndex();
		}
	});
}


function SpaceRenderer() {
	var numStarsAmbient = 200000;
	var numStarsMilkyway = 200000;

	var geometry;
	var mesh;
	var scene;

	init();

	function init() {
		initGeometry();
		initScene();
	}

	function initGeometry() {
		var numIteration = numStarsAmbient + numStarsMilkyway;
		geometry = new THREE.Geometry();
		geometry.vertices = new Array(numIteration);  // pre-allocate
		geometry.colors = new Array(numIteration);  // pre-allocate

		for (var i = 0; i < numIteration; i++) {
			var sample;
			if (i < numStarsAmbient)
				sample = new UniformSphereSample(Math.random(), Math.random());  // uniformly distrubute onto the spherical surface
			else
				sample = new MilkyWaySample(Math.random(), Math.random());
			geometry.vertices[i] = new THREE.Vector3(sample.phi, sample.theta);  // milky way

			var color = new StellarColorSample(Math.random(), Math.random());
			geometry.colors[i] = new THREE.Vector3(color.r, color.g, color.b);
		}

		// attributes for star colors
		var attributes = {
			vertColor: { type: 'v3', value: geometry.colors }
		};

		var shaderMar = new THREE.ShaderMaterial({
			uniforms: {
				u_radius: { type: "f", value: 100000 },
				u_pointSize: { type: "f", value: 1 }
			},
			vertexShader: ShaderArchive["vs_space"],
			fragmentShader: ShaderArchive["fs_space"],
			attributes: attributes,
			depthTest: false,
			depthWrite: false
		});

		mesh = new THREE.ParticleSystem(geometry, shaderMar);
		mesh.rotation.x = -0.3;
	}

	// (x, y) is in [0, 1]^2
	function UniformSphereSample(x, y) {
		return ({
			phi: x * Math.PI * 2,  // phi [0, 2*PI]
			theta: Math.acos((y - 0.5) * 2)  // theta [-PI/2, PI/2]
		});
	}

	// (x, y) is in [0, 1]^2
	function MilkyWaySample(x, y) {
		var power = 0.08;  // smaller for more concentrated milky way
		return ({
			phi: x * Math.PI * 2,  // phi [0, 2*PI]
			theta: Math.acos((1 - Math.pow(y, power)) * (Math.random() > 0.5 ? 1 : -1))  // theta [-PI/2, PI/2]
		});
	}

	// (x, y) is in [0, 1]^2
	function StellarColorSample(x, y) {
		// ref: http://www.jstor.org/stable/40710095
		var probType = [0.12, 0.31, 0.12, 0.10, 0.28, 0.07];  // order: BAFGKM
		var probBrightness = [0.006, 0.019, 0.063, 0.214, 0.698];  // 2.5 ~ 6.5 (step=1.0)

		// ref: http://www.vendian.org/mncharity/dir3/starcolor/
		var stellarColors = [
			[0xaa, 0xbf, 0xff],  // B
			[0xca, 0xd7, 0xff],  // A
			[0xf8, 0xf7, 0xff],  // F
			[0xff, 0xf4, 0xea],  // G
			[0xff, 0xd2, 0xa1],  // K
			[0xff, 0xcc, 0x6f]   // M
		];

		// get stellar type
		function getType(x) {
			var acc = 0;
			for (var i = 0; i < probType.length; i++) {
				acc += probType[i];
				if (acc >= x)
					return i;
			}
			return probType.length - 1;
		}

		// get stellar brightness
		// mapping input to n/probBrightness.length (n = 1, 2 ... probBrightness.length)
		function getBrightness(x) {
			var acc = 0;
			for (var i = 0; i < probBrightness.length; i++) {
				acc += probBrightness[i];
				if (acc >= x)
					return (1 - i / probBrightness.length);
			}
			return 0;
		}

		var stellarType = getType(x);
		var stellarBrightness = Math.min(getBrightness(y) + 0.2, 1);
		return ({
			r: stellarColors[stellarType][0] / 256 * stellarBrightness,
			g: stellarColors[stellarType][1] / 256 * stellarBrightness,
			b: stellarColors[stellarType][2] / 256 * stellarBrightness
		});
	}

	function initScene() {
		scene = new THREE.Scene();
		scene.add(mesh);
	}

	return ({
		renderNextFrameTo: function (param) {
			var date = new Date();
			mesh.rotation.z = date.getTime() * 5e-6;
			param.target.render(scene, param.camera);
		}
	});
}

} /* function */ );  // end of define()
