// 通信担当
export async function fetchUserInfo(username) {
  try {
    const res = await fetch(`https://api.scratch.mit.edu/users/${username}`);
    if (!res.ok) throw new Error("Fetch failed");
    return await res.json();
  } catch (e) {
    return null;
  }
}