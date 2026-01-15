const scene = new THREE.Scene();

// ===== BACKGROUND CONFIGURATION =====
// Pilih salah satu mode background:
// 'default' = Background luar angkasa dengan bintang dan nebula
// 'image'   = Background gambar custom dari folder 'background' (contoh: 'background/my-image.jpg')
// 'video'   = Background video custom dari folder 'background' (contoh: 'background/my-video.mp4')

const BACKGROUND_MODE = 'image'; // Ganti dengan 'image' atau 'video' untuk custom background
const CUSTOM_BACKGROUND_PATH = 'background/background fix.png'; // Ganti dengan path file Anda

// ===== Background Setup =====
let videoBackground = null;
let savedBackground = null; // Simpan background asli untuk dikembalikan setelah video

function setupBackground() {
  if (BACKGROUND_MODE === 'image') {
    // Custom Image Background
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(CUSTOM_BACKGROUND_PATH, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; // Warna akurat
      scene.background = texture;
    }, undefined, (err) => {
      console.error('Error loading background image:', err);
      scene.background = new THREE.Color(0x000510);
    });
  } else if (BACKGROUND_MODE === 'video') {
    // Custom Video Background
    videoBackground = document.createElement('video');
    videoBackground.src = CUSTOM_BACKGROUND_PATH;
    videoBackground.loop = true;
    videoBackground.muted = true;
    videoBackground.playsInline = true;
    videoBackground.autoplay = true;
    videoBackground.play();
    
    const videoTexture = new THREE.VideoTexture(videoBackground);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    scene.background = videoTexture;
  } else {
    // Default: Dark space color (stars will be added separately)
    scene.background = new THREE.Color(0x000510);
  }
}

setupBackground();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // Warna lebih akurat sesuai aslinya

// Adjust camera distance based on screen aspect ratio
const baseDistance = 350;
camera.position.z = baseDistance;

// ===== CUSTOM FONT CONFIGURATION =====
// Ganti dengan nama font yang sama seperti di CSS @font-face
// Jika menggunakan font default, set USE_CUSTOM_FONT = false
const USE_CUSTOM_FONT = true;
const CUSTOM_FONT_NAME = 'MCE-Font'; // Nama font sesuai @font-face di style.css
const FALLBACK_FONT = 'Arial'; // Font cadangan jika custom font gagal

// Load custom font before using
async function loadCustomFont() {
  if (!USE_CUSTOM_FONT) return true;
  
  try {
    // Check if font is already loaded
    await document.fonts.load(`bold 100px "${CUSTOM_FONT_NAME}"`);
    console.log(`Font "${CUSTOM_FONT_NAME}" loaded successfully!`);
    return true;
  } catch (err) {
    console.warn(`Failed to load font "${CUSTOM_FONT_NAME}", using fallback:`, err);
    return false;
  }
}

// ===== Words and Images to cycle through =====
// Teks akan ditampilkan dulu, lalu dilanjutkan dengan gambar, lalu video
const words = ["SELAMAT DATANG", "DI", "MCE", "2026"];
const images = [
  "background/18-removebg-preview.png",
  "background/19-removebg-preview.png",
  "background/20-removebg-preview.png"
];
// === VIDEO DISABLED ===
// const videos = [
//   "background/karya IPS animasi.mp4"  // Tambahkan path video mp4 di sini
// ];
// const totalItems = words.length + images.length + videos.length;
const totalItems = words.length + images.length; // Tanpa video
let currentWordIndex = 0;

// Image textures storage
let imageTextures = [];
let imagePlane = null;

// === VIDEO DISABLED ===
// Video elements storage
// let videoElements = [];
// let videoTextures = [];
let videoPlane = null; // Keep for compatibility check

// Load image textures
function loadImageTextures() {
  const textureLoader = new THREE.TextureLoader();
  images.forEach((imgPath, index) => {
    textureLoader.load(imgPath, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; // Warna akurat sesuai aslinya
      imageTextures[index] = texture;
      console.log(`Loaded image: ${imgPath}`);
    }, undefined, (err) => {
      console.error(`Failed to load image: ${imgPath}`, err);
    });
  });
}

loadImageTextures();

