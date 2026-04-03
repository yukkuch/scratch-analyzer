/**
 * 検索キーワードに基づいてユーザーをフィルタリングする
 */
export function filterUsers(users, searchText) {
  const query = searchText.toLowerCase();
  return users.filter(u => 
    u.username.toLowerCase().includes(query)
  );
}

/**
 * フォロー中とフォロワーを分離する
 */
export function splitUserTypes(users) {
  return {
    following: users.filter(u => u.type === 'following'),
    followers: users.filter(u => u.type === 'followers')
  };
}