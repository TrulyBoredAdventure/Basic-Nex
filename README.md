# Basic Nex

Basic Nex is an Alt1 Toolkit helper for the standard RuneScape Nex encounter. It is designed for solo and duo kills and provides automated mechanic, prayer, ability-response, target, and positioning guidance.

Repository owner: `TrulyBoredAdventure`  
Repository name: `Basic-Nex`

## Install

Install it in Alt1 with:

```text
alt1://addapp/https://TrulyBoredAdventure.github.io/Basic-Nex/appconfig.json
```

Alt1 Toolkit must already be installed. Open the link on the computer running RuneScape and approve the prompt to add Basic Nex.

## Current features

- Solo and duo modes
- Aggro/lurer and partner/damage duo roles
- Ranged, Necromancy, Magic, and Melee profiles
- Automatic chatbox detection of Nex phase and mechanic dialogue
- Fixed-rotation prediction for Smoke, Shadow, Blood, and Ice specials
- Recommended protection prayer for each phase
- Optional movable prayer overlay drawn directly over the RuneScape client
- Mechanic-specific movement and defensive suggestions
- Blood Siphon stop-damage warning
- Blood Sacrifice movement warning
- Ice Prison solo and duo instructions
- Automatic mage target calls for Fumus, Umbra, Cruor, and Glacies
- Top-down arena guide with the active quadrant highlighted
- Compact fight view
- Optional spoken urgent calls
- Saved local settings
- Retry-based chatbox detection with linking, permission, and library diagnostics
- Diagnostics and a local event simulator
- Two-click confirmation for fight resets and local-data deletion

## Automation limits

Alt1 reads pixels and game interfaces; it does not receive RuneScape world coordinates, NPC animations, ability cooldowns, or camera geometry directly. Basic Nex therefore uses chat OCR for reliable phase and mechanic synchronization and the known Nex rotation to show what comes next.

The arena diagram provides recommended quadrants and lure direction. Exact outlines on individual game tiles would require a separate calibration system tied to the player's camera angle, zoom, interface layout, and resolution.

The displayed auto-attack timing is an estimate. Movement, missed attacks, phase transitions, and animation delays can shift the real timing. The detected Nex dialogue always takes priority and re-synchronizes the helper.

## RuneScape setup

For the most reliable chat detection:

1. Keep the game messages tab visible.
2. Turn local chat timestamps on.
3. Avoid covering the chatbox with another interface.
4. Use 100% interface scaling while initially testing.
5. Open Basic Nex before entering the encounter.

## Testing

The repository has no local build step. It loads the pinned `alt1` 0.1.3 browser bundles from jsDelivr at runtime.

Run the local state-machine tests with:

```bash
npm test
npm run check
```

The Diagnostics tab includes an event simulator, allowing the complete encounter flow to be tested without entering the Nex arena.

## Detection phrases

Basic Nex currently recognizes the main Nex dialogue for:

- Smoke, Shadow, Blood, Ice, and Zaros phase starts
- Virus
- No Escape
- Embrace Darkness
- Fear the Shadow
- Blood Siphon
- Blood Sacrifice
- Ice Prison
- Contain This
- Fumus, Umbra, Cruor, and Glacies calls
- Wrath and common completion messages

OCR matching ignores capitalization, punctuation, apostrophes, and timestamps.

## Prayer overlay placement

Enable **Show prayer as a RuneScape screen overlay** in Settings and select **Move prayer overlay**. Move the mouse to the desired location inside RuneScape, then press **Alt+1** while the game is focused. The overlay locks immediately at that location and the saved position is reused the next time the app opens. The **Lock at current position** button remains available as a fallback.

The next practical detection layer is optional screen calibration for boss-health thresholds. That would improve phase recovery when a dialogue line is missed. Exact game-tile highlighting should remain opt-in because it depends heavily on camera and interface configuration.

## License

MIT License. See `LICENSE`.
