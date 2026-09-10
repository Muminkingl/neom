"use client";

import React, { useState, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ==========================================
// DENTAL TYPES & PALMER DEFINITIONS
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
  id: string; // FDI id (e.g. "16")
  palmer: string; // Palmer notation (e.g. "6┘")
  palmerQuadrant: 'UR' | 'UL' | 'LR' | 'LL';
  palmerNumber: string; // "1"-"8" or "A"-"E"
  name: string;
  type: 'incisor' | 'canine' | 'premolar' | 'molar';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  arch: 'maxillary' | 'mandibular';
  dentition: 'permanent' | 'deciduous';
}

export interface ToothRecord extends ToothCoord3D {
  condition: ToothCondition;
  surfaces: ToothSurface[];
  notes?: string;
}

export const CONDITION_CONFIG: Record<ToothCondition, {
  label: string;
  color: string;
  hexColor: number;
  emissive: number;
  metalness: number;
  roughness: number;
}> = {
  sound: {
    label: 'Sound / Healthy',
    color: '#10b981',
    hexColor: 0xfcfbf7, // Natural ivory enamel
    emissive: 0x000000,
    metalness: 0.05,
    roughness: 0.16,
  },
  caries: {
    label: 'Caries / Cavity',
    color: '#ef4444',
    hexColor: 0xdc2626, // Crimson pathology
    emissive: 0x450a0a,
    metalness: 0.1,
    roughness: 0.45,
  },
  filled: {
    label: 'Filled / Restoration',
    color: '#0284c7',
    hexColor: 0x0284c7, // Amalgam/composite blue
    emissive: 0x082f49,
    metalness: 0.45,
    roughness: 0.22,
  },
  crown: {
    label: 'Crown / Cap',
    color: '#f59e0b',
    hexColor: 0xf59e0b, // Dental gold
    emissive: 0x78350f,
    metalness: 0.85,
    roughness: 0.14,
  },
  missing: {
    label: 'Missing / Extracted',
    color: '#64748b',
    hexColor: 0x64748b, // Wireframe ghost
    emissive: 0x000000,
    metalness: 0.1,
    roughness: 0.9,
  },
  rct: {
    label: 'Root Canal (RCT)',
    color: '#a855f7',
    hexColor: 0xa855f7, // Endodontic purple
    emissive: 0x3b0764,
    metalness: 0.2,
    roughness: 0.22,
  },
  implant: {
    label: 'Dental Implant',
    color: '#0d9488',
    hexColor: 0x0d9488, // Titanium teal
    emissive: 0x134e4a,
    metalness: 0.85,
    roughness: 0.18,
  },
  fracture: {
    label: 'Fractured / Broken',
    color: '#ea580c',
    hexColor: 0xea580c, // Trauma orange
    emissive: 0x431407,
    metalness: 0.2,
    roughness: 0.35,
  },
};

