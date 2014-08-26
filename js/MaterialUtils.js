// This file is a part of the ProceduralUniverse
// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


define(["ShaderArchive"], function (ShaderArchive) {  // RequireJS API

// interface
return {
	'MaterialManager' : MaterialManager,
	'MaterialLoader' : MaterialLoader
};


function MaterialManager(param) {
	var materials = new Array();

	// params to construct THREE.ShaderMaterial
	var uniforms = param.uniforms;
	var vertShaderSrc = new Array();
	var fragShaderSrc = new Array();

	initVertShaderSrc(param.descriptions);
	initFragShaderSrc(param.descriptions);
	initMaterials(param.descriptions);

	function initVertShaderSrc(descList) {
		for (var i = 0; i < descList.length; i++) {
			vertShaderSrc[i] = ShaderArchive[descList[i].vertShaderName];
		}
	}

	function initFragShaderSrc(descList) {
		var srcNoiseLib = ShaderArchive["fs_noise"];
		var srcLightingLib = ShaderArchive["fs_lighting"];
		for (var i = 0; i < descList.length; i++) {
			var srcCore = ShaderArchive[descList[i].fragShaderName];
			var srcMainFunc = ShaderArchive[descList[i].isEmissive ? "fs_emissive" : "fs_nonemissive"];
			fragShaderSrc[i] = srcNoiseLib + srcLightingLib + srcCore + srcMainFunc;
		}
	}

	function initMaterials(descList) {
		for (var i = 0; i < descList.length; i++) {
			materials[i] = new THREE.ShaderMaterial({
				uniforms: uniforms,
				vertexShader: vertShaderSrc[i],
				fragmentShader: fragShaderSrc[i]
			});
		}
	}

	return ({
		getMaterial: function (index) {
			var legalIndex = index;
			if (legalIndex < 0 || legalIndex >= materials.length)
				legalIndex = 0;
			return materials[index];
		},

		getNumberOfMaterials: function () {
			return materials.length;
		},

		setUniforms: function (newUni) {
			uniforms = newUni;
		}
	});
}


// hack to fore browser to compile shaders and cache them
function MaterialLoader() {
	var camera = new THREE.PerspectiveCamera(45, 1, 1, 1);
	var geometry = new THREE.Geometry();
	geometry.vertices.push(new THREE.Vector3(0, 0, -1000));  // this point must not be culled
	var mesh = new THREE.PointCloud(geometry);
	var scene = new THREE.Scene();
	scene.add(mesh);

	return ({
		load: function (param) {
			if (navigator.userAgent.toUpperCase().search("CHROME") > 0) {
				param.target.initMaterial(param.material , {}, {}, mesh);
			}
			else {
				mesh.material = param.material;
				param.target.render(scene, camera);
			}
		}
	});
}

} /* function */ );  // end of define()
