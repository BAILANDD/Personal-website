import * as THREE from 'three';

export const FIELD_SETTINGS = {
  density: 48,
  samples: 128,
  curvature: 1,
  color: 0x75638f,
  highlightColor: 0xc5afe6,
  warmColor: 0xd6af96,
  opacity: 0.46,
  focusOpacity: 0.16,
  lowQuality: false,
};

export function createSpatialField() {
  const group = new THREE.Group();
  group.name = 'Folded wire field';
  const simple = FIELD_SETTINGS.lowQuality || (navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(max-width: 620px)').matches;
  const density = simple ? 28 : FIELD_SETTINGS.density;
  const samples = simple ? 72 : FIELD_SETTINGS.samples;
  const materials = [], geometries = [];
  const base = new THREE.Color(FIELD_SETTINGS.color), light = new THREE.Color(FIELD_SETTINGS.highlightColor), warm = new THREE.Color(FIELD_SETTINGS.warmColor);
  for (let layer = 0; layer < 2; layer++) {
    const positions = [], colors = [];
    function vertex(u, v) {
      let x, y, z, strength, heat;
      if (layer === 0) {
        // Open saddle sheet: broad shoulders converge into a twisted central waist.
        // No closed torus silhouette when viewed from the side.
        const t = u * 2 - 1, w = v * 2 - 1;
        const twist = t * 2.4 + 0.45;
        const span = 380 + 220 * Math.pow(Math.abs(t), 0.7);
        x = t * 1650;
        y = 100 + 290 * Math.sin(t * 3.1) + w * span * Math.cos(twist);
        z = -420 + 320 * Math.sin(t * 2.5) + w * span * Math.sin(twist) + w * w * 190;
        const crest = Math.exp(-Math.pow((w - 0.5 * Math.sin(t * 2)) / 0.38, 2));
        const fade = (1 - Math.abs(t) ** 10) * (1 - Math.abs(w) ** 10);
        strength = (0.12 + crest * 0.8) * fade;
        heat = Math.exp(-Math.pow((t - 0.57) / 0.22, 2)) * crest * 0.85;
      } else {
        // A broad foreground fold sweeps along the bottom and recedes to the right.
        const t = u * 2 - 1, w = v * 2 - 1;
        x = t * 1650;
        y = -520 - 260 * Math.sin(t * 2.9) + w * 340 * Math.cos(t * 2 - 0.8);
        z = -500 + w * 420 * Math.sin(t * 2 - 0.8) + 230 * Math.sin(t * 3) * FIELD_SETTINGS.curvature;
        const crest = Math.exp(-Math.pow((w - 0.15) / 0.3, 2));
        strength = (0.12 + crest * 0.85) * (1 - Math.abs(t) ** 8) * (1 - Math.abs(w) ** 6);
        heat = Math.exp(-Math.pow((t - 0.6) / 0.25, 2)) * crest * 0.55;
      }
      positions.push(x, y, z);
      const tint = base.clone().lerp(light, Math.min(1, strength)).lerp(warm, heat);
      tint.multiplyScalar(strength).toArray(colors, colors.length);
    }
    for (let axis = 0; axis < 2; axis++) for (let line = 0; line < density; line++) {
      for (let step = 0; step < samples; step++) {
        const a = step / samples, b = (step + 1) / samples, fixed = line / density;
        if (axis === 0) { vertex(fixed, a); vertex(fixed, b); }
        else { vertex(a, fixed); vertex(b, fixed); }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    const material = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: FIELD_SETTINGS.opacity, depthWrite: false});
    const lines = new THREE.LineSegments(geometry, material);
    lines.raycast = () => {};
    group.add(lines); geometries.push(geometry); materials.push(material);
    // Shared geometry surrounds the origin on all six sides, not just a backdrop.
    for (let side = 1; side < 6; side++) {
      const surround = new THREE.LineSegments(geometry, material);
      if (side < 4) surround.rotation.y = side * Math.PI / 2;
      else surround.rotation.x = (side === 4 ? 1 : -1) * Math.PI / 2;
      surround.scale.setScalar(1.35);
      surround.raycast = () => {};
      group.add(surround);
    }
  }
  return {
    group, animated: false,
    update() {},
    fit() {},
    setEmphasis(active) { materials.forEach(m => { m.opacity = active ? FIELD_SETTINGS.focusOpacity : FIELD_SETTINGS.opacity; }); },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
