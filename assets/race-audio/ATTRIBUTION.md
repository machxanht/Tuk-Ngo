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

The runtime set contains 12 Vietnamese commentary cuts, four Khmer commentator
cuts, three short recorded field-percussion hits and a short field-ambience loop.
There are no generated voices, generated chants, cloned voices or synthesized
drum samples in this set. Processing is limited to cuts, EQ, fades, loudness
normalization and MP3 encoding. The percussion is cut from field sound, rather
than being an isolated studio drum stem.

Vietnamese word boundaries were selected using local Whisper small ASR. The
captions are descriptive labels, not certified verbatim transcripts. Named-team
portions were excluded from those Vietnamese cuts. Khmer passages are the
original commentator speaking Khmer, not cheering calls. A reliable verbatim
translation/native review is not available: they can retain context or names
from the real event. They are labelled as source excerpts and are not used to
announce a game winner or to read the selected team's name.

`docs/broadcast-audio-cuts.json` contains all source ranges and event mappings.
`manifest.json` adds decoded durations/peaks, sizes and hashes of generated MP3s.
Rebuild with Python, numpy and imageio-ffmpeg:

    python scripts/build-race-audio.py --source "path/to/broadcast-full.m4a"

The baker verifies the exact source hash, changes only this generated audio set,
and removes its obsolete synthetic recordings. It does not download or process
media at runtime. The full source, ASR model and extraction tools remain on drive
E outside the website.