// === VIDEO DISABLED ===
// Load video elements
// function loadVideoElements() {
//   videos.forEach((videoPath, index) => {
//     const video = document.createElement('video');
//     video.src = videoPath;
//     video.loop = true;
//     video.muted = true;
//     video.playsInline = true;
//     video.crossOrigin = 'anonymous';
//     video.preload = 'auto';
//     
//     video.addEventListener('loadeddata', () => {
//       const texture = new THREE.VideoTexture(video);
//       texture.colorSpace = THREE.SRGBColorSpace;
//       texture.minFilter = THREE.LinearFilter;
//       texture.magFilter = THREE.LinearFilter;
//       videoTextures[index] = texture;
//       console.log(`Loaded video: ${videoPath}`);
//     });
//     
//     video.addEventListener('error', (err) => {
//       console.error(`Failed to load video: ${videoPath}`, err);
//     });
//     
//     videoElements[index] = video;
//   });
// }
// 
// loadVideoElements();

// Check if current index is an image
function isImageIndex(index) {
  return index >= words.length && index < words.length + images.length;
}

// === VIDEO DISABLED ===
// Check if current index is a video
// function isVideoIndex(index) {
//   return index >= words.length + images.length;
// }

// Get image texture for index
function getImageTexture(index) {
  const imageIndex = index - words.length;
  return imageTextures[imageIndex] || null;
}

// === VIDEO DISABLED ===
// Get video texture and element for index
// function getVideoData(index) {
//   const videoIndex = index - words.length - images.length;
//   return {
//     texture: videoTextures[videoIndex] || null,
//     element: videoElements[videoIndex] || null
//   };
// }

// ===== Hand tracking position =====
let handX = 0;
let handY = 0;
let handDetected = false;

// ===== Grab gesture detection =====
let isGrabbing = false;
let grabOffsetX = 0;
let grabOffsetY = 0;
let lastGrabState = false;

// ===== Swipe detection =====
let lastHandX = 0;
let lastHandY = 0;
let handHistory = [];
const swipeThreshold = 0.15; // Minimum distance for swipe
const swipeCooldown = 800; // ms between swipes
let lastSwipeTime = 0;
let canSwipe = true;

// ===== Particle system variables =====
let originalPositions = [];
let currentPositions = [];
let targetPositions = [];
let velocities = [];
let geometry, material, points;
let fontLoaded = false;

// ===== Create Text via Canvas =====
const textCanvas = document.createElement('canvas');
const ctx = textCanvas.getContext('2d');
textCanvas.width = 1600;
textCanvas.height = 400;

