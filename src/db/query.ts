export async function all<T>(query: PromiseLike<T[]>): Promise<T[]> {
  return query;
}

export async function first<T>(query: PromiseLike<T[]>): Promise<T | undefined> {
  const rows = await query;
  return rows[0];
}

export async function exec<T>(query: PromiseLike<T>): Promise<T> {
  return query;
}