// ==========================================
// 32 PERMANENT TEETH (PALMER 1-8)
// Anterior (+Z front) to Posterior (-Z back)
// ==========================================
export const PERMANENT_TEETH_3D: ToothCoord3D[] = [
  // ── UPPER RIGHT (UR: 8┘ to 1┘) ──
  { id: '18', palmer: '8┘', palmerQuadrant: 'UR', palmerNumber: '8', name: 'Upper Right 3rd Molar (Wisdom)', type: 'molar', x: -4.1, y: 1.8, z: -2.7, rotationY: 0.15, arch: 'maxillary', dentition: 'permanent' },
  { id: '17', palmer: '7┘', palmerQuadrant: 'UR', palmerNumber: '7', name: 'Upper Right 2nd Molar', type: 'molar', x: -3.9, y: 1.8, z: -1.5, rotationY: 0.25, arch: 'maxillary', dentition: 'permanent' },
  { id: '16', palmer: '6┘', palmerQuadrant: 'UR', palmerNumber: '6', name: 'Upper Right 1st Molar', type: 'molar', x: -3.6, y: 1.8, z: -0.2, rotationY: 0.35, arch: 'maxillary', dentition: 'permanent' },
  { id: '15', palmer: '5┘', palmerQuadrant: 'UR', palmerNumber: '5', name: 'Upper Right 2nd Premolar', type: 'premolar', x: -3.2, y: 1.8, z: 1.0, rotationY: 0.55, arch: 'maxillary', dentition: 'permanent' },
  { id: '14', palmer: '4┘', palmerQuadrant: 'UR', palmerNumber: '4', name: 'Upper Right 1st Premolar', type: 'premolar', x: -2.7, y: 1.8, z: 2.1, rotationY: 0.80, arch: 'maxillary', dentition: 'permanent' },
  { id: '13', palmer: '3┘', palmerQuadrant: 'UR', palmerNumber: '3', name: 'Upper Right Canine', type: 'canine', x: -2.1, y: 1.8, z: 3.0, rotationY: 1.05, arch: 'maxillary', dentition: 'permanent' },
  { id: '12', palmer: '2┘', palmerQuadrant: 'UR', palmerNumber: '2', name: 'Upper Right Lateral Incisor', type: 'incisor', x: -1.3, y: 1.8, z: 3.6, rotationY: 1.30, arch: 'maxillary', dentition: 'permanent' },
  { id: '11', palmer: '1┘', palmerQuadrant: 'UR', palmerNumber: '1', name: 'Upper Right Central Incisor', type: 'incisor', x: -0.45, y: 1.8, z: 3.8, rotationY: 1.50, arch: 'maxillary', dentition: 'permanent' },

  // ── UPPER LEFT (UL: └1 to └8) ──
  { id: '21', palmer: '└1', palmerQuadrant: 'UL', palmerNumber: '1', name: 'Upper Left Central Incisor', type: 'incisor', x: 0.45, y: 1.8, z: 3.8, rotationY: -1.50, arch: 'maxillary', dentition: 'permanent' },
  { id: '22', palmer: '└2', palmerQuadrant: 'UL', palmerNumber: '2', name: 'Upper Left Lateral Incisor', type: 'incisor', x: 1.3, y: 1.8, z: 3.6, rotationY: -1.30, arch: 'maxillary', dentition: 'permanent' },
  { id: '23', palmer: '└3', palmerQuadrant: 'UL', palmerNumber: '3', name: 'Upper Left Canine', type: 'canine', x: 2.1, y: 1.8, z: 3.0, rotationY: -1.05, arch: 'maxillary', dentition: 'permanent' },
  { id: '24', palmer: '└4', palmerQuadrant: 'UL', palmerNumber: '4', name: 'Upper Left 1st Premolar', type: 'premolar', x: 2.7, y: 1.8, z: 2.1, rotationY: -0.80, arch: 'maxillary', dentition: 'permanent' },
  { id: '25', palmer: '└5', palmerQuadrant: 'UL', palmerNumber: '5', name: 'Upper Left 2nd Premolar', type: 'premolar', x: 3.2, y: 1.8, z: 1.0, rotationY: -0.55, arch: 'maxillary', dentition: 'permanent' },
  { id: '26', palmer: '└6', palmerQuadrant: 'UL', palmerNumber: '6', name: 'Upper Left 1st Molar', type: 'molar', x: 3.6, y: 1.8, z: -0.2, rotationY: -0.35, arch: 'maxillary', dentition: 'permanent' },
  { id: '27', palmer: '└7', palmerQuadrant: 'UL', palmerNumber: '7', name: 'Upper Left 2nd Molar', type: 'molar', x: 3.9, y: 1.8, z: -1.5, rotationY: -0.25, arch: 'maxillary', dentition: 'permanent' },
  { id: '28', palmer: '└8', palmerQuadrant: 'UL', palmerNumber: '8', name: 'Upper Left 3rd Molar (Wisdom)', type: 'molar', x: 4.1, y: 1.8, z: -2.7, rotationY: -0.15, arch: 'maxillary', dentition: 'permanent' },

  // ── LOWER RIGHT (LR: 8┐ to 1┐) ──
  { id: '48', palmer: '8┐', palmerQuadrant: 'LR', palmerNumber: '8', name: 'Lower Right 3rd Molar (Wisdom)', type: 'molar', x: -3.85, y: -1.8, z: -2.7, rotationY: 0.15, arch: 'mandibular', dentition: 'permanent' },
  { id: '47', palmer: '7┐', palmerQuadrant: 'LR', palmerNumber: '7', name: 'Lower Right 2nd Molar', type: 'molar', x: -3.65, y: -1.8, z: -1.5, rotationY: 0.25, arch: 'mandibular', dentition: 'permanent' },
  { id: '46', palmer: '6┐', palmerQuadrant: 'LR', palmerNumber: '6', name: 'Lower Right 1st Molar', type: 'molar', x: -3.35, y: -1.8, z: -0.2, rotationY: 0.35, arch: 'mandibular', dentition: 'permanent' },
  { id: '45', palmer: '5┐', palmerQuadrant: 'LR', palmerNumber: '5', name: 'Lower Right 2nd Premolar', type: 'premolar', x: -2.95, y: -1.8, z: 1.0, rotationY: 0.55, arch: 'mandibular', dentition: 'permanent' },
  { id: '44', palmer: '4┐', palmerQuadrant: 'LR', palmerNumber: '4', name: 'Lower Right 1st Premolar', type: 'premolar', x: -2.5, y: -1.8, z: 2.1, rotationY: 0.80, arch: 'mandibular', dentition: 'permanent' },
  { id: '43', palmer: '3┐', palmerQuadrant: 'LR', palmerNumber: '3', name: 'Lower Right Canine', type: 'canine', x: -1.9, y: -1.8, z: 2.9, rotationY: 1.05, arch: 'mandibular', dentition: 'permanent' },
  { id: '42', palmer: '2┐', palmerQuadrant: 'LR', palmerNumber: '2', name: 'Lower Right Lateral Incisor', type: 'incisor', x: -1.15, y: -1.8, z: 3.4, rotationY: 1.30, arch: 'mandibular', dentition: 'permanent' },
  { id: '41', palmer: '1┐', palmerQuadrant: 'LR', palmerNumber: '1', name: 'Lower Right Central Incisor', type: 'incisor', x: -0.4, y: -1.8, z: 3.6, rotationY: 1.50, arch: 'mandibular', dentition: 'permanent' },

  // ── LOWER LEFT (LL: ┌1 to ┌8) ──
  { id: '31', palmer: '┌1', palmerQuadrant: 'LL', palmerNumber: '1', name: 'Lower Left Central Incisor', type: 'incisor', x: 0.4, y: -1.8, z: 3.6, rotationY: -1.50, arch: 'mandibular', dentition: 'permanent' },
  { id: '32', palmer: '┌2', palmerQuadrant: 'LL', palmerNumber: '2', name: 'Lower Left Lateral Incisor', type: 'incisor', x: 1.15, y: -1.8, z: 3.4, rotationY: -1.30, arch: 'mandibular', dentition: 'permanent' },
  { id: '33', palmer: '┌3', palmerQuadrant: 'LL', palmerNumber: '3', name: 'Lower Left Canine', type: 'canine', x: 1.9, y: -1.8, z: 2.9, rotationY: -1.05, arch: 'mandibular', dentition: 'permanent' },
  { id: '34', palmer: '┌4', palmerQuadrant: 'LL', palmerNumber: '4', name: 'Lower Left 1st Premolar', type: 'premolar', x: 2.5, y: -1.8, z: 2.1, rotationY: -0.80, arch: 'mandibular', dentition: 'permanent' },
  { id: '35', palmer: '┌5', palmerQuadrant: 'LL', palmerNumber: '5', name: 'Lower Left 2nd Premolar', type: 'premolar', x: 2.95, y: -1.8, z: 1.0, rotationY: -0.55, arch: 'mandibular', dentition: 'permanent' },
  { id: '36', palmer: '┌6', palmerQuadrant: 'LL', palmerNumber: '6', name: 'Lower Left 1st Molar', type: 'molar', x: 3.35, y: -1.8, z: -0.2, rotationY: -0.35, arch: 'mandibular', dentition: 'permanent' },
  { id: '37', palmer: '┌7', palmerQuadrant: 'LL', palmerNumber: '7', name: 'Lower Left 2nd Molar', type: 'molar', x: 3.65, y: -1.8, z: -1.5, rotationY: -0.25, arch: 'mandibular', dentition: 'permanent' },
  { id: '38', palmer: '┌8', palmerQuadrant: 'LL', palmerNumber: '8', name: 'Lower Left 3rd Molar (Wisdom)', type: 'molar', x: 3.85, y: -1.8, z: -2.7, rotationY: -0.15, arch: 'mandibular', dentition: 'permanent' },
];

