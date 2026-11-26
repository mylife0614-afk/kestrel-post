# kestrel-post

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/mylife0614-afk/kestrel-post/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/mylife0614-afk/kestrel-post/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Kestrel Post is a complete, original flight game that plays offline in a desktop browser from static files. You are a courier pilot flying mail through the Alpine valleys: thread the glowing rings, mind your fuel, fight the gusts, and bring the plane home onto the runway. Three missions — Dawn Run, Storm Pass and Night Mail — each with its own sky, wind and ring course, a live HUD (airspeed, altitude, heading, throttle, fuel), synthesised engine sound, and a landing that has to be earned.

## Run it

```sh
python3 -m http.server 8080
# open http://localhost:8080/game/
```

No build step, no network: every file the game loads sits under `game/`. Play with keyboard and mouse — arrows or mouse to steer, Shift/Ctrl or the wheel for throttle, Space for the airbrake, P to pause, M to mute, R to fly again.

## Controls

- **Arrows / WASD or mouse** — steer (Up climbs, Down descends)
- **Shift / Ctrl, + / -, or mouse wheel** — throttle up / down
- **Space** — airbrake
- **1–3** — pick a mission on the menu · **Enter** — fly · **P** — pause · **M** — mute · **R** — fly again

Fly through every glowing ring to score and refuel, then bring the plane down on the runway: slow below 95 knots, line up straight, and touch down gently. Hit the ground anywhere else and the mail is late.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
