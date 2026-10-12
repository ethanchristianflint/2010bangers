import json
import re

with open('vibe_playlist.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

entries = [e for e in data.get('entries', []) if e.get('title') and e.get('id')]

print(f"Found {len(entries)} valid entries.")

# Known artists list for resolving Title - Artist vs Artist - Title
KNOWN_ARTISTS = [
    'Rihanna', 'Kanye West', 'Eminem', 'Drake', 'Lil Wayne', 'Chris Brown', 'Usher',
    'Black Eyed Peas', 'The Black Eyed Peas', 'Katy Perry', 'Pitbull', 'Flo Rida',
    'David Guetta', 'Calvin Harris', 'Avicii', 'LMFAO', 'Taio Cruz', 'Jason Derulo',
    'Bruno Mars', 'B.o.B', 'Lupe Fiasco', 'Akon', 'Sean Kingston', 'Trey Songz',
    'Jeremih', 'Soulja Boy', 'Iyaz', 'Young Money', 'Mike Posner', 'Far East Movement',
    'Owl City', 'Dr. Dre', 'Maroon 5', 'Cee Lo Green', 'CeeLo Green', 'Avril Lavigne',
    '3OH!3', 'Cali Swag District', 'Jay Sean', 'Enrique Iglesias', 'Diddy', 'Bad Meets Evil',
    'Fun', 'Kelly Clarkson', 'Britney Spears', 'Lady Gaga', 'Ke$ha', 'Kesha', 'Ne-Yo',
    'Gym Class Heroes', 'Cobra Starship', 'Hot Chelle Rae', 'Foster The People', 'Neon Trees',
    'OneRepublic', 'Coldplay', 'Justin Bieber', 'Macklemore', 'Outkast', 'T-Pain', 'Ludacris',
    'Snoop Dogg', 'Wiz Khalifa', 'Nicki Minaj', 'will.i.am', 'Timbaland', 'Justin Timberlake',
    '50 Cent', 'Nelly', 'Sean Paul', 'T.I.', 'Tinie Tempah', 'Daft Punk', 'Swedish House Mafia'
]

def parse_entry(entry):
    raw_title = entry.get('title', '').strip()
    vid_id = entry.get('id')
    channel = entry.get('channel') or entry.get('uploader') or ''
    duration = entry.get('duration') or 210

    # Clean noise
    t = raw_title
    t = re.sub(r'\s*\((?:lyrics?|lyric video|official lyrics? video|official audio|audio|official video|official music video|video|hd|hq|dirty|clean|explicit|remastered|visualizer).*?\)', '', t, flags=re.I)
    t = re.sub(r'\s*\[(?:lyrics?|lyric video|official lyrics? video|official audio|audio|official video|official music video|video|hd|hq|dirty|clean|explicit|remastered|visualizer).*?\]', '', t, flags=re.I)
    t = re.sub(r'\s*\|\s*(?:lyrics?|audio|official).*$', '', t, flags=re.I)
    t = re.sub(r'[🎵🎶🔥✨]', '', t).strip()
    t = re.sub(r'\s+', ' ', t).strip()

    artist = None
    title = None

    if ' - ' in t:
        parts = t.split(' - ', 1)
        p0 = parts[0].strip()
        p1 = parts[1].strip()

        # Check if p1 is a known artist (e.g. "Rude Boy - Rihanna" or "Gold Digger - Kanye West")
        p1_is_artist = any(k.lower() in p1.lower() for k in KNOWN_ARTISTS)
        p0_is_artist = any(k.lower() in p0.lower() for k in KNOWN_ARTISTS)

        if p1_is_artist and not p0_is_artist:
            artist = p1
            title = p0
        else:
            artist = p0
            title = p1
    elif ' | ' in t:
        parts = t.split(' | ', 1)
        p0 = parts[0].strip()
        p1 = parts[1].strip()
        if any(k.lower() in p1.lower() for k in KNOWN_ARTISTS):
            artist = p1
            title = p0
        else:
            artist = p0
            title = p1
    else:
        # Use channel/uploader
        ch_clean = re.sub(r'(?:vevo|official|channel|music|lyrics)', '', channel, flags=re.I).strip()
        if ch_clean and len(ch_clean) > 2:
            artist = ch_clean
        else:
            artist = 'Various Artists'
        title = t

    # Further clean up title & artist
    artist = re.sub(r'\s*\(.*?\)', '', artist).strip()
    title = re.sub(r'^[-\s]+|[-\s]+$', '', title).strip()

    # Normalize special channel names
    if 'caliswag' in artist.lower():
        artist = 'Cali Swag District'
    elif 'black eyed peas' in artist.lower():
        artist = 'The Black Eyed Peas'
    elif 'drake' in artist.lower() and artist != 'Drake':
        artist = 'Drake'

    return {
        'id': vid_id,
        'title': title,
        'artist': artist,
        'raw_title': raw_title,
        'duration': duration
    }

parsed_all = [parse_entry(e) for e in entries]

with open('scratch/parsed_sample.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_all, f, indent=2)

print("Saved parsed_sample.json")