function getTextParticles(text) {
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.fillStyle = "white";
  
  // Dynamic font size based on text length - smaller for long text
  let fontSize = 180;
  if (text.length > 12) {
    fontSize = 80;
  } else if (text.length > 10) {
    fontSize = 100;
  } else if (text.length > 6) {
    fontSize = 140;
  } else if (text.length <= 2) {
    fontSize = 220;
  }
  
  // Use custom font or fallback
  const fontFamily = (USE_CUSTOM_FONT && fontLoaded) ? CUSTOM_FONT_NAME : FALLBACK_FONT;
  ctx.font = `bold ${fontSize}px "${fontFamily}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Measure text and adjust if still too wide
  let textWidth = ctx.measureText(text).width;
  while (textWidth > textCanvas.width - 100 && fontSize > 40) {
    fontSize -= 10;
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    textWidth = ctx.measureText(text).width;
  }
  
  ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

  const imageData = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
  const positions = [];

  // Adjust particle density based on text size
  const step = text.length > 8 ? 5 : 4;

  for (let y = 0; y < textCanvas.height; y += step) {
    for (let x = 0; x < textCanvas.width; x += step) {
      const i = (y * textCanvas.width + x) * 4;
      if (imageData[i] > 200) {
        const px = x - textCanvas.width / 2;
        const py = textCanvas.height / 2 - y;
        positions.push({ x: px, y: py, z: 0 });
      }
    }
  }

  return positions;
}

// ===== Create Space Background =====
function createStarField() {
  const starCount = 2000;
  const starPositions = [];
  const starColors = [];
  
  for (let i = 0; i < starCount; i++) {
    // Random positions in a large sphere
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000 - 500;
    starPositions.push(x, y, z);
    
    // Random star colors (white, blue, yellow, red tints)
    const colorChoice = Math.random();
    let r, g, b;
    if (colorChoice < 0.6) {
      // White stars
      r = 1; g = 1; b = 1;
    } else if (colorChoice < 0.75) {
      // Blue stars
      r = 0.7; g = 0.8; b = 1;
    } else if (colorChoice < 0.9) {
      // Yellow stars
      r = 1; g = 0.95; b = 0.7;
    } else {
      // Red/orange stars
      r = 1; g = 0.6; b = 0.4;
    }
    starColors.push(r, g, b);
  }
  
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  
  const starMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });
  
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = 'starField';
  scene.add(stars);
  
  return stars;
}

// Create nebula clouds
function createNebula() {
  const nebulaGroup = new THREE.Group();
  nebulaGroup.name = 'nebula';
  
  const nebulaColors = [0x4a0080, 0x000080, 0x800040, 0x004080];
  
  for (let i = 0; i < 5; i++) {
    const cloudCount = 300;
    const cloudPositions = [];
    
    // Create cloud cluster
    const centerX = (Math.random() - 0.5) * 1000;
    const centerY = (Math.random() - 0.5) * 600;
    const centerZ = -300 - Math.random() * 500;
    
    for (let j = 0; j < cloudCount; j++) {
      const x = centerX + (Math.random() - 0.5) * 400;
      const y = centerY + (Math.random() - 0.5) * 300;
      const z = centerZ + (Math.random() - 0.5) * 200;
      cloudPositions.push(x, y, z);
    }
    
    const cloudGeometry = new THREE.BufferGeometry();
    cloudGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cloudPositions, 3));
    
    const cloudMaterial = new THREE.PointsMaterial({
      color: nebulaColors[i % nebulaColors.length],
      size: 8,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    
    const cloud = new THREE.Points(cloudGeometry, cloudMaterial);
    nebulaGroup.add(cloud);
  }
  
  scene.add(nebulaGroup);
  return nebulaGroup;
}

// Create shooting stars
let shootingStars = [];
function createShootingStar() {
  if (shootingStars.length > 3) return; // Max 3 at a time
  
  const startX = (Math.random() - 0.5) * 1500;
  const startY = 300 + Math.random() * 200;
  const startZ = -100 - Math.random() * 300;
  
  const trail = [];
  const trailLength = 20;
  
  for (let i = 0; i < trailLength; i++) {
    trail.push(startX + i * 3, startY - i * 2, startZ);
  }
  
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trail, 3));
  
  const trailMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8
  });
  
  const shootingStar = new THREE.Points(trailGeometry, trailMaterial);
  shootingStar.userData = {
    velocityX: 15 + Math.random() * 10,
    velocityY: -8 - Math.random() * 5,
    life: 100
  };
  
  scene.add(shootingStar);
  shootingStars.push(shootingStar);
}

// Update shooting stars
function updateShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    const positions = star.geometry.attributes.position.array;
    
    for (let j = 0; j < positions.length; j += 3) {
      positions[j] += star.userData.velocityX;
      positions[j + 1] += star.userData.velocityY;
    }
    
    star.geometry.attributes.position.needsUpdate = true;
    star.material.opacity -= 0.01;
    star.userData.life--;
    
    if (star.userData.life <= 0 || star.material.opacity <= 0) {
      scene.remove(star);
      shootingStars.splice(i, 1);
    }
  }
  
  // Random chance to create new shooting star
  if (Math.random() < 0.005) {
    createShootingStar();
  }
}

// Initialize background elements (only for default mode)
let starField = null;
let nebula = null;

if (BACKGROUND_MODE === 'default') {
  starField = createStarField();
  nebula = createNebula();
}

function initParticles() {
  const particles = getTextParticles(words[currentWordIndex]);
  
  originalPositions = [];
  currentPositions = [];
  targetPositions = [];
  velocities = [];

  particles.forEach(p => {
    // Start from random scattered positions
    const randomX = (Math.random() - 0.5) * 600;
    const randomY = (Math.random() - 0.5) * 400;
    const randomZ = (Math.random() - 0.5) * 200;
    
    currentPositions.push(randomX, randomY, randomZ);
    originalPositions.push(p.x, p.y, p.z);
    targetPositions.push(p.x, p.y, p.z);
    velocities.push(0, 0, 0);
  });

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(currentPositions, 3));

  // Enhanced material for better visibility on custom backgrounds
  // MCE Color Palette dari brand guidelines
  // ICEBERG: #71ABD1, JAPANESE INDIGO: #1E424D, FLAX: #E0D595, GAMBOGE: #E0BE4D, DARK BROWN: #663E31
  const MCE_COLORS = {
    ICEBERG: 0x71ABD1,
    JAPANESE_INDIGO: 0x1E424D,
    FLAX: 0xE0D595,
    GAMBOGE: 0xE0BE4D,
    DARK_BROWN: 0x663E31
  };
  
  material = new THREE.PointsMaterial({
    color: MCE_COLORS.GAMBOGE, // Start with golden yellow
    size: 4,
    transparent: true,
    opacity: 1,
    blending: THREE.NormalBlending, // Normal blending tanpa efek kontras
    depthWrite: false
  });

  points = new THREE.Points(geometry, material);
  
  // Add outline/shadow layer for contrast
  const outlineMaterial = new THREE.PointsMaterial({
    color: 0x000000,
    size: 6,
    transparent: true,
    opacity: 0.5
  });
  const outlinePoints = new THREE.Points(geometry, outlineMaterial);
  outlinePoints.position.z = -1; // Slightly behind
  outlinePoints.name = 'outline';
  scene.add(outlinePoints);
  
  scene.add(points);
}

// Show image instead of particles
function showImage(texture) {
  // Hide particles
  if (points) points.visible = false;
  const outline = scene.getObjectByName('outline');
  if (outline) outline.visible = false;
  
  // Remove existing image plane
  if (imagePlane) {
    scene.remove(imagePlane);
    imagePlane = null;
  }
  
  if (!texture) return;
  
  // Create plane with image - ukuran sangat besar
  const aspectRatio = texture.image.width / texture.image.height;
  const planeHeight = 500; // Diperbesar lagi (sebelumnya 350)
  const planeWidth = planeHeight * aspectRatio;
  
  const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  imagePlane.name = 'imagePlane';
  scene.add(imagePlane);
}

// Hide image only (tanpa menampilkan partikel)
function hideImageOnly() {
  if (imagePlane) {
    scene.remove(imagePlane);
    imagePlane = null;
  }
}

// Hide image and show particles
function hideImage() {
  hideImageOnly();
  
  // Show particles again (hanya jika video tidak aktif)
  if (!videoPlane) {
    if (points) points.visible = true;
    const outline = scene.getObjectByName('outline');
    if (outline) outline.visible = true;
  }
}

// === VIDEO DISABLED ===
// Show video instead of particles - HANYA video yang tampil
// function showVideo(videoData) {
//   // Hide ALL other elements
//   // 1. Hide particles
//   if (points) points.visible = false;
//   const outline = scene.getObjectByName('outline');
//   if (outline) outline.visible = false;
//   
//   // 2. Hide image (tanpa menampilkan partikel)
//   hideImageOnly();
//   
//   // 3. Remove existing video plane
//   if (videoPlane) {
//     scene.remove(videoPlane);
//     videoPlane = null;
//   }
//   
//   // Background tetap menggunakan background awal (tidak diubah)
//   
//   if (!videoData.texture || !videoData.element) return;
//   
//   // Start playing the video
//   videoData.element.currentTime = 0;
//   videoData.element.play();
//   
//   // Create plane with video - ukuran FULLSCREEN
//   const aspectRatio = videoData.element.videoWidth / videoData.element.videoHeight || 16/9;
//   
//   // Hitung ukuran yang memenuhi layar
//   const screenAspect = window.innerWidth / window.innerHeight;
//   let planeWidth, planeHeight;
//   
//   // Sesuaikan dengan field of view kamera untuk fullscreen
//   const vFov = camera.fov * Math.PI / 180;
//   const viewHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
//   const viewWidth = viewHeight * screenAspect;
//   
//   if (aspectRatio > screenAspect) {
//     // Video lebih lebar dari layar
//     planeWidth = viewWidth;
//     planeHeight = viewWidth / aspectRatio;
//   } else {
//     // Video lebih tinggi dari layar
//     planeHeight = viewHeight;
//     planeWidth = viewHeight * aspectRatio;
//   }
//   
//   const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
//   const planeMaterial = new THREE.MeshBasicMaterial({
//     map: videoData.texture,
//     side: THREE.DoubleSide
//   });
//   
//   videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
//   videoPlane.name = 'videoPlane';
//   scene.add(videoPlane);
// }
// 
// // Hide video and show particles
// function hideVideo() {
//   if (videoPlane) {
//     scene.remove(videoPlane);
//     videoPlane = null;
//   }
//   
//   // Pause all videos
//   videoElements.forEach(video => {
//     if (video) video.pause();
//   });
// }

function changeWord() {
  // === VIDEO DISABLED ===
  // Hide video first
  // hideVideo();
  
  // Check if we're showing a video
  // if (isVideoIndex(currentWordIndex)) {
  //   const videoData = getVideoData(currentWordIndex);
  //   if (videoData.texture) {
  //     showVideo(videoData);
  //   }
  //   return;
  // }
  
  // Check if we're showing an image
  if (isImageIndex(currentWordIndex)) {
    // Show image
    const texture = getImageTexture(currentWordIndex);
    if (texture) {
      showImage(texture);
    }
    return;
  }
  
  // Hide image if showing text
  hideImage();
  
  const newParticles = getTextParticles(words[currentWordIndex]);
  
  // Update target positions
  const newTargets = [];
  const newOriginals = [];
  
  newParticles.forEach(p => {
    newTargets.push(p.x, p.y, p.z);
    newOriginals.push(p.x, p.y, p.z);
  });

  // Handle different particle counts
  const currentCount = currentPositions.length / 3;
  const newCount = newParticles.length;

  if (newCount > currentCount) {
    // Add more particles
    for (let i = currentCount; i < newCount; i++) {
      const randomX = (Math.random() - 0.5) * 600;
      const randomY = (Math.random() - 0.5) * 400;
      const randomZ = (Math.random() - 0.5) * 200;
      currentPositions.push(randomX, randomY, randomZ);
      velocities.push(0, 0, 0);
    }
  } else if (newCount < currentCount) {
    // Remove excess particles - kirim ke sangat jauh di luar layar (tidak terlihat)
    for (let i = newCount; i < currentCount; i++) {
      // Posisi sangat jauh di belakang kamera agar tidak terlihat sama sekali
      newTargets.push(0, 0, -5000);
      newOriginals.push(0, 0, -5000);
    }
  }

  // Trim arrays to match new particle count untuk membersihkan partikel berlebih
  if (newCount < currentCount) {
    currentPositions.length = newCount * 3;
    velocities.length = newCount * 3;
    targetPositions = newTargets.slice(0, newCount * 3);
    originalPositions = newOriginals.slice(0, newCount * 3);
  } else {
    targetPositions = newTargets;
    originalPositions = newOriginals;
  }

  // Update geometry
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(currentPositions, 3));
  
  // Update outline geometry too
  const outline = scene.getObjectByName('outline');
  if (outline) {
    outline.geometry.setAttribute('position', new THREE.Float32BufferAttribute(currentPositions, 3));
  }
  
  // Change color with each word - MCE Brand Colors
  // SELAMAT DATANG: GAMBOGE, DI: ICEBERG, MCE: JAPANESE INDIGO, 2026: FLAX, 🙌: DARK BROWN
  const colors = [
    0xE0BE4D, // GAMBOGE - golden yellow (SELAMAT DATANG)
    0x71ABD1, // ICEBERG - light blue (DI)
    0xFFFFFF, // JAPANESE INDIGO - dark teal (MCE)
    0xE0D595, // FLAX - light beige (2026)
    0xFFFFFF  // DARK BROWN (🙌)
  ];
  material.color.setHex(colors[currentWordIndex % colors.length]);
}

// Initialize particles with font loading
async function init() {
  fontLoaded = await loadCustomFont();
  initParticles();
}

init();

// Show current word indicator
function showWordIndicator(word, direction) {
  // Remove existing indicator
  const existing = document.getElementById('word-indicator');
  if (existing) existing.remove();
  
  const indicator = document.createElement('div');
  indicator.id = 'word-indicator';
  indicator.textContent = word;
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 60px;
    font-weight: bold;
    color: white;
    text-shadow: 0 0 20px currentColor;
    opacity: 1;
    transition: opacity 0.5s, transform 0.5s;
    pointer-events: none;
    z-index: 100;
  `;
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translate(-50%, -50%) scale(1.5)';
  }, 100);
  
  setTimeout(() => indicator.remove(), 600);
}

