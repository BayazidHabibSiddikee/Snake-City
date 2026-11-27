import * as THREE from 'three';

export type WeatherMode = 'clear' | 'mist' | 'fog' | 'rain' | 'storm' | 'blizzard' | 'ashstorm';

/**
 * Standalone Weather Transition Post-Processing Shader Engine (`src/game/engine/WeatherTransitionShader.ts`).
 * Dynamically tints the 3D scene based on the active biome and weather setting selected in the HUD.
 */
export class WeatherTransitionShaderSystem {
  private quadMesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetTint = new THREE.Vector3(0.5, 0.5, 0.5);
  private currentTint = new THREE.Vector3(0.5, 0.5, 0.5);
  private targetIntensity = 0.0;
  private currentIntensity = 0.0;

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera | THREE.PerspectiveCamera) {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTint: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uIntensity: { value: 0.0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTint;
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Subtle screen-space weather & biome color grading tint
          vec3 baseColor = vec3(0.85, 0.92, 0.88);
          vec3 tinted = mix(baseColor, uTint, uIntensity * 0.45);
          
          // Vignette & subtle atmosphere gradient
          float dist = distance(vUv, vec2(0.5));
          float vignette = smoothstep(0.8, 0.2, dist * 1.2);
          
          gl_FragColor = vec4(tinted * vignette, uIntensity * 0.28);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.quadMesh = new THREE.Mesh(geometry, this.material);
    this.quadMesh.frustumCulled = false;
    this.quadMesh.renderOrder = 999;
    
    // Attach to camera so it stays in screen-space
    camera.add(this.quadMesh);
    if (!scene.children.includes(camera)) {
      scene.add(camera);
    }
  }

  public setWeather(weather: WeatherMode, biome: string, activeIntensity: number): void {
    this.targetIntensity = Math.max(0, Math.min(1, activeIntensity));

    // Map weather and biome to atmospheric tint colors
    if (weather === 'blizzard') {
      this.targetTint.set(0.7, 0.85, 1.0); // Icy blue tint
    } else if (weather === 'ashstorm') {
      this.targetTint.set(1.0, 0.55, 0.3); // Magma orange tint
    } else if (weather === 'storm' || weather === 'rain') {
      this.targetTint.set(0.4, 0.6, 0.75); // Stormy slate tint
    } else if (weather === 'fog' || weather === 'mist') {
      this.targetTint.set(0.75, 0.82, 0.78); // Misty gray-green tint
    } else {
      // Clear / biome specific
      if (biome === 'jungle') {
        this.targetTint.set(0.45, 0.9, 0.55); // Lush jungle emerald
      } else {
        this.targetTint.set(0.5, 0.8, 0.65); // Mountain pine
      }
    }
  }

  public update(dt: number, elapsedTime: number): void {
    this.currentTint.lerp(this.targetTint, dt * 3.0);
    this.currentIntensity = THREE.MathUtils.lerp(this.currentIntensity, this.targetIntensity, dt * 2.5);

    this.material.uniforms.uTint.value.copy(this.currentTint);
    this.material.uniforms.uIntensity.value = this.currentIntensity;
    this.material.uniforms.uTime.value = elapsedTime;
  }

  public dispose(): void {
    this.quadMesh.geometry.dispose();
    this.material.dispose();
    this.quadMesh.removeFromParent();
  }
}
