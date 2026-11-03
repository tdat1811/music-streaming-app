const fs = require('fs');
const filePath = 'D:/mobile/project/app/screens/SearchResultsScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `   const matchedSongs = SEARCH_RESULTS.filter((song) => {
    const q = searchQuery.toLowerCase();
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
  });
  const displaySongs = matchedSongs.length > 0 ? matchedSongs : SEARCH_RESULTS;`;

const newCode = `  // Kho nhac tong hop tat ca bai hat trong app (loai bo trung ID)
  const ALL_SONGS: Song[] = [
    ...SEARCH_RESULTS,
    ...PLAYLIST_DETAILS_TRACKS,
    ...SUGGESTIONS,
  ].filter((song, index, self) => index === self.findIndex((s) => s.id === song.id));

  const q = searchQuery.toLowerCase().trim();
  const matchedSongs = ALL_SONGS.filter((song) => {
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q)
    );
  });
  const displaySongs = q === '' ? SEARCH_RESULTS : matchedSongs;`;

if (content.indexOf('matchedSongs') !== -1) {
  // Replace using regex or direct slice
  const startIndex = content.indexOf('const matchedSongs = SEARCH_RESULTS.filter');
  const endIndex = content.indexOf('const displaySongs = matchedSongs.length > 0 ? matchedSongs : SEARCH_RESULTS;') + 'const displaySongs = matchedSongs.length > 0 ? matchedSongs : SEARCH_RESULTS;'.length;
  content = content.substring(0, startIndex) + newCode + content.substring(endIndex);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('REPLACED_OK');
} else {
  console.log('NOT_FOUND');
}
