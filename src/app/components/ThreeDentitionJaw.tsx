"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ==========================================
// TYPES & DEFINITIONS
// ==========================================

export type ToothCondition =
  | 'sound'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'missing'
  | 'rct'
  | 'implant'
  | 'fracture';

export type ToothSurface = 'O' | 'M' | 'D' | 'B' | 'L';

export interface ToothCoord3D {
  id: string; // FDI (e.g. "16")
  palmer: string; // Palmer notation (e.g. "6┘")
  palmerQuadrant: 'UR' | 'UL' | 'LR' | 'LL';
  palmerNumber: string; // "1"-"8" or "A"-"E"
  name: string;
  type: 'incisor' | 'canine' | 'premolar' | 'molar';
  x: number;
  y: number;
  z: number;
  rotationY: number; // Y-rotation angle to align along dental arch
  arch: 'maxillary' | 'mandibular';
  dentition: 'permanent' | 'deciduous';
}

export interface ToothRecord extends ToothCoord3D {
  condition: ToothCondition;
  surfaces: ToothSurface[];
  notes?: string;
}

export const CONDITION_COLORS: Record<ToothCondition, { color: number; emissive: number; metalness: number; roughness: number }> = {
  sound: { color: 0xfbfbf6, emissive: 0x000000, metalness: 0.05, roughness: 0.18 },
  caries: { color: 0xdc2626, emissive: 0x450a0a, metalness: 0.1, roughness: 0.45 },
  filled: { color: 0x0284c7, emissive: 0x082f49, metalness: 0.5, roughness: 0.25 },
  crown: { color: 0xf59e0b, emissive: 0x78350f, metalness: 0.85, roughness: 0.12 },
  missing: { color: 0x64748b, emissive: 0x000000, metalness: 0.1, roughness: 0.9 },
  rct: { color: 0xa855f7, emissive: 0x3b0764, metalness: 0.2, roughness: 0.2 },
  implant: { color: 0x0d9488, emissive: 0x134e4a, metalness: 0.9, roughness: 0.2 },
  fracture: { color: 0xea580c, emissive: 0x431407, metalness: 0.2, roughness: 0.3 },
};

// ==========================================
// 3D ANATOMICAL DENTAL ARCH COORDINATES
// ==========================================