// ==========================================
// 20 DECIDUOUS TEETH (PALMER A-E)
// ==========================================
export const DECIDUOUS_TEETH_3D: ToothCoord3D[] = [
  // Upper Right (UR: E┘ to A┘)
  { id: '55', palmer: 'E┘', palmerQuadrant: 'UR', palmerNumber: 'E', name: 'Primary Upper Right 2nd Molar', type: 'molar', x: -3.4, y: 1.8, z: -1.0, rotationY: 0.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '54', palmer: 'D┘', palmerQuadrant: 'UR', palmerNumber: 'D', name: 'Primary Upper Right 1st Molar', type: 'molar', x: -2.8, y: 1.8, z: 0.5, rotationY: 0.45, arch: 'maxillary', dentition: 'deciduous' },
  { id: '53', palmer: 'C┘', palmerQuadrant: 'UR', palmerNumber: 'C', name: 'Primary Upper Right Canine', type: 'canine', x: -2.1, y: 1.8, z: 1.9, rotationY: 0.85, arch: 'maxillary', dentition: 'deciduous' },
  { id: '52', palmer: 'B┘', palmerQuadrant: 'UR', palmerNumber: 'B', name: 'Primary Upper Right Lateral Incisor', type: 'incisor', x: -1.3, y: 1.8, z: 2.8, rotationY: 1.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '51', palmer: 'A┘', palmerQuadrant: 'UR', palmerNumber: 'A', name: 'Primary Upper Right Central Incisor', type: 'incisor', x: -0.45, y: 1.8, z: 3.2, rotationY: 1.50, arch: 'maxillary', dentition: 'deciduous' },

  // Upper Left (UL: └A to └E)
  { id: '61', palmer: '└A', palmerQuadrant: 'UL', palmerNumber: 'A', name: 'Primary Upper Left Central Incisor', type: 'incisor', x: 0.45, y: 1.8, z: 3.2, rotationY: -1.50, arch: 'maxillary', dentition: 'deciduous' },
  { id: '62', palmer: '└B', palmerQuadrant: 'UL', palmerNumber: 'B', name: 'Primary Upper Left Lateral Incisor', type: 'incisor', x: 1.3, y: 1.8, z: 2.8, rotationY: -1.25, arch: 'maxillary', dentition: 'deciduous' },
  { id: '63', palmer: '└C', palmerQuadrant: 'UL', palmerNumber: 'C', name: 'Primary Upper Left Canine', type: 'canine', x: 2.1, y: 1.8, z: 1.9, rotationY: -0.85, arch: 'maxillary', dentition: 'deciduous' },
  { id: '64', palmer: '└D', palmerQuadrant: 'UL', palmerNumber: 'D', name: 'Primary Upper Left 1st Molar', type: 'molar', x: 2.8, y: 1.8, z: 0.5, rotationY: -0.45, arch: 'maxillary', dentition: 'deciduous' },
  { id: '65', palmer: '└E', palmerQuadrant: 'UL', palmerNumber: 'E', name: 'Primary Upper Left 2nd Molar', type: 'molar', x: 3.4, y: 1.8, z: -1.0, rotationY: -0.25, arch: 'maxillary', dentition: 'deciduous' },

  // Lower Right (LR: E┐ to A┐)
  { id: '85', palmer: 'E┐', palmerQuadrant: 'LR', palmerNumber: 'E', name: 'Primary Lower Right 2nd Molar', type: 'molar', x: -3.2, y: -1.8, z: -1.0, rotationY: 0.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '84', palmer: 'D┐', palmerQuadrant: 'LR', palmerNumber: 'D', name: 'Primary Lower Right 1st Molar', type: 'molar', x: -2.6, y: -1.8, z: 0.5, rotationY: 0.45, arch: 'mandibular', dentition: 'deciduous' },
  { id: '83', palmer: 'C┐', palmerQuadrant: 'LR', palmerNumber: 'C', name: 'Primary Lower Right Canine', type: 'canine', x: -1.9, y: -1.8, z: 1.9, rotationY: 0.85, arch: 'mandibular', dentition: 'deciduous' },
  { id: '82', palmer: 'B┐', palmerQuadrant: 'LR', palmerNumber: 'B', name: 'Primary Lower Right Lateral Incisor', type: 'incisor', x: -1.2, y: -1.8, z: 2.7, rotationY: 1.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '81', palmer: 'A┐', palmerQuadrant: 'LR', palmerNumber: 'A', name: 'Primary Lower Right Central Incisor', type: 'incisor', x: -0.4, y: -1.8, z: 3.0, rotationY: 1.50, arch: 'mandibular', dentition: 'deciduous' },

  // Lower Left (LL: ┌A to ┌E)
  { id: '71', palmer: '┌A', palmerQuadrant: 'LL', palmerNumber: 'A', name: 'Primary Lower Left Central Incisor', type: 'incisor', x: 0.4, y: -1.8, z: 3.0, rotationY: -1.50, arch: 'mandibular', dentition: 'deciduous' },
  { id: '72', palmer: '┌B', palmerQuadrant: 'LL', palmerNumber: 'B', name: 'Primary Lower Left Lateral Incisor', type: 'incisor', x: 1.2, y: -1.8, z: 2.7, rotationY: -1.25, arch: 'mandibular', dentition: 'deciduous' },
  { id: '73', palmer: '┌C', palmerQuadrant: 'LL', palmerNumber: 'C', name: 'Primary Lower Left Canine', type: 'canine', x: 1.9, y: -1.8, z: 1.9, rotationY: -0.85, arch: 'mandibular', dentition: 'deciduous' },
  { id: '74', palmer: '┌D', palmerQuadrant: 'LL', palmerNumber: 'D', name: 'Primary Lower Left 1st Molar', type: 'molar', x: 2.6, y: -1.8, z: 0.5, rotationY: -0.45, arch: 'mandibular', dentition: 'deciduous' },
  { id: '75', palmer: '┌E', palmerQuadrant: 'LL', palmerNumber: 'E', name: 'Primary Lower Left 2nd Molar', type: 'molar', x: 3.2, y: -1.8, z: -1.0, rotationY: -0.25, arch: 'mandibular', dentition: 'deciduous' },
];

