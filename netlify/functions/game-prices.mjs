import games from '../../lifestyle/store-games.json' with { type: 'json' };

export default async function gamePrices(request) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.search = new URLSearchParams({appids: games.map(game => game.id).join(','), filters:'price_overview', cc:'ca', l:'english'});
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(6000)});
    if (!response.ok) throw Error('Store unavailable');
    const data = await response.json();
    const prices = {};
    for (const {id} of games) {
      const p = data[id]?.data?.price_overview;
      if (p?.currency === 'CAD' && Number.isInteger(p.final) && p.final >= 0 && Number.isInteger(p.initial) && Number.isInteger(p.discount_percent)) {
        prices[id] = {cents:p.final, regular:p.initial, discount:p.discount_percent};
      }
    }
    if (!Object.keys(prices).length) throw Error('No Canadian prices');
    return Response.json({checked:new Date().toISOString(), prices}, {headers:{
      'Cache-Control':'public, max-age=300', 'Netlify-CDN-Cache-Control':'public, s-maxage=1800, stale-while-revalidate=300'
    }});
  } catch {
    return Response.json({error:'Canadian prices are temporarily unavailable.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
