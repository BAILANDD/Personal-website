import { createSpatialField } from './spatial-field.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const NODE_W = 498;
const NODE_H = 355;
const SCALE = 0.62;
const NODE_DEPTH = 18; // Local CSS units, scaled uniformly with each Operator.
const POSITIONS = [
  [-410, 230, 120], [0, 205, -180], [410, 240, 100],
  [410, -80, -120], [0, -115, 160], [-410, -70, -70],
  [30, -425, 10],
];
const PORTRAIT_POSITIONS = [
  [-210, 450, 35], [210, 425, -80], [210, 120, 60],
  [-210, 145, -65], [-210, -165, 75], [210, -185, -30],
  [0, -480, 10],
];
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

export function createSpatialWorkspace({ host, operators, connections, createNode, getDetail, select, open, flag }) {
  // Construct WebGL first so failure leaves the original HTML untouched.
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const field = createSpatialField(renderer);
  const fieldScene = new THREE.Scene();
  fieldScene.add(field.group);
  const fieldRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  fieldRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  fieldRenderer.setClearColor(0x000000, 0);
  fieldRenderer.domElement.className = 'spatial-field-canvas';
  fieldRenderer.domElement.setAttribute('aria-hidden', 'true');
  const htmlScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 20000);
  const html = new CSS3DRenderer();
  renderer.domElement.className = 'spatial-webgl';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  html.domElement.className = 'spatial-html';
  host.replaceChildren(fieldRenderer.domElement, renderer.domElement, html.domElement);
  document.body.classList.add('spatial-app');
  host.classList.add('spatial-host');

  const controls = new OrbitControls(camera, host);
  const updateOrbit = controls.update.bind(controls);
  // Keep the pan/zoom controller aligned with the free-rotation camera up vector.
  controls.update = (...args) => {
    controls._quat.setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
    controls._quatInverse.copy(controls._quat).invert();
    return updateOrbit(...args);
  };
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.zoomSpeed = 0.7;
  const abort = new AbortController();
  const listen = (element, event, fn, options = {}) => element.addEventListener(event, fn, { ...options, signal: abort.signal });
  let focused = null;
  let hovered = null;
  let previousView = null;
  let tween = null;
  let suspended = false;
  let disposed = false;
  let interacted = false;
  let raf = 0;
  let settleUntil = 0;
  let inertiaX = 0, inertiaY = 0, inertiaTime = 0;
  const nodes = new Map();
  const wires = [];
  const resources = [];
  const bounds = new THREE.Box3();
  const corners = [];
  let portraitLayout = host.clientWidth < 620;

  const actions = document.createElement('div');
  actions.className = 'spatial-actions';
  actions.innerHTML = '<button type="button" class="spatial-open" hidden>OPEN PROJECT ↗</button><button type="button" class="spatial-back" hidden>← BACK TO SPACE</button>';
  document.querySelector('.workspace-topbar').append(actions);
  const openButton = actions.querySelector('.spatial-open');
  const backButton = actions.querySelector('.spatial-back');

  function updateInfo() {
    field.setEmphasis(Boolean(focused || hovered));
    const id = focused || hovered;
    openButton.hidden = !focused;
    openButton.disabled = Boolean(tween);
    backButton.hidden = !focused;
    backButton.disabled = Boolean(tween);
    for (const [nodeId, node] of nodes) {
      node.element.classList.toggle('spatial-hover', nodeId === hovered && !focused);
      node.element.classList.toggle('spatial-muted', Boolean(focused && nodeId !== focused));
    }
    for (const wire of wires) {
      const related = id && (wire.connection.from === id || wire.connection.to === id);
      wire.line.material.opacity = id ? related ? 0.95 : 0.16 : 0.48;
      wire.line.material.color.set(related ? 0xc3b1e9 : 0x8975ae);
    }
    requestRender();
  }

  operators.forEach((operator, index) => {
    const wrapper = createNode(operator);
    wrapper.classList.add('spatial-node');
    wrapper.removeAttribute('data-depth');
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    const element = wrapper.querySelector('.top-operator');
    const previewTarget = wrapper.querySelector('.viewer-window');
    previewTarget.tabIndex = 0;
    previewTarget.setAttribute('role', 'button');
    previewTarget.setAttribute('aria-label', `Focus ${operator.title}`);
    wrapper.querySelector('.name-cell').title = 'Drag to move · Shift + drag for depth';
    const object = new CSS3DObject(wrapper);
    object.position.fromArray((portraitLayout ? PORTRAIT_POSITIONS : POSITIONS)[index] || [0, -425 - (index - 6) * 310, 0]);
    operator.position = { x: object.position.x, y: object.position.y, z: object.position.z };
    object.scale.setScalar(SCALE);
    htmlScene.add(object);

    // Five real 3D faces behind the existing front UI, sharing its world transform.
    const faces = [
      [470, 327, 0, 0, -NODE_DEPTH, 0, Math.PI, '#24212d'],
      [NODE_DEPTH, 327, -235, 0, -NODE_DEPTH / 2, 0, -Math.PI / 2, '#383044'],
      [NODE_DEPTH, 327, 235, 0, -NODE_DEPTH / 2, 0, Math.PI / 2, '#302a3a'],
      [470, NODE_DEPTH, 0, 163.5, -NODE_DEPTH / 2, -Math.PI / 2, 0, '#51465e'],
      [470, NODE_DEPTH, 0, -163.5, -NODE_DEPTH / 2, Math.PI / 2, 0, '#282330'],
    ];
    for (const [width, height, x, y, z, rx, ry, color] of faces) {
      const face = document.createElement('div');
      face.className = 'spatial-node-face';
      face.setAttribute('aria-hidden', 'true');
      Object.assign(face.style, { width: `${width}px`, height: `${height}px`, background: color });
      if (z === -NODE_DEPTH) {
        face.classList.add('spatial-node-back');
        const thumbnail = document.createElement('img');
        thumbnail.src = operator.thumbnail;
        thumbnail.alt = '';
        thumbnail.draggable = false;
        const name = document.createElement('div');
        name.className = 'spatial-node-back-name';
        name.textContent = operator.operatorName;
        face.append(thumbnail, name);
      }
      const side = new CSS3DObject(face);
      side.position.set(x, y, z);
      side.rotation.set(rx, ry, 0);
      object.add(side);
    }
    // Match the solid casing in the wire depth buffer as well.
    const geometry = new THREE.BoxGeometry(470 * SCALE, 327 * SCALE, NODE_DEPTH * SCALE);
    geometry.translate(0, 0, -NODE_DEPTH * SCALE / 2);
    const material = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    const mask = new THREE.Mesh(geometry, material);
    mask.position.copy(object.position);
    mask.renderOrder = -1;
    scene.add(mask);
    resources.push(geometry, material);
    const node = { object, element, wrapper, mask };
    nodes.set(operator.id, node);
    for (const x of [-NODE_W / 2, NODE_W / 2]) for (const y of [-NODE_H / 2, NODE_H / 2]) {
      const corner = new THREE.Vector3(x * SCALE, y * SCALE, 0).applyQuaternion(object.quaternion).add(object.position);
      corners.push(corner); bounds.expandByPoint(corner);
    }
    let down = null;
    listen(element, 'pointerdown', (event) => {
      if (event.target.closest('[data-no-drag]')) { event.stopPropagation(); return; }
      const handle = event.target.closest('.name-cell');
      const preview = event.target.closest('.viewer-window');
      // Chrome rotates this node; only blank Workspace rotates the camera.
      event.stopPropagation();
      if (event.button !== 0 || tween || suspended) return;
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), object.position);
      down = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, handle: Boolean(handle), preview: Boolean(preview), rotation: object.quaternion.clone(), cameraRotation: camera.quaternion.clone(), depth: event.shiftKey, direction: camera.getWorldDirection(new THREE.Vector3()), unitsPerPixel: 2 * camera.position.distanceTo(object.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / host.clientHeight, plane, start: dragPoint(event, plane), origin: object.position.clone() };
      element.setPointerCapture(event.pointerId);
    });
    listen(element, 'pointermove', (event) => {
      if (down?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) down.moved = true;
      if (!down.moved || operator.locked || focused) return;
      if (!down.handle && !down.preview) {
        const dx = event.clientX - down.x;
        const dy = event.clientY - down.y;
        const delta = down.depth
          ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), dx * 0.008)
          : new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.008, dx * 0.008, 0, 'YXZ'));
        delta.premultiply(down.cameraRotation).multiply(down.cameraRotation.clone().invert());
        object.quaternion.copy(delta).multiply(down.rotation);
        mask.quaternion.copy(object.quaternion);
        operator.rotation = object.quaternion.toArray();
        interacted = true;
        updateWires(); requestRender();
        return;
      }
      if (!down.handle || !down.start) return;
      const point = dragPoint(event, down.plane);
      if (!point) return;
      interacted = true;
      if (down.depth) object.position.copy(down.origin).addScaledVector(down.direction, (event.clientY - down.y) * down.unitsPerPixel);
      else object.position.copy(down.origin).add(point.sub(down.start));
      mask.position.copy(object.position);
      operator.position = { x: object.position.x, y: object.position.y, z: object.position.z };
      updateWires(); requestRender();
    });
    listen(element, 'pointerup', (event) => {
      if (down?.id !== event.pointerId) return;
      const tap = down.preview && !down.moved && Math.hypot(event.clientX - down.x, event.clientY - down.y) <= 6;
      down = null;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (tap) focus(operator.id);
    });
    listen(element, 'pointercancel', () => { down = null; });
    listen(element, 'pointerenter', (event) => {
      if (event.pointerType === 'touch' || focused || tween) return;
      hovered = operator.id; updateInfo();
    });
    listen(element, 'pointerleave', () => { if (!focused) { hovered = null; updateInfo(); } });
    listen(element, 'keydown', (event) => {
      if (event.target !== previewTarget) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focus(operator.id); }
    });
    wrapper.querySelectorAll('[data-flag-action]').forEach((button) => {
      listen(button, 'click', (event) => { event.stopPropagation(); flag(operator, button.dataset.flagAction, event); requestRender(); });
    });
  });

  function port(id, output) {
    const node = nodes.get(id);
    const target = node.wrapper.querySelector(output ? '.output-rail' : '.input-port');
    // offset coordinates are unaffected by CSS perspective or device pixel ratio.
    let x = output ? target.offsetWidth : 0;
    let y = target.offsetHeight / 2;
    for (let element = target; element && element !== node.wrapper; element = element.offsetParent) {
      x += element.offsetLeft; y += element.offsetTop;
      const parent = element.offsetParent;
      if (parent && parent !== node.wrapper) { x += parent.clientLeft; y += parent.clientTop; }
    }
    return new THREE.Vector3((x - NODE_W / 2) * SCALE, (NODE_H / 2 - y) * SCALE, 0).applyQuaternion(node.object.quaternion).add(node.object.position);
  }

  // Attach HTML once before measuring ports. Curves remain static while the camera moves.
  html.render(htmlScene, camera);
  connections.forEach((connection) => {
    const start = port(connection.from, true);
    const end = port(connection.to, false);
    const bend = Math.max(75, Math.abs(end.x - start.x) * 0.4);
    const curve = new THREE.CubicBezierCurve3(start, start.clone().add(new THREE.Vector3(bend, 0, 0)),
      end.clone().add(new THREE.Vector3(-bend, 0, 0)), end);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
    const material = new THREE.LineBasicMaterial({ color: 0x8975ae, transparent: true, opacity: 0.48, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    scene.add(line); wires.push({ connection, line }); resources.push(geometry, material);
  });

  function adaptLayout() {
    const portrait = host.clientWidth < 620;
    if (portrait === portraitLayout) return;
    portraitLayout = portrait;
    bounds.makeEmpty(); corners.length = 0;
    operators.forEach((operator, index) => {
      const node = nodes.get(operator.id);
      node.object.position.fromArray((portrait ? PORTRAIT_POSITIONS : POSITIONS)[index] || [0, -425 - (index - 6) * 310, 0]);
      node.mask.position.copy(node.object.position);
      operator.position = { x: node.object.position.x, y: node.object.position.y, z: node.object.position.z };
      for (const x of [-NODE_W / 2, NODE_W / 2]) for (const y of [-NODE_H / 2, NODE_H / 2]) {
        const corner = new THREE.Vector3(x * SCALE, y * SCALE, 0).applyQuaternion(node.object.quaternion).add(node.object.position);
        corners.push(corner); bounds.expandByPoint(corner);
      }
    });
    updateWires();
  }

  function updateWires() {
    refreshBounds();
    wires.forEach(({ connection, line }) => {
      const start = port(connection.from, true); const end = port(connection.to, false);
      const bend = Math.max(75, Math.abs(end.x - start.x) * 0.4);
      const curve = new THREE.CubicBezierCurve3(start, start.clone().add(new THREE.Vector3(bend, 0, 0)), end.clone().add(new THREE.Vector3(-bend, 0, 0)), end);
      line.geometry.setFromPoints(curve.getPoints(64)); line.geometry.computeBoundingSphere();
    });
  }

  function refreshBounds() {
    bounds.makeEmpty(); corners.length = 0;
    for (const { object } of nodes.values()) {
      for (const x of [-NODE_W / 2, NODE_W / 2]) for (const y of [-NODE_H / 2, NODE_H / 2]) {
        const corner = new THREE.Vector3(x * SCALE, y * SCALE, 0).applyQuaternion(object.quaternion).add(object.position);
        corners.push(corner); bounds.expandByPoint(corner);
      }
    }
    field.fit(bounds);
  }
  const raycaster = new THREE.Raycaster();
  function dragPoint(event, plane) {
    const rect = host.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  function capture() {
    return { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), target: controls.target.clone(), zoom: camera.zoom };
  }
  function home() {
    refreshBounds();
    const center = bounds.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, 1).normalize();
    const orientation = new THREE.PerspectiveCamera();
    orientation.position.copy(center).add(direction); orientation.lookAt(center);
    const inverse = orientation.quaternion.clone().invert();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    let distance = 0;
    for (const corner of corners) {
      const local = corner.clone().sub(center).applyQuaternion(inverse);
      distance = Math.max(distance, Math.abs(local.x) / tanH + local.z, Math.abs(local.y) / tanV + local.z);
    }
    distance *= 1.08;
    controls.minDistance = distance * 0.58;
    controls.maxDistance = distance * 2.4;
    return { position: center.clone().addScaledVector(direction, distance), target: center, quaternion: orientation.quaternion, zoom: 1 };
  }
  function moveTo(destination, done = () => {}) {
    inertiaX = inertiaY = 0;
    // Drain residual orbit/pan damping without changing the view being saved.
    const current = capture();
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    camera.position.copy(current.position);
    camera.quaternion.copy(current.quaternion);
    controls.target.copy(current.target);
    controls.enabled = false;
    tween = { start: performance.now(), from: capture(), to: destination, done };
    updateInfo(); requestRender();
  }
  function focus(id) {
    if (tween || suspended || focused) return;
    interacted = true;
    previousView = capture();
    focused = id; hovered = null; select(id);
    const node = nodes.get(id);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(NODE_H * SCALE / (2 * tanV), NODE_W * SCALE / (2 * tanV * camera.aspect)) * 1.35;
    const target = node.object.position.clone();
    moveTo({ position: target.clone().add(new THREE.Vector3(0, 0, distance).applyQuaternion(node.object.quaternion)), target, quaternion: node.object.quaternion.clone(), zoom: 1 });
  }
  function back() {
    if (!focused || tween || suspended) return;
    moveTo(previousView, () => {
      focused = null; hovered = null; previousView = null; select(null);
      controls.enabled = true; updateInfo();
    });
  }
  function refresh() {
    if (suspended) return;
    tween = null;
    focused = null; hovered = null; previousView = null;
    select(null); interacted = false;
    portraitLayout = host.clientWidth < 620;
    operators.forEach((operator, index) => {
      const node = nodes.get(operator.id);
      node.object.position.fromArray((portraitLayout ? PORTRAIT_POSITIONS : POSITIONS)[index] || [0, -425 - (index - 6) * 310, 0]);
      node.object.quaternion.identity();
      node.mask.position.copy(node.object.position);
      node.mask.quaternion.identity();
      operator.position = { x: node.object.position.x, y: node.object.position.y, z: node.object.position.z };
      operator.rotation = node.object.quaternion.toArray();
    });
    updateWires();
    moveTo(home(), () => { controls.enabled = true; updateInfo(); });
  }

  function reset() {
    if (tween || suspended) return;
    focused = null; hovered = null; previousView = null; select(null); interacted = false;
    adaptLayout();
    moveTo(home(), () => { controls.enabled = true; updateInfo(); });
  }

  function render(now) {
    raf = 0;
    if (disposed || suspended || document.hidden) return;
    if (tween) {
      const t = motionQuery.matches ? 1 : Math.min(1, (now - tween.start) / 760);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(tween.from.position, tween.to.position, eased);
      controls.target.lerpVectors(tween.from.target, tween.to.target, eased);
      camera.zoom = THREE.MathUtils.lerp(tween.from.zoom, tween.to.zoom, eased);
      camera.quaternion.slerpQuaternions(tween.from.quaternion, tween.to.quaternion, eased);
      camera.updateProjectionMatrix();
      if (t === 1) {
        const done = tween.done;
        camera.quaternion.copy(tween.to.quaternion);
        camera.up.copy(tween.to.up || new THREE.Vector3(0, 1, 0));
        tween = null; done(); updateInfo();
      }
    } else if (controls.enabled && !freeOrbit) {
      if (Math.hypot(inertiaX, inertiaY) > 0.01) {
        const dt = Math.min(40, Math.max(1, now - inertiaTime));
        rotateView(inertiaX * dt, inertiaY * dt);
        const decay = Math.exp(-dt / 240);
        inertiaX *= decay; inertiaY *= decay;
      } else inertiaX = inertiaY = 0;
      controls.update();
    }
    inertiaTime = now;
    camera.updateMatrixWorld();
    html.render(htmlScene, camera);
    field.update(motionQuery.matches ? 0 : now / 1000);
    fieldRenderer.render(fieldScene, camera);
    renderer.render(scene, camera);
    if ((field.animated && !motionQuery.matches) || Math.hypot(inertiaX, inertiaY) > 0.01 || tween || performance.now() < settleUntil) requestRender();
  }
  function requestRender() {
    if (!raf && !disposed && !suspended) raf = requestAnimationFrame(render);
  }
  controls.addEventListener('start', () => { interacted = true; settleUntil = performance.now() + 1000; requestRender(); });
  controls.addEventListener('change', () => { settleUntil = performance.now() + 300; requestRender(); });
  controls.addEventListener('end', () => { settleUntil = performance.now() + 800; requestRender(); });
  // Quaternion drag allows complete vertical loops, without OrbitControls' pole stop.
  function rotateView(dx, dy) {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const rotation = new THREE.Quaternion().setFromAxisAngle(up, -dx * 0.006)
      .multiply(new THREE.Quaternion().setFromAxisAngle(right, -dy * 0.006));
    camera.position.sub(controls.target).applyQuaternion(rotation).add(controls.target);
    camera.up.applyQuaternion(rotation); camera.lookAt(controls.target);
  }
  let freeOrbit = null;
  listen(host, 'pointerdown', (event) => {
    inertiaX = inertiaY = 0;
    if (event.pointerType === 'touch' || event.button !== 0 || event.target.closest('.top-operator') || focused || tween || suspended) return;
    event.stopImmediatePropagation(); event.preventDefault();
    freeOrbit = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
    host.setPointerCapture(event.pointerId); interacted = true;
  }, { capture: true });
  listen(host, 'pointermove', (event) => {
    if (freeOrbit?.id !== event.pointerId) return;
    event.stopImmediatePropagation();
    const dx = event.clientX - freeOrbit.x, dy = event.clientY - freeOrbit.y;
    freeOrbit.x = event.clientX; freeOrbit.y = event.clientY;
    const now = performance.now(), dt = Math.max(8, now - freeOrbit.time);
    inertiaX = Math.max(-1.5, Math.min(1.5, dx / dt));
    inertiaY = Math.max(-1.5, Math.min(1.5, dy / dt));
    freeOrbit.time = now;
    rotateView(dx, dy);
    requestRender();
  }, { capture: true });
  listen(host, 'pointerup', (event) => {
    if (freeOrbit?.id !== event.pointerId) return;
    event.stopImmediatePropagation();
    if (performance.now() - freeOrbit.time > 100 || motionQuery.matches) inertiaX = inertiaY = 0;
    inertiaTime = performance.now(); freeOrbit = null;
    requestRender();
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
  }, { capture: true });
  listen(host, 'pointercancel', () => { freeOrbit = null; inertiaX = inertiaY = 0; });
  listen(host, 'pointerdown', (event) => { if (event.button === 1) event.preventDefault(); });
  listen(openButton, 'click', () => { if (focused && !tween) open(operators.find((item) => item.id === focused)); });
  listen(backButton, 'click', back);
  listen(document, 'visibilitychange', () => { if (!document.hidden) requestRender(); });

  function resize() {
    const width = host.clientWidth; const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height); fieldRenderer.setSize(width, height); html.setSize(width, height);
    if (!interacted && !focused && !tween) {
      adaptLayout();
      const view = home(); camera.position.copy(view.position); controls.target.copy(view.target); camera.lookAt(view.target); controls.update();
    }
    requestRender();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); observer.disconnect(); abort.abort(); controls.dispose();
    resources.forEach((resource) => resource.dispose()); field.dispose(); fieldRenderer.dispose(); renderer.dispose();
  }
  listen(window, 'pagehide', (event) => { if (!event.persisted) dispose(); });
  resize(); updateInfo();
  return {
    reset, refresh, back, dispose,
    suspend() { suspended = true; controls.enabled = false; host.inert = true; actions.hidden = true; openButton.disabled = true; backButton.disabled = true; },
    resume() { suspended = false; host.inert = false; actions.hidden = false; controls.enabled = !focused; updateInfo(); resize(); requestRender(); },
  };
}