// ==========================================
// 3D PROCEDURAL ANATOMICAL TOOTH GEOMETRIES
// ==========================================
function getProceduralToothGeometry(type: 'incisor' | 'canine' | 'premolar' | 'molar') {
  if (type === 'molar') {
    // 4-cusped anatomical molar crown with cervical constriction
    // Radius top (cervical neck near gum) = 0.44, radius bottom (occlusal table) = 0.54
    const geom = new THREE.CylinderGeometry(0.44, 0.54, 0.82, 24, 4);
    geom.scale(1.15, 1.0, 1.08);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.3) {
        // Occlusal chewing table: subtle 4-cusp lobe definition
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const cuspLift = Math.sin(x * 4.5) * Math.sin(z * 4.5) * 0.06;
        pos.setY(i, y - cuspLift);
      }
    }
    geom.computeVertexNormals();
    return geom;
  } else if (type === 'premolar') {
    // Bicuspid crown (two distinct cusps: buccal & lingual)
    const geom = new THREE.CylinderGeometry(0.36, 0.44, 0.78, 20, 4);
    geom.scale(1.05, 1.0, 0.95);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.28) {
        const z = pos.getZ(i);
        const cuspLift = (Math.abs(z) - 0.18) * 0.08;
        pos.setY(i, y - cuspLift);
      }
    }
    geom.computeVertexNormals();
    return geom;
  } else if (type === 'canine') {
    // Conical pointed crown tapering from cervical neck to sharp cusp tip
    const geom = new THREE.ConeGeometry(0.40, 0.92, 20, 4);
    geom.rotateX(Math.PI); // Tip points downward towards occlusal plane
    geom.scale(1.05, 1.0, 0.9);
    geom.computeVertexNormals();
    return geom;
  } else {
    // Incisor: chisel crown with convex labial face and tapered neck
    const geom = new THREE.BoxGeometry(0.66, 0.85, 0.28, 4, 4, 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Taper cervical margin towards gum (at +Y)
      if (y > 0) {
        pos.setX(i, pos.getX(i) * (0.8 + 0.2 * ((0.425 - y) / 0.425)));
      }
      // Round the labial face (front curvature)
      if (z > 0) {
        const x = pos.getX(i);
        pos.setZ(i, z - (x * x) * 0.12);
      }
    }
    geom.computeVertexNormals();
    return geom;
  }
}