// Swipe detection function
function detectSwipe(currentX, currentY) {
  // Don't detect swipe while grabbing
  if (isGrabbing) return null;
  
  const now = Date.now();
  
  // Add current position to history
  handHistory.push({ x: currentX, y: currentY, time: now });
  
  // Keep only last 10 frames
  if (handHistory.length > 10) {
    handHistory.shift();
  }
  
  // Need at least 5 frames to detect swipe
  if (handHistory.length < 5) return null;
  
  // Check cooldown
  if (now - lastSwipeTime < swipeCooldown) return null;
  
  // Calculate movement over recent frames
  const oldest = handHistory[0];
  const newest = handHistory[handHistory.length - 1];
  
  const deltaX = newest.x - oldest.x;
  const deltaY = newest.y - oldest.y;
  const deltaTime = newest.time - oldest.time;
  
  // Check if it's a horizontal swipe (more horizontal than vertical movement)
  if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
    if (deltaTime < 500) { // Must be fast enough
      lastSwipeTime = now;
      handHistory = []; // Clear history after swipe
      
      // Note: webcam is mirrored, so we invert the direction
      // User swipes right (their perspective) → deltaX is negative in webcam
      if (deltaX < 0) {
        return 'right'; // Swipe right (next word)
      } else {
        return 'left'; // Swipe left (previous word)
      }
    }
  }
  
  return null;
}

