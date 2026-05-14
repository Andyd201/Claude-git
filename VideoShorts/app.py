"""
VideoShorts v1.6
Découpe · Whisper · Reddit TTS · Reddit Visuel · Shorts/Reels/TikTok
Patch 6 : Reddit Visuel — card animé avec reveal progressif du texte
"""

from flask import Flask, render_template, request, jsonify, send_file
import os, subprocess, json, threading, uuid, re, asyncio, time, shutil, random
from pathlib import Path

app = Flask(__name__)

BASE_DIR      = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
OUTPUT_FOLDER = BASE_DIR / "outputs"
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

jobs = {}


def cleanup_job(job_id: str):
    """Supprime tous les fichiers liés à un job (upload + dossier output)."""
    for f in UPLOAD_FOLDER.glob(f"{job_id}.*"):
        try: f.unlink()
        except: pass
    out = OUTPUT_FOLDER / job_id
    if out.exists():
        try: shutil.rmtree(out)
        except: pass
    jobs.pop(job_id, None)


def startup_cleanup():
    """Supprime tous les fichiers des sessions précédentes au démarrage."""
    for f in UPLOAD_FOLDER.iterdir():
        try: f.unlink()
        except: pass
    for d in OUTPUT_FOLDER.iterdir():
        if d.is_dir():
            try: shutil.rmtree(d)
            except: pass
        else:
            try: d.unlink()
            except: pass

startup_cleanup()


# ══════════════════════════════════════════════
#  Utilitaires communs
# ══════════════════════════════════════════════

def get_media_duration(path: Path) -> float:
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json",
           "-show_format", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(json.loads(r.stdout)["format"]["duration"])
    except Exception:
        return 0.0


def _upd(job_id: str, **kw):
    if job_id in jobs:
        jobs[job_id].update(kw)


def run_ffmpeg(args: list) -> tuple[int, str]:
    """Run ffmpeg, return (returncode, stderr)."""
    r = subprocess.run(["ffmpeg", "-y"] + args, capture_output=True, text=True)
    return r.returncode, r.stderr


# ══════════════════════════════════════════════
#  Couleurs ASS
# ══════════════════════════════════════════════

def hex_to_ass_color(hex_str: str) -> str:
    """Convertit #RRGGBB → &H00BBGGRR (format couleur ASS en BGR)."""
    h = hex_str.lstrip('#')
    if len(h) == 6:
        r, g, b = h[0:2].upper(), h[2:4].upper(), h[4:6].upper()
        return f"&H00{b}{g}{r}"
    return "&H00FF00FF"   # magenta par défaut


# ══════════════════════════════════════════════
#  Sous-titres ASS — neon glow, 1 ligne, dynamique
# ══════════════════════════════════════════════

