// This file is a part of the ProceduralUniverse
// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


define({
'fs_atmosphere' : ' \
	uniform float	u_enableAtmos; \n \
	uniform vec3	u_atmosColor; \n \
	uniform vec3	u_lightDir; \n \
	varying vec3	v_worldPosition; \n \
	varying vec3	v_worldNormal; \n \
	float GetGrain(vec2 co) { \n \
		float f = sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453; \n \
		return fract(f); \n \
	} \n \
	void main(void) { \n \
		if (u_enableAtmos >= 0.0) { \n \
			vec3 viewDir = normalize(cameraPosition - v_worldPosition); \n \
			float thickness = clamp(1.0 - dot(viewDir, v_worldNormal), 0.0, 1.0); \n \
			float enhancedThickness; \n \
			float threshold = 0.85; \n \
			if (thickness > threshold) \n \
				thickness = threshold - smoothstep(0.0, threshold, (thickness - threshold) / (1.0 - threshold)); \n \
			enhancedThickness = pow(max(thickness, 0.0), 3.0); \n \
			float brightness = dot(v_worldNormal, -u_lightDir); \n \
			brightness = smoothstep(-0.8, 1.0, brightness); \n \
			gl_FragColor.xyz = u_atmosColor * brightness * enhancedThickness; \n \
			gl_FragColor.xyz += (GetGrain(gl_FragCoord.xy) - 0.5) / 256.0; \n \
			gl_FragColor.w = pow(length(gl_FragColor.xyz), 0.5); \n \
		} \n \
		else { \n \
			discard; \n \
		} \n \
	} \n \
',
'fs_emissive' : ' \
	void main(void) { \n \
		vec3 outputRGB = DrawSurfaceColor(v_modelPosition); \n \
		outputRGB = pow(outputRGB, vec3(0.4545)); \n \
		gl_FragColor = vec4(outputRGB, 1.0); \n \
	} \n \
',
'fs_lighting' : ' \
	struct LightingResult { \n \
		vec3	albedo; \n \
		float	glossiness; \n \
		vec3	specularColor; \n \
	}; \n \
	vec3 CalcLommelSeeliger(vec3 albedo, vec3 normal, vec3 light, vec3 view) { \n \
		float uIncident = max(dot(light, normal), 0.0); \n \
		float uReflective = max(dot(view, normal), 0.0); \n \
		return albedo * uIncident / (uIncident + uReflective); \n \
	} \n \
	vec3 CalcFresnelSchlick(vec3 specularColor, vec3 L, vec3 H) { \n \
		vec3 white = vec3(1.0); \n \
		vec3 blendingOpponent = vec3(pow(1.0 - max(dot(L, H), 0.0), 5.0)); \n \
		return mix(blendingOpponent, white, specularColor); \n \
	} \n \
	float CalcDistributionBlinn(float sharpness, float dotNH) { \n \
		const float twoPI = 2.0 * 3.1415926; \n \
		return (sharpness + 2.0) / twoPI * pow(max(dotNH, 0.0), sharpness); \n \
	} \n \
	float CalcGeomAntCookTorrance(float dotNH_2, float dotNV, float dotNL, float dotVH_inv) { \n \
		float g1 = (dotNH_2 * dotNV) * dotVH_inv; \n \
		float g2 = (dotNH_2 * dotNL) * dotVH_inv; \n \
		return min(1.0, min(g1, g2)); \n \
	} \n \
	vec3 CalcTorranceSparrow(vec3 N, vec3 L, vec3 V, float glossiness, vec3 specColor, out vec3 fresnel) { \n \
		vec3 H = normalize(V + L); \n \
		float specularPower = exp2(10.0 * glossiness + 1.0); \n \
		float dotNL = dot(N, L); \n \
		float dotNV = dot(N, V); \n \
		float dotNH = dot(N, H); \n \
		float dotVH = dot(V, H); \n \
		fresnel = CalcFresnelSchlick(specColor, L, H); \n \
		vec3 radiance = fresnel \n \
			* CalcGeomAntCookTorrance(2.0 * dotNH, dotNV, dotNL, 1.0 / dotVH) \n \
			* CalcDistributionBlinn(specularPower, dotNH) \n \
			/ (dotNV * 4.0); \n \
		return max(radiance, vec3(0.0)); \n \
	} \n \
',
'fs_noise' : ' \
	uniform sampler2D	t_gradients; \n \
	uniform float		u_radius; \n \
	uniform vec3		u_lightDir; \n \
	varying vec3		v_modelPosition; \n \
	varying vec3		v_worldPosition; \n \
	varying vec3		v_worldNormal; \n \
	float NoiseWeight(float t) { \n \
		return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); \n \
	} \n \
	vec3 SamplePrecomputedGradient(float x, float y, float z) { \n \
		float fx = mod(x, 256.0); \n \
		float fy = mod(y, 256.0); \n \
		float blockX = mod(z, 16.0) * 256.0; \n \
		float blockY = floor(z / 16.0) * 256.0; \n \
		vec2 index = vec2(blockX + fx, blockY + fy) + 0.5; \n \
		return (texture2D(t_gradients, index / 4096.0).rgb * 16.0 - 1.0); \n \
	} \n \
	float Gradient(vec3 index, vec3 delta) { \n \
		vec3 grad = SamplePrecomputedGradient(index.x, index.y, index.z); \n \
		return dot(grad, delta); \n \
	} \n \
	float PerlinNoise(vec3 p) { \n \
		p *= 6.0; \n \
		vec3 delta = fract(p); \n \
		vec3 index = mod(floor(p), 256.0); \n \
		float w000 = Gradient(index, delta); \n \
		float w100 = Gradient(index + vec3(1.0, 0.0, 0.0), delta - vec3(1.0, 0.0, 0.0)); \n \
		float w010 = Gradient(index + vec3(0.0, 1.0, 0.0), delta - vec3(0.0, 1.0, 0.0)); \n \
		float w110 = Gradient(index + vec3(1.0, 1.0, 0.0), delta - vec3(1.0, 1.0, 0.0)); \n \
		float w001 = Gradient(index + vec3(0.0, 0.0, 1.0), delta - vec3(0.0, 0.0, 1.0)); \n \
		float w101 = Gradient(index + vec3(1.0, 0.0, 1.0), delta - vec3(1.0, 0.0, 1.0)); \n \
		float w011 = Gradient(index + vec3(0.0, 1.0, 1.0), delta - vec3(0.0, 1.0, 1.0)); \n \
		float w111 = Gradient(index + vec3(1.0, 1.0, 1.0), delta - vec3(1.0, 1.0, 1.0)); \n \
		float wx = NoiseWeight(delta.x); \n \
		float wy = NoiseWeight(delta.y); \n \
		float wz = NoiseWeight(delta.z); \n \
		float x00 = mix(w000, w100, wx); \n \
		float x10 = mix(w010, w110, wx); \n \
		float x01 = mix(w001, w101, wx); \n \
		float x11 = mix(w011, w111, wx); \n \
		float y0 = mix(x00, x10, wy); \n \
		float y1 = mix(x01, x11, wy); \n \
		return mix(y0, y1, wz); \n \
	} \n \
	float fBmOrder2(vec3 v3Point) { \n \
		return PerlinNoise(v3Point) \n \
			+ 0.5 * PerlinNoise(v3Point * 2.0); \n \
	} \n \
	float fBmOrder4(vec3 v3Point) { \n \
		return PerlinNoise(v3Point) \n \
			+ 0.5 * PerlinNoise(v3Point * 2.0) \n \
			+ 0.25 * PerlinNoise(v3Point * 4.0) \n \
			+ 0.125 * PerlinNoise(v3Point * 8.0); \n \
	} \n \
	float fBmOrder8(vec3 v3Point) { \n \
		return PerlinNoise(v3Point) \n \
			+ 0.5 * PerlinNoise(v3Point * 2.0) \n \
			+ 0.25 * PerlinNoise(v3Point * 4.0) \n \
			+ 0.125 * PerlinNoise(v3Point * 8.0) \n \
			+ 0.0625 * PerlinNoise(v3Point * 16.0) \n \
			+ 0.03125 * PerlinNoise(v3Point * 32.0) \n \
			+ 0.015625 * PerlinNoise(v3Point * 64.0) \n \
			+ 0.0078125 * PerlinNoise(v3Point * 128.0); \n \
	} \n \
',
'fs_nonemissive' : ' \
	vec3 CalcToneMapUncharted2(vec3 hdrColor) { \n \
		float A = 0.22; \n \
		float B = 0.30; \n \
		float C = 0.10; \n \
		float D = 0.20; \n \
		float E = 0.02; \n \
		float F = 0.30; \n \
		return ((hdrColor * (A * hdrColor + C * B) + D * E) / (hdrColor * (A * hdrColor + B) + D * F)) - E / F; \n \
	} \n \
	vec3 ConvertLinearToSRGB(vec3 linearColor) { \n \
		return pow(linearColor, vec3(0.4545)); \n \
	} \n \
	float GetGrain(vec2 co) { \n \
		float f = sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453; \n \
		return fract(f); \n \
	} \n \
	void main(void) { \n \
		const float irradianceSun = 3.0; \n \
		LightingResult surface = DrawSurfaceColor(v_modelPosition); \n \
		vec3 viewDir = normalize(cameraPosition - v_worldPosition); \n \
		vec3 radiance; \n \
		vec3 diffuse = CalcLommelSeeliger( \n \
			max(surface.albedo, vec3(0.0)), \n \
			v_worldNormal, \n \
			-u_lightDir, \n \
			viewDir \n \
		); \n \
		if (surface.glossiness > 0.0) { \n \
			vec3 fresnel; \n \
			vec3 specular = CalcTorranceSparrow( \n \
				v_worldNormal, \n \
				-u_lightDir, \n \
				viewDir, \n \
				surface.glossiness, \n \
				surface.specularColor, \n \
				fresnel \n \
			); \n \
			radiance = diffuse * (vec3(1.0) - fresnel) + specular; \n \
		} \n \
		else \n \
			radiance = diffuse; \n \
		radiance = CalcToneMapUncharted2(radiance * irradianceSun); \n \
		gl_FragColor = vec4(ConvertLinearToSRGB(radiance), 1.0); \n \
		gl_FragColor.xyz += (GetGrain(gl_FragCoord.xy) - 0.5) / 256.0; \n \
	} \n \
',
'fs_space' : ' \
	varying vec3	v_color; \n \
	void main(void) { \n \
		vec3 outputRGB = v_color; \n \
		gl_FragColor = vec4(outputRGB, 1.0); \n \
	} \n \
',
'surface/fs_earth' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		LightingResult result; \n \
		const float seaLevel = 0.25; \n \
		const float snowLevel = 0.6; \n \
		const float cloudAmountOffset = -0.1; \n \
		const vec3 land = vec3(0.031, 0.11, 0.005); \n \
		const vec3 mountain = vec3(0.47, 0.37, 0.029); \n \
		const vec3 ocean = vec3(0.0146, 0.0146, 0.20); \n \
		const vec3 white = vec3(1.0); \n \
		const vec3 terrainDetailDisplacement = vec3(1.68, 54.38, 3.14); \n \
		const vec3 cloudDisplacement = vec3(54.38, 3.14, 1.68); \n \
		float surfaceAltiCoarse = fBmOrder4(position / 8.0); \n \
		float surfaceAltiDetail = fBmOrder8(position + terrainDetailDisplacement); \n \
		float f = mix(surfaceAltiCoarse, surfaceAltiDetail, 0.2); \n \
		if (f > seaLevel) { \n \
			result.albedo = mix(land, mountain, smoothstep(seaLevel, 1.0, f)); \n \
			if (f > snowLevel) { \n \
				result.albedo = mix(result.albedo, white, (f - snowLevel) * 30.0); \n \
				result.glossiness = 0.5 * min((f - snowLevel) * 30.0, 1.0); \n \
				result.specularColor = vec3(0.01801); \n \
			} \n \
			else { \n \
				result.glossiness = 1e-9; \n \
				result.specularColor = vec3(0.0, 0.01, 0.0); \n \
			} \n \
		} \n \
		else { \n \
			result.albedo = ocean; \n \
			result.glossiness = 0.6 + (surfaceAltiDetail * 0.1); \n \
			result.specularColor = vec3(0.02732); \n \
		} \n \
		float cloudAmount = fBmOrder8((position + cloudDisplacement) / 1.6) + cloudAmountOffset; \n \
		cloudAmount = max(cloudAmount, 0.0); \n \
		result.albedo = mix(result.albedo, white * 2.5, cloudAmount); \n \
		result.glossiness = mix(result.glossiness, 0.5, cloudAmount); \n \
		return result; \n \
	} \n \
',
'surface/fs_fbm' : ' \
	vec3 DrawSurfaceColor(vec3 inputPosition) { \n \
		float f = fBmOrder8(inputPosition) + 0.2; \n \
		return vec3(clamp(f, 0.0, 1.0)); \n \
	} \n \
',
'surface/fs_jupiter' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const float spotThreshold = 0.6; \n \
		const vec3 displacement = vec3(81.3, 81.3, 81.3); \n \
		const vec3 base = vec3(0.79, 0.076, 0.0078); \n \
		const vec3 bright = vec3(1.0, 0.61, 0.40); \n \
		const vec3 dark = vec3(0.29, 0.16, 0.023); \n \
		const vec3 spot = vec3(0.61, 0.015, 0.0063); \n \
		float y = position.y / 2.0 + fBmOrder2(position * 5.0) / 175.0; \n \
		vec3 yPos = vec3(y); \n \
		float f = fBmOrder4(yPos); \n \
		f = clamp(f * 0.5 + 0.75, 0.0, 1.0); \n \
		outputColor = mix(bright, base, f); \n \
		yPos += vec3(displacement); \n \
		f = fBmOrder4(yPos); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(dark, outputColor, f); \n \
		float f2 = PerlinNoise(position / 2.0); \n \
		if (f2 > spotThreshold) { \n \
			f2 -= spotThreshold; \n \
			f2 *= 6.0; \n \
			f2 = clamp(f2, 0.0, 1.0); \n \
			outputColor = mix(outputColor, spot, f2); \n \
		} \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'surface/fs_mars' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const float cloudAmount = -0.25; \n \
		const vec3 displacement = vec3(31.41, 59.26, 50.6); \n \
		const vec3 land = vec3(0.47, 0.12, 0.013) * 0.9; \n \
		const vec3 dark = vec3(0.18, 0.029, 0.0078); \n \
		const vec3 cloud = vec3(1.0); \n \
		float f = -0.05 + fBmOrder8((position + displacement) / 10.0); \n \
		float amp = 1.6; \n \
		outputColor = mix(dark, land, smoothstep(-0.1, 0.1, f * amp)); \n \
		f = (fBmOrder2(position) - 0.5) / 80.0; \n \
		outputColor += vec3(f, f, f); \n \
		float f2 = cloudAmount + fBmOrder8((position * 0.5) / 3.0); \n \
		f2 = smoothstep(0.0, 1.0, f2 + 0.1); \n \
		outputColor = mix(outputColor, cloud, f2); \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'surface/fs_mercury' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		const float brightness = 0.05; \n \
		const vec3 displacement = vec3(54.38, 3.14, 1.68); \n \
		float f = fBmOrder8(position) / 4.0; \n \
		float f2 = fBmOrder4(position * 3.0 + displacement); \n \
		float f3 = fBmOrder4(position + displacement) / 6.0; \n \
		f = max(f, 0.0); \n \
		f2 = max(f2, 0.0); \n \
		f3 = max(f3, 0.0); \n \
		f = brightness + (f + 0.1) * (f2 + 0.2) + f3; \n \
		LightingResult result; \n \
		result.albedo = vec3(f, f, f); \n \
		return result; \n \
	} \n \
