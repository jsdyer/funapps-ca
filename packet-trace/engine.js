/* Packet Trace: deterministic, turn-based incident response in a simulated network. */
(() => {
  'use strict';

  const node = (id, label, role, x, y, z, critical, description, lines, alert = false) => ({
    id, label, role, x, y, z, critical, description, lines, alert
  });
  const link = (from, to, label, alert = false) => ({ from, to, label, alert });
  const scenarios = [
    {
      id: 'harbour',
      title: 'Halifax Harbour: The Silent Ferry Board',
      summary: 'Trace an unexpected outbound connection from a ferry information network.',
      difficulty: 'Orientation',
      briefing: 'Commuters in Dartmouth are waiting for the next boat across Halifax Harbour. The departure board has stopped updating and the ferry network flagged unexpected traffic. Find the foothold before the attacker reuses a service credential.',
      objective: 'Remove the foothold and any later pivots, then bring every device back online.',
      limit: 15,
      efficientTurns: 5,
      nodes: [
        node('gateway', 'Harbour Gateway', 'Gateway', -5, .75, -1, true, 'Edge router for the ferry information network.', [
          'EGRESS | webhook-relay → 198.51.100.24 | destination first seen today.',
          'ROUTE | Gateway forwarded the connection; the source was the relay, not the router.'
        ], true),
        node('relay', 'Webhook Relay', 'Webhook', -1.7, 1.5, -3.8, false, 'Receives public status updates and passes validated events to the status feed.', [
          'INGRESS | Rejected signature followed by unexpected worker start.',
          'SESSION | A feed-writer token was read after the worker started.'
        ]),
        node('feed', 'Sailing Status', 'Service', 3.5, 1.2, -4.5, true, 'Public departure and cancellation feed.', [
          'AUTH | The feed-writer role accepts sessions from Webhook Relay.',
          'METRIC | Fewer updates this hour; no failed health probes.'
        ]),
        node('bookings', 'Booking Store', 'Database', 5, 1.1, -.2, true, 'Primary store for bookings and seat counts.', [
          'AUDIT | Feed-reader queries are permitted; booking writes use a separate credential.'
        ]),
        node('identity', 'Crew Directory', 'Identity', 1.3, 1.35, 4.5, true, 'Directory for crew and service accounts.', [
          'AUTH | No crew password changes or new administrative sessions.'
        ]),
        node('monitor', 'Dock Monitor', 'Monitoring', -4.8, .75, 4, false, 'Passive network telemetry and equipment health checks.', [
          'HEALTH | One delayed probe. The next probe succeeded.',
          'ALERT | The gateway’s egress signal was independent of the missed probe.'
        ]),
        node('archive', 'Schedule Archive', 'Backup', 5.2, 1, 4.7, false, 'Read-only historical schedules.', [
          'AUDIT | Scheduled archive checks completed on time.'
        ])
      ],
      links: [
        link('gateway', 'relay', 'Public ingress', true),
        link('relay', 'feed', 'Feed writer'),
        link('feed', 'bookings', 'Availability query'),
        link('identity', 'bookings', 'Service identity'),
        link('gateway', 'monitor', 'Flow telemetry'),
        link('bookings', 'archive', 'Snapshot'),
        link('monitor', 'identity', 'Health probe')
      ],
      initial: {
        relay: {
          from: 'gateway',
          lines: [
            'INCIDENT | The unexpected worker is running with a copied feed-writer token.',
            'PIVOT RISK | The worker is preparing a session against Sailing Status.'
          ]
        }
      },
      pivots: [
        { turn: 5, from: 'relay', to: 'feed', lines: ['INCIDENT | Feed-writer token replay from Webhook Relay.', 'PIVOT RISK | An unexpected process is reading Booking Store connection details.'] },
        { turn: 9, from: 'feed', to: 'bookings', lines: ['INCIDENT | Unapproved session from Sailing Status copied a database service credential.'] }
      ]
    },
    {
      id: 'homelab',
      title: 'Langley: Midnight at the Homelab',
      summary: 'Separate ordinary overnight activity from a stolen service identity.',
      difficulty: 'Operator',
      briefing: 'A hobbyist in Langley, BC, is backing up the family media collection overnight. Monitoring saw a dashboard session outside the maintenance window and an unrecognised process on the job runner. Some alerts are normal maintenance.',
      objective: 'Follow the session trail and restore all systems before the maintenance window closes.',
      limit: 21,
      efficientTurns: 9,
      nodes: [
        node('gateway', 'Edge Firewall', 'Gateway', -5.3, .7, -3.1, true, 'Filters external ingress and records outbound connection metadata.', [
          'FLOW | A new outbound destination was reached from the dashboard segment.',
          'FIREWALL | No unsolicited inbound connections passed the rule set.'
        ]),
        node('dashboard', 'Admin Dashboard', 'Service', -1.4, 1.3, -3.8, false, 'Administrative web console for homelab jobs.', [
          'AUTH | Maintenance account authenticated outside the approved schedule.'
        ], true),
        node('runner', 'Job Runner', 'Hypervisor', 2.5, 1.5, -3.4, false, 'Executes maintenance tasks and handles service tokens.', [
          'TASK | Scheduled integrity scan is expected; an extra task shares its name.'
        ], true),
        node('nas', 'Home NAS', 'NAS', 5.3, 1, .7, true, 'Primary storage for media, snapshots and local backups.', [
          'ACCESS | Job Runner has a narrow service account for snapshots.'
        ]),
        node('identity', 'Local Identity', 'Identity', -1, 1.45, .45, true, 'Issues credentials for the homelab’s main services.', [
          'AUTH | Dashboard retains permission to request maintenance tokens.'
        ]),
        node('media', 'Media Shelf', 'Cache', -4.8, .9, 1.1, false, 'Caches artwork, local indexes and transcoding output.', [
          'CPU | High usage matches a scheduled media index rebuild.',
          'AUDIT | Index worker hash matches its approved package.'
        ], true),
        node('monitor', 'Metrics Desk', 'Monitoring', -2.8, .8, 4.8, false, 'Shows job status and device alerts.', [
          'TIMELINE | Admin Dashboard logged in first; the extra Job Runner task followed.',
          'TIMELINE | Media Shelf’s independent spike aligns with its scheduled index rebuild.'
        ]),
        node('backup', 'Cold Copy', 'Backup', 3.3, 1.1, 4.8, true, 'Receives scheduled backup copies from Home NAS.', [
          'BACKUP | Home NAS is the only approved writer.'
        ])
      ],
      links: [
        link('gateway', 'dashboard', 'Admin ingress'),
        link('dashboard', 'runner', 'Job control', true),
        link('runner', 'nas', 'Snapshot account'),
        link('dashboard', 'identity', 'Token requests'),
        link('nas', 'backup', 'Backup replication'),
        link('identity', 'media', 'Read token'),
        link('monitor', 'runner', 'Task telemetry'),
        link('media', 'monitor', 'CPU telemetry')
      ],
      initial: {
        dashboard: {
          from: 'gateway',
          lines: [
            'INCIDENT | A stolen browser session issued an unsigned job to Job Runner.',
            'PIVOT RISK | The same session can request credentials from Local Identity.'
          ]
        },
        runner: {
          from: 'dashboard',
          lines: [
            'INCIDENT | The unsigned job opened a new process that copied a NAS service token.',
            'PIVOT RISK | It is preparing to contact Home NAS.'
          ]
        }
      },
      pivots: [
        { turn: 6, from: 'runner', to: 'nas', lines: ['INCIDENT | The stolen snapshot account opened a new session on Home NAS.', 'PIVOT RISK | The process has read replication settings for Cold Copy.'] },
        { turn: 9, from: 'dashboard', to: 'identity', lines: ['INCIDENT | An unapproved maintenance token was minted for the dashboard session.'] },
        { turn: 13, from: 'nas', to: 'backup', lines: ['INCIDENT | An unauthorised NAS job has written to the backup staging area.'] }
      ]
    },
    {
      id: 'backcountry',
      title: 'Yukon: The Field Photo Archive',
      summary: 'Contain a second route into an isolated-looking backup network.',
      difficulty: 'Expert',
      briefing: 'A Yukon field crew has just sent a batch of autumn photos back to Whitehorse. The archive is still copying them overnight. At the same time, a second tunnel appeared between the ingest and recovery networks. Trace both paths before the next replication cycle.',
      objective: 'Remediate every compromised system and return the archive network to full availability.',
      limit: 25,
      efficientTurns: 11,
      nodes: [
        node('vpn', 'Field VPN', 'VPN', -5.4, 1, -3.5, true, 'Remote access for the archive’s ingest and operations teams.', [
          'AUTH | One field key authenticated twice from different session paths.'
        ], true),
        node('ingest', 'Photo Ingest', 'Workstation', -1.6, 1.4, -4.5, false, 'Transfers field images to an internal indexer.', [
          'TASK | Large image batches produce predictable traffic bursts.',
          'AUDIT | No new outbound connections beyond the indexer.'
        ]),
        node('index', 'Archive Index', 'Database', 2.6, 1.1, -3.7, true, 'Indexes metadata for the primary collection.', [
          'AUDIT | The indexing spike matches the expected field batch size.'
        ], true),
        node('library', 'Photo Library', 'NAS', 5.4, 1.2, -.1, true, 'Primary media storage for the digital archive.', [
          'ACCESS | Sync Relay can open a backup-reader session.'
        ]),
        node('sync', 'Sync Relay', 'Service', -.8, 1.55, .6, false, 'Transfers approved data between the archive and recovery segments.', [
          'FLOW | Both scheduled replication and an unexpected route appear in current logs.'
        ]),
        node('vault', 'Key Vault', 'Identity', -4.7, 1.4, .8, true, 'Stores keys used by remote operators and automated tasks.', [
          'POLICY | The field VPN can authenticate to this service on behalf of operators.'
        ]),
        node('monitor', 'Traffic Observer', 'Monitoring', -4, .8, 4.9, false, 'Passive flow recorder on the recovery segment.', [
          'FLOW | An unapproved tunnel originated on Sync Relay, alongside normal replication.',
          'FLOW | The tunnel is separate from the Field VPN duplicate session.'
        ], true),
        node('restore', 'Recovery Host', 'Hypervisor', 0, 1.2, 4.8, false, 'Hosts restoration drills and the recovery segment’s tools.', [
          'ACL | The Key Vault’s operator role can open a management session.'
        ]),
        node('snapshot', 'Snapshot Store', 'Backup', 4.6, 1.05, 4.5, true, 'Holds backup data and recent archive manifests.', [
          'ACL | Recovery Host receives limited access during recovery drills.'
        ])
      ],
      links: [
        link('vpn', 'ingest', 'Field access'),
        link('ingest', 'index', 'Metadata ingest'),
        link('index', 'library', 'Content indexing'),
        link('vpn', 'vault', 'Operator session'),
        link('sync', 'library', 'Backup reader'),
        link('sync', 'monitor', 'Traffic mirror', true),
        link('sync', 'snapshot', 'Replication'),
        link('vault', 'restore', 'Recovery access'),
        link('restore', 'snapshot', 'Recovery tools')
      ],
      initial: {
        vpn: {
          from: null,
          lines: [
            'INCIDENT | A copied field key is active on a second, unauthorised session.',
            'PIVOT RISK | The second session has reached the Key Vault sign-in screen.'
          ]
        },
        sync: {
          from: 'monitor',
          lines: [
            'INCIDENT | A job credential was copied and reused for an unapproved tunnel.',
            'PIVOT RISK | Sync Relay is preparing to use its reader access to Photo Library.'
          ]
        }
      },
      pivots: [
        { turn: 4, from: 'vpn', to: 'vault', lines: ['INCIDENT | The unauthorised field session requested an operator credential from Key Vault.', 'PIVOT RISK | The credential can open Recovery Host.'] },
        { turn: 8, from: 'sync', to: 'library', lines: ['INCIDENT | A stolen backup-reader credential opened a session on Photo Library.'] },
        { turn: 11, from: 'vault', to: 'restore', lines: ['INCIDENT | Recovery Host accepted a copied operator credential from Key Vault.', 'PIVOT RISK | Recovery tools can access Snapshot Store.'] },
        { turn: 15, from: 'restore', to: 'snapshot', lines: ['INCIDENT | An unauthorised Recovery Host process has staged a snapshot job.'] }
      ]
    }
  ];

  const sessions = new WeakMap();

  function missionInfo({ id, title, summary, difficulty }) {
    return { id, title, summary, difficulty };
  }

  function start(id) {
    const scenario = scenarios.find(mission => mission.id === id);
    if (!scenario) throw new Error('Unknown Packet Trace mission.');
    const { briefing, objective, limit } = scenario;
    const state = {
      mission: { ...missionInfo(scenario), briefing, objective },
      nodes: scenario.nodes.map(({ description, lines, ...device }) => ({
        ...device, status: 'online', scanned: false
      })),
      links: scenario.links.map(edge => ({ ...edge })),
      turn: 0,
      limit,
      status: 'active',
      availability: 100,
      events: [{ turn: 0, kind: 'alert', text: briefing }]
    };
    sessions.set(state, {
      scenario,
      compromised: new Map(Object.entries(scenario.initial)),
      prevented: 0,
      pivots: 0,
      disruptions: 0,
      criticalDowntime: 0,
      remediated: 0
    });
    return state;
  }

  function getNode(state, id) {
    return state.nodes.find(device => device.id === id);
  }

  function inspect(state, id) {
    const internal = sessions.get(state);
    const info = internal?.scenario.nodes.find(device => device.id === id);
    const device = getNode(state, id);
    if (!info || !device) return { description: 'Select a device to inspect.', lines: [] };
    const result = { description: info.description, lines: [] };
    if (!device.scanned) return result;
    const evidence = internal.compromised.get(id);
    result.lines = [...info.lines];
    if (evidence) result.lines.push(...evidence.lines);
    else if (device.status === 'contained') result.lines.push('RESPONSE | Affected credentials revoked and clean configuration restored. Safe to reconnect.');
    else result.lines.push('SCAN | No confirmed compromise on this device.');
    return result;
  }

  function event(state, text, kind = 'action') {
    state.events.push({ turn: state.turn, text, kind });
  }

  function markLink(state, from, to) {
    const route = state.links.find(edge => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from));
    if (route) route.alert = true;
  }

  function update(state, internal, result) {
    state.turn++;
    event(state, result.text, result.kind);
    for (const pivot of internal.scenario.pivots) {
      if (pivot.turn !== state.turn) continue;
      const from = getNode(state, pivot.from);
      const to = getNode(state, pivot.to);
      if (!internal.compromised.has(from.id)) {
        // The source was either never compromised or already remediated.
        continue;
      }
      if (from.status !== 'online' || to.status !== 'online') {
        internal.prevented++;
        event(state, `Blocked pivot from ${from.label} to ${to.label}. A device on the path was isolated.`, 'success');
        continue;
      }
      if (internal.compromised.has(to.id)) continue;
      internal.compromised.set(to.id, pivot);
      internal.pivots++;
      to.alert = true;
      to.scanned = false;
      markLink(state, from.id, to.id);
      event(state, `Lateral activity detected: ${from.label} → ${to.label}. Scan the destination for fresh evidence.`, 'alert');
    }

    const critical = state.nodes.filter(device => device.critical);
    const offline = critical.filter(device => device.status !== 'online').length;
    internal.criticalDowntime += offline;
    state.availability = Math.round(100 * (critical.length - offline) / critical.length);
    if (!internal.compromised.size && state.nodes.every(device => device.status === 'online')) {
      state.status = 'won';
      event(state, 'Incident closed. Compromised devices remediated and all systems are online.', 'success');
    } else if (state.turn >= state.limit) {
      state.status = 'lost';
      event(state, 'Response window closed. The incident was not fully resolved.', 'alert');
    }
    return { ok: true, text: result.text };
  }

  function reject(text) {
    return { ok: false, text };
  }

  function act(state, action, id) {
    const internal = sessions.get(state);
    if (!internal || state.status !== 'active') return reject('Start a new incident to continue.');
    const device = getNode(state, id);
    if (!device) return reject('Select a device first.');
    const incident = internal.compromised.get(id);
    let result;
    switch (action) {
      case 'scan':
        if (device.scanned) return reject('This device’s latest evidence is already open.');
        device.scanned = true;
        device.alert = Boolean(incident);
        if (incident?.from) markLink(state, incident.from, id);
        result = incident
          ? { text: `Scan confirmed compromise on ${device.label}. Review the evidence before acting.`, kind: 'alert' }
          : { text: `Scan found no confirmed compromise on ${device.label}.`, kind: 'action' };
        break;
      case 'isolate':
        if (device.status !== 'online') return reject('This device is already offline.');
        device.status = 'isolated';
        if (!incident) internal.disruptions++;
        result = { text: `${device.label} isolated. Network access paused.`, kind: 'action' };
        break;
      case 'rotate':
        if (device.status !== 'isolated') return reject('Isolate the device before remediating it.');
        if (!device.scanned) return reject('Scan the device to confirm what needs remediation.');
        if (!incident) return reject('No compromise found. Restore this device instead.');
        internal.compromised.delete(id);
        internal.remediated++;
        device.status = 'contained';
        device.alert = false;
        result = { text: `${device.label} remediated. Affected credentials revoked and known-good configuration restored.`, kind: 'success' };
        break;
      case 'restore':
        if (device.status === 'online') return reject('This device is already online.');
        if (!device.scanned) return reject('Scan the device before reconnecting it.');
        if (incident) return reject('Remediate the confirmed compromise before reconnecting this device.');
        device.status = 'online';
        result = { text: `${device.label} restored to the network.`, kind: 'success' };
        break;
      default:
        return reject('Choose scan, isolate, remediate, or restore.');
    }
    return update(state, internal, result);
  }

  function advance(state) {
    const internal = sessions.get(state);
    if (!internal || state.status !== 'active') return reject('Start a new incident to continue.');
    return update(state, internal, { text: 'One turn elapsed while monitoring the network.', kind: 'action' });
  }

  function report(state) {
    const internal = sessions.get(state);
    if (!internal) return { grade: '—', score: 0, summary: 'Start an incident first.', details: [] };
    const { scenario, criticalDowntime, disruptions, pivots, prevented, remediated } = internal;
    const turnsOver = Math.max(0, state.turn - scenario.efficientTurns);
    const points = 100 - 2 * turnsOver - 2 * criticalDowntime - 4 * disruptions - 8 * pivots;
    const won = state.status === 'won';
    const lost = state.status === 'lost';
    const score = Math.max(0, lost ? Math.min(49, points) : points);
    const grade = lost ? 'Incomplete' : !won ? '—' : score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
    const summary = won
      ? 'Incident resolved. Every device is back online.'
      : lost ? 'Response window closed before full recovery.' : 'Response in progress. Score is provisional.';
    const details = [
      `Turns used: ${state.turn} of ${state.limit}`,
      `Devices remediated: ${remediated}`,
      `Successful attacker pivots: ${pivots}`,
      `Pivots blocked by isolation: ${prevented}`,
      `Critical device-turns offline: ${criticalDowntime}`,
      `Clean devices isolated: ${disruptions}`
    ];
    if (lost) {
      const unresolved = state.nodes.filter(device => internal.compromised.has(device.id));
      if (unresolved.length) details.push(`Compromise remained on: ${unresolved.map(device => device.label).join(', ')}`);
    }
    return { grade, score, summary, details };
  }

  window.PacketTraceEngine = { missions: scenarios.map(missionInfo), start, inspect, act, advance, report };
})();
