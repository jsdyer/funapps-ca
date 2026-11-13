(() => {
  'use strict';

  const COLOURS = {
    online: '#65dcca',
    alert: '#ffab63',
    isolated: '#9caec5',
    contained: '#9fe29a'
  };
  const CAMERA = { yaw: .48, pitch: .59, scale: 1 };
  const FIELD = 8;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const interpolate = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
  const intersects = (a, b, gap = 3) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

  function nodeColour(node) {
    if (node.status === 'isolated') return COLOURS.isolated;
    if (node.status === 'contained') return COLOURS.contained;
    return node.alert ? COLOURS.alert : COLOURS.online;
  }

  function makeCamera(yaw, pitch, scale, width, height) {
    const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw);
    const sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
    const distance = 20 / scale;
    const focal = Math.min(height * 1.27, width * .92);
    return ([x, y, z]) => {
      const relativeY = y - .57;
      const horizontal = x * cosYaw - z * sinYaw;
      const vertical = relativeY * cosPitch - (x * sinYaw + z * cosYaw) * sinPitch;
      const depth = distance - ((x * sinYaw + z * cosYaw) * cosPitch + relativeY * sinPitch);
      const pixels = focal / depth;
      return {
        x: width * .5 + horizontal * pixels,
        y: height * .52 - vertical * pixels,
        depth, pixels
      };
    };
  }

  function mount(canvas, { onSelect } = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let nodes = [];
    let links = [];
    let byId = new Map();
    let selectedId = null;
    let hitRegions = [];
    let { yaw, pitch, scale } = CAMERA;
    let width = 0, height = 0, ratio = 1;
    let frame = 0;
    let lastPaint = -Infinity;
    let disposed = false;
    const points = new Map();
    let gesture = null;
    const events = new AbortController();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      requestPaint();
    }

    function requestPaint() {
      if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    }

    function tick(time) {
      frame = 0;
      if (disposed || document.hidden) return;
      if (motion.matches || time - lastPaint >= 24) {
        draw(motion.matches ? 0 : time);
        lastPaint = time;
      }
      if (!motion.matches && nodes.length) requestPaint();
    }

    function path(points, colour, width = 1, close = false) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      if (close) ctx.closePath();
      ctx.lineWidth = width;
      ctx.strokeStyle = colour;
      ctx.stroke();
    }

    function polygon(points, fill, border) {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (border) {
        ctx.strokeStyle = border;
        ctx.lineWidth = .85;
        ctx.stroke();
      }
    }

    function ring(project, node, y, radius, colour, dash = []) {
      const circle = Array.from({ length: 32 }, (_, index) => {
        const angle = index * Math.PI / 16;
        return project([node.x + Math.cos(angle) * radius, y, node.z + Math.sin(angle) * radius]);
      });
      ctx.setLineDash(dash);
      path(circle, colour, 1.15, true);
      ctx.setLineDash([]);
    }

    function dot(point, radius, colour) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colour;
      ctx.fill();
    }

    function drawGround(project) {
      const square = [[-FIELD, 0, -FIELD], [FIELD, 0, -FIELD], [FIELD, 0, FIELD], [-FIELD, 0, FIELD]].map(project);
      polygon(square, '#0a1c23', '#2f5960');
      for (let index = -FIELD + 1; index < FIELD; index++) {
        const colour = index === 0 ? '#284f56' : index % 2 === 0 ? '#1a3840' : '#122b33';
        path([project([index, 0, -FIELD]), project([index, 0, FIELD])], colour);
        path([project([-FIELD, 0, index]), project([FIELD, 0, index])], colour);
      }
      for (const x of [-FIELD, FIELD]) {
        for (const z of [-FIELD, FIELD]) {
          const point = project([x, 0, z]);
          dot(point, 2.2, '#66a8a8');
          path([point, project([x, .36, z])], '#66a8a8');
        }
      }
    }

    function drawLink(project, link, index, time) {
      const source = byId.get(link.from), dest = byId.get(link.to);
      if (!source || !dest) return;

      const from = [source.x, source.y + .12, source.z];
      const to = [dest.x, dest.y + .12, dest.z];
      const mid = interpolate(from, to, .5);
      mid[1] += Math.min(.6, Math.hypot(dest.x - source.x, dest.z - source.z) * .065);
      const route = [from, mid, to].map(project);
      const offline = source.status === 'isolated' || dest.status === 'isolated';
      const highlighted = source.id === selectedId || dest.id === selectedId;
      const colour = offline ? '#8ea7b9' : link.alert ? COLOURS.alert : '#58c9bc';
      ctx.globalAlpha = offline ? .34 : highlighted || link.alert ? .94 : .57;
      ctx.setLineDash(offline ? [4, 5] : []);
      path(route, colour + '2a', 4.5);
      path(route, colour, highlighted ? 1.7 : 1);
      ctx.setLineDash([]);
      dot(route[1], 1.7, colour);

      if (!offline && !motion.matches) {
        const progress = (time / (link.alert ? 1600 : 2600) + index * .173) % 1;
        for (const offset of [0, .54]) {
          const part = (progress + offset) % 1;
          const point = project(part < .5
            ? interpolate(from, mid, part * 2)
            : interpolate(mid, to, (part - .5) * 2));
          dot(point, highlighted ? 6 : 4.2, colour + '34');
          dot(point, highlighted ? 2.4 : 1.75, colour);
        }
      }
      ctx.globalAlpha = 1;
    }

    function makeBlock(project, node, faces, bounds, fill, accent) {
      const [left, bottom, near, right, top, far] = bounds;
      const world = [
        [left, bottom, near], [right, bottom, near], [right, top, near], [left, top, near],
        [left, bottom, far], [right, bottom, far], [right, top, far], [left, top, far]
      ].map(([x, y, z]) => [x + node.x, y + node.y, z + node.z]);
      const vertices = world.map(project);
      const panels = [
        { corners: [0, 3, 2, 1], colour: fill[0] },
        { corners: [4, 5, 6, 7], colour: fill[0] },
        { corners: [0, 4, 7, 3], colour: fill[1] },
        { corners: [1, 2, 6, 5], colour: fill[1] },
        { corners: [3, 7, 6, 2], colour: fill[2] }
      ];
      for (const panel of panels) {
        const corners = panel.corners.map(index => vertices[index]);
        const a = corners[0], b = corners[1], c = corners[2];
        const winding = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (winding >= 0) continue;
        faces.push({
          points: corners,
          depth: corners.reduce((sum, corner) => sum + corner.depth, 0) / corners.length,
          fill: panel.colour, accent
        });
      }
      return vertices;
    }

    function drawDevice(project, node) {
      const selected = node.id === selectedId;
      const colour = nodeColour(node);
      const dim = node.status === 'isolated';
      const ground = project([node.x, .02, node.z]);
      const stand = project([node.x, node.y, node.z]);
      path([ground, stand], colour + '66', 1);
      dot(ground, 2.2, colour + '99');
      ring(project, node, .025, selected ? .95 : .66, colour + (selected ? 'aa' : '55'), [3, 4]);
      if (selected || node.alert || node.scanned) {
        ring(project, node, node.y + .015, selected ? 1.02 : .93, colour + '88', node.alert ? [5, 3] : []);
      }

      const faces = [];
      const border = colour + (selected ? 'ee' : '9a');
      const plinth = makeBlock(project, node, faces, [-.76, .02, -.55, .76, .16, .55], ['#122e38', '#16343e', '#1c424a'], border);
      const role = String(node.role).toLowerCase();
      const desktop = role === 'workstation' || role === 'monitoring';
      const low = role === 'gateway' || role === 'vpn' || role === 'cache';
      const bodyHeight = desktop ? 1.02 : low ? .52 : 1.28;
      const darkBody = dim ? ['#233442', '#2e3d4b', '#425361'] : ['#143f4a', '#1b4f5a', '#296571'];
      let body;

      if (desktop) {
        makeBlock(project, node, faces, [-.58, .16, -.27, .58, .27, .39], darkBody, border);
        makeBlock(project, node, faces, [-.13, .27, -.13, .13, .52, .13], darkBody, border);
        body = makeBlock(project, node, faces, [-.53, .44, -.26, .53, bodyHeight, -.08], darkBody, border);
      } else if (low) {
        body = makeBlock(project, node, faces, [-.64, .16, -.42, .64, bodyHeight, .42], darkBody, border);
        makeBlock(project, node, faces, [-.42, bodyHeight, -.22, .42, bodyHeight + .08, .22], darkBody, border);
      } else {
        body = makeBlock(project, node, faces, [-.49, .16, -.36, .49, bodyHeight, .36], darkBody, border);
      }
      faces.sort((a, b) => b.depth - a.depth);
      for (const face of faces) polygon(face.points, face.fill, face.accent);

      // Paint lights on the nearer vertical face, so the front remains legible during orbit.
      const frontZ = body[0].depth < body[4].depth ? (desktop ? -.26 : low ? -.42 : -.36)
        : desktop ? -.08 : low ? .42 : .36;
      const devicePoint = (x, y, z) => project([node.x + x, node.y + y, node.z + z]);
      const strips = desktop ? [.58, .7, .82] : low ? [.33] : [.38, .59, .8, 1.01];
      for (const y of strips) {
        path([devicePoint(-.35, y, frontZ), devicePoint(.18, y, frontZ)], colour + (dim ? '66' : 'c5'), 1.1);
        dot(devicePoint(.33, y, frontZ), 1.45, colour);
      }
      if (node.critical) {
        const beacon = devicePoint(0, bodyHeight + .23, 0);
        path([devicePoint(0, bodyHeight, 0), beacon], colour);
        dot(beacon, 2.15, colour);
      }

      const shape = plinth.concat(body);
      const xs = shape.map(point => point.x), ys = shape.map(point => point.y);
      const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      if (selected) {
        const w = right - left, h = bottom - top;
        const corners = [
          [[left - 6, top + h * .28], [left - 6, top - 6], [left + w * .25, top - 6]],
          [[right - w * .25, top - 6], [right + 6, top - 6], [right + 6, top + h * .28]],
          [[left - 6, bottom - h * .28], [left - 6, bottom + 6], [left + w * .25, bottom + 6]],
          [[right - w * .25, bottom + 6], [right + 6, bottom + 6], [right + 6, bottom - h * .28]]
        ];
        corners.forEach(line => path(line.map(([x, y]) => ({ x, y })), colour));
      }
      return {
        id: node.id, label: node.label, critical: node.critical, colour, selected, depth: stand.depth,
        center: (left + right) / 2, top, bottom,
        hit: { x: left - 5, y: top - 5, w: right - left + 10, h: bottom - top + 10 }
      };
    }

    function fitLabel(label, max) {
      if (ctx.measureText(label).width <= max) return label;
      const letters = Array.from(label);
      while (letters.length && ctx.measureText(letters.join('') + '…').width > max) letters.pop();
      return letters.join('') + '…';
    }

    function drawLabels(devices) {
      const placed = [];
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Consolas, monospace';
      ctx.textBaseline = 'middle';

      const ordered = [...devices].sort((a, b) => Number(b.selected) - Number(a.selected) || a.depth - b.depth);
      for (const item of ordered) {
        const viewport = { x: 0, y: 0, w: width, h: height };
        if (!intersects(item.hit, viewport, 0)) continue;
        const label = fitLabel(String(item.label ?? item.id), 114);
        const w = ctx.measureText(label).width + (item.critical ? 24 : 14);
        const h = 19;
        const proposed = [
          [item.center - w / 2, item.bottom + 8],
          [item.center - w / 2, item.top - h - 9],
          [item.hit.x + item.hit.w + 3, item.bottom - h * .5],
          [item.hit.x - w - 3, item.bottom - h * .5],
          [item.center - w / 2, item.bottom + 30]
        ].map(([x, y]) => ({ x: clamp(x, 3, width - w - 3), y: clamp(y, 3, height - h - 3), w, h }));
        const placement = proposed.find(box =>
          placed.every(other => !intersects(box, other)) &&
          devices.every(other => other === item || !intersects(box, other.hit, 1))
        ) || proposed.find(box => placed.every(other => !intersects(box, other)));
        if (!placement) continue;
        const { x, y } = placement;
        path([{ x: item.center, y: item.bottom }, { x: clamp(item.center, x + 6, x + w - 6), y: y > item.bottom ? y : y + h }], item.colour + '78');
        ctx.fillStyle = item.selected ? '#163841' : '#08171f';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = item.colour + (item.selected ? 'ff' : '82');
        ctx.lineWidth = 1;
        ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
        if (item.critical) dot({ x: x + 8, y: y + h / 2 }, 2.2, item.colour);
        ctx.fillStyle = item.selected ? '#e0fffb' : '#cde3e9';
        ctx.fillText(label, x + (item.critical ? 15 : 7), y + h / 2 + .5);
        placed.push({ ...placement, id: item.id });
      }
      return placed;
    }

    function draw(time) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const background = ctx.createRadialGradient(width / 2, height * .49, 10, width / 2, height * .49, Math.max(width, height) * .65);
      background.addColorStop(0, '#102631');
      background.addColorStop(1, '#071219');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      const project = makeCamera(yaw, pitch, scale, width, height);
      drawGround(project);
      links.forEach((link, i) => drawLink(project, link, i, time));

      const ordered = [...nodes].sort((a, b) =>
        project([b.x, b.y, b.z]).depth - project([a.x, a.y, a.z]).depth
      );
      const devices = ordered.map(node => drawDevice(project, node));
      const labels = drawLabels(devices);
      hitRegions = [...labels, ...devices.reverse().map(device => ({ id: device.id, ...device.hit }))];
    }

    function rotate(yawDelta, pitchDelta) {
      yaw = (yaw + yawDelta) % (2 * Math.PI);
      pitch = clamp(pitch + pitchDelta, .22, 1.14);
      requestPaint();
    }

    function zoom(factor) {
      scale = clamp(scale * factor, .58, 1.45);
      requestPaint();
    }

    function reset() {
      ({ yaw, pitch, scale } = CAMERA);
      requestPaint();
    }

    function hitTest(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left, y = clientY - rect.top;
      return hitRegions.find(box => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h)?.id;
    }

    function touchDistance() {
      const [a, b] = points.values();
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal: events.signal });

    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0 || points.size >= 2) return;
      const point = { x: event.clientX, y: event.clientY };
      points.set(event.pointerId, point);
      canvas.setPointerCapture(event.pointerId);
      if (points.size === 1) gesture = { origin: point, moved: false };
      else gesture = { moved: true, pinch: touchDistance() };
    });

    listen(canvas, 'pointermove', event => {
      const previous = points.get(event.pointerId);
      if (!previous || !gesture) return;
      const current = { x: event.clientX, y: event.clientY };
      points.set(event.pointerId, current);
      if (points.size === 2) {
        const distance = touchDistance();
        if (gesture.pinch > 0 && distance > 0) zoom(distance / gesture.pinch);
        gesture.pinch = distance;
        return;
      }
      if (!gesture.moved && Math.hypot(current.x - gesture.origin.x, current.y - gesture.origin.y) < 4) return;
      gesture.moved = true;
      rotate((previous.x - current.x) * .009, (current.y - previous.y) * .008);
    });

    function releasePointer(event) {
      if (!points.delete(event.pointerId)) return;
      if (!points.size) {
        if (event.type === 'pointerup' && !gesture?.moved) {
          const id = hitTest(event.clientX, event.clientY);
          if (id) onSelect?.(id);
        }
        gesture = null;
      }
    }

    listen(canvas, 'pointerup', releasePointer);
    listen(canvas, 'pointercancel', releasePointer);
    listen(canvas, 'lostpointercapture', releasePointer);
    listen(canvas, 'wheel', event => {
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      zoom(Math.exp(clamp(-pixels, -160, 160) * .0022));
    }, { passive: false });
    listen(document, 'visibilitychange', requestPaint);
    listen(motion, 'change', requestPaint);

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else listen(window, 'resize', resize);
    resize();

    return {
      update(next) {
        ({ nodes, links, selectedId } = next);
        byId = new Map(nodes.map(node => [node.id, node]));
        requestPaint();
      },
      rotate, zoom, reset,
      destroy() {
        disposed = true;
        events.abort();
        resizeObserver?.disconnect();
        if (frame) cancelAnimationFrame(frame);
        for (const id of points.keys()) {
          if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        }
        points.clear();
        hitRegions = [];
        ctx.clearRect(0, 0, width, height);
      }
    };
  }

  window.PacketTraceScene = { mount };
})();