// ==========================================
// INDIVIDUAL 3D TOOTH MESH COMPONENT
// ==========================================
interface ToothMeshProps {
  tooth: ToothCoord3D;
  record?: { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string };
  isHovered: boolean;
  onHover: (tooth: ToothCoord3D | null) => void;
  onClick: (tooth: ToothCoord3D) => void;
}

function ToothMesh({ tooth, record, isHovered, onHover, onClick }: ToothMeshProps) {
  const condition: ToothCondition = record?.condition || 'sound';
  const conf = CONDITION_CONFIG[condition];

  const geometry = useMemo(() => {
    const geom = getProceduralToothGeometry(tooth.type).clone();
    if (tooth.arch === 'mandibular') {
      geom.rotateX(Math.PI); // Flip mandibular crowns to point upwards towards occlusal plane
    }
    return geom;
  }, [tooth.type, tooth.arch]);

  return (
    <mesh
      position={[tooth.x, tooth.y, tooth.z]}
      rotation={[0, tooth.rotationY, 0]}
      scale={isHovered ? [1.14, 1.14, 1.14] : [1, 1, 1]}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onClick(tooth);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(tooth);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
    >
      <meshPhysicalMaterial
        color={isHovered ? 0xffffff : conf.hexColor}
        emissive={isHovered ? 0x6366f1 : conf.emissive}
        emissiveIntensity={isHovered ? 0.9 : 0.25}
        metalness={conf.metalness}
        roughness={conf.roughness}
        clearcoat={0.95}
        clearcoatRoughness={0.08}
        reflectivity={0.65}
        wireframe={condition === 'missing'}
        transparent={condition === 'missing'}
        opacity={condition === 'missing' ? 0.35 : 1.0}
      />
    </mesh>
  );
}

