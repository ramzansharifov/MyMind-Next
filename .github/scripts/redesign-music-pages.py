from pathlib import Path
import re

path = Path('src/renderer/src/modules/music/MusicSimplePage.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace('  Pencil,\n', '', 1)
text = text.replace('  Search,\n', '', 1)

old_type = "type LibraryScope =\n  { kind: 'all' } | { kind: 'favorites' } | { kind: 'playlist'; playlistId: string }\n\n"
if old_type not in text:
    raise SystemExit('LibraryScope marker not found')
text = text.replace(old_type, '', 1)

import_marker = "import { StandardModulePage } from '../../shared/ui/StandardModulePage'\n"
import_value = import_marker + "import {\n  MusicLibraryContent,\n  MusicLibraryNavigation,\n  type MusicLibraryScope\n} from './components/MusicLibraryView'\n"
if import_marker not in text:
    raise SystemExit('StandardModulePage import marker not found')
text = text.replace(import_marker, import_value, 1)

text, count = re.subn(
    r"\nfunction TrackCover\(\{ item \}: \{ item: MusicItemRecord \}\): React\.JSX\.Element \{.*?\n\}\n\nfunction PlaylistDialog",
    '\nfunction PlaylistDialog',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Expected to remove TrackCover once, removed {count}')

text = text.replace(
    "const [scope, setScope] = useState<LibraryScope>({ kind: 'all' })",
    "const [scope, setScope] = useState<MusicLibraryScope>({ kind: 'all' })",
    1,
)

text, count = re.subn(
    r"\n  const selectedPlaylist =.*?\n  \}, \[overview\.items, overview\.playlists, query, scope\]\)\n",
    '\n',
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Expected to remove old visible-items block once, removed {count}')

text = text.replace(
    "      if (scope.kind === 'playlist' && scope.playlistId === playlistDeleteTarget.id) {\n        setScope({ kind: 'all' })\n      }",
    "      if (scope.kind === 'playlist' && scope.playlistId === playlistDeleteTarget.id) {\n        setScope({ kind: 'playlists' })\n      }",
    1,
)

navigation = '''      >
        {view.kind === 'library' && (
          <MusicLibraryNavigation
            scope={scope}
            query={query}
            onQueryChange={setQuery}
            onScopeChange={setScope}
          />
        )}
      </ModuleHeader>'''
text, count = re.subn(
    r"      >\n        \{view\.kind === 'library' && \(.*?\n      </ModuleHeader>",
    navigation,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Expected to replace music header navigation once, replaced {count}')

content = '''      {view.kind === 'form' ? (
        <TrackForm
          key={activeItem?.id ?? 'new-track'}
          item={activeItem}
          playlists={overview.playlists}
          busy={isSaving}
          formId={MUSIC_FORM_ID}
          onSave={saveTrack}
          onCreatePlaylist={openNewPlaylist}
        />
      ) : (
        <MusicLibraryContent
          overview={overview}
          scope={scope}
          query={query}
          isSaving={isSaving}
          onScopeChange={setScope}
          onOpenTrack={(itemId) => setView({ kind: 'form', itemId })}
          onToggleFavorite={(item) => void toggleFavorite(item)}
          onDeleteTrack={setDeleteTarget}
          onEditPlaylist={openPlaylistEditor}
          onDeletePlaylist={setPlaylistDeleteTarget}
          onCreatePlaylist={openNewPlaylist}
          onAddTrack={() => setView({ kind: 'form', itemId: null })}
        />
      )}

      <PlaylistDialog'''
text, count = re.subn(
    r"      \{view\.kind === 'form' \? \(.*?\n\n      <PlaylistDialog",
    content,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Expected to replace old library body once, replaced {count}')

path.write_text(text, encoding='utf-8')
