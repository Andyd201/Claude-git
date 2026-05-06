@echo off
cd /d "%~dp0\.."
echo.
echo  VideoShorts - Git commit
echo  ========================
echo.

:: Supprimer le verrou si present
del /f ".git\index.lock" 2>nul

:: Reconstruire l'index s'il est corrompu
echo [1/4] Reconstruction de l'index git...
del /f ".git\index" 2>nul
git reset HEAD 2>nul

:: Exclure les dossiers temporaires
echo [2/4] Configuration .gitignore...
git add VideoShorts/.gitignore 2>nul
git rm --cached -r VideoShorts/outputs/ VideoShorts/uploads/ 2>nul

:: Stager les fichiers du projet
echo [3/4] Staging...
git add VideoShorts/app.py
git add VideoShorts/static/app.js
git add VideoShorts/templates/index.html
git add VideoShorts/commit.bat

:: Commit
echo [4/4] Commit...
git commit -m "v1.7 - Fix audio desync + fix video restart between parts

Root cause of audio desync:
  WAV from edge-tts is 24kHz. AAC encoder delay = 2112 samples.
  At 24kHz: 2112/24000 = 88ms delay (vs 44ms at 48kHz).
  Previous 3-step pipeline (trim + burn_subs + merge_tts) caused double
  or inconsistent encoder delay. Players ignoring MP4 edit list saw 88ms desync.

Root cause of video restart:
  process_reddit() and process_reddit_visual() always seeked video from t=0,
  so each part played the same beginning of the background video.

Fix 1 — new process_reddit_clip() function:
  Single ffmpeg pass: seek + burn ASS subs + encode audio all at once.
  -stream_loop -1 : loops background video if shorter than TTS audio.
  -ss video_offset : starts from where the previous part ended.
  -c:a aac -ar 48000 : encodes at 48kHz (encoder delay = 44ms, handled by
    ffmpeg edit list, transparent to the player).
  -shortest : stops when WAV is exhausted.
  Replaces the 3 separate steps: trim_video + burn_and_format + merge_tts.

Fix 2 — video_offset tracking in process_reddit():
  video_dur = get_media_duration(video_path)  # computed once
  video_offset = 0.0
  ...each part: video_offset = (video_offset + tts_dur) % video_dur
  This ensures part 2 starts where part 1 ended, cycling through the video.

Fix 3 — same fixes in process_reddit_visual():
  compose_visual_clip() now accepts video_offset parameter.
  Passes -stream_loop -1 + -ss video_offset to background video input.
  Also uses -ar 48000 for AAC encoding.
  video_offset tracked identically across parts."

echo.
echo Done! Push with: git push origin main
echo.
pause