export const PERMANENT_TEETH_3D: ToothCoord3D[] = [
  // Upper Right (UR 8┘ to 1┘)
  { id: '18', palmer: '8┘', palmerQuadrant: 'UR', palmerNumber: '8', name: 'Upper Right 3rd Molar (Wisdom)', type: 'molar', x: -4.1, y: 1.8, z: 2.2, rotationY: -0.15, arch: 'maxillary', dentition: 'permanent' },
  { id: '17', palmer: '7┘', palmerQuadrant: 'UR', palmerNumber: '7', name: 'Upper Right 2nd Molar', type: 'molar', x: -3.9, y: 1.8, z: 0.9, rotationY: -0.25, arch: 'maxillary', dentition: 'permanent' },
  { id: '16', palmer: '6┘', palmerQuadrant: 'UR', palmerNumber: '6', name: 'Upper Right 1st Molar', type: 'molar', x: -3.6, y: 1.8, z: -0.5, rotationY: -0.35, arch: 'maxillary', dentition: 'permanent' },
  { id: '15', palmer: '5┘', palmerQuadrant: 'UR', palmerNumber: '5', name: 'Upper Right 2nd Premolar', type: 'premolar', x: -3.2, y: 1.8, z: -1.7, rotationY: -0.55, arch: 'maxillary', dentition: 'permanent' },
  { id: '14', palmer: '4┘', palmerQuadrant: 'UR', palmerNumber: '4', name: 'Upper Right 1st Premolar', type: 'premolar', x: -2.7, y: 1.8, z: -2.7, rotationY: -0.80, arch: 'maxillary', dentition: 'permanent' },
  { id: '13', palmer: '3┘', palmerQuadrant: 'UR', palmerNumber: '3', name: 'Upper Right Canine', type: 'canine', x: -2.1, y: 1.8, z: -3.5, rotationY: -1.05, arch: 'maxillary', dentition: 'permanent' },
  { id: '12', palmer: '2┘', palmerQuadrant: 'UR', palmerNumber: '2', name: 'Upper Right Lateral Incisor', type: 'incisor', x: -1.3, y: 1.8, z: -4.1, rotationY: -1.30, arch: 'maxillary', dentition: 'permanent' },
  { id: '11', palmer: '1┘', palmerQuadrant: 'UR', palmerNumber: '1', name: 'Upper Right Central Incisor', type: 'incisor', x: -0.45, y: 1.8, z: -4.3, rotationY: -1.50, arch: 'maxillary', dentition: 'permanent' },

  // Upper Left (UL └1 to └8)
  { id: '21', palmer: '└1', palmerQuadrant: 'UL', palmerNumber: '1', name: 'Upper Left Central Incisor', type: 'incisor', x: 0.45, y: 1.8, z: -4.3, rotationY: 1.50, arch: 'maxillary', dentition: 'permanent' },
  { id: '22', palmer: '└2', palmerQuadrant: 'UL', palmerNumber: '2', name: 'Upper Left Lateral Incisor', type: 'incisor', x: 1.3, y: 1.8, z: -4.1, rotationY: 1.30, arch: 'maxillary', dentition: 'permanent' },
  { id: '23', palmer: '└3', palmerQuadrant: 'UL', palmerNumber: '3', name: 'Upper Left Canine', type: 'canine', x: 2.1, y: 1.8, z: -3.5, rotationY: 1.05, arch: 'maxillary', dentition: 'permanent' },
  { id: '24', palmer: '└4', palmerQuadrant: 'UL', palmerNumber: '4', name: 'Upper Left 1st Premolar', type: 'premolar', x: 2.7, y: 1.8, z: -2.7, rotationY: 0.80, arch: 'maxillary', dentition: 'permanent' },
  { id: '25', palmer: '└5', palmerQuadrant: 'UL', palmerNumber: '5', name: 'Upper Left 2nd Premolar', type: 'premolar', x: 3.2, y: 1.8, z: -1.7, rotationY: 0.55, arch: 'maxillary', dentition: 'permanent' },
  { id: '26', palmer: '└6', palmerQuadrant: 'UL', palmerNumber: '6', name: 'Upper Left 1st Molar', type: 'molar', x: 3.6, y: 1.8, z: -0.5, rotationY: 0.35, arch: 'maxillary', dentition: 'permanent' },
  { id: '27', palmer: '└7', palmerQuadrant: 'UL', palmerNumber: '7', name: 'Upper Left 2nd Molar', type: 'molar', x: 3.9, y: 1.8, z: 0.9, rotationY: 0.25, arch: 'maxillary', dentition: 'permanent' },
  { id: '28', palmer: '└8', palmerQuadrant: 'UL', palmerNumber: '8', name: 'Upper Left 3rd Molar (Wisdom)', type: 'molar', x: 4.1, y: 1.8, z: 2.2, rotationY: 0.15, arch: 'maxillary', dentition: 'permanent' },

  // Lower Right (LR 8┐ to 1┐)
  { id: '48', palmer: '8┐', palmerQuadrant: 'LR', palmerNumber: '8', name: 'Lower Right 3rd Molar (Wisdom)', type: 'molar', x: -3.85, y: -1.8, z: 2.2, rotationY: -0.15, arch: 'mandibular', dentition: 'permanent' },
  { id: '47', palmer: '7┐', palmerQuadrant: 'LR', palmerNumber: '7', name: 'Lower Right 2nd Molar', type: 'molar', x: -3.65, y: -1.8, z: 0.9, rotationY: -0.25, arch: 'mandibular', dentition: 'permanent' },
  { id: '46', palmer: '6┐', palmerQuadrant: 'LR', palmerNumber: '6', name: 'Lower Right 1st Molar', type: 'molar', x: -3.35, y: -1.8, z: -0.5, rotationY: -0.35, arch: 'mandibular', dentition: 'permanent' },
  { id: '45', palmer: '5┐', palmerQuadrant: 'LR', palmerNumber: '5', name: 'Lower Right 2nd Premolar', type: 'premolar', x: -2.95, y: -1.8, z: -1.7, rotationY: -0.55, arch: 'mandibular', dentition: 'permanent' },
  { id: '44', palmer: '4┐', palmerQuadrant: 'LR', palmerNumber: '4', name: 'Lower Right 1st Premolar', type: 'premolar', x: -2.5, y: -1.8, z: -2.7, rotationY: -0.80, arch: 'mandibular', dentition: 'permanent' },
  { id: '43', palmer: '3┐', palmerQuadrant: 'LR', palmerNumber: '3', name: 'Lower Right Canine', type: 'canine', x: -1.9, y: -1.8, z: -3.4, rotationY: -1.05, arch: 'mandibular', dentition: 'permanent' },
  { id: '42', palmer: '2┐', palmerQuadrant: 'LR', palmerNumber: '2', name: 'Lower Right Lateral Incisor', type: 'incisor', x: -1.15, y: -1.8, z: -3.9, rotationY: -1.30, arch: 'mandibular', dentition: 'permanent' },
  { id: '41', palmer: '1┐', palmerQuadrant: 'LR', palmerNumber: '1', name: 'Lower Right Central Incisor', type: 'incisor', x: -0.4, y: -1.8, z: -4.1, rotationY: -1.50, arch: 'mandibular', dentition: 'permanent' },

  // Lower Left (LL ┌1 to ┌8)
  { id: '31', palmer: '┌1', palmerQuadrant: 'LL', palmerNumber: '1', name: 'Lower Left Central Incisor', type: 'incisor', x: 0.4, y: -1.8, z: -4.1, rotationY: 1.50, arch: 'mandibular', dentition: 'permanent' },
  { id: '32', palmer: '┌2', palmerQuadrant: 'LL', palmerNumber: '2', name: 'Lower Left Lateral Incisor', type: 'incisor', x: 1.15, y: -1.8, z: -3.9, rotationY: 1.30, arch: 'mandibular', dentition: 'permanent' },
  { id: '33', palmer: '┌3', palmerQuadrant: 'LL', palmerNumber: '3', name: 'Lower Left Canine', type: 'canine', x: 1.9, y: -1.8, z: -3.4, rotationY: 1.05, arch: 'mandibular', dentition: 'permanent' },
  { id: '34', palmer: '┌4', palmerQuadrant: 'LL', palmerNumber: '4', name: 'Lower Left 1st Premolar', type: 'premolar', x: 2.5, y: -1.8, z: -2.7, rotationY: 0.80, arch: 'mandibular', dentition: 'permanent' },
  { id: '35', palmer: '┌5', palmerQuadrant: 'LL', palmerNumber: '5', name: 'Lower Left 2nd Premolar', type: 'premolar', x: 2.95, y: -1.8, z: -1.7, rotationY: 0.55, arch: 'mandibular', dentition: 'permanent' },
  { id: '36', palmer: '┌6', palmerQuadrant: 'LL', palmerNumber: '6', name: 'Lower Left 1st Molar', type: 'molar', x: 3.35, y: -1.8, z: -0.5, rotationY: 0.35, arch: 'mandibular', dentition: 'permanent' },
  { id: '37', palmer: '┌7', palmerQuadrant: 'LL', palmerNumber: '7', name: 'Lower Left 2nd Molar', type: 'molar', x: 3.65, y: -1.8, z: 0.9, rotationY: 0.25, arch: 'mandibular', dentition: 'permanent' },
  { id: '38', palmer: '┌8', palmerQuadrant: 'LL', palmerNumber: '8', name: 'Lower Left 3rd Molar (Wisdom)', type: 'molar', x: 3.85, y: -1.8, z: 2.2, rotationY: 0.15, arch: 'mandibular', dentition: 'permanent' },
];

