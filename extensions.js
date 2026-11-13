/* Register standalone activities with the shared game launcher. */
(() => {
  'use strict';
  const games = window.FunGames;
  if (!games) return;
  const extensions = [
    window.RoadTripGame && { info: { ...window.RoadTripGame.info, category: 'explore' }, mount: window.RoadTripGame.mount },
    window.FunExtra && { info: { ...window.FunExtra.metadata, category: 'explore' }, mount: window.FunExtra.mount },
    window.RainWindow,
    window.PostcardMaker
  ].filter(Boolean);
  const previousMount = games.mount.bind(games);
  const previousUnmount = games.unmount.bind(games);
  let cleanup;

  games.unmount = function (container) {
    const dispose = cleanup;
    cleanup = undefined;
    try {
      dispose?.();
    } finally {
      previousUnmount(container);
    }
  };

  extensions.forEach(extension => games.list.push(extension.info));
  games.list.unshift({
    id: 'packet-trace',
    title: 'Packet Trace',
    description: 'Investigate a breach on a 3D network map. Trace the pivot, contain it, and bring services back online.',
    tag: '3D INCIDENT RESPONSE',
    icon: '⌬',
    href: 'packet-trace/'
  });
  games.mount = function (id, container) {
    const extension = extensions.find(item => item.info.id === id);
    games.unmount(container);
    if (!extension) return previousMount(id, container);
    const dispose = extension.mount(container);
    if (typeof dispose === 'function') cleanup = dispose;
  };
})();
