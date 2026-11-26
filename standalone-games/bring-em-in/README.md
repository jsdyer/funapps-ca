# Bring 'Em In

A morning of lobster fishing out of Shelburne, Nova Scotia. Steer to your red-and-yellow buoys, slow down and haul, then bring the crate back to Government Wharf before the bell.

Play it on FunApps at [/play/bring-em-in/](https://funapps.ca/play/bring-em-in/).

## Controls

- A or Left turns the boat left. D or Right turns it right.
- W or Ahead goes forward. S or Back eases off.
- Space, or Haul, pulls a pot when you are slow and close.
- E, or Tie up, sells the crate at the wharf.
- P pauses.

## Build

```bash
npm install
npm run build
```

The static release is written to `web/` and copied to `/play/bring-em-in/` by the hub build. Asset paths are relative so the game works in that subdirectory.