// ===== Setup MediaPipe Hands =====
const videoElement = document.getElementById('webcam');

// Detect grab gesture (closed fist)
function detectGrab(landmarks) {
  // Fingertip landmarks: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
  // Palm/MCP landmarks: 0 (wrist), 5 (index MCP), 9 (middle MCP), 13 (ring MCP), 17 (pinky MCP)
  
  const fingertips = [
    landmarks[8],  // Index fingertip
    landmarks[12], // Middle fingertip
    landmarks[16], // Ring fingertip
    landmarks[20]  // Pinky fingertip
  ];
  
  const mcps = [
    landmarks[5],  // Index MCP
    landmarks[9],  // Middle MCP
    landmarks[13], // Ring MCP
    landmarks[17]  // Pinky MCP
  ];
  
  // Check if fingertips are curled (below their MCPs in Y direction)
  // In MediaPipe, Y increases downward, so curled finger has higher Y than MCP
  let curledFingers = 0;
  
  for (let i = 0; i < fingertips.length; i++) {
    // Check if fingertip is below (higher Y) or close to MCP
    const fingerCurled = fingertips[i].y > mcps[i].y - 0.02;
    if (fingerCurled) curledFingers++;
  }
  
  // Also check thumb - compare tip (4) with IP joint (3)
  const thumbCurled = landmarks[4].x > landmarks[3].x - 0.02; // For right hand
  
  // Consider it a grab if 3+ fingers are curled
  return curledFingers >= 3;
}

