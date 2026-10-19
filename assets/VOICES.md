# Clan voices

The clan's voices in `assets/voices.json` are one matching set. Every recording is released under **CC0 1.0** (public domain), so no credit is required; they're listed here so you can find the originals.

## How the set is made

- **Four men, one studio.** The screams, calls, grunts and some of the hurt cries are all from one pack: four male vocalists recorded on the same Neumann mic and preamp. Each is a voice, marked `A` to `D` in the file. Each cannibal keeps one of the four voices, and a band's members each get a different one, so one cannibal never changes voice mid-fight.
- **A few others for the rest.** The growls, pain grunts, death cries, long wails and a babble come from a few other recordings. Each is dry and close, with one man only. Their tone is nudged toward the four men's.
- **Taken out.** These were cut from the earlier set because they didn't match:
  - crowds and groups (wailing crowd, war cries, two cowboys, men howling, "tribe of savage creatures");
  - imitations (monkeys, a cartoon effort, a zombie);
  - recordings with their own space baked in (a parking garage, a scream recorded at a distance in a forest, howling recorded far off outdoors).
  The game now adds distance and the forest's echo itself, the same way for every sound.
- **One chain for every clip.**
  - Rumble below 90 Hz and hiss above 9 kHz are cut.
  - Each clip is trimmed tight and levelled to the same loudness.
  - It is saved as a mono 22.05 kHz, 48 kbps MP3.
  - Every clip is mono. Where it sits left, right, behind and how far off is set while it plays, from where the cannibal is and which way you face (`placeOut` in `src/fp/45-audio.js`).

## Sources

| Recording | By | Where | Used as |
|---|---|---|---|
| [Male Grunt/Yelling sounds](https://opengameart.org/content/male-gruntyelling-sounds) | haeldb | OpenGameArt | scream (24), yell (16), grunt (14), hurt (4), chatter (1), wail (2): voices A–D |
| [caveman scream](https://freesound.org/s/867185/) | riippumattog | Freesound | scream (1) |
| [wailing sounds](https://freesound.org/s/814010/) | riippumattog | Freesound | wail (4) |
| [going crazy sounds](https://freesound.org/s/856149/) | riippumattog | Freesound | chatter (3) |
| [Male Aggressive Growls](https://freesound.org/s/257358/) | Kodack | Freesound | growl (5) |
| [Medium Male Pain Grunts](https://freesound.org/s/610998/) | unfa | Freesound | hurt (4) |
| [Male Grunting In Pain](https://freesound.org/s/464486/) | elynch0901 | Freesound | hurt (1) |
| [Voice_AdultMale_PainGrunts_09.wav](https://freesound.org/s/547209/) | MrFossy | Freesound | hurt (1) |
| [Soldier-Death Agony scream](https://freesound.org/s/800871/) | TyrantTim | Freesound | die (1) |
| [Death cry](https://freesound.org/s/795690/) | randbsoundbites | Freesound | die (1) |
| [MaleDeathSound13.wav](https://freesound.org/s/577032/) | Blankened | Freesound | die (1) |
| [Male Death Sound](https://freesound.org/s/554443/) | Blankened | Freesound | die (1) |
| [Male Screams Grunts](https://freesound.org/s/745726/) | JD_Brick_Productions | Freesound | die (1) |
