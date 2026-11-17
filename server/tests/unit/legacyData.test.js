// Kiểm thử đơn vị: chuyển dữ liệu kiểu cũ sang kiểu mới (sheet UT16)
const { parseCount, buildArtistResolver } = require('../../src/utils/legacyData');

describe('UT16 – parseCount(value)', () => {
  it.each([
    ['UTCID01', '12.8M', 12800000],
    ['UTCID02', '2,1M', 2100000],          // dấu phẩy thập phân
    ['UTCID03', '950K', 950000],
    ['UTCID04', '85.4M Followers', 85400000],
    ['UTCID05', '12,345', 12345],          // dấu phân cách hàng nghìn
    ['UTCID06', '1.5B', 1500000000],
    ['UTCID07', 4200, 4200],               // đã là số
    ['UTCID08', 12.6, 13],                 // làm tròn
    ['UTCID09', -5, 0],                    // không âm
    ['UTCID10', 'abc', 0],
    ['UTCID11', '', 0],
    ['UTCID12', null, 0],
    ['UTCID13', undefined, 0],
    ['UTCID14', NaN, 0],
  ])('%s: parseCount(%p) = %p', (_ma, vao, ra) => {
    expect(parseCount(vao)).toBe(ra);
  });
});

describe('UT16 – buildArtistResolver(artists)(name)', () => {
  const resolve = buildArtistResolver([
    { id: 'art1', name: 'The Weeknd' },
    { id: 'art5', name: 'Sơn Tùng M-TP' },
    { id: 'art6', name: 'Vũ.' },
  ]);

  it.each([
    ['UTCID15', 'The Weeknd', 'art1'],
    ['UTCID16', 'the weeknd', 'art1'],                 // không phân biệt hoa thường
    ['UTCID17', 'Son Tung M-TP', 'art5'],              // không dấu
    ['UTCID18', 'The Weeknd ft. Daft Punk', 'art1'],   // có khách mời -> nghệ sĩ chính
    ['UTCID19', 'Sơn Tùng M-TP feat. Snoop Dogg', 'art5'],
    ['UTCID20', 'Vũ.', 'art6'],
    ['UTCID21', 'Daft Punk', null],                    // không có trong danh sách
    ['UTCID22', '', null],
  ])('%s: resolve(%p) = %p', (_ma, ten, id) => {
    expect(resolve(ten)).toBe(id);
  });
});
