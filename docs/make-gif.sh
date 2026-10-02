#!/bin/sh
# docs/demo.mp4 (from `vhs docs/demo.tape`) → docs/cctop.gif, 2× speed.
set -e
cd "$(dirname "$0")"
ffmpeg -y -v error -i demo.mp4 \
  -vf "setpts=PTS/2,fps=12,scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  cctop.gif
ls -la cctop.gif
