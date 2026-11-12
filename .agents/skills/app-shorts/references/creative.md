# Making each Short from scratch

The owner's direction (2026-11-11): every Short starts from a fresh creative plate. Take big creative risks, never run
the same experiment twice, and do not reuse music, layouts or assets from Short to Short. Watch every cut and
iterate until it is good enough for the owner's body of work. The nine Shorts the template made before that date were
taken down for failing this: none said what its app was, all shared one look and one synthesised bed, and several had
captions the colour of their background.

## The creative plan

Write it in the episode folder (`plan.md`) before recording. Short and specific:

- **The idea in one line.** Something a person would describe to a friend: "a robot eats a crumpled lab report and
  prints Apple Health charts", not "before → after of import".
- **What the app is, by second 3.** The exact words or picture that tell a stranger what the app does and what it
  works with (Function Health, Apple Health, the App Store game genre). If the idea cannot carry that, change the
  idea.
- **The experiment.** One sentence: what this Short tests that no earlier one has, and the number that will say
  whether it worked (hook retention at 3 s, average percentage viewed, shares, comments, clicks to the App Store).
- **The dimensions.** Fill each one, then check `../ledger/experiments.md`: at least three must differ from every
  earlier Short on the channel, and the look and sound must differ from all of them.

| Dimension | Some of the range (go beyond it) |
|---|---|
| Premise | demo, skit, parody (nature documentary, infomercial, true crime, sports commentary), confession, challenge, ASMR, time-lapse, tutorial, myth-buster, POV, unboxing, mock trailer, text-message drama |
| Point of view | the app's mascot speaks, a parent's diary, a narrator, the data's own view, a rival, no one |
| Footage | the real app full screen, the app inside a staged scene, split screen with the problem, the screen's elements pulled out and animated, macro of a device, photographed props |
| Type | a typeface chosen for this Short, its size, case, weight, where it sits, how it moves (kinetic, typed, stamped, handwritten) |
| Colour | a palette chosen for this Short; app colours, the opposite, monochrome, one accent |
| Sound | music arranged from scratch in a genre chosen for this Short, the app's own sounds as the score, foley, a voice, silence and one hit |
| Structure | hook → payoff, countdown, loop, escalation, reveal at the end, two halves, cold open |
| Length | 6 s loop, 12 s, 20 s, up to 45 s when the story needs it |

## The bar

Score every round 1 to 10 on each line. Ship only when every line is 8 or more, from you and from the independent
reviewer. Write the scores in the plan.

1. **Stops the scroll.** The first frame is already interesting, before any words are read.
2. **Says what it is.** By 3 seconds a stranger knows what the app does and what it works with.
3. **Original.** It does not look or sound like any earlier Short on the channel, or like a template.
4. **Legible.** Every word is readable on a phone at a glance: `legibility.swift` passes at 4.5:1, nothing sits
   under YouTube's controls, no line is on screen too briefly to read.
5. **Sounds good.** Real instruments or real sound, mixed well, about -14 LUFS, the voice clear if there is one.
6. **Crafted.** Timing, motion and cuts feel deliberate; no frame looks like a mistake.
7. **True.** Every result is what the real app did in the take, with synthetic data.
8. **Earns an action.** A viewer would comment, share, rewatch or look the app up.
9. **Obviously an iPhone app, and obviously easy.** A real iPhone is on screen, large, the way Apple shows apps,
   not a flat rectangle of UI or a cartoon. The app's part is the shortest real path to the result, with the
   cleanest screens; never linger on dense lists, forms or settings. If it looks complicated, it is wrong, however
   true it is.

**Owner verdicts to design against (2026-11-12).** On the Importron robot cut (pixel-art mascot, robot voice,
stamped pixel type, flat recordings of the review screens): "you cant even tell its an iphone app, and you make
the ui seem ugly and complicated… the whole point is that its easy and the 'first pdf is free' line is a turn
off." On the Space Worms documentary (Gill Sans and Iowan italic subtitles, a subtle story about which worm is
ours, ambient piano): "font story sound all bad." Both had passed every automated check, so the checks are
necessary but not enough.

**No pricing lines** in a Short, its cover, title or pinned comment ("first one free", "pay once per…"). The
store page carries the price.

## Sound

Score each Short from scratch. Never reuse another Short's bed.

- **Music from Apple Loops.** About 1,700 real-instrument loops live in `/Library/Audio/Apple Loops/Apple/` in many
  genres (hip hop, modern R&B, dubstep, vintage breaks, blues garage, indie disco, disco funk and more). Choose a
  genre for the idea, then arrange: pick a drum loop, a bass and one or two melodic parts in the same key and tempo,
  lay them out in ffmpeg (`amix`, `adelay`, `atrim`, `afade`), and build the arrangement so it drops out, enters
  or hits where the picture does. Apple's licence lets us use the loops royalty-free in our own compositions; never
  publish a loop on its own. Log the loops used in `experiments.md` and do not use the same loop twice on the channel.
- **The app's own audio,** recorded with the take, when the app has sound (games, Rhythm, Giraffe Stretch).
- **Foley and effects** with `soundtrack.mjs` cues or recorded sound, cut to the picture.
- **A voice** only as a deliberate character. The Mac's built-in voices are robotic: a robot mascot (Importron)
  can own that; a parent narrator cannot. Otherwise the owner's voice, recorded by the owner.
- **No sine-wave beds.** `soundtrack.mjs` music is retired. Its I–V–vi–IV synth was the "corny track" the owner
  rejected.

Check every mix: `ffmpeg -i cut.mp4 -af ebur128=peak=true -f null -` (about -14 LUFS integrated, true peak under
-1 dBTP), and look at a spectrogram (`-lavfi showspectrumpic=s=1024x512`) for real instruments.

## Type and colour

- Choose the typeface for the idea from the fonts installed on the Mac (`fc-list` or Font Book) or an OFL font
  saved with the episode. Do not reuse the previous Short's face, size and box.
- **Contrast is not taste.** A caption's every word reaches 4.5:1 against what is behind it. An accent word in the
  app's brand colour over a background of the same hue fails, as Füd's purple "count?" on lavender did. Put text on
  a solid or shadowed ground when the picture behind it moves.
- Give each line enough time to read: about 0.3 s per word, never under 1 s.

## Watching it

A contact sheet is not watching. Stills at one per second hid both failures above: each beat looked clear on its
own, and the whole read as ugly, busy and not like an iPhone. Each round, also pull every frame of the first three
seconds and of each transition at full size, and judge the cut as a viewer on a phone would: what is this, does it
look easy, would I want it. You cannot hear it, so measure the sound and say so; the owner listens before posting.
Write down the weakest moment and what changes. A cut that reads as "fine" is not done.