def _ass_ts(s: float) -> str:
    """Secondes → timestamp ASS  H:MM:SS.cc"""
    h  = int(s // 3600)
    m  = int((s % 3600) // 60)
    sc = int(s % 60)
    cs = int(round((s % 1) * 100))
    return f"{h}:{m:02d}:{sc:02d}.{cs:02d}"


def _ass_header(play_x: int = 1080, play_y: int = 1920,
                neon_color: str = "&H00FF00FF") -> str:
    """Retourne le header ASS avec les styles neon."""
    return (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {play_x}\nPlayResY: {play_y}\n"
        "WrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # Default : texte blanc, contour neon (couleur dynamique), ombre légère
        f"Style: Default,Arial,30,&H00FFFFFF,&H000000FF,{neon_color},"
        "&H80000000,1,0,0,0,100,100,0,0,1,4,1,2,20,20,80,1\n"
        # Reaction : texte cyan, contour rouge, centre écran
        "Style: Reaction,Arial,48,&H0000FFFF,&H000000FF,&H00FF0000,"
        "&H00000000,1,0,0,0,100,100,0,0,1,6,0,5,20,20,400,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )


# Mots qui déclenchent le style Reaction dans les sous-titres
_REACTION_TRIGGER = {
    'faah','ayo','bruh','wait','bro','nah','noooo','non','stop',
    'quoi','what','omg','dingue','incroyable','impossible','sérieux',
}

def _dynamic_fs(text: str, base: int = 30) -> int:
    """Réduit la taille de police pour les textes longs → single-line."""
    n = len(text)
    if n <= 16: return base
    if n <= 24: return max(base - 4, 12)
    if n <= 32: return max(base - 7, 12)
    return max(base - 11, 12)


def write_word_chunk_ass(word_timings: list, ass_path: Path,
                         wpc: int = 3, vertical: bool = True,
                         font_size: int = 30, sub_y_pct: float = 85.0,
                         neon_hex: str = '#FF00FF') -> None:
    """
    Génère un fichier ASS avec :
    - position Y personnalisable (sub_y_pct % depuis le haut)
    - couleur neon personnalisable (neon_hex #RRGGBB)
    - taille de police personnalisable + réduction auto pour tenir sur 1 ligne
    - style Reaction centré pour les mots-réactions
    """
    px, py = (1080, 1920) if vertical else (1920, 1080)
    neon_color = hex_to_ass_color(neon_hex)
    cx    = px // 2
    pos_y = int(sub_y_pct / 100.0 * py)

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(_ass_header(px, py, neon_color))
        for i in range(0, len(word_timings), wpc):
            chunk = word_timings[i:i + wpc]
            if not chunk:
                continue
            start = chunk[0]["start"]
            end   = chunk[-1]["end"]
            text  = " ".join(w["text"] for w in chunk)

            is_reaction = any(rw in text.lower().strip("?!. ") for rw in _REACTION_TRIGGER)
            if is_reaction:
                style    = "Reaction"
                override = r"{\an5\blur4}"
            else:
                fs       = _dynamic_fs(text, font_size)
                style    = "Default"
                override = rf"{{\an2\pos({cx},{pos_y})\blur3\fs{fs}}}"

            f.write(
                f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},"
                f"{style},,0,0,0,,{override}{text}\n"
            )


# ── Legacy SRT (download uniquement) ──
def _srt_ts(s: float) -> str:
    h, m, sc, ms = int(s//3600), int((s%3600)//60), int(s%60), int(round((s%1)*1000))
    return f"{h:02d}:{m:02d}:{sc:02d},{ms:03d}"

def write_word_chunk_srt(word_timings: list, srt_path: Path, wpc: int = 3):
    with open(srt_path, "w", encoding="utf-8") as f:
        idx = 1
        for i in range(0, len(word_timings), wpc):
            chunk = word_timings[i:i + wpc]
            if not chunk: continue
            text = " ".join(w["text"] for w in chunk)
            f.write(f"{idx}\n{_srt_ts(chunk[0]['start'])} --> {_srt_ts(chunk[-1]['end'])}\n{text}\n\n")
            idx += 1


# ══════════════════════════════════════════════
#  Réactions automatiques dans les histoires Reddit
# ══════════════════════════════════════════════

_SHOCK_KW = {
    'fr': {'mort','morte','tué','tuée','décédé','décédée','accident','divorc','trahi',
           'trahie','enceinte','licencié','arrêté','emprisonné','million','milliard',
           'disparu','disparue','hôpital','urgence','cancer','rupture','arnaqué',
           'volé','trompé','trompée','suicid','escroqué','agressé','hospitalisé'},
    'en': {'died','dead','killed','murder','cheated','pregnant','fired','arrested',
           'million','billion','cancer','divorce','betrayed','accident','hospital',
           'surgery','missing','disappeared','abuse','bankrupt','robbery','assault',
           'trapped','suicide','fraud','scam','overdose','crash','threatened'},
}
_REACTIONS = {
    'fr': ["Faah!","Ayo?!","Bro quoi?!","Nah sérieux?!","Non non non!","Oh la la!",
           "C'est dingue frère!","T'es sérieux là?","Bro...","Attends quoi?!"],
    'en': ["Faah!","BRO WHAT","No way!","NAH FR?!","AYO?!","BRUH","WAIT WHAT",
           "Dude...","Oh my god!","That's WILD"],
}

def _detect_lang(text: str) -> str:
    fr = len(re.findall(
        r'\b(et|le|la|les|de|du|un|une|je|tu|il|elle|nous|vous|ils|elles|'
        r'est|sont|pas|mais|avec|pour|dans|sur|qui|que|très|plus|bien|tout|'
        r'même|comme|fait|dit|peut|être|avoir|cette|mon|ma|mes|ton|ta|ses)\b',
        text.lower()
    ))
    return 'fr' if fr > 4 else 'en'

def inject_reactions(story: str) -> str:
    """Insère des phrases-réactions après les moments choquants/surprenants."""
    lang  = _detect_lang(story)
    kws   = _SHOCK_KW[lang]
    reax  = _REACTIONS[lang]
    sents = re.split(r'(?<=[.!?…])\s+', story.strip())
    out, n = [], 0
    for sent in sents:
        out.append(sent)
        if n >= 3:
            continue
        slow  = sent.lower()
        shock = any(kw in slow for kw in kws)
        loud  = sent.strip().endswith('!') and len(sent) > 50
        if shock or loud:
            out.append(random.choice(reax))
            n += 1
    return ' '.join(out)


# ══════════════════════════════════════════════
#  Mode Reddit Visuel — PIL card rendering
# ══════════════════════════════════════════════

def _load_pil_font(size: int, bold: bool = False):
    """Charge une police TrueType depuis le système (Windows ou Linux)."""
    from PIL import ImageFont
    paths = (
        ["C:/Windows/Fonts/arialbd.ttf",
         "C:/Windows/Fonts/calibrib.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
        if bold else
        ["C:/Windows/Fonts/arial.ttf",
         "C:/Windows/Fonts/calibri.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
    )
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()


def _hex_to_rgba(hex_str: str, alpha: int = 255) -> tuple:
    h = hex_str.lstrip('#')
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), alpha)


def render_reddit_card(chunks: list, current_idx: int,
                        screenshot_img=None, neon_hex: str = '#FF00FF',
                        card_w: int = 1020) -> object:
    """
    Génère une image PIL RGBA du card Reddit avec le chunk `current_idx`
    mis en évidence par un highlight neon.

    chunks       : list of {'text': str, 'start': float, 'end': float}
    current_idx  : index du chunk actuellement lu
    screenshot_img: PIL Image à utiliser comme fond du card (optionnel)
    """
    from PIL import Image, ImageDraw

    FONT_SIZE = 48
    FONT_SM   = 30
    PADDING   = 42
    LINE_H    = FONT_SIZE + 24
    CORNER_R  = 22
    HEADER_H  = 62
    WINDOW    = 3   # chunks visibles avant/après le courant

    font_body = _load_pil_font(FONT_SIZE, bold=False)
    font_bold = _load_pil_font(FONT_SIZE, bold=True)
    font_head = _load_pil_font(FONT_SM,   bold=False)

    vis_start = max(0, current_idx - WINDOW)
    vis_end   = min(len(chunks), current_idx + WINDOW + 1)
    visible   = chunks[vis_start:vis_end]
    card_h    = PADDING + HEADER_H + len(visible) * LINE_H + PADDING

    # ── Fond arrondi ──
    card = Image.new('RGBA', (card_w, card_h), (0, 0, 0, 0))
    mask = Image.new('L',    (card_w, card_h), 0)
    try:
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, card_w-1, card_h-1], radius=CORNER_R, fill=255
        )
    except AttributeError:          # Pillow < 8.2 fallback
        ImageDraw.Draw(mask).rectangle([0, 0, card_w-1, card_h-1], fill=255)

    if screenshot_img:
        ss = screenshot_img.copy().convert('RGBA').resize(
            (card_w, card_h), Image.LANCZOS
        )
        dark = Image.new('RGBA', (card_w, card_h), (6, 6, 18, 190))
        card.paste(Image.alpha_composite(ss, dark), mask=mask)
    else:
        bg = Image.new('RGBA', (card_w, card_h), (13, 13, 26, 220))
        card.paste(bg, mask=mask)

    draw = ImageDraw.Draw(card)
    neon = _hex_to_rgba(neon_hex)

    # ── Header "r/reddit" ──
    draw.ellipse([PADDING, PADDING+5, PADDING+20, PADDING+25], fill=neon)
    draw.text((PADDING + 30, PADDING+2), "r/reddit  ·  histoire",
              font=font_head, fill=(150, 150, 168, 210))
    sep_y = PADDING + HEADER_H - 10
    draw.line([(PADDING, sep_y), (card_w - PADDING, sep_y)],
              fill=(48, 48, 68, 160), width=1)

    # ── Chunks (fenêtre glissante) ──
    neon_bg = _hex_to_rgba(neon_hex, 45)
    y = PADDING + HEADER_H

    for i, chunk in enumerate(visible):
        gidx = vis_start + i
        text = chunk['text']

        if gidx < current_idx:
            color = (95, 95, 115, 200)
            font  = font_body

        elif gidx == current_idx:
            # Highlight box + barre latérale neon
            try:
                draw.rounded_rectangle(
                    [PADDING-14, y-5, card_w-PADDING+14, y+FONT_SIZE+9],
                    radius=10, fill=neon_bg
                )
            except AttributeError:
                draw.rectangle(
                    [PADDING-14, y-5, card_w-PADDING+14, y+FONT_SIZE+9],
                    fill=neon_bg
                )
            draw.rectangle(
                [PADDING-14, y-5, PADDING-5, y+FONT_SIZE+9], fill=neon
            )
            color = (255, 255, 255, 255)
            font  = font_bold

        else:
            color = (52, 52, 70, 200)
            font  = font_body

        draw.text((PADDING, y), text, font=font, fill=color)
        y += LINE_H

    return card


def _read_srt_chunks(srt_path: Path) -> list:
    """Parse un fichier SRT → list of {'text', 'start', 'end'}."""
    chunks  = []
    content = srt_path.read_text(encoding='utf-8', errors='ignore')
    for entry in re.split(r'\n\n+', content.strip()):
        lines = entry.strip().split('\n')
        if len(lines) < 3:
            continue
        m = re.match(
            r'(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)',
            lines[1]
        )
        if m:
            g = m.groups()
            s = int(g[0])*3600 + int(g[1])*60 + int(g[2]) + int(g[3])/1000
            e = int(g[4])*3600 + int(g[5])*60 + int(g[6]) + int(g[7])/1000
            chunks.append({'text': ' '.join(lines[2:]), 'start': s, 'end': e})
    return chunks


def generate_card_frames(chunks: list, screenshot_path,
                          frame_dir: Path, neon_hex: str,
                          play_x: int = 1080, play_y: int = 1920) -> Path:
    """
    Génère les PNG RGBA (full-video size) pour chaque chunk
    et écrit le fichier de concaténation ffmpeg.
    Returns: Path to concat file.
    """
    from PIL import Image

    frame_dir.mkdir(parents=True, exist_ok=True)

    screenshot_img = None
    if screenshot_path:
        sp = Path(screenshot_path)
        if sp.exists():
            try: screenshot_img = Image.open(sp).convert('RGBA')
            except: pass

    card_w = min(1020, play_x - 60)
    card_x = (play_x - card_w) // 2
    card_y = 80

    concat_lines = ["ffconcat version 1.0"]

    for idx, chunk in enumerate(chunks):
        card   = render_reddit_card(chunks, idx, screenshot_img, neon_hex, card_w)
        canvas = Image.new('RGBA', (play_x, play_y), (0, 0, 0, 0))
        canvas.paste(card, (card_x, card_y), card)
        canvas.save(str(frame_dir / f"f{idx:04d}.png"), 'PNG')

        dur = max(0.04, chunk['end'] - chunk['start'])
        concat_lines.append(f"file 'f{idx:04d}.png'")
        concat_lines.append(f"duration {dur:.4f}")

    # Tenir le dernier frame 0.5s pour éviter la troncation ffmpeg
    if chunks:
        concat_lines.append(f"file 'f{len(chunks)-1:04d}.png'")
        concat_lines.append("duration 0.5000")

    concat_file = frame_dir / "frames.txt"
    concat_file.write_text('\n'.join(concat_lines), encoding='utf-8')
    return concat_file


def compose_visual_clip(bg_video: Path, concat_file: Path, wav: Path,
                         out: Path, vertical: bool, zoom: bool,
                         video_offset: float = 0.0):
    """
    Compose en une seule passe ffmpeg :
      background video (scaled, seek à video_offset) +
      card overlay PNG alpha + WAV audio → MP4.

    -stream_loop -1 : boucle la vidéo de fond si besoin.
    -ss video_offset : reprend là où la partie précédente s'est arrêtée.
    """
    if vertical:
        scale_f = (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,setsar=1"
            if zoom else
            "scale=1080:1920:force_original_aspect_ratio=decrease,"
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
        )
    else:
        scale_f = ("scale=1920:1080:force_original_aspect_ratio=decrease,"
                   "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1")

    filter_cplx = (
        f"[0:v]{scale_f}[bg];"
        "[1:v]fps=30[card];"
        "[bg][card]overlay=0:0:format=auto[out]"
    )

    rc, err = run_ffmpeg([
        "-stream_loop", "-1",
        "-ss", str(video_offset),
        "-i", str(bg_video),
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-i", str(wav),
        "-filter_complex", filter_cplx,
        "-map", "[out]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-ar", "48000", "-b:a", "128k",
        "-shortest", str(out)
    ])
    if rc != 0 or not out.exists():
        raise RuntimeError(f"compose_visual_clip failed: {err[-400:]}")


def process_reddit_visual(job_id: str, video_path: Path,
                           screenshot_path, opts: dict):
    """
    Pipeline Reddit Visuel :
    1. TTS → WAV + SRT (timings chunks)
    2. Trim background video
    3. Génère frames PIL du card (screenshot + reveal progressif)
    4. Compose en une passe ffmpeg (bg + card alpha + audio)
    """
    t0 = time.time()
    try:
        try:
            import PIL   # noqa
        except ImportError:
            raise RuntimeError(
                "Pillow n'est pas installé. Lance : pip install Pillow"
            )

        story = opts.get("story_text", "").strip()
        if not story:
            raise ValueError("Le texte Reddit est vide.")

        voice     = opts.get("tts_voice", "fr-FR-HenriNeural")
        wpc_txt   = opts.get("words_per_chunk", 160)
        vert      = opts.get("vertical", True)
        zoom      = opts.get("zoom", False)
        react     = opts.get("inject_reactions", True)
        font_size = opts.get("font_size", 30)
        neon_hex  = opts.get("neon_color", "#FF00FF")

        out_dir = OUTPUT_FOLDER / job_id
        out_dir.mkdir(exist_ok=True)

        if react:
            _upd(job_id, step="🤖  Analyse de l'histoire…", progress=3)
            story = inject_reactions(story)

        _upd(job_id, step="📖  Découpage du texte…", progress=5)
        parts = split_story(story, wpc_txt)
        n = len(parts)

        eta_total = n * (10 + wpc_txt / 2.5 + 35)
        _upd(job_id, total_clips=n, progress=8,
             eta=fmt_eta(eta_total),
             step=f"⏱ ~{fmt_eta(eta_total)} estimé · {n} partie(s)")

        video_dur    = get_media_duration(video_path)
        video_offset = 0.0
        clips = []

        for i, text in enumerate(parts):
            cn        = f"clip_{i+1:02d}"
            elapsed   = time.time() - t0
            remaining = max(0, eta_total - elapsed)
            pb        = 8 + (i / n) * 87

            # 1 · TTS → WAV + SRT (l'ASS n'est pas utilisé ici)
            _upd(job_id, step=f"🔊  Voix IA {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=pb)
            wav = out_dir / f"{cn}.wav"
            ass = out_dir / f"{cn}.ass"
            srt = out_dir / f"{cn}.srt"
            generate_tts(text, voice, wav, ass, srt,
                         words_per_chunk=3, vertical=vert,
                         font_size=font_size, sub_y_pct=85.0,
                         neon_hex=neon_hex)
            try: ass.unlink()
            except: pass

            if not wav.exists():
                raise RuntimeError(f"TTS a échoué pour la partie {i+1}")

            tts_dur = get_media_duration(wav)

            # 2 · Générer les frames PIL du card (reveal progressif)
            _upd(job_id, step=f"🎨  Card animé {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=pb + (87/n)*0.35)
            chunks_data = _read_srt_chunks(srt)
            frame_dir   = out_dir / f"{cn}_frames"
            concat_file = generate_card_frames(
                chunks_data, screenshot_path, frame_dir,
                neon_hex, play_x=1080, play_y=1920
            )

            # 3 · Composer en 1 passe : fond (seek) + card alpha + audio → sync parfait
            _upd(job_id, step=f"🎬  Rendu final {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=pb + (87/n)*0.75)
            final = out_dir / f"{cn}_final.mp4"
            compose_visual_clip(video_path, concat_file, wav, final, vert, zoom,
                                video_offset=video_offset)

            try: wav.unlink()
            except: pass
            try: shutil.rmtree(frame_dir)
            except: pass

            if not final.exists():
                raise RuntimeError(f"Le clip final {i+1} n'a pas été créé.")

            # Avancer l'offset dans la vidéo de fond (boucle si besoin)
            video_offset = (video_offset + tts_dur) % video_dur

            clips.append({
                "id": i+1, "name": f"Partie {i+1}",
                "duration": round(tts_dur, 1),
                "start": 0, "end": round(tts_dur, 1),
                "filename": f"{cn}_final.mp4",
                "srt_filename": f"{cn}.srt",
                "transcript": text[:180] + ("…" if len(text) > 180 else ""),
            })
            _upd(job_id, clips=clips)

        _upd(job_id, status="done", progress=100,
             step=f"✅  {n} partie(s) générée(s) en {fmt_eta(time.time()-t0)}",
             clips=clips, eta="")

    except Exception as exc:
        _upd(job_id, status="error", step=f"❌  {exc}", error=str(exc))
        raise


def whisper_to_word_timings(whisper_segments: list) -> list:
    """
    Convertit les segments Whisper en timings mot-par-mot.
    La durée de chaque segment est répartie uniformément entre les mots.
    """
    result = []
    for seg in whisper_segments:
        words = seg["text"].strip().split()
        if not words:
            continue
        dur    = seg["end"] - seg["start"]
        tpw    = dur / len(words)
        for i, w in enumerate(words):
            result.append({
                "start": seg["start"] + i * tpw,
                "end":   seg["start"] + (i + 1) * tpw,
                "text":  w
            })
    return result


# ══════════════════════════════════════════════
#  Mode Normal – utilitaires
# ══════════════════════════════════════════════

def detect_silences(video_path: Path, noise_db="-35dB", min_dur=0.5):
    _, stderr = run_ffmpeg([
        "-i", str(video_path),
        "-af", f"silencedetect=noise={noise_db}:d={min_dur}",
        "-f", "null", "-"
    ])
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", stderr)]
    ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)",   stderr)]
    return list(zip(starts, ends))


def compute_segments(silences, total, min_clip=20, max_clip=90):
    pts = sorted({0.0, total} | {(s+e)/2 for s, e in silences})
    segs, i = [], 0
    while i < len(pts) - 1:
        a, b = pts[i], pts[i+1]
        while b - a < min_clip and i + 2 < len(pts):
            i += 1; b = pts[i+1] if i+1 < len(pts) else total
        while b - a > max_clip:
            sp = a + max_clip
            nearby = [p for p in pts if a < p < b]
            sp = min(nearby, key=lambda x: abs(x-sp), default=sp)
            if b - sp > 5: segs.append((a, sp))
            a = sp
        if b - a >= 5: segs.append((a, b))
        i += 1
    return segs


def cut_video(src: Path, start: float, end: float, dst: Path):
    run_ffmpeg(["-ss", str(start), "-to", str(end), "-i", str(src), "-c", "copy", str(dst)])


def trim_video(src: Path, duration: float, dst: Path):
    """Coupe la vidéo à exactement `duration` secondes (sans audio)."""
    rc, err = run_ffmpeg([
        "-i", str(src), "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-an", str(dst)
    ])
    if rc != 0 or not dst.exists():
        raise RuntimeError(f"trim_video failed: {err[-300:]}")


def _safe_sub_path(sub: Path) -> tuple[str, str | None]:
    """
    Retourne (path_esc_pour_ffmpeg, tmp_à_supprimer_ou_None).
    Sur Windows, les espaces dans le chemin cassent les filtres subtitles= / ass=.
    Stratégie : chemin court 8.3 d'abord, puis copie dans %TEMP%.
    """
    if os.name != 'nt':
        return str(sub).replace("\\", "/").replace(":", "\\:"), None

    try:
        import ctypes
        buf = ctypes.create_unicode_buffer(32768)
        ctypes.windll.kernel32.GetShortPathNameW(str(sub), buf, 32768)
        short = buf.value
        if short and ' ' not in short:
            return short.replace("\\", "/").replace(":", "\\:"), None
    except Exception:
        pass

    import tempfile
    tmp = tempfile.mktemp(suffix=sub.suffix)
    shutil.copy2(str(sub), tmp)
    return tmp.replace("\\", "/").replace(":", "\\:"), tmp


def burn_and_format(clip: Path, ass: Path, out: Path,
                    vertical: bool = True, zoom: bool = False,
                    audio_mode: str = 'encode'):
    """
    Incruste les sous-titres ASS (neon glow) et formate en vertical/zoom.

    audio_mode:
      'encode' → transcode en AAC (mode Normal — vidéo avec audio original)
      'copy'   → copie le flux audio existant sans re-encoder
      'none'   → pas d'audio dans la sortie (vidéo silencieuse)

    zoom=True  → rogner pour remplir le cadre 9:16 (pas de bandes noires)
    zoom=False → letterbox avec bandes noires (comportement par défaut)
    """
    ass_esc, tmp_ass = _safe_sub_path(ass)

    vf = []
    if vertical:
        if zoom:
            vf.append("scale=1080:1920:force_original_aspect_ratio=increase,"
                      "crop=1080:1920,setsar=1")
        else:
            vf.append("scale=1080:1920:force_original_aspect_ratio=decrease,"
                      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1")

    vf.append(f"ass='{ass_esc}'")

    if audio_mode == 'none':
        audio_args = ["-an"]
    elif audio_mode == 'copy':
        audio_args = ["-c:a", "copy"]
    else:
        audio_args = ["-c:a", "aac", "-b:a", "128k"]

    try:
        rc, err = run_ffmpeg([
            "-i", str(clip), "-vf", ",".join(vf),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            *audio_args, str(out)
        ])
        if rc != 0 or not out.exists():
            raise RuntimeError(f"burn_and_format failed: {err[-300:]}")
    finally:
        if tmp_ass:
            try: os.unlink(tmp_ass)
            except: pass


# ══════════════════════════════════════════════
#  Mode Reddit – rendu clip en une seule passe
# ══════════════════════════════════════════════

def process_reddit_clip(video_path: Path, video_offset: float,
                         ass_path: Path, wav_path: Path, out: Path,
                         vertical: bool = True, zoom: bool = False):
    """
    Génère un clip Reddit en UNE SEULE passe ffmpeg :
      seek dans la vidéo de fond → burn sous-titres ASS → encode audio WAV.

    Avantages vs pipeline en 3 étapes :
    - Sync audio/vidéo parfaite (ffmpeg gère tout en interne)
    - Aucun délai d'encodeur AAC visible (pas de mux séparé)
    - -stream_loop -1 : boucle la vidéo si elle est plus courte que le TTS
    - -ss video_offset : reprend là où la partie précédente s'est arrêtée
    - -shortest        : s'arrête quand le WAV est épuisé
    """
    ass_esc, tmp_ass = _safe_sub_path(ass_path)

    vf = []
    if vertical:
        if zoom:
            vf.append("scale=1080:1920:force_original_aspect_ratio=increase,"
                      "crop=1080:1920,setsar=1")
        else:
            vf.append("scale=1080:1920:force_original_aspect_ratio=decrease,"
                      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1")
    vf.append(f"ass='{ass_esc}'")

    try:
        rc, err = run_ffmpeg([
            "-stream_loop", "-1",          # boucle la vidéo si besoin
            "-ss", str(video_offset),      # seek rapide au bon offset
            "-i", str(video_path),
            "-i", str(wav_path),
            "-vf", ",".join(vf),
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-ar", "48000", "-b:a", "128k",
            "-shortest", str(out)
        ])
        if rc != 0 or not out.exists():
            raise RuntimeError(f"process_reddit_clip failed: {err[-400:]}")
    finally:
        if tmp_ass:
            try: os.unlink(tmp_ass)
            except: pass


# ══════════════════════════════════════════════
#  Mode Reddit – utilitaires
# ══════════════════════════════════════════════

def split_story(text: str, wpc=160) -> list[str]:
    sentences = re.split(r'(?<=[.!?…])\s+', text.strip())
    chunks, cur, n = [], [], 0
    for s in sentences:
        w = len(s.split())
        if n + w > wpc and cur:
            chunks.append(" ".join(cur)); cur, n = [s], w
        else:
            cur.append(s); n += w
    if cur: chunks.append(" ".join(cur))
    return chunks or [text]


async def _tts_async(text: str, voice: str, wav_path: Path,
                     ass_path: Path, srt_path: Path,
                     words_per_chunk: int = 3, vertical: bool = True,
                     font_size: int = 30, sub_y_pct: float = 85.0,
                     neon_hex: str = '#FF00FF'):
    """
    Génère audio TTS via edge-tts.
    • Écrit d'abord un MP3 temporaire (format natif edge-tts)
    • Convertit en WAV PCM → élimine le délai d'encodeur MP3 (sync fix)
    • Génère le fichier ASS (neon, single-line, position/couleur perso) et le SRT
    """
    import edge_tts
    comm        = edge_tts.Communicate(text, voice)
    words       = []
    audio_bytes = 0
    tmp_mp3     = wav_path.with_suffix(".tmp.mp3")

    try:
        with open(str(tmp_mp3), "wb") as f:
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                    audio_bytes += len(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    start = chunk["offset"]                      / 10_000_000
                    end   = (chunk["offset"] + chunk["duration"]) / 10_000_000
                    words.append({"start": start, "end": end, "text": chunk["text"]})
    except Exception as exc:
        raise RuntimeError(
            f"edge-tts a échoué — vérifiez votre connexion internet. "
            f"Détail : {type(exc).__name__}: {exc}"
        )

    if audio_bytes == 0:
        raise RuntimeError(
            "edge-tts n'a produit aucun audio. "
            "Vérifiez la voix sélectionnée et votre connexion internet."
        )

    # ── Fix sync : MP3 → WAV PCM (zéro délai d'encodeur) ──
    rc, err = run_ffmpeg([
        "-i", str(tmp_mp3),
        "-c:a", "pcm_s16le", "-ar", "24000",
        str(wav_path)
    ])
    try: tmp_mp3.unlink()
    except: pass
    if rc != 0 or not wav_path.exists():
        raise RuntimeError(f"Conversion audio échouée : {err[-200:]}")

    # ── Fallback si aucun WordBoundary ──
    if not words:
        dur = get_media_duration(wav_path)
        raw = text.split()
        tpw = dur / max(len(raw), 1)
        words = [{"start": i*tpw, "end": (i+1)*tpw, "text": w}
                 for i, w in enumerate(raw)]

    write_word_chunk_ass(words, ass_path, words_per_chunk,
                         vertical=vertical,
                         font_size=font_size,
                         sub_y_pct=sub_y_pct,
                         neon_hex=neon_hex)
    write_word_chunk_srt(words, srt_path, words_per_chunk)


def generate_tts(text: str, voice: str, wav_path: Path,
                 ass_path: Path, srt_path: Path,
                 words_per_chunk: int = 3, vertical: bool = True,
                 font_size: int = 30, sub_y_pct: float = 85.0,
                 neon_hex: str = '#FF00FF'):
    """Lance _tts_async dans un event loop dédié (thread-safe pour Flask)."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(
            _tts_async(text, voice, wav_path, ass_path, srt_path,
                       words_per_chunk, vertical,
                       font_size, sub_y_pct, neon_hex)
        )
    finally:
        loop.close()
        asyncio.set_event_loop(None)


def merge_tts(video: Path, audio: Path, out: Path, mute: bool):
    """Fusionne vidéo (sans audio) + audio TTS."""
    rc, err = run_ffmpeg([
        "-i", str(video), "-i", str(audio),
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-shortest", str(out)
    ])
    if rc != 0 or not out.exists():
        raise RuntimeError(f"merge_tts failed: {err[-300:]}")


# ══════════════════════════════════════════════
#  ETA helpers
# ══════════════════════════════════════════════

def fmt_eta(seconds: float) -> str:
    if seconds <= 0: return "—"
    s = int(seconds)
    if s < 60:   return f"~{s}s"
    if s < 3600: return f"~{s//60}m{s%60:02d}s"
    return f"~{s//3600}h{(s%3600)//60:02d}m"


# ══════════════════════════════════════════════
#  Pipelines de traitement
# ══════════════════════════════════════════════

def process_normal(job_id: str, video_path: Path, opts: dict):
    t0 = time.time()
    try:
        _upd(job_id, step="Analyse de la vidéo…", progress=5)
        dur = get_media_duration(video_path)

        _upd(job_id, step="Détection des silences…", progress=12)
        silences = detect_silences(video_path,
                                   opts.get("noise_db", "-35dB"),
                                   opts.get("silence_min_dur", 0.5))

        _upd(job_id, step="Calcul des segments…", progress=18)
        segs = compute_segments(silences, dur,
                                opts.get("min_duration", 20),
                                opts.get("max_duration", 90))
        if not segs: segs = [(0.0, dur)]

        n = len(segs)
        avg_dur = sum(e-s for s,e in segs) / n
        eta_total = n * (avg_dur * 0.5 + 15)
        _upd(job_id, total_clips=n, progress=22,
             eta=fmt_eta(eta_total),
             step=f"⏱ ~{fmt_eta(eta_total)} estimé · {n} clip(s) détecté(s)")

        out_dir = OUTPUT_FOLDER / job_id
        out_dir.mkdir(exist_ok=True)

        vert      = opts.get("vertical", True)
        zoom      = opts.get("zoom", False)
        font_size = opts.get("font_size", 30)
        sub_y_pct = opts.get("sub_y_pct", 85.0)
        neon_hex  = opts.get("neon_color", "#FF00FF")

        whisper_model = None
        clips = []
        for i, (s, e) in enumerate(segs):
            cn = f"clip_{i+1:02d}"
            elapsed = time.time() - t0
            remaining = eta_total - elapsed
            _upd(job_id,
                 step=f"✂️  Découpage clip {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=22 + (i/n)*18)

            raw = out_dir / f"{cn}_raw.mp4"
            cut_video(video_path, s, e, raw)

            _upd(job_id,
                 step=f"🎙️  Transcription clip {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=40 + (i/n)*35)
            if whisper_model is None:
                import whisper as _w
                whisper_model = _w.load_model("base")
            tr = whisper_model.transcribe(str(raw), language=opts.get("language") or None)

            word_timings = whisper_to_word_timings(tr["segments"])
            ass = out_dir / f"{cn}.ass"
            srt = out_dir / f"{cn}.srt"
            write_word_chunk_ass(word_timings, ass, wpc=3, vertical=vert,
                                 font_size=font_size,
                                 sub_y_pct=sub_y_pct,
                                 neon_hex=neon_hex)
            write_word_chunk_srt(word_timings, srt, wpc=3)

            _upd(job_id,
                 step=f"🎬  Rendu clip {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=75 + (i/n)*20)
            final = out_dir / f"{cn}_final.mp4"
            burn_and_format(raw, ass, final, vertical=vert, zoom=zoom)
            try: raw.unlink(); ass.unlink()
            except: pass

            clips.append({
                "id": i+1, "name": f"Clip {i+1}",
                "duration": round(e-s, 1),
                "start": round(s,1), "end": round(e,1),
                "filename": f"{cn}_final.mp4",
                "srt_filename": f"{cn}.srt",
                "transcript": tr["text"].strip(),
            })
            _upd(job_id, clips=clips)

        _upd(job_id, status="done", progress=100,
             step=f"✅  {n} clip(s) générés en {fmt_eta(time.time()-t0)}",
             clips=clips, eta="")

    except Exception as exc:
        _upd(job_id, status="error", step=f"❌  {exc}", error=str(exc))
        raise


def process_reddit(job_id: str, video_path: Path, opts: dict):
    t0 = time.time()
    try:
        story  = opts.get("story_text", "").strip()
        if not story: raise ValueError("Le texte Reddit est vide.")

        voice     = opts.get("tts_voice", "fr-FR-HenriNeural")
        wpc_txt   = opts.get("words_per_chunk", 160)
        vert      = opts.get("vertical", True)
        zoom      = opts.get("zoom", False)
        react     = opts.get("inject_reactions", True)
        font_size = opts.get("font_size", 30)
        sub_y_pct = opts.get("sub_y_pct", 85.0)
        neon_hex  = opts.get("neon_color", "#FF00FF")

        out_dir = OUTPUT_FOLDER / job_id
        out_dir.mkdir(exist_ok=True)

        if react:
            _upd(job_id, step="🤖  Analyse de l'histoire…", progress=3)
            story = inject_reactions(story)

        _upd(job_id, step="📖  Découpage du texte…", progress=5)
        parts = split_story(story, wpc_txt)
        n = len(parts)

        eta_total = n * (5 + wpc_txt / 2.5 + 20)
        _upd(job_id, total_clips=n, progress=8,
             eta=fmt_eta(eta_total),
             step=f"⏱ ~{fmt_eta(eta_total)} estimé · {n} partie(s) détectée(s)")

        video_dur    = get_media_duration(video_path)
        video_offset = 0.0          # avance entre chaque partie
        clips = []

        for i, text in enumerate(parts):
            cn        = f"clip_{i+1:02d}"
            elapsed   = time.time() - t0
            remaining = max(0, eta_total - elapsed)
            pb_base   = 8 + (i / n) * 87

            # 1 · TTS → WAV + ASS + SRT
            _upd(job_id, step=f"🔊  Voix IA {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=pb_base)
            wav = out_dir / f"{cn}.wav"
            ass = out_dir / f"{cn}.ass"
            srt = out_dir / f"{cn}.srt"
            generate_tts(text, voice, wav, ass, srt,
                         words_per_chunk=3, vertical=vert,
                         font_size=font_size, sub_y_pct=sub_y_pct,
                         neon_hex=neon_hex)

            if not wav.exists():
                raise RuntimeError(f"TTS a échoué pour la partie {i+1}")

            tts_dur = get_media_duration(wav)

            # 2 · Rendu en UNE seule passe (seek + subs + audio = sync parfait)
            #     -stream_loop -1 : boucle la vidéo si elle est trop courte
            #     -ss video_offset : reprend là où la partie précédente s'est arrêtée
            _upd(job_id, step=f"🎬  Rendu {i+1}/{n} · {fmt_eta(remaining)} restant",
                 progress=pb_base + (87/n)*0.55)
            final = out_dir / f"{cn}_final.mp4"
            process_reddit_clip(video_path, video_offset, ass, wav, final, vert, zoom)
            try: ass.unlink(); wav.unlink()
            except: pass

            if not final.exists():
                raise RuntimeError(f"Le clip final {i+1} n'a pas été créé (vérifiez ffmpeg).")

            # Avancer l'offset (boucle si la vidéo de fond est plus courte)
            video_offset = (video_offset + tts_dur) % video_dur

            clips.append({
                "id": i+1, "name": f"Partie {i+1}",
                "duration": round(tts_dur, 1),
                "start": 0, "end": round(tts_dur, 1),
                "filename": f"{cn}_final.mp4",
                "srt_filename": f"{cn}.srt",
                "transcript": text[:180] + ("…" if len(text) > 180 else ""),
            })
            _upd(job_id, clips=clips)

        _upd(job_id, status="done", progress=100,
             step=f"✅  {n} partie(s) générée(s) en {fmt_eta(time.time()-t0)}",
             clips=clips, eta="")

    except Exception as exc:
        _upd(job_id, status="error", step=f"❌  {exc}", error=str(exc))
        raise


def process_video_job(job_id: str, video_path: Path, opts: dict):
    _upd(job_id, status="processing")
    mode = opts.get("mode", "normal")
    if mode == "reddit_visual":
        process_reddit_visual(job_id, video_path, opts.get("screenshot_path"), opts)
    elif mode == "reddit":
        process_reddit(job_id, video_path, opts)
    else:
        process_normal(job_id, video_path, opts)


# ══════════════════════════════════════════════
#  Routes Flask
# ══════════════════════════════════════════════

DIST_DIR = BASE_DIR / "static" / "dist"

@app.route("/")
def index():
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return send_file(str(dist_index))
    return render_template("index.html")

@app.route("/<path:path>")
def spa_catch(path):
    """Serve React static assets; fall back to index.html for SPA routes."""
    asset = DIST_DIR / path
    if asset.exists() and asset.is_file():
        return send_file(str(asset))
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return send_file(str(dist_index))
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    if "video" not in request.files:
        return jsonify({"error": "Aucun fichier vidéo"}), 400
    f = request.files["video"]
    if not f.filename:
        return jsonify({"error": "Nom de fichier vide"}), 400

    job_id = str(uuid.uuid4())
    ext    = Path(f.filename).suffix.lower() or ".mp4"
    vpath  = UPLOAD_FOLDER / f"{job_id}{ext}"
    f.save(str(vpath))

    def _bool(key, default="false"):
        return request.form.get(key, default).lower() == "true"

    # ── Mode detection ──
    # New: mode = "normal" | "reddit" | "reddit_visual"
    # Legacy compat: reddit_mode=true → mode="reddit"
    mode = request.form.get("mode", "")
    if not mode:
        mode = "reddit" if _bool("reddit_mode") else "normal"

    # ── Screenshot (Reddit Visuel uniquement) ──
    screenshot_path = None
    if mode == "reddit_visual" and "screenshot" in request.files:
        sf = request.files["screenshot"]
        if sf and sf.filename:
            ss_ext  = Path(sf.filename).suffix.lower() or ".png"
            ss_path = UPLOAD_FOLDER / f"{job_id}_screenshot{ss_ext}"
            sf.save(str(ss_path))
            screenshot_path = str(ss_path)

    opts = {
        "mode":              mode,
        # legacy key kept for backward compat
        "reddit_mode":       mode == "reddit",
        "story_text":        request.form.get("story_text", ""),
        "tts_voice":         request.form.get("tts_voice", "fr-FR-HenriNeural"),
        "mute_video":        _bool("mute_video", "true"),
        "words_per_chunk":   int(request.form.get("words_per_chunk", 160)),
        "vertical":          _bool("vertical", "true"),
        "zoom":              _bool("zoom", "false"),
        "inject_reactions":  _bool("inject_reactions", "true"),
        "min_duration":      int(request.form.get("min_duration", 20)),
        "max_duration":      int(request.form.get("max_duration", 90)),
        "noise_db":          request.form.get("noise_db", "-35dB"),
        "silence_min_dur":   float(request.form.get("silence_min_dur", 0.5)),
        "language":          request.form.get("language", "") or None,
        "font_size":         int(request.form.get("font_size", 30)),
        "sub_y_pct":         float(request.form.get("sub_y_pct", 85.0)),
        "neon_color":        request.form.get("neon_color", "#FF00FF"),
        # Reddit Visuel
        "screenshot_path":   screenshot_path,
    }

    jobs[job_id] = {
        "status": "queued", "progress": 0,
        "step": "En attente…", "total_clips": 0,
        "clips": [], "eta": ""
    }

    threading.Thread(target=process_video_job,
                     args=(job_id, vpath, opts), daemon=True).start()
    return jsonify({"job_id": job_id})


@app.route("/status/<job_id>")
def status(job_id):
    if job_id not in jobs:
        return jsonify({"error": "Job introuvable"}), 404
    return jsonify(jobs[job_id])


@app.route("/download/<job_id>/<filename>")
def download(job_id, filename):
    fp = OUTPUT_FOLDER / job_id / Path(filename).name
    if not fp.exists():
        return jsonify({"error": f"Fichier introuvable: {filename}"}), 404
    return send_file(str(fp), as_attachment=True,
                     download_name=Path(filename).name,
                     mimetype="video/mp4" if filename.endswith(".mp4") else None)


@app.route("/cleanup/<job_id>", methods=["POST"])
def cleanup(job_id):
    cleanup_job(job_id)
    return jsonify({"ok": True})


if __name__ == "__main__":
    print("\n🎬  VideoShorts v1.6")
    print("👉  http://localhost:5000\n")
    app.run(debug=False, port=5000, threaded=True)