// ==========================================
// 3D ANATOMICAL GINGIVA (GUMS) & SOFT TISSUE
// Properly scaled so teeth emerge cleanly
// ==========================================
function DentalGums({ isDeciduous = false }: { isDeciduous?: boolean }) {
  const gumMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xd96f7c,
      roughness: 0.45,
      metalness: 0.02,
    });
  }, []);

  const { upperGumGeom, lowerGumGeom, palateGeom, tongueGeom } = useMemo(() => {
    const scale = isDeciduous ? 0.82 : 1.0;

    // Upper Gum Curved Ridge (slender tube sitting at tooth cervical margin)
    const upperPoints = [
      new THREE.Vector3(-4.3 * scale, 2.15, -2.9 * scale),
      new THREE.Vector3(-3.8 * scale, 2.15, -0.2 * scale),
      new THREE.Vector3(-2.8 * scale, 2.15, 2.1 * scale),
      new THREE.Vector3(-1.4 * scale, 2.15, 3.7 * scale),
      new THREE.Vector3(0, 2.15, 4.1 * scale),
      new THREE.Vector3(1.4 * scale, 2.15, 3.7 * scale),
      new THREE.Vector3(2.8 * scale, 2.15, 2.1 * scale),
      new THREE.Vector3(3.8 * scale, 2.15, -0.2 * scale),
      new THREE.Vector3(4.3 * scale, 2.15, -2.9 * scale),
    ];
    const upperCurve = new THREE.CatmullRomCurve3(upperPoints);
    const upperG = new THREE.TubeGeometry(upperCurve, 40, 0.30, 14, false);

    // Lower Gum Curved Ridge
    const lowerPoints = [
      new THREE.Vector3(-4.0 * scale, -2.15, -2.9 * scale),
      new THREE.Vector3(-3.5 * scale, -2.15, -0.2 * scale),
      new THREE.Vector3(-2.6 * scale, -2.15, 2.1 * scale),
      new THREE.Vector3(-1.3 * scale, -2.15, 3.5 * scale),
      new THREE.Vector3(0, -2.15, 3.9 * scale),
      new THREE.Vector3(1.3 * scale, -2.15, 3.5 * scale),
      new THREE.Vector3(2.6 * scale, -2.15, 2.1 * scale),
      new THREE.Vector3(3.5 * scale, -2.15, -0.2 * scale),
      new THREE.Vector3(4.0 * scale, -2.15, -2.9 * scale),
    ];
    const lowerCurve = new THREE.CatmullRomCurve3(lowerPoints);
    const lowerG = new THREE.TubeGeometry(lowerCurve, 40, 0.28, 14, false);

    // Palate: shallow flattened anatomical vault cap sitting comfortably ABOVE crowns
    const palG = new THREE.SphereGeometry(3.8 * scale, 24, 16, 0, Math.PI, 0, Math.PI * 0.28);
    palG.scale(1, 0.45, 1);
    palG.rotateX(Math.PI * 0.1);
    palG.translate(0, 3.2, 0.4);

    // Tongue: smooth flattened tongue resting on floor of mouth BELOW lower crowns
    const tG = new THREE.SphereGeometry(3.2 * scale, 24, 16);
    tG.scale(0.9, 0.20, 1.05);
    tG.translate(0, -2.7, 0.2);

    return {
      upperGumGeom: upperG,
      lowerGumGeom: lowerG,
      palateGeom: palG,
      tongueGeom: tG,
    };
  }, [isDeciduous]);

  return (
    <group>
      <mesh geometry={upperGumGeom} material={gumMaterial} />
      <mesh geometry={lowerGumGeom} material={gumMaterial} />
      <mesh geometry={palateGeom} material={gumMaterial} />
      <mesh geometry={tongueGeom} material={gumMaterial} />
    </group>
  );
}

