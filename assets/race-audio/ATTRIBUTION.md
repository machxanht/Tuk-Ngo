# Original broadcast audio

All MP3s in this folder are cuts from the user-supplied programme:
[Ngày thi đấu thứ 2 – Giải Đua ghe Ngo, Óc Om Bóc, TP Cần Thơ 2025](https://www.youtube.com/watch?v=crZF3hghbgQ),
Cần Thơ – Tiếng Dân tộc. Copyright remains with the original rightsholder; no
CC0 or independently verified reusable-content licence is asserted.

The 301,668,624-byte AAC source was retrieved using updated yt-dlp with the Node
JavaScript runtime. Its SHA-256 is
`2c443d23b71fe92cc191baca5bbc45ec12704d79a2ef1b31492839cd04654ed5`.
It is kept outside the repository on the working machine. The five-hour source
is not shipped with the game.

The runtime set contains 12 Vietnamese commentary cuts, three Khmer commentator
cuts, three short recorded field-percussion hits and a short field-ambience loop.
There are no generated voices, generated chants, cloned voices or synthesized
drum samples in this set. Processing is limited to cuts, EQ, fades, loudness
normalization and MP3 encoding. The percussion is cut from field sound, rather
than being an isolated studio drum stem.

Speech boundaries and content were selected from the original YouTube automatic
CC track (`vi-orig`, 4,434 cues, containing both Vietnamese and Khmer). The recipe
and manifest record its hash and each speech cut's CC words/timestamps. Khmer
phrases have working Vietnamese translations: a viewer greeting, a statement
that the race has started, and congratulations (only after a player win). Source
team names and unrelated Khmer passages were excluded. Automatic CC can contain
errors; independent listening/native review and speaker labels are not available.
Nothing generates new speech or changes the original speakers' pitch/speed.

`docs/broadcast-audio-cuts.json` contains all source ranges and event mappings.
`manifest.json` adds decoded durations/peaks, sizes and hashes of generated MP3s.
Rebuild with Python, numpy and imageio-ffmpeg:

    python scripts/build-race-audio.py --source "path/to/broadcast-full.m4a" --captions "path/to/youtube-captions.vi-orig.json3"

The baker verifies source/CC hashes and selected CC words, changes only this
generated audio set, and removes its obsolete recordings. It does not download or process
media at runtime. The full source, ASR model and extraction tools remain on drive
E outside the website.