export const DECIDUOUS_TEETH_3D: ToothCoord3D[] = [
  // Upper Right (UR E┘ to A┘)
  { id: '55', palmer: 'E┘', palmerQuadrant: 'UR', palmerNumber: 'E', name: 'Primary Upper Right 2nd Molar', type: 'molar', x: -3.4, y: 1.8, z: 0.6, rotationY: -0.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '54', palmer: 'D┘', palmerQuadrant: 'UR', palmerNumber: 'D', name: 'Primary Upper Right 1st Molar', type: 'molar', x: -3.0, y: 1.8, z: -0.8, rotationY: -0.45, arch: 'maxillary', dentition: 'deciduous' },
  { id: '53', palmer: 'C┘', palmerQuadrant: 'UR', palmerNumber: 'C', name: 'Primary Upper Right Canine', type: 'canine', x: -2.3, y: 1.8, z: -2.0, rotationY: -0.85, arch: 'maxillary', dentition: 'deciduous' },
  { id: '52', palmer: 'B┘', palmerQuadrant: 'UR', palmerNumber: 'B', name: 'Primary Upper Right Lateral Incisor', type: 'incisor', x: -1.4, y: 1.8, z: -2.9, rotationY: -1.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '51', palmer: 'A┘', palmerQuadrant: 'UR', palmerNumber: 'A', name: 'Primary Upper Right Central Incisor', type: 'incisor', x: -0.45, y: 1.8, z: -3.3, rotationY: -1.50, arch: 'maxillary', dentition: 'deciduous' },

  // Upper Left (UL └A to └E)
  { id: '61', palmer: '└A', palmerQuadrant: 'UL', palmerNumber: 'A', name: 'Primary Upper Left Central Incisor', type: 'incisor', x: 0.45, y: 1.8, z: -3.3, rotationY: 1.50, arch: 'maxillary', dentition: 'deciduous' },
  { id: '62', palmer: '└B', palmerQuadrant: 'UL', palmerNumber: 'B', name: 'Primary Upper Left Lateral Incisor', type: 'incisor', x: 1.4, y: 1.8, z: -2.9, rotationY: 1.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '63', palmer: '└C', palmerQuadrant: 'UL', palmerNumber: 'C', name: 'Primary Upper Left Canine', type: 'canine', x: 2.3, y: 1.8, z: -2.0, rotationY: 0.85, arch: 'maxillary', dentition: 'deciduous' },
  { id: '64', palmer: '└D', palmerQuadrant: 'UL', palmerNumber: 'D', name: 'Primary Upper Left 1st Molar', type: 'molar', x: 3.0, y: 1.8, z: -0.8, rotationY: 0.45, arch: 'maxillary', dentition: 'deciduous' },
  { id: '65', palmer: '└E', palmerQuadrant: 'UL', palmerNumber: 'E', name: 'Primary Upper Left 2nd Molar', type: 'molar', x: 3.4, y: 1.8, z: 0.6, rotationY: 0.25, arch: 'maxillary', dentition: 'deciduous' },

  // Lower Right (LR E┐ to A┐)
  { id: '85', palmer: 'E┐', palmerQuadrant: 'LR', palmerNumber: 'E', name: 'Primary Lower Right 2nd Molar', type: 'molar', x: -3.2, y: -1.8, z: 0.6, rotationY: -0.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '84', palmer: 'D┐', palmerQuadrant: 'LR', palmerNumber: 'D', name: 'Primary Lower Right 1st Molar', type: 'molar', x: -2.8, y: -1.8, z: -0.8, rotationY: -0.45, arch: 'mandibular', dentition: 'deciduous' },
  { id: '83', palmer: 'C┐', palmerQuadrant: 'LR', palmerNumber: 'C', name: 'Primary Lower Right Canine', type: 'canine', x: -2.1, y: -1.8, z: -2.0, rotationY: -0.85, arch: 'mandibular', dentition: 'deciduous' },
  { id: '82', palmer: 'B┐', palmerQuadrant: 'LR', palmerNumber: 'B', name: 'Primary Lower Right Lateral Incisor', type: 'incisor', x: -1.3, y: -1.8, z: -2.8, rotationY: -1.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '81', palmer: 'A┐', palmerQuadrant: 'LR', palmerNumber: 'A', name: 'Primary Lower Right Central Incisor', type: 'incisor', x: -0.4, y: -1.8, z: -3.1, rotationY: -1.50, arch: 'mandibular', dentition: 'deciduous' },

  // Lower Left (LL ┌A to ┌E)
  { id: '71', palmer: '┌A', palmerQuadrant: 'LL', palmerNumber: 'A', name: 'Primary Lower Left Central Incisor', type: 'incisor', x: 0.4, y: -1.8, z: -3.1, rotationY: 1.50, arch: 'mandibular', dentition: 'deciduous' },
  { id: '72', palmer: '┌B', palmerQuadrant: 'LL', palmerNumber: 'B', name: 'Primary Lower Left Lateral Incisor', type: 'incisor', x: 1.3, y: -1.8, z: -2.8, rotationY: 1.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '73', palmer: '┌C', palmerQuadrant: 'LL', palmerNumber: 'C', name: 'Primary Lower Left Canine', type: 'canine', x: 2.1, y: -1.8, z: -2.0, rotationY: 0.85, arch: 'mandibular', dentition: 'deciduous' },
  { id: '74', palmer: '┌D', palmerQuadrant: 'LL', palmerNumber: 'D', name: 'Primary Lower Left 1st Molar', type: 'molar', x: 2.8, y: -1.8, z: -0.8, rotationY: 0.45, arch: 'mandibular', dentition: 'deciduous' },
  { id: '75', palmer: '┌E', palmerQuadrant: 'LL', palmerNumber: 'E', name: 'Primary Lower Left 2nd Molar', type: 'molar', x: 3.2, y: -1.8, z: 0.6, rotationY: 0.25, arch: 'mandibular', dentition: 'deciduous' },
];