// ==========================================
// 3D JAW SCENE INNER
// ==========================================
interface DentalArchSceneProps {
  teethCoords: ToothCoord3D[];
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  hoveredTooth: ToothCoord3D | null;
  onToothHover: (tooth: ToothCoord3D | null) => void;
  onToothClick: (tooth: ToothCoord3D) => void;
}

function DentalArchScene({
  teethCoords,
  teethData,
  hoveredTooth,
  onToothHover,
  onToothClick,
}: DentalArchSceneProps) {
  const isDeciduous = teethCoords.length <= 20;

  return (
    <group>
      {/* Anatomical Gums */}
      <DentalGums isDeciduous={isDeciduous} />

      {/* 3D Teeth */}
      {teethCoords.map((tooth) => (
        <ToothMesh
          key={tooth.id}
          tooth={tooth}
          record={teethData[tooth.id]}
          isHovered={hoveredTooth?.id === tooth.id}
          onHover={onToothHover}
          onClick={onToothClick}
        />
      ))}
    </group>
  );
}

// ==========================================
// MAIN COMPONENT: Real3DDentalJaw
// ==========================================
interface Real3DDentalJawProps {
  title: string;
  teethCoords: ToothCoord3D[];
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  onToothClick: (tooth: ToothRecord) => void;
  disabled?: boolean;
}