// Function to get available cameras and select external webcam
async function setupCamera() {
  try {
    // First get permission
    await navigator.mediaDevices.getUserMedia({ video: true });
    
    // Get all video devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log('Available cameras:', videoDevices);
    
    // Try to find external webcam (usually not the first one, or has "USB" in name)
    let selectedDevice = videoDevices[videoDevices.length - 1]; // Default to last camera (often external)
    
    for (const device of videoDevices) {
      const label = device.label.toLowerCase();
      if (label.includes('usb') || label.includes('external') || label.includes('webcam')) {
        selectedDevice = device;
        break;
      }
    }
    
    console.log('Selected camera:', selectedDevice.label);
    
    return selectedDevice.deviceId;
  } catch (err) {
    console.error('Error accessing camera:', err);
    return null;
  }
}

async function initHandTracking() {
  const deviceId = await setupCamera();
  
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Get palm center (landmark 9) for better tracking
      const landmark = landmarks[9];
      
      // Store raw landmark for swipe detection (0-1 range)
      const rawX = landmark.x;
      const rawY = landmark.y;
      
      // Detect grab gesture
      const grabDetected = detectGrab(landmarks);
      
      // Convert to scene coordinates (flip X because webcam is mirrored)
      // Extended range for wider movement (600 x 400 instead of 300 x 200)
      handX = (1 - landmark.x - 0.5) * 600;
      handY = (0.5 - landmark.y) * 400;
      
      // Handle grab state changes
      if (grabDetected && !lastGrabState) {
        // Just started grabbing - store current offset
        isGrabbing = true;
        console.log('✊ Grab started!');
      } else if (!grabDetected && lastGrabState) {
        // Just released - reset
        isGrabbing = false;
        grabOffsetX = 0;
        grabOffsetY = 0;
        console.log('🖐️ Released!');
      }
      
      // Update grab offset while grabbing
      if (isGrabbing) {
        grabOffsetX = handX;
        grabOffsetY = handY;
      }
      
      lastGrabState = grabDetected;
      
      // Detect swipe gesture (only when not grabbing)
      const swipeDirection = detectSwipe(rawX, rawY);
      
      if (swipeDirection === 'right') {
        // Next item (text, image) - VIDEO DISABLED
        currentWordIndex = (currentWordIndex + 1) % totalItems;
        changeWord();
        let displayName;
        // === VIDEO DISABLED ===
        // if (isVideoIndex(currentWordIndex)) {
        //   displayName = `🎬 Video ${currentWordIndex - words.length - images.length + 1}`;
        // } else 
        if (isImageIndex(currentWordIndex)) {
          displayName = `📷 Image ${currentWordIndex - words.length + 1}`;
        } else {
          displayName = words[currentWordIndex];
        }
        showWordIndicator(displayName, 'right');
        console.log('Swipe Right! →', displayName);
      } else if (swipeDirection === 'left') {
        // Previous item - VIDEO DISABLED
        currentWordIndex = (currentWordIndex - 1 + totalItems) % totalItems;
        changeWord();
        let displayName;
        // === VIDEO DISABLED ===
        // if (isVideoIndex(currentWordIndex)) {
        //   displayName = `🎬 Video ${currentWordIndex - words.length - images.length + 1}`;
        // } else 
        if (isImageIndex(currentWordIndex)) {
          displayName = `📷 Image ${currentWordIndex - words.length + 1}`;
        } else {
          displayName = words[currentWordIndex];
        }
        showWordIndicator(displayName, 'left');
        console.log('Swipe Left! ←', displayName);
      }
      
      handDetected = true;
    } else {
      handDetected = false;
      isGrabbing = false;
      lastGrabState = false;
      grabOffsetX = 0;
      grabOffsetY = 0;
      handHistory = []; // Clear history when hand is lost
    }
  });

  // Start camera with selected device
  const cameraOptions = {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
  };
  
  if (deviceId) {
    cameraOptions.deviceId = deviceId;
  }
  
  const cam = new Camera(videoElement, cameraOptions);
  cam.start();
}

