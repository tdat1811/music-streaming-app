// Kiểm thử đơn vị: hiển thị thống kê nghệ sĩ và nguồn lượt nghe – giai đoạn 4 (sheet UT35)
import { axisLabels, barHeights, compactSources, formatChange, formatNumber, pointLabel, rangeLabel, signed, sinceLabel, sourceLabel, tooltipLines } from '../stats';
import { getPlaySource, setPlaySource, sourceForScreen } from '../playSource';

describe('UT35 – formatChange(change)', () => {
  it.each([
    ['UTCID01', 18, { text: '▲ 18%', tone: 'up' }],
    ['UTCID02', -4, { text: '▼ 4%', tone: 'down' }],
    ['UTCID03', 0, { text: '— same as before', tone: 'flat' }],
    ['UTCID04', null, { text: '▲ new', tone: 'up' }],
    ['UTCID05', undefined, null],
  ])('%s: %j → %j', (_ma, vao, ra) => {
    expect(formatChange(vao as any)).toEqual(ra);
  });

  it('UTCID06: có hậu tố so sánh', () => {
    expect(formatChange(18, ' vs prev. 7 days')?.text).toBe('▲ 18% vs prev. 7 days');
  });

  it('UTCID07: formatNumber và signed', () => {
    expect([formatNumber(1248), formatNumber(12400), formatNumber(0)]).toEqual(['1,248', '12,400', '0']);
    expect([signed(27), signed(-9), signed(0), signed(1200)]).toEqual(['+27', '−9', '0', '+1,200']);
  });
});

describe('UT35 – nhãn biểu đồ', () => {
  const tuan = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'].map((key) => ({ key, plays: 1 }));

  it('UTCID08: 7 ngày → nhãn là thứ trong tuần', () => {
    expect(axisLabels(tuan)).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']);
  });

  it('UTCID09: 30 ngày → chỉ 4 mốc có nhãn (đầu, 1/3, 2/3, cuối)', () => {
    const thang = Array.from({ length: 30 }, (_, i) => ({ key: `2026-11-${String(i + 1).padStart(2, '0')}`, plays: i }));
    const nhan = axisLabels(thang);
    expect(nhan.filter(Boolean)).toEqual(['Nov 1', 'Nov 11', 'Nov 20', 'Nov 30']);
    expect(nhan).toHaveLength(30);
  });

  it('UTCID10: theo tháng → cột "Before" + 3 tháng một nhãn, tháng cuối luôn có nhãn', () => {
    const nam = [{ key: 'before', plays: 900 }, ...['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((key) => ({ key, plays: 5 }))];
    expect(axisLabels(nam).filter(Boolean)).toEqual(['Before', 'Feb', 'May', 'Aug', 'Nov']);
  });

  it('UTCID11: pointLabel, rangeLabel', () => {
    expect([pointLabel('2026-11-06'), pointLabel('2026-03'), pointLabel('before')]).toEqual(['Nov 6', 'Mar 2026', 'Before']);
    expect(rangeLabel(tuan)).toBe('Nov 10 – Nov 16');
    expect(rangeLabel([])).toBe('');
  });

  it('UTCID12: tooltipLines – ngày thường, ngày ra bài mới, cột lượt nghe cũ', () => {
    expect(tooltipLines({ key: '2026-11-06', plays: 286, releases: ['Mùa thu Hà Nội'] })).toEqual({ title: 'Nov 6 · 286 plays', sub: 'Released "Mùa thu Hà Nội"' });
    expect(tooltipLines({ key: '2026-11-07', plays: 1 })).toEqual({ title: 'Nov 7 · 1 play', sub: null });
    expect(tooltipLines({ key: 'before', plays: 3900 }).sub).toBe('Before daily stats started');
  });

  it('UTCID13: barHeights – cột cao nhất = 1; cột "Before" quá lớn bị chặn ở 1, không làm dẹt các tháng', () => {
    expect(barHeights([{ key: 'a-1-1', plays: 5 }, { key: 'a-1-2', plays: 10 }, { key: 'a-1-3', plays: 0 }])).toEqual([0.5, 1, 0]);
    expect(barHeights([{ key: 'before', plays: 5000 }, { key: '2026-10', plays: 50 }, { key: '2026-11', plays: 100 }])).toEqual([1, 0.5, 1]);
    expect(barHeights([{ key: '2026-11-01', plays: 0 }])).toEqual([0]);
  });

  it('UTCID14: sinceLabel', () => {
    expect(sinceLabel('2026-11-01T05:00:00', true)).toBe('since Nov 1, 2026');
    expect(sinceLabel('2025-03-20T05:00:00', false)).toBe('since Mar 2025');
    expect(sinceLabel(null)).toBe('');
  });
});

describe('UT35 – nguồn lượt nghe', () => {
  const nguon = [
    { source: 'search', plays: 41, percent: 41 },
    { source: 'feed', plays: 27, percent: 27 },
    { source: 'artist', plays: 19, percent: 19 },
    { source: 'home', plays: 8, percent: 8 },
    { source: 'library', plays: 5, percent: 5 },
  ];

  it('UTCID15: compactSources giữ 3 nguồn lớn nhất, còn lại gộp "Other"', () => {
    expect(compactSources(nguon, 4)).toEqual([nguon[0], nguon[1], nguon[2], { source: 'other', plays: 13, percent: 13 }]);
  });

  it('UTCID16: ít nguồn thì giữ nguyên; "Unknown" luôn đứng cuối', () => {
    expect(compactSources(nguon.slice(0, 2), 4)).toEqual(nguon.slice(0, 2));
    const coCu = [{ source: 'unknown', plays: 900, percent: 90 }, ...nguon.slice(0, 4)];
    const rut = compactSources(coCu, 4);
    expect(rut.map((s) => s.source)).toEqual(['search', 'feed', 'other', 'unknown']);
  });

  it('UTCID17: sourceLabel – nguồn lạ hiện "Other"', () => {
    expect([sourceLabel('home'), sourceLabel('unknown'), sourceLabel('xyz')]).toEqual(['Home & Charts', 'Unknown', 'Other']);
  });

  it.each([
    ['UTCID18', 'SearchResults', undefined, 'search'],
    ['UTCID19', 'Home', undefined, 'home'],
    ['UTCID20', 'ArtistProfile', undefined, 'artist'],
    ['UTCID21', 'PlaylistDetails', 'album', 'album'],
    ['UTCID22', 'PlaylistDetails', 'chart', 'home'],
    ['UTCID23', 'PlaylistDetails', 'u_jason', 'playlist'],
    ['UTCID24', 'Feed', undefined, 'feed'],
    ['UTCID25', 'MyLibrary', undefined, 'library'],
    ['UTCID26', 'StudioSongs', undefined, 'other'],
    ['UTCID27', 'PlayAudio', undefined, null],
  ])('%s: sourceForScreen(%s, %s) → %s', (_ma, man, chu, ra) => {
    expect(sourceForScreen(man, chu)).toBe(ra);
  });

  it('UTCID28: màn phát nhạc không đổi nguồn đang có', () => {
    setPlaySource('search');
    setPlaySource(sourceForScreen('PlayAudio'));
    expect(getPlaySource()).toBe('search');
    setPlaySource(sourceForScreen('Feed'));
    expect(getPlaySource()).toBe('feed');
  });
});
