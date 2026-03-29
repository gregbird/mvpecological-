/**
 * Run async tasks in batches with a concurrency limit.
 * Unlike Promise.all which runs everything at once, this processes
 * at most `concurrency` tasks simultaneously.
 */
export async function batchAsync<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 3
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  // Start `concurrency` workers in parallel
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  await Promise.all(workers)

  return results
}