',
'surface/fs_neptune' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const float spotThreshold = 0.65; \n \
		const vec3 base = vec3(0.076, 0.15, 1.0); \n \
		const vec3 bright = vec3(0.082, 0.25, 1.0); \n \
		const vec3 dark = vec3(0.026, 0.029, 0.60); \n \
		float y = position.y / 6.0; \n \
		vec3 yPos = vec3(y); \n \
		float f = 0.6 + fBmOrder4(yPos); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(dark, base, f); \n \
		y = position.y * 3.0 + PerlinNoise(position * 5.0) / 80.0; \n \
		yPos = vec3(y); \n \
		f = fBmOrder2(yPos) * PerlinNoise(position * 0.5); \n \
		f = max((f - 0.2) * 1.2, 0.0); \n \
		outputColor = mix(outputColor, bright, f); \n \
		float f2 = PerlinNoise(position / 2.0); \n \
		if (f2 > spotThreshold) { \n \
			f2 -= spotThreshold; \n \
			f2 *= 6.0; \n \
			outputColor = mix(outputColor, dark, f2); \n \
		} \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'surface/fs_saturn' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const vec3 displacement = vec3(526.9, 526.9, 526.9); \n \
		const vec3 base = vec3(0.44, 0.29, 0.15); \n \
		const vec3 bright = vec3(0.79, 0.61, 0.40); \n \
		const vec3 dark = vec3(0.58, 0.40, 0.40); \n \
		float y = position.y / 1.5; \n \
		vec3 yPos = vec3(y); \n \
		float f = 0.1 + fBmOrder8(yPos); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(bright, base, f); \n \
		y = position.y / 4.0; \n \
		yPos = vec3(y) + displacement; \n \
		f = 0.2 + fBmOrder4(yPos); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(dark, outputColor, f); \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'surface/fs_sun' : ' \
	vec3 DrawSurfaceColor(vec3 position) { \n \
		const float brightness = 0.1; \n \
		const float spotThreshold = 0.60; \n \
		const vec3 baseColor = vec3(0.75, 0.17, 0.0); \n \
		float f = brightness + PerlinNoise(12.0 * position) / 3.0; \n \
		float f2 = PerlinNoise(position); \n \
		if (f2 >= spotThreshold) \n \
			f += 6.0 * (f2 - spotThreshold); \n \
		f *= 1.0 + PerlinNoise(position) / 1.75; \n \
		return baseColor + vec3(f, f, f) * 0.75; \n \
	} \n \
',
'surface/fs_uranus' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const vec3 displacement1 = vec3(689.414, 689.414, 689.414); \n \
		const vec3 displacement2 = vec3(197.4, 197.4, 197.4); \n \
		const vec3 base = vec3(0.0094, 0.50, 0.68); \n \
		const vec3 bright = vec3(0.099, 0.79, 1.0); \n \
		const vec3 dark = vec3(0.060, 0.011, 1.0); \n \
		float y = position.y / 3.0; \n \
		vec3 yPos = vec3(y); \n \
		float f = 0.1 + fBmOrder8(yPos + displacement1); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 0.7); \n \
		outputColor = mix(bright, base, f); \n \
		y = position.y / 5.0; \n \
		yPos = vec3(y + displacement2); \n \
		f = -0.7 + fBmOrder4(yPos); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 0.5); \n \
		outputColor = mix(outputColor, dark, f); \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'surface/fs_venus' : ' \
	LightingResult DrawSurfaceColor(vec3 position) { \n \
		vec3 outputColor; \n \
		const vec3 displacement = vec3(54.38, 3.14, 1.68); \n \
		const vec3 base = vec3(0.47, 0.33, 0.13); \n \
		const vec3 cloud1 = vec3(0.91, 0.85, 0.49); \n \
		const vec3 cloud2 = vec3(0.77, 0.65, 0.21); \n \
		const vec3 dark = vec3(0.20, 0.18, 0.11); \n \
		vec3 pos = vec3(position.x / 3.0, position.y, position.z / 3.0); \n \
		float f = 0.3 + fBmOrder4(pos / 3.0); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(cloud1, base, f); \n \
		f = 0.2 + fBmOrder4((pos + displacement) / 2.0); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(cloud2, outputColor, f); \n \
		pos.y += fBmOrder2(position * 5.0) / 150.0; \n \
		f = 0.45 + fBmOrder4(pos) * PerlinNoise(position / 2.0); \n \
		f = clamp(f * 0.5 + 0.5, 0.0, 1.0); \n \
		outputColor = mix(dark, outputColor, f); \n \
		LightingResult result; \n \
		result.albedo = outputColor; \n \
		return result; \n \
	} \n \
',
'vs_planet' : ' \
	uniform float	u_radius; \n \
	uniform mat4	u_transform; \n \
	varying vec3	v_modelPosition; \n \
	varying vec3	v_worldPosition; \n \
	varying vec3	v_worldNormal; \n \
	void main(void) { \n \
		gl_Position = modelMatrix * u_transform * vec4(position, 1.0); \n \
		v_worldPosition = gl_Position.xyz / gl_Position.w; \n \
		gl_Position = projectionMatrix * viewMatrix * gl_Position; \n \
		v_modelPosition = position / u_radius; \n \
		v_worldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz; \n \
	} \n \
',
'vs_space' : ' \
	attribute vec3	vertColor; \n \
	uniform float	u_radius; \n \
	uniform float	u_pointSize; \n \
	varying vec3	v_color; \n \
	void main(void) { \n \
		v_color = vertColor; \n \
		float phi = position.x; \n \
		float theta = position.y; \n \
		vec3 worldPos = u_radius * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)); \n \
		gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPos, 1.0); \n \
		gl_Position.z = 1.0; \n \
		gl_PointSize = u_pointSize; \n \
	} \n \
',
});