// ==========================================
// 3D PROCEDURAL GEOMETRY GENERATORS
// ==========================================

function createToothGeometry(type: 'incisor' | 'canine' | 'premolar' | 'molar') {
  if (type === 'molar') {
    // 4-cusped molar crown
    const geom = new THREE.CylinderGeometry(0.55, 0.48, 0.75, 16, 2);
    geom.scale(1.2, 1.0, 1.05);
    return geom;
  } else if (type === 'premolar') {
    // Bicuspid crown
    const geom = new THREE.CylinderGeometry(0.42, 0.36, 0.72, 14, 2);
    geom.scale(1.0, 1.0, 0.9);
    return geom;
  } else if (type === 'canine') {
    // Pointed conical canine crown
    const geom = new THREE.ConeGeometry(0.40, 0.85, 12);
    geom.rotateX(Math.PI);
    return geom;
  } else {
    // Chisel-shaped Incisor
    const geom = new THREE.BoxGeometry(0.65, 0.80, 0.32);
    return geom;
  }
}

// ==========================================
// COMPONENT PROPS
// ==========================================
interface ThreeDentitionJawProps {
  title: string;
  teethCoords: ToothCoord3D[];
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  onToothClick: (tooth: ToothRecord) => void;
  disabled?: boolean;
}