export default function Real3DDentalJaw({
  title,
  teethCoords,
  teethData,
  onToothClick,
  disabled,
}: Real3DDentalJawProps) {
  const [hoveredTooth, setHoveredTooth] = useState<ToothCoord3D | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Count charted / treated teeth
  const treatedCount = useMemo(() => {
    return teethCoords.filter((coord) => {
      const cond = teethData[coord.id]?.condition;
      return cond && cond !== 'sound';
    }).length;
  }, [teethCoords, teethData]);

  // Camera presets
  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.reset();
  };

  const handleUpperArch = () => {
    if (!controlsRef.current?.object) return;
    const camera = controlsRef.current.object as THREE.Camera;
    camera.position.set(0, -10, 5);
    camera.lookAt(0, 1.8, 0);
    controlsRef.current.target.set(0, 1.8, 0);
    controlsRef.current.update();
  };

  const handleLowerArch = () => {
    if (!controlsRef.current?.object) return;
    const camera = controlsRef.current.object as THREE.Camera;
    camera.position.set(0, 10, 5);
    camera.lookAt(0, -1.8, 0);
    controlsRef.current.target.set(0, -1.8, 0);
    controlsRef.current.update();
  };

  const handleToothSelected = (tooth: ToothCoord3D) => {
    if (disabled) return;
    const saved = teethData[tooth.id];
    onToothClick({
      ...tooth,
      condition: saved?.condition || 'sound',
      surfaces: saved?.surfaces || [],
      notes: saved?.notes || '',
    });
  };

  return (
    <div className="w-full bg-[#0f1117] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-gray-800/80">
      {/* Header bar with Palmer Live HUD & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🦷</span>
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          {treatedCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {treatedCount} charted
            </span>
          )}
        </div>

        {/* Live Hover HUD */}
        <div className="text-xs h-7 flex items-center">
          {hoveredTooth ? (
            <div className="flex items-center gap-2 animate-fadeIn bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-indigo-200 shadow-lg">
              <span className="font-mono font-black text-white text-sm bg-indigo-600 px-2 py-0.5 rounded shadow">
                {hoveredTooth.palmer}
              </span>
              <span>·</span>
              <span className="font-semibold text-white">{hoveredTooth.name}</span>
              <span>·</span>
              <span
                className="font-bold capitalize"
                style={{
                  color: CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].color,
                }}
              >
                {CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].label.split('/')[0]}
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
            onClick={handleResetCamera}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="Reset front perspective"
          >
            🔄 Reset
          </button>
          <button
            type="button"
            onClick={handleUpperArch}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="Upper Arch Occlusal View"
          >
            ⬆️ Upper
          </button>
          <button
            type="button"
            onClick={handleLowerArch}
            className="px-2.5 py-1 text-[11px] font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-colors"
            title="Lower Arch Occlusal View"
          >
            ⬇️ Lower
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-[480px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#090a0d] via-[#0f1117] to-[#090a0d] shadow-inner border border-gray-900 select-none">
        {/* Quadrant Legend Guidelines */}
        <div className="absolute top-3 left-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none z-10">
          RIGHT (UR ┘)
        </div>
        <div className="absolute top-3 right-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none z-10">
          LEFT (UL └)
        </div>
        <div className="absolute bottom-3 left-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none z-10">
          RIGHT (LR ┐)
        </div>
        <div className="absolute bottom-3 right-4 text-[10px] font-mono font-bold text-white/30 tracking-wider pointer-events-none z-10">
          LEFT (LL ┌)
        </div>

        {/* 3D Orbit Help Badge */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 bg-black/60 backdrop-blur-sm px-3 py-0.5 rounded-full pointer-events-none border border-white/10 z-10">
          WebGL 3D Orbit: Rotate, Pan, & Zoom
        </div>

        {/* React Three Fiber Canvas */}
        <Canvas
          camera={{ position: [0, 1.2, 13.5], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Lighting Rig for Enamel Specular Shimmer */}
          <ambientLight intensity={1.4} />
          <directionalLight position={[8, 15, 12]} intensity={2.2} />
          <directionalLight position={[-10, -10, 8]} intensity={1.2} />
          <directionalLight position={[0, 10, -12]} intensity={1.0} />

          {/* 3D Dental Arch */}
          <DentalArchScene
            teethCoords={teethCoords}
            teethData={teethData}
            hoveredTooth={hoveredTooth}
            onToothHover={setHoveredTooth}
            onToothClick={handleToothSelected}
          />

          {/* OrbitControls */}
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={5}
            maxDistance={25}
            maxPolarAngle={Math.PI - 0.05}
          />
        </Canvas>
      </div>
    </div>
  );
}
