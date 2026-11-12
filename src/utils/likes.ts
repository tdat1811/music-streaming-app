// Áp dụng like/unlike của một user lên bài đăng hoặc bình luận (trả object mới, không sửa object cũ)
export const toggleLike = <T extends { likes: number; likedByUserIds: string[] }>(item: T, userId: string): T =>
  item.likedByUserIds.includes(userId)
    ? {
        ...item,
        likes: Math.max(0, item.likes - 1),
        likedByUserIds: item.likedByUserIds.filter((id) => id !== userId),
      }
    : { ...item, likes: item.likes + 1, likedByUserIds: [...item.likedByUserIds, userId] };
