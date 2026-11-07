# Getting a recording and transcribing it

## A file the owner points to

Copy it into `audio/` in the call folder with `cp`, and go to Transcribe.

## Voice Memos (macOS)

The library is protected, and the shell cannot read it or the app's temporary copies. Use the app. Each step needs the
owner's approval when it asks.

1. Request access to Voice Memos. New recordings from the iPhone can show "Downloading…" for a minute or two after the
   app opens, and can't be selected until they finish. Do other work meanwhile.
2. Select the recording by date and duration. Open its transcript (the speech-bubble button) and confirm the call from
   the first minutes. Apple's transcript is only for this check: it is rougher than `transcribe`, and has no timestamps
   you can reach.
3. Share button, then **Copy**. The Share popover can't be seen by the background tools, so this needs full-screen
   control. Never click a contact or a share target in that popover.
4. Request access to Finder, `open` the call's `audio/` folder, bring Finder forward and press Cmd-V. The menu's Paste
   command is refused in the background, so this needs full-screen control too. Release it straight afterwards.
5. Two identical files may land. Compare SHA-256, delete the duplicate, and name the original `recording.qta`.

A `.qta` file is an ordinary QuickTime container, and ffmpeg reads it. Its audio is AAC plus a spatial track.

## Transcribe

Build once, and again after `transcribe.swift` changes:

```bash
swiftc -O -parse-as-library scripts/transcribe.swift -o /Volumes/ssd/projects/calls/bin/transcribe
```

Then, in the call folder:

```bash
ffmpeg -loglevel error -y -i audio/recording.qta -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/work.wav
/Volumes/ssd/projects/calls/bin/transcribe audio/work.wav transcript.txt
rm audio/work.wav
```

Apple's on-device `SpeechAnalyzer` does this. A 23-minute call took about 20 seconds, and no audio leaves the Mac. The
transcript is written with mode 600, one timestamped segment per line. The last timestamp should be close to the
recording's end. A long gap means audio was lost: check before triaging.

Never send a call to a hosted transcription API. If `SpeechAnalyzer` is unavailable, install whisper.cpp from Homebrew
with a model under `/Volumes/ssd/projects/calls/models/`, and tell the owner a download was needed.

## Keeping the audio

The original stays where it was (Voice Memos, or wherever the owner keeps it). Once the triage is finished and checked,
delete the copy in `audio/` if the original still exists: `guard` reports it until then. The transcript stays on the
SSD. Delete anything further only when the owner asks, or when the person on the call does.