initHandTracking();

// ===== Animation time =====
let time = 0;

// ===== Animate with hand interaction =====
function animate() {
  requestAnimationFrame(animate);
  
  time += 0.02; // Faster time progression

  // Animate star field rotation (faster rotation)
  if (starField) {
    starField.rotation.y += 0.0003;
    starField.rotation.x += 0.0001;
  }
  
  // Animate nebula
  if (nebula) {
    nebula.rotation.y += 0.0004;
    nebula.children.forEach((cloud, i) => {
      cloud.rotation.z += 0.0002 * (i % 2 === 0 ? 1 : -1);
    });
  }
  
  // Update shooting stars (only in default mode)
  if (BACKGROUND_MODE === 'default') {
    updateShootingStars();
  }
  
  // Animate image plane if visible
  if (imagePlane) {
    // Check if it's the third image (index 2 in images array = words.length + 2)
    const isThirdImage = currentWordIndex === words.length + 2;
    
    if (isThirdImage) {
      // Special spinning animation for third image (logo)
      imagePlane.rotation.y += 0.02; // Continuous Y rotation (spinning)
      imagePlane.rotation.x = Math.sin(time * 0.5) * 0.1; // Slight tilt
      imagePlane.rotation.z = Math.sin(time * 0.3) * 0.05;
      
      // Floating motion
      imagePlane.position.y = Math.sin(time * 1.2) * 15;
      imagePlane.position.x = Math.sin(time * 0.6) * 8;
      
      // Pulsing scale
      const scale = 1 + Math.sin(time * 2.5) * 0.08;
      imagePlane.scale.set(scale, scale, 1);
    } else {
      // Normal gentle animation for other images
      // Floating motion
      imagePlane.position.y = Math.sin(time * 1.5) * 10;
      imagePlane.position.x = Math.sin(time * 0.8) * 5;
      
      // Gentle rotation
      imagePlane.rotation.y = Math.sin(time * 0.5) * 0.15;
      imagePlane.rotation.x = Math.sin(time * 0.3) * 0.05;
      imagePlane.rotation.z = Math.sin(time * 0.7) * 0.03;
      
      // Pulsing scale
      const scale = 1 + Math.sin(time * 2) * 0.05;
      imagePlane.scale.set(scale, scale, 1);
    }
  }
  
  // === VIDEO DISABLED ===
  // Animate video plane if visible
  // if (videoPlane) {
  //   // Gentle floating motion
  //   videoPlane.position.y = Math.sin(time * 1.0) * 8;
  //   videoPlane.position.x = Math.sin(time * 0.5) * 4;
  //   
  //   // Slight rotation
  //   videoPlane.rotation.y = Math.sin(time * 0.3) * 0.08;
  //   videoPlane.rotation.x = Math.sin(time * 0.2) * 0.03;
  // }

  const positions = geometry.attributes.position.array;
  const repelRadius = 100; // Larger repel area
  const repelStrength = 15; // Stronger repel
  const morphSpeed = 0.05; // Faster morphing
  const friction = 0.88;

  // Rotate entire particle system - MORE DYNAMIC
  points.rotation.y = Math.sin(time * 0.8) * 0.25; // Faster, wider rotation
  points.rotation.x = Math.sin(time * 0.5) * 0.15;
  points.rotation.z = Math.sin(time * 0.3) * 0.05; // Add Z rotation

  for (let i = 0; i < positions.length; i += 3) {
    const particleIndex = i / 3;
    
    // Get target position (for morphing between words)
    const tx = targetPositions[i] || 0;
    const ty = targetPositions[i + 1] || 0;
    const tz = targetPositions[i + 2] || 0;

    // Add floating/orbiting motion for each particle - MORE DYNAMIC
    const floatSpeed = 1.0 + (particleIndex % 10) * 0.1; // Faster floating
    const floatRadius = 3 + (particleIndex % 7); // Larger orbit radius
    const phase = particleIndex * 0.15;
    
    const floatX = Math.sin(time * floatSpeed + phase) * floatRadius * 0.5;
    const floatY = Math.cos(time * floatSpeed * 0.8 + phase) * floatRadius * 0.7;
    const floatZ = Math.sin(time * floatSpeed * 0.6 + phase) * floatRadius * 1.2;

    let vx = velocities[i] || 0;
    let vy = velocities[i + 1] || 0;
    let vz = velocities[i + 2] || 0;

    if (handDetected) {
      const dx = positions[i] - handX;
      const dy = positions[i + 1] - handY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repelRadius && dist > 0) {
        const force = (repelRadius - dist) / repelRadius * repelStrength;
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
        vz += (Math.random() - 0.5) * force * 1.5; // More Z movement
      }
    }

    // Morph towards target position with floating offset
    // Add grab offset when grabbing
    const grabX = isGrabbing ? grabOffsetX : 0;
    const grabY = isGrabbing ? grabOffsetY : 0;
    
    const targetWithFloatX = tx + floatX + grabX;
    const targetWithFloatY = ty + floatY + grabY;
    const targetWithFloatZ = tz + floatZ;
    
    vx += (targetWithFloatX - positions[i]) * morphSpeed;
    vy += (targetWithFloatY - positions[i + 1]) * morphSpeed;
    vz += (targetWithFloatZ - positions[i + 2]) * morphSpeed;

    // Apply friction
    vx *= friction;
    vy *= friction;
    vz *= friction;

    // Update velocities
    velocities[i] = vx;
    velocities[i + 1] = vy;
    velocities[i + 2] = vz;

    // Update positions
    positions[i] += vx;
    positions[i + 1] += vy;
    positions[i + 2] += vz;
  }

  geometry.attributes.position.needsUpdate = true;
  
  // Breathing effect on particle size - faster pulsing
  material.size = 3 + Math.sin(time * 3) * 0.8;

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
