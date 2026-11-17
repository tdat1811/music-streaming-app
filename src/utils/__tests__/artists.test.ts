// Kiểm thử đơn vị: gộp danh sách nghệ sĩ có sẵn trong app với danh sách từ máy chủ (sheet UT25)
import type { Artist } from '../../data/musicData';
import { mapServerArtist, mergeArtists } from '../artists';

const LOCAL: Artist[] = [
  { id: 'art1', name: 'The Weeknd', avatarImage: 'local-weeknd.png', followers: '85.4M Followers' },
  { id: 'art2', name: 'Taylor Swift', avatarImage: 'local-taylor.png' },
];

describe('UT25 – mergeArtists(local, server) / mapServerArtist(a)', () => {
  it('UTCID01: nghệ sĩ chỉ có trên máy chủ (mới được duyệt) được thêm vào cuối', () => {
    const moi = mapServerArtist({ id: 'art_x1', name: 'Ashley S.', avatarImage: '', followersCount: 0 });
    const kq = mergeArtists(LOCAL, [moi]);
    expect(kq.map((a) => a.id)).toEqual(['art1', 'art2', 'art_x1']);
    expect(kq[2].name).toBe('Ashley S.');
  });

  it('UTCID02: cùng id → lấy dữ liệu máy chủ, giữ ảnh có sẵn nếu máy chủ không có ảnh', () => {
    const kq = mergeArtists(LOCAL, [mapServerArtist({ id: 'art1', name: 'The Weeknd', avatarImage: '', followersCount: 90000000 })]);
    expect(kq[0]).toMatchObject({ id: 'art1', avatarImage: 'local-weeknd.png', followersCount: 90000000 });
    expect(kq[0].followers).toBe('85.4M Followers'); // trường máy chủ không có thì giữ nguyên
  });

  it('UTCID03: máy chủ có ảnh mới → dùng ảnh máy chủ', () => {
    const kq = mergeArtists(LOCAL, [mapServerArtist({ id: 'art2', name: 'Taylor Swift', avatarImage: '/avatars/av_1.png' })]);
    expect(kq[1].avatarImage).toBe('/avatars/av_1.png');
  });

  it('UTCID04: máy chủ trả rỗng → giữ nguyên danh sách có sẵn; không làm thay đổi mảng đầu vào', () => {
    const banSao = JSON.parse(JSON.stringify(LOCAL));
    expect(mergeArtists(LOCAL, [])).toEqual(LOCAL);
    mergeArtists(LOCAL, [mapServerArtist({ id: 'art1', name: 'X' })]);
    expect(LOCAL).toEqual(banSao);
  });

  it('UTCID05: bỏ qua bản ghi máy chủ thiếu id hoặc tên', () => {
    const kq = mergeArtists(LOCAL, [mapServerArtist({ id: '', name: 'A' }), mapServerArtist({ id: 'b', name: '' })]);
    expect(kq).toHaveLength(2);
  });

  it('UTCID06: mapServerArtist – thiếu trường thì dùng giá trị mặc định', () => {
    expect(mapServerArtist({ id: 'a', name: 'B' })).toMatchObject({ avatarImage: '', bio: '', ownerUserId: null, followersCount: undefined });
  });
});