export default function ThreeDentitionJaw({
  title,
  teethCoords,
  teethData,
  onToothClick,
  disabled,
}: ThreeDentitionJawProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTooth, setHoveredTooth] = useState<ToothCoord3D | null>(null);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Setup Three.js Scene, Camera, Lights, OrbitControls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 550;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI - 0.1;
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(8, 15, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xbfdbfe, 1.5);
    dirLight2.position.set(-10, -10, 8);
    scene.add(dirLight2);

    const backLight = new THREE.DirectionalLight(0xffedd5, 1.0);
    backLight.position.set(0, 10, -12);
    scene.add(backLight);

    // ── Build Anatomical Gums (Gingiva 3D Arches) ──
    const upperGumPoints = [
      new THREE.Vector3(-4.4, 2.3, 2.4),
      new THREE.Vector3(-3.8, 2.3, -0.6),
      new THREE.Vector3(-2.8, 2.3, -2.8),
      new THREE.Vector3(-1.4, 2.3, -4.2),
      new THREE.Vector3(0, 2.3, -4.6),
      new THREE.Vector3(1.4, 2.3, -4.2),
      new THREE.Vector3(2.8, 2.3, -2.8),
      new THREE.Vector3(3.8, 2.3, -0.6),
      new THREE.Vector3(4.4, 2.3, 2.4),
    ];
    const upperCurve = new THREE.CatmullRomCurve3(upperGumPoints);
    const upperGumGeom = new THREE.TubeGeometry(upperCurve, 40, 0.75, 12, false);
    const gumMat = new THREE.MeshStandardMaterial({
      color: 0xd96f7c,
      roughness: 0.35,
      metalness: 0.05,
    });
    const upperGumMesh = new THREE.Mesh(upperGumGeom, gumMat);
    scene.add(upperGumMesh);

    // Palatal vault
    const palateGeom = new THREE.SphereGeometry(3.6, 24, 16, 0, Math.PI, 0, Math.PI * 0.45);
    palateGeom.rotateX(Math.PI * 0.9);
    palateGeom.translate(0, 2.5, -0.5);
    const palateMat = new THREE.MeshStandardMaterial({ color: 0xcc606d, roughness: 0.5 });
    const palateMesh = new THREE.Mesh(palateGeom, palateMat);
    scene.add(palateMesh);

    // Lower gum
    const lowerGumPoints = [
      new THREE.Vector3(-4.1, -2.3, 2.4),
      new THREE.Vector3(-3.5, -2.3, -0.6),
      new THREE.Vector3(-2.6, -2.3, -2.8),
      new THREE.Vector3(-1.3, -2.3, -4.1),
      new THREE.Vector3(0, -2.3, -4.4),
      new THREE.Vector3(1.3, -2.3, -4.1),
      new THREE.Vector3(2.6, -2.3, -2.8),
      new THREE.Vector3(3.5, -2.3, -0.6),
      new THREE.Vector3(4.1, -2.3, 2.4),
    ];
    const lowerCurve = new THREE.CatmullRomCurve3(lowerGumPoints);
    const lowerGumGeom = new THREE.TubeGeometry(lowerCurve, 40, 0.70, 12, false);
    const lowerGumMesh = new THREE.Mesh(lowerGumGeom, gumMat);
    scene.add(lowerGumMesh);

    // Tongue
    const tongueGeom = new THREE.SphereGeometry(3.0, 24, 16);
    tongueGeom.scale(0.9, 0.5, 1.2);
    tongueGeom.translate(0, -2.4, -0.2);
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xdf727d, roughness: 0.4 });
    const tongueMesh = new THREE.Mesh(tongueGeom, tongueMat);
    scene.add(tongueMesh);

    // ── Build 3D Tooth Meshes ──
    meshesMapRef.current.clear();

    teethCoords.forEach(tooth => {
      const geom = createToothGeometry(tooth.type);

      // Orientation adjustments
      if (tooth.arch === 'mandibular') {
        geom.rotateX(Math.PI); // Point incisal/occlusal edge up
      }

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xfbfbf6,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(tooth.x, tooth.y, tooth.z);
      mesh.rotation.y = tooth.rotationY;
      mesh.userData = tooth;

      scene.add(mesh);
      meshesMapRef.current.set(tooth.id, mesh);
    });

    // Raycaster for Pointer Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      isDragging = false;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 5) isDragging = true;

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(meshesMapRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const toothData = hitMesh.userData as ToothCoord3D;
        setHoveredTooth(toothData);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredTooth(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerUp = (e: MouseEvent) => {
      if (isDragging) return; // Ignore clicks if camera was dragged

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(meshesMapRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const toothData = hitMesh.userData as ToothCoord3D;
        if (!disabled) {
          const saved = teethData[toothData.id];
          onToothClick({
            ...toothData,
            condition: saved?.condition || 'sound',
            surfaces: saved?.surfaces || [],
            notes: saved?.notes || '',
          });
        }
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onPointerDown);
    domElement.addEventListener('mousemove', onPointerMove);
    domElement.addEventListener('mouseup', onPointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 550;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      domElement.removeEventListener('mousedown', onPointerDown);
      domElement.removeEventListener('mousemove', onPointerMove);
      domElement.removeEventListener('mouseup', onPointerUp);
      if (domElement.parentElement) {
        domElement.parentElement.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [teethCoords]);

  // Update Materials & Hover Highlights Reactively
  useEffect(() => {
    meshesMapRef.current.forEach((mesh, id) => {
      const saved = teethData[id];
      const condition = saved?.condition || 'sound';
      const conf = CONDITION_COLORS[condition];
      const mat = mesh.material as THREE.MeshPhysicalMaterial;

      const isHovered = hoveredTooth?.id === id;

      // Color & Emissive
      mat.color.setHex(conf.color);
      mat.metalness = conf.metalness;
      mat.roughness = conf.roughness;

      if (condition === 'missing') {
        mat.wireframe = true;
        mat.transparent = true;
        mat.opacity = 0.35;
      } else {
        mat.wireframe = false;
        mat.transparent = false;
        mat.opacity = 1.0;
      }

      if (isHovered) {
        mat.emissive.setHex(0x4338ca); // Clean indigo auto-hover glow
        mesh.scale.set(1.18, 1.18, 1.18);
      } else {
        mat.emissive.setHex(conf.emissive);
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });
  }, [teethData, hoveredTooth]);

  // Quick 3D Camera Controls
  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0, 15);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const viewUpper = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 14, 0.1);
    controlsRef.current.target.set(0, 1.8, 0);
    controlsRef.current.update();
  };

  const viewLower = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, -14, 0.1);
    controlsRef.current.target.set(0, -1.8, 0);
    controlsRef.current.update();
  };

  return (
    <div className="w-full bg-[#12141a] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-gray-800/80">
      {/* Sleek Minimal Header with Live Palmer HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🦷</span>
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
        </div>

        {/* Live Hover HUD / Status */}
        <div className="text-xs h-7 flex items-center">
          {hoveredTooth ? (
            <div className="flex items-center gap-2 animate-fadeIn bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-indigo-200 shadow-md">
              <span className="font-mono font-black text-white text-sm bg-indigo-600 px-1.5 py-0.5 rounded">
                {hoveredTooth.palmer}
              </span>
              <span>·</span>
              <span className="font-semibold text-white">{hoveredTooth.name}</span>
              <span>·</span>
              <span className="font-bold capitalize text-amber-300">
                {teethData[hoveredTooth.id]?.condition ? teethData[hoveredTooth.id].condition : 'Sound'}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-[11px]">
              Drag to rotate 3D view · Scroll to zoom · Click tooth to edit
            </span>
          )}
        </div>

        {/* 3D Camera Angles */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={resetCamera}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="Reset front perspective"
          >
            🔄 Reset 3D
          </button>
          <button
            type="button"
            onClick={viewUpper}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="View Upper Maxillary Arch"
          >
            ⬆️ Upper Arch
          </button>
          <button
            type="button"
            onClick={viewLower}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="View Lower Mandibular Arch"
          >
            ⬇️ Lower Arch
          </button>
        </div>
      </div>

      {/* WebGL 3D Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[460px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0b0e] via-[#101216] to-[#0a0b0e] shadow-inner border border-gray-900"
      >
        {/* Quadrant Legend in 3D Space */}
        <div className="absolute top-3 left-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none">
          RIGHT (UR ┘)
        </div>
        <div className="absolute top-3 right-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none">
          LEFT (UL └)
        </div>
        <div className="absolute bottom-3 left-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none">
          RIGHT (LR ┐)
        </div>
        <div className="absolute bottom-3 right-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none">
          LEFT (LL ┌)
        </div>

        {/* 3D Orbit Help Badge */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-full pointer-events-none border border-white/10">
          3D WebGL Orbit: Rotate, Pan, & Zoom
        </div>
      </div>
    </div>
  );
}
