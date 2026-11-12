/* Register standalone activities with the shared game launcher. */
(() => {
  'use strict';
  const games = window.FunGames;
  if (!games) return;
  const extensions = [
    window.RoadTripGame && { info: { ...window.RoadTripGame.info, category: 'explore' }, mount: window.RoadTripGame.mount },
    window.FunExtra && { info: { ...window.FunExtra.metadata, category: 'explore' }, mount: window.FunExtra.mount }
  ].filter(Boolean);
  const previousMount = games.mount.bind(games);
  extensions.forEach(extension => games.list.push(extension.info));
  games.mount = function (id, container) {
    const extension = extensions.find(item => item.info.id === id);
    if (!extension) return previousMount(id, container);
    games.unmount(container);
    extension.mount(container);
  };
})();
