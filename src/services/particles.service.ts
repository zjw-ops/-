import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class ParticleService {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  
  private particlesMesh: THREE.Points | null = null;
  private animationFrameId: number = 0;
  
  // State
  private progress: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  
  // Settings
  private readonly particleCount = 4500; // Increased count
  
  // Physics for smooth transition
  private currentRotationSpeed = 0.001;
  private targetRotationSpeed = 0.001;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // 1. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Setup Scene
    this.scene = new THREE.Scene();
    
    // 3. Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      60, // Narrower FOV for a more cinematic look
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.z = 400;
    this.camera.position.y = 100;
    this.camera.lookAt(0, 0, 0);

    // 4. Create Particles
    this.createGalaxySystem();

    // 5. Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 6. Start Loop
    this.animate();
  }

  setProgress(p: number) {
    this.progress = p;
  }

  // Generate a soft glow texture programmatically
  private getTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Texture();

    // Create a radial gradient for a soft "orb" look
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createGalaxySystem() {
    if (!this.scene) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const colorInside = new THREE.Color(0xffbf00); // Deep Amber
    const colorOutside = new THREE.Color(0xffffff); // White

    for (let i = 0; i < this.particleCount; i++) {
      // Spiral Galaxy Math
      // We want a dense center and spiral arms
      const radius = Math.random() * 200; 
      const spinAngle = radius * 0.05; // Tightness of spiral
      const branchAngle = (i % 3) * ((2 * Math.PI) / 3); // 3 Arms

      // Randomness to scatter particles out of perfect lines
      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 30;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 30;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 30;

      const x = Math.cos(branchAngle + spinAngle) * radius + randomX;
      const y = (Math.random() - 0.5) * (radius * 0.2) + randomY; // Flattened disk
      const z = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color mixing based on radius
      const mixedColor = colorInside.clone().lerp(colorOutside, radius / 200);

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Varied sizes
      sizes[i] = Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 5, // Slightly larger
      vertexColors: true,
      map: this.getTexture(), // Use the soft texture
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9, // Higher opacity
      sizeAttenuation: true
    });

    this.particlesMesh = new THREE.Points(geometry, material);
    this.scene.add(this.particlesMesh);
  }

  private onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    if (!this.scene || !this.camera || !this.renderer || !this.particlesMesh) return;

    const isProcessing = this.progress > 0 && this.progress < 100;

    // --- Smooth Speed Transition ---
    // If processing, speed up drastically. If idle, slow drift.
    const targetSpeed = isProcessing ? 0.05 : 0.001; 
    
    // Linear interpolation for smooth acceleration/deceleration
    this.currentRotationSpeed += (targetSpeed - this.currentRotationSpeed) * 0.05;

    // --- Rotation ---
    // Spin the galaxy on Y axis
    this.particlesMesh.rotation.y += this.currentRotationSpeed;

    // --- Mouse Parallax / Tilt ---
    // Gentle tilt based on mouse position. 
    // We update target rotation, then lerp current rotation to target.
    const targetTiltX = this.mouseY * 0.2; // Tilt up/down
    const targetTiltZ = this.mouseX * 0.1; // Bank left/right

    this.particlesMesh.rotation.x += (targetTiltX - this.particlesMesh.rotation.x) * 0.05;
    this.particlesMesh.rotation.z += (targetTiltZ - this.particlesMesh.rotation.z) * 0.05;

    // --- Subtle Wave Motion (Optional, makes it feel like fluid) ---
    // We add a tiny bit of wobble to the camera to make it feel like floating in space
    const time = Date.now() * 0.0005;
    this.camera.position.y = 100 + Math.sin(time) * 10;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}