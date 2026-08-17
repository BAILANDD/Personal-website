const typedLines = [...document.querySelectorAll("[data-type-parts]")];
const operatorLayer = document.getElementById("operator-layer");
const workspacePanel = document.querySelector(".workspace-panel");
const workspacePath = document.querySelector(".workspace-path");
const workspaceContent = document.querySelector(".workspace-content");
const projectDetails = [...document.querySelectorAll("[data-project-detail]")];

const TYPE_SPEED = 18;
const LINE_PAUSE = 80;
const DRAG_THRESHOLD = 3;
const WHEEL_ZOOM_THRESHOLD = 40;
const WORKSPACE_ZOOM_LEVELS = [0.72, 0.82, 0.92, 1, 1.12, 1.25, 1.4];
const INITIAL_WORKSPACE_ZOOM_INDEX = 0;
const NETWORK_GRID_MAJOR_STEPS = 5;
const DETAIL_ENTER_ZOOM_INDEX = WORKSPACE_ZOOM_LEVELS.length - 1;
const DETAIL_ENTER_WHEEL_DELTA = 280;
const DETAIL_TRANSITION_MS = 380;
const MOCK_EXTERNAL_VIDEO_URL = "#";

const TOP_OPERATOR_ICONS = {
  viewerOn: "./assets/td-native/viewer-on.png",
  viewerOff: "./assets/td-native/viewer-off.png",
  cloneImmuneOff: "./assets/td-native/clone-immune-off.png",
  unlocked: "./assets/td-native/unlocked.png",
  locked: "./assets/td-native/locked.png",
  activateOff: "./assets/td-native/activate-off.png",
  activateOn: "./assets/td-native/activate-on.png",
};

const operators = [
  {
    id: "scomparsa",
    title: "Scomparsa Dell'Infanzia",
    operatorName: "scomparsa1",
    thumbnail: "./assets/thumbs/scomparsa-dell-infanzia.mp4.png",
    externalVideoUrl: MOCK_EXTERNAL_VIDEO_URL,
    detailPath: "/works/scomparsa1",
    x: 92,
    y: 54,
    hasInput: false,
    selected: false,
    viewerOn: true,
    locked: false,
    viewerActive: false,
    dynamic: true,
    cookLive: true,
  },
  {
    id: "corallo",
    title: "Energia Del Corallo",
    operatorName: "corallo1",
    thumbnail: "./assets/thumbs/energia-del-corallo.mp4.png",
    externalVideoUrl: null,
    detailPath: "/works/corallo1",
    x: 390,
    y: 62,
    hasInput: true,
    selected: false,
    viewerOn: true,
    locked: false,
    viewerActive: false,
    dynamic: true,
    cookLive: true,
  },
];

const connections = [
  {
    id: "scomparsa-corallo",
    from: "scomparsa",
    to: "corallo",
  },
];

let activeDrag = null;
let activePan = null;
let suppressNextLayerClick = false;
let mode = "workspace";
let workspaceInteractionEnabled = false;
let workspaceSnapshot = null;
let workspaceZoomIndex = INITIAL_WORKSPACE_ZOOM_INDEX;
let workspaceWheelDelta = 0;
let detailEnterWheelDelta = 0;
let networkGridOriginX = 0;
let networkGridOriginY = 0;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getParts(element) {
  try {
    return JSON.parse(element.dataset.typeParts || "[]");
  } catch {
    return [];
  }
}

function renderTypedParts(element, parts, visibleLength) {
  let remaining = visibleLength;
  const fragment = document.createDocumentFragment();

  for (const part of parts) {
    if (remaining <= 0) break;

    const text = part.text || "";
    const visibleText = text.slice(0, remaining);
    const node = part.accent ? document.createElement("span") : document.createTextNode(visibleText);

    if (part.accent) {
      node.className = "accent";
      node.textContent = visibleText;
    }

    fragment.append(node);
    remaining -= visibleText.length;
  }

  element.replaceChildren(fragment);
}

async function typeLine(element, parts) {
  element.classList.add("is-typing");
  const length = parts.reduce((total, part) => total + (part.text || "").length, 0);

  for (let i = 1; i <= length; i += 1) {
    renderTypedParts(element, parts, i);
    await sleep(TYPE_SPEED);
  }

  element.classList.remove("is-typing");
}

async function bootTerminal() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const line of typedLines) {
    const parts = getParts(line);

    if (reducedMotion) {
      renderTypedParts(line, parts, Infinity);
      continue;
    }

    await typeLine(line, parts);
    await sleep(LINE_PAUSE);
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getOperatorById(id) {
  return operators.find((operator) => operator.id === id);
}

function getOperatorElement(id) {
  return document.querySelector(`.top-operator[data-operator-id="${id}"]`);
}

function getOperatorWrapper(id) {
  return getOperatorElement(id)?.closest(".workspace-operator");
}

function getSelectedOperator() {
  return operators.find((operator) => operator.selected);
}

function getSelectedDetailOperator() {
  const selectedOperator = getSelectedOperator();

  return selectedOperator?.detailPath ? selectedOperator : null;
}

function getProjectDetail(operator) {
  if (!operator) return null;

  return projectDetails.find((detail) => detail.dataset.projectDetail === operator.id) || null;
}

function setActiveProjectDetail(activeDetail) {
  projectDetails.forEach((detail) => {
    const isActive = detail === activeDetail;

    detail.classList.toggle("is-active", isActive);
    detail.setAttribute("aria-hidden", String(!isActive));

    if (isActive) {
      detail.scrollTop = 0;
    }
  });
}

function resetDetailEnterWheel() {
  detailEnterWheelDelta = 0;
}

function getBaseOperatorScale() {
  const rawScale = getComputedStyle(document.documentElement).getPropertyValue("--operator-scale");
  const scale = Number.parseFloat(rawScale);

  return Number.isFinite(scale) ? scale : 0.64;
}

function setWorkspacePath(value) {
  if (!workspacePath) return;

  workspacePath.classList.remove("is-typing");
  workspacePath.textContent = value;
}

function captureWorkspaceState() {
  return {
    workspaceZoomIndex,
    networkGridOriginX,
    networkGridOriginY,
    operators: operators.map((operator) => ({
      id: operator.id,
      x: operator.x,
      y: operator.y,
      selected: operator.selected,
    })),
  };
}

function restoreWorkspaceState(snapshot) {
  if (!snapshot || !operatorLayer) return;

  workspaceZoomIndex = snapshot.workspaceZoomIndex;
  networkGridOriginX = snapshot.networkGridOriginX;
  networkGridOriginY = snapshot.networkGridOriginY;
  operatorLayer.style.setProperty("--operator-render-scale", getRenderedOperatorScale().toFixed(4));

  snapshot.operators.forEach((operatorState) => {
    const operator = getOperatorById(operatorState.id);
    const wrapper = getOperatorWrapper(operatorState.id);

    if (!operator || !wrapper) return;

    operator.x = operatorState.x;
    operator.y = operatorState.y;
    operator.selected = operatorState.selected;
    wrapper.style.left = `${operator.x}px`;
    wrapper.style.top = `${operator.y}px`;
    renderOperatorState(operator);
  });

  syncNetworkGrid();
  renderConnections();
}

function getWorkspaceZoom() {
  return WORKSPACE_ZOOM_LEVELS[workspaceZoomIndex] ?? 1;
}

function getRenderedOperatorScale(zoom = getWorkspaceZoom()) {
  return getBaseOperatorScale() * zoom;
}

function getCSSNumber(name, fallback = 0) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  const number = Number.parseFloat(value);

  return Number.isFinite(number) ? number : fallback;
}

function syncNetworkGrid(zoom = getWorkspaceZoom()) {
  if (!operatorLayer) return;

  const minorBase = getCSSNumber("--network-grid-minor-base", 44);
  const minorSize = minorBase * zoom;
  const majorSize = minorSize * NETWORK_GRID_MAJOR_STEPS;

  operatorLayer.style.setProperty("--network-grid-minor-size", `${minorSize.toFixed(2)}px`);
  operatorLayer.style.setProperty("--network-grid-major-size", `${majorSize.toFixed(2)}px`);
  operatorLayer.style.setProperty("--network-grid-x", `${networkGridOriginX.toFixed(2)}px`);
  operatorLayer.style.setProperty("--network-grid-y", `${networkGridOriginY.toFixed(2)}px`);
}

function setIcon(button, src, label) {
  const image = button?.querySelector("img");

  if (!button || !image) return;

  button.setAttribute("aria-label", label);
  image.src = src;
}

function syncPreviewPlayback(operator, element) {
  const preview = element.querySelector(".project-preview");

  if (!(preview instanceof HTMLVideoElement)) return;

  if (operator.cookLive) {
    preview.play().catch(() => {});
  } else {
    preview.pause();
  }
}

function syncExternalVideoLinks() {
  document.querySelectorAll("[data-external-video-project]").forEach((link) => {
    const operator = getOperatorById(link.dataset.externalVideoProject);
    const externalVideoUrl = operator?.externalVideoUrl;

    link.classList.toggle("is-disabled", !externalVideoUrl);
    link.setAttribute("aria-disabled", String(!externalVideoUrl));

    if (!externalVideoUrl) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }

    link.setAttribute("href", externalVideoUrl);

    if (externalVideoUrl === "#") {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    } else {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function renderOperatorState(operator) {
  const element = getOperatorElement(operator.id);
  if (!element) return;

  const wrapper = element.closest(".workspace-operator");
  const viewerButton = element.querySelector('[data-flag-action="viewer"]');
  const lockButton = element.querySelector('[data-flag-action="lock"]');
  const cookButton = element.querySelector('[data-flag-action="cook"]');
  const viewerWindow = element.querySelector(".viewer-window");
  const preview = element.querySelector(".project-preview");
  const viewerActiveButton = element.querySelector('[data-flag-action="viewer-active"]');

  element.classList.toggle("is-current", operator.selected);
  element.classList.toggle("is-viewer-active", operator.viewerActive);
  wrapper?.classList.toggle("is-locked", operator.locked);

  viewerButton?.setAttribute("aria-pressed", String(operator.viewerOn));
  setIcon(
    viewerButton,
    operator.viewerOn ? TOP_OPERATOR_ICONS.viewerOn : TOP_OPERATOR_ICONS.viewerOff,
    operator.viewerOn ? "Viewer on" : "Viewer off",
  );
  viewerWindow?.classList.toggle("is-viewer-off", !operator.viewerOn);
  preview?.setAttribute("aria-hidden", String(!operator.viewerOn));

  lockButton?.setAttribute("aria-pressed", String(operator.locked));
  setIcon(
    lockButton,
    operator.locked ? TOP_OPERATOR_ICONS.locked : TOP_OPERATOR_ICONS.unlocked,
    operator.locked ? "Locked" : "Unlocked",
  );

  if (operator.dynamic && cookButton) {
    cookButton.setAttribute("aria-pressed", String(operator.cookLive));
    setIcon(
      cookButton,
      TOP_OPERATOR_ICONS.cloneImmuneOff,
      operator.cookLive ? "Cook live on" : "Cook live off",
    );
    viewerWindow?.classList.toggle("is-frozen", !operator.cookLive);
  } else {
    viewerWindow?.classList.remove("is-frozen");
  }

  syncPreviewPlayback(operator, element);

  viewerActiveButton?.setAttribute("aria-pressed", String(operator.viewerActive));
  viewerActiveButton?.classList.toggle("is-active", operator.viewerActive);
  setIcon(
    viewerActiveButton,
    operator.viewerActive ? TOP_OPERATOR_ICONS.activateOn : TOP_OPERATOR_ICONS.activateOff,
    operator.viewerActive ? "Viewer Active on" : "Viewer Active off",
  );
}

function renderConnections() {
  if (!operatorLayer) return;

  const wireLayer = operatorLayer.querySelector(".connection-layer");
  if (!(wireLayer instanceof SVGSVGElement)) return;

  const layerRect = operatorLayer.getBoundingClientRect();

  connections.forEach((connection) => {
    const path = wireLayer.querySelector(`[data-connection-id="${connection.id}"]`);
    const fromWrapper = getOperatorWrapper(connection.from);
    const toWrapper = getOperatorWrapper(connection.to);

    if (!(path instanceof SVGPathElement) || !fromWrapper || !toWrapper) return;

    const fromRect = fromWrapper.getBoundingClientRect();
    const toRect = toWrapper.getBoundingClientRect();
    const inputPort = toWrapper.querySelector(".input-port");
    const renderedScale = getRenderedOperatorScale();
    const nodeInset = (getCSSNumber("--current-line") + getCSSNumber("--current-gap")) * renderedScale;
    const startX = fromRect.right - layerRect.left - nodeInset;
    const startY = fromRect.top - layerRect.top + fromRect.height * 0.48;
    const inputRect = inputPort?.getBoundingClientRect();
    const endX = inputRect ? inputRect.left - layerRect.left : toRect.left - layerRect.left + nodeInset;
    const endY = inputRect ? inputRect.top - layerRect.top + inputRect.height * 0.5 : toRect.top - layerRect.top + toRect.height * 0.42;
    const controlDistance = Math.max(34, Math.abs(endX - startX) * 0.52);

    path.setAttribute(
      "d",
      `M ${startX.toFixed(2)} ${startY.toFixed(2)} C ${(startX + controlDistance).toFixed(2)} ${startY.toFixed(2)}, ${(endX - controlDistance).toFixed(2)} ${endY.toFixed(2)}, ${endX.toFixed(2)} ${endY.toFixed(2)}`,
    );
  });
}

function setWorkspaceInteractionEnabled(enabled) {
  if (!operatorLayer || workspaceInteractionEnabled === enabled) return;

  if (enabled) {
    operatorLayer.addEventListener("pointerdown", beginWorkspacePan);
    operatorLayer.addEventListener("click", deselectOperators);
    operatorLayer.addEventListener("wheel", handleWorkspaceWheel, { passive: false });
  } else {
    operatorLayer.removeEventListener("pointerdown", beginWorkspacePan);
    operatorLayer.removeEventListener("click", deselectOperators);
    operatorLayer.removeEventListener("wheel", handleWorkspaceWheel);
  }

  workspaceInteractionEnabled = enabled;
}

function enterProjectDetail(operator, trigger = "keyboard") {
  const detail = getProjectDetail(operator);

  if (mode !== "workspace" || !operator?.detailPath || !workspacePanel || !detail) return;

  mode = "project-detail";
  workspaceSnapshot = captureWorkspaceState();
  resetDetailEnterWheel();

  const wrapper = getOperatorWrapper(operator.id);
  wrapper?.classList.add("is-entering-detail");

  setWorkspaceInteractionEnabled(false);
  setWorkspacePath(operator.detailPath);
  workspacePanel.classList.add("is-detail", "is-detail-transitioning");
  workspacePanel.dataset.detailTrigger = trigger;
  workspaceContent?.setAttribute("aria-hidden", "true");
  setActiveProjectDetail(detail);

  window.setTimeout(() => {
    wrapper?.classList.remove("is-entering-detail");
    workspacePanel.classList.remove("is-detail-transitioning");
  }, DETAIL_TRANSITION_MS);
}

function exitProjectDetail() {
  if (mode !== "project-detail" || !workspacePanel) return;

  mode = "workspace";
  resetDetailEnterWheel();
  workspacePanel.classList.remove("is-detail", "is-detail-transitioning");
  delete workspacePanel.dataset.detailTrigger;
  workspaceContent?.setAttribute("aria-hidden", "false");
  setActiveProjectDetail(null);
  setWorkspacePath("/works");
  restoreWorkspaceState(workspaceSnapshot);
  setWorkspaceInteractionEnabled(true);
}

function maybeEnterSelectedDetailFromScroll() {
  const selectedOperator = getSelectedDetailOperator();

  if (
    mode === "workspace" &&
    selectedOperator &&
    workspaceZoomIndex >= DETAIL_ENTER_ZOOM_INDEX &&
    detailEnterWheelDelta >= DETAIL_ENTER_WHEEL_DELTA
  ) {
    enterProjectDetail(selectedOperator, "scroll");
  }
}

function handleKeyboardShortcuts(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const key = event.key.toLowerCase();

  if (mode === "workspace" && key === "i") {
    const selectedOperator = getSelectedDetailOperator();
    if (!selectedOperator) return;

    event.preventDefault();
    enterProjectDetail(selectedOperator, "keyboard");
  }

  if (mode === "project-detail" && key === "u") {
    event.preventDefault();
    exitProjectDetail();
  }
}

function selectOperator(id) {
  resetDetailEnterWheel();

  operators.forEach((operator) => {
    operator.selected = operator.id === id;
    renderOperatorState(operator);
  });
}

function deselectOperators(event) {
  if (suppressNextLayerClick) {
    suppressNextLayerClick = false;
    return;
  }

  if (event && event.target !== operatorLayer) return;

  operators.forEach((operator) => {
    operator.selected = false;
    renderOperatorState(operator);
  });
  resetDetailEnterWheel();
}

function stopOperatorControlEvent(event) {
  event.stopPropagation();
}

function toggleViewer(operator, event) {
  stopOperatorControlEvent(event);
  operator.viewerOn = !operator.viewerOn;
  renderOperatorState(operator);
}

function toggleLock(operator, event) {
  stopOperatorControlEvent(event);
  operator.locked = !operator.locked;
  renderOperatorState(operator);
}

function toggleCook(operator, event) {
  stopOperatorControlEvent(event);
  if (!operator.dynamic) return;

  operator.cookLive = !operator.cookLive;
  renderOperatorState(operator);
}

function toggleViewerActive(operator, event) {
  stopOperatorControlEvent(event);
  operator.viewerActive = !operator.viewerActive;
  renderOperatorState(operator);
}

function isInsidePreviewArea(wrapper, event) {
  const viewerWindow = wrapper.querySelector(".viewer-window");
  if (!viewerWindow) return false;

  const rect = viewerWindow.getBoundingClientRect();

  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

function enterOperatorFromDoubleClick(operator, wrapper, event) {
  event.preventDefault();
  event.stopPropagation();

  if (mode !== "workspace" || event.target.closest("[data-no-drag]") || !isInsidePreviewArea(wrapper, event)) return;

  if (wrapper.dataset.suppressClick === "true") {
    wrapper.dataset.suppressClick = "false";
    return;
  }

  selectOperator(operator.id);
  enterProjectDetail(operator, "double-click");
}

function setOperatorPosition(operator, wrapper, x, y) {
  if (!operatorLayer) return;

  const maxX = Math.max(0, operatorLayer.clientWidth - wrapper.offsetWidth);
  const maxY = Math.max(0, operatorLayer.clientHeight - wrapper.offsetHeight);
  const nextX = clamp(x, 0, maxX);
  const nextY = clamp(y, 0, maxY);

  operator.x = nextX;
  operator.y = nextY;
  wrapper.style.left = `${nextX}px`;
  wrapper.style.top = `${nextY}px`;
  renderConnections();
}

function translateNetwork(dx, dy) {
  networkGridOriginX += dx;
  networkGridOriginY += dy;

  operators.forEach((operator) => {
    const wrapper = getOperatorWrapper(operator.id);
    if (!wrapper) return;

    operator.x += dx;
    operator.y += dy;
    wrapper.style.left = `${operator.x}px`;
    wrapper.style.top = `${operator.y}px`;
  });

  syncNetworkGrid();
  renderConnections();
}

function applyWorkspaceZoom(nextIndex, originX, originY) {
  if (!operatorLayer || nextIndex === workspaceZoomIndex) return;

  const previousZoom = getWorkspaceZoom();
  const nextZoom = WORKSPACE_ZOOM_LEVELS[nextIndex];
  const ratio = nextZoom / previousZoom;
  const nextPositions = operators.map((operator) => ({
    operator,
    x: originX - (originX - operator.x) * ratio,
    y: originY - (originY - operator.y) * ratio,
  }));

  networkGridOriginX = originX - (originX - networkGridOriginX) * ratio;
  networkGridOriginY = originY - (originY - networkGridOriginY) * ratio;
  workspaceZoomIndex = nextIndex;
  operatorLayer.style.setProperty("--operator-render-scale", getRenderedOperatorScale(nextZoom).toFixed(4));
  syncNetworkGrid(nextZoom);

  nextPositions.forEach(({ operator, x, y }) => {
    const wrapper = getOperatorWrapper(operator.id);
    if (!wrapper) return;

    setOperatorPosition(operator, wrapper, x, y);
  });

  renderConnections();
}

function handleWorkspaceWheel(event) {
  if (mode !== "workspace" || !operatorLayer || event.target.closest(".workspace-operator")) return;

  event.preventDefault();
  event.stopPropagation();

  const selectedDetailOperator = getSelectedDetailOperator();
  const isScrollIn = event.deltaY < 0;

  if (selectedDetailOperator && isScrollIn) {
    detailEnterWheelDelta += Math.abs(event.deltaY);
  } else if (!isScrollIn) {
    resetDetailEnterWheel();
  }

  workspaceWheelDelta += event.deltaY;

  if (Math.abs(workspaceWheelDelta) < WHEEL_ZOOM_THRESHOLD) {
    maybeEnterSelectedDetailFromScroll();
    return;
  }

  const direction = workspaceWheelDelta > 0 ? -1 : 1;
  workspaceWheelDelta = 0;

  const nextIndex = clamp(workspaceZoomIndex + direction, 0, WORKSPACE_ZOOM_LEVELS.length - 1);

  if (nextIndex !== workspaceZoomIndex) {
    const layerRect = operatorLayer.getBoundingClientRect();
    applyWorkspaceZoom(nextIndex, event.clientX - layerRect.left, event.clientY - layerRect.top);
  }

  maybeEnterSelectedDetailFromScroll();
}

function endOperatorDrag(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

  const { captureElement, wrapper, moved } = activeDrag;

  wrapper.classList.remove("is-dragging");
  captureElement.releasePointerCapture?.(event.pointerId);

  if (moved) {
    wrapper.dataset.suppressClick = "true";
    suppressNextLayerClick = true;
  }

  captureElement.removeEventListener("pointermove", moveOperatorDrag);
  captureElement.removeEventListener("pointerup", endOperatorDrag);
  captureElement.removeEventListener("pointercancel", endOperatorDrag);
  activeDrag = null;
}

function endWorkspacePan(event) {
  if (!activePan || event.pointerId !== activePan.pointerId) return;

  const { captureElement, moved } = activePan;

  captureElement.classList.remove("is-panning");
  captureElement.releasePointerCapture?.(event.pointerId);

  if (moved) {
    suppressNextLayerClick = true;
  }

  captureElement.removeEventListener("pointermove", moveWorkspacePan);
  captureElement.removeEventListener("pointerup", endWorkspacePan);
  captureElement.removeEventListener("pointercancel", endWorkspacePan);
  activePan = null;
}

function moveOperatorDrag(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

  const dx = event.clientX - activeDrag.startClientX;
  const dy = event.clientY - activeDrag.startClientY;

  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    activeDrag.moved = true;
  }

  if (activeDrag.locked) return;

  setOperatorPosition(activeDrag.operator, activeDrag.wrapper, activeDrag.startX + dx, activeDrag.startY + dy);
}

function moveWorkspacePan(event) {
  if (!activePan || event.pointerId !== activePan.pointerId) return;

  const dx = event.clientX - activePan.lastClientX;
  const dy = event.clientY - activePan.lastClientY;
  const totalDx = event.clientX - activePan.startClientX;
  const totalDy = event.clientY - activePan.startClientY;

  if (Math.abs(totalDx) > DRAG_THRESHOLD || Math.abs(totalDy) > DRAG_THRESHOLD) {
    activePan.moved = true;
  }

  activePan.lastClientX = event.clientX;
  activePan.lastClientY = event.clientY;

  if (!activePan.moved) return;

  event.preventDefault();
  activePan.captureElement.classList.add("is-panning");
  translateNetwork(dx, dy);
}

function beginOperatorDrag(operator, wrapper, event) {
  if (mode !== "workspace") return;
  if (event.button !== 0 || event.target.closest("[data-no-drag]")) return;

  const captureElement = event.currentTarget;

  event.stopPropagation();
  selectOperator(operator.id);

  activeDrag = {
    operator,
    captureElement,
    wrapper,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: operator.x,
    startY: operator.y,
    locked: operator.locked,
    moved: false,
  };

  if (!operator.locked) {
    wrapper.classList.add("is-dragging");
  }

  captureElement.setPointerCapture?.(event.pointerId);
  captureElement.addEventListener("pointermove", moveOperatorDrag);
  captureElement.addEventListener("pointerup", endOperatorDrag);
  captureElement.addEventListener("pointercancel", endOperatorDrag);
}

function beginWorkspacePan(event) {
  if (mode !== "workspace") return;
  if (!operatorLayer || event.button !== 0 || event.target !== operatorLayer) return;

  activePan = {
    captureElement: operatorLayer,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    lastClientX: event.clientX,
    lastClientY: event.clientY,
    moved: false,
  };

  operatorLayer.setPointerCapture?.(event.pointerId);
  operatorLayer.addEventListener("pointermove", moveWorkspacePan);
  operatorLayer.addEventListener("pointerup", endWorkspacePan);
  operatorLayer.addEventListener("pointercancel", endWorkspacePan);
}

function renderCookOrStaticFlag(operator) {
  if (operator.dynamic) {
    const cookLabel = operator.cookLive ? "Cook live on" : "Cook live off";

    return `
      <button class="vflag flag-button" type="button" data-no-drag data-flag-action="cook" aria-label="${cookLabel}" aria-pressed="${operator.cookLive}">
        <img src="${TOP_OPERATOR_ICONS.cloneImmuneOff}" alt="" draggable="false" />
      </button>
    `;
  }

  return `
    <span class="vflag" data-no-drag aria-label="Clone immune off">
      <img src="${TOP_OPERATOR_ICONS.cloneImmuneOff}" alt="" draggable="false" />
    </span>
  `;
}

function renderInputPort(operator) {
  if (!operator.hasInput) return "";

  return `
    <span class="input-port input-port--connected" aria-hidden="true"></span>
  `;
}

function createTopOperator(operator) {
  const wrapper = document.createElement("div");
  wrapper.className = `workspace-operator${operator.hasInput ? " has-input" : ""}`;
  wrapper.style.left = `${operator.x}px`;
  wrapper.style.top = `${operator.y}px`;

  const title = escapeHTML(operator.title);
  const operatorName = escapeHTML(operator.operatorName);
  const thumbnail = escapeHTML(operator.thumbnail);
  const previewMedia = `<img class="project-preview" src="${thumbnail}" alt="${title} preview" draggable="false" />`;

  wrapper.innerHTML = `
    <article class="top-operator${operator.hasInput ? " has-input" : ""}${operator.selected ? " is-current" : ""}" data-operator-id="${operator.id}" aria-label="${title} TOP operator">
      <div class="td-node">
        <div class="td-node-inner">
          <div class="td-body">
            <nav class="left-rail" aria-label="${operatorName} vertical flags">
              <div class="rail-fill" aria-hidden="true">${renderInputPort(operator)}</div>
              <div class="rail-separator" aria-hidden="true"></div>
              <div class="flag-stack">
                <button class="vflag flag-button" type="button" data-no-drag data-flag-action="viewer" aria-label="Viewer on" aria-pressed="${operator.viewerOn}">
                  <img src="${operator.viewerOn ? TOP_OPERATOR_ICONS.viewerOn : TOP_OPERATOR_ICONS.viewerOff}" alt="" draggable="false" />
                </button>
                ${renderCookOrStaticFlag(operator)}
                <button class="vflag flag-button" type="button" data-no-drag data-flag-action="lock" aria-label="Unlocked" aria-pressed="${operator.locked}">
                  <img src="${operator.locked ? TOP_OPERATOR_ICONS.locked : TOP_OPERATOR_ICONS.unlocked}" alt="" draggable="false" />
                </button>
                <span class="flag-spacer" aria-hidden="true"></span>
              </div>
            </nav>

            <section class="viewer-chrome" aria-label="${operatorName} TOP viewer">
              <div class="viewer-window">
                ${previewMedia}
              </div>
            </section>

            <aside class="output-rail" aria-label="${operatorName} output rail">
              <span class="output-port output-port-a" aria-hidden="true"></span>
              <span class="output-port output-port-b" aria-hidden="true"></span>
            </aside>
          </div>

          <footer class="bottom-strip" aria-label="${operatorName} horizontal flags and name strip">
            <div class="name-cell" title="${title}">${operatorName}</div>
            <div class="bottom-gap" aria-hidden="true"></div>
            <button class="viewer-active-cell" type="button" data-no-drag data-flag-action="viewer-active" aria-label="Viewer Active off" aria-pressed="${operator.viewerActive}">
              <img src="${operator.viewerActive ? TOP_OPERATOR_ICONS.activateOn : TOP_OPERATOR_ICONS.activateOff}" alt="" draggable="false" />
            </button>
          </footer>
        </div>
      </div>
    </article>
  `;

  bindOperatorEvents(wrapper, operator);
  renderOperatorState(operator);

  return wrapper;
}

function bindOperatorEvents(wrapper, operator) {
  const operatorElement = wrapper.querySelector(".top-operator");
  const viewerButton = wrapper.querySelector('[data-flag-action="viewer"]');
  const lockButton = wrapper.querySelector('[data-flag-action="lock"]');
  const cookButton = wrapper.querySelector('[data-flag-action="cook"]');
  const viewerActiveButton = wrapper.querySelector('[data-flag-action="viewer-active"]');

  operatorElement?.addEventListener("pointerdown", (event) => {
    beginOperatorDrag(operator, wrapper, event);
  });

  operatorElement?.addEventListener("click", (event) => {
    event.stopPropagation();

    if (wrapper.dataset.suppressClick === "true") {
      wrapper.dataset.suppressClick = "false";
      return;
    }

    selectOperator(operator.id);
  });

  operatorElement?.addEventListener("dblclick", (event) => {
    enterOperatorFromDoubleClick(operator, wrapper, event);
  });

  wrapper.querySelectorAll("[data-no-drag]").forEach((element) => {
    element.addEventListener("pointerdown", stopOperatorControlEvent);
    element.addEventListener("click", stopOperatorControlEvent);
    element.addEventListener("dblclick", stopOperatorControlEvent);
  });

  viewerButton?.addEventListener("click", (event) => {
    toggleViewer(operator, event);
  });

  lockButton?.addEventListener("click", (event) => {
    toggleLock(operator, event);
  });

  cookButton?.addEventListener("click", (event) => {
    toggleCook(operator, event);
  });

  viewerActiveButton?.addEventListener("click", (event) => {
    toggleViewerActive(operator, event);
  });
}

function initOperators() {
  if (!operatorLayer) return;

  operatorLayer.style.setProperty("--operator-render-scale", getRenderedOperatorScale().toFixed(4));

  const fragment = document.createDocumentFragment();

  const gridLayer = document.createElement("div");
  gridLayer.classList.add("network-grid");
  gridLayer.setAttribute("aria-hidden", "true");
  fragment.append(gridLayer);

  const wireLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wireLayer.classList.add("connection-layer");
  wireLayer.setAttribute("aria-hidden", "true");

  connections.forEach((connection) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("connection-wire");
    path.dataset.connectionId = connection.id;
    wireLayer.append(path);
  });

  fragment.append(wireLayer);

  operators.forEach((operator) => {
    fragment.append(createTopOperator(operator));
  });

  operatorLayer.replaceChildren(fragment);
  syncNetworkGrid();
  setWorkspaceInteractionEnabled(true);
  document.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("resize", () => {
    syncNetworkGrid();
    renderConnections();
  });
  renderConnections();
}

initOperators();
syncExternalVideoLinks();
bootTerminal();
