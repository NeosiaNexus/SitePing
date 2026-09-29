const ignore = (): void => {};

/**
 * Orders the hooks' tracker work within this process. Each hook reads the
 * issue before it writes it, and the server runs the hooks of concurrent
 * requests side by side: a status change and its undo, a delete and its
 * retry, or a delete landing while the issue is still being created would
 * otherwise interleave, and the last tracker write would win whatever order
 * the requests came in.
 *
 * Work on a feedback runs after the earlier work on that feedback. A
 * project task runs after every task of the project queued before it, and
 * before any queued after it.
 */
export function createTaskQueue() {
  const feedbackTails = new Map<string, Promise<void>>();
  const projectTails = new Map<string, Promise<void>>();
  const feedbackTasksByProject = new Map<string, Set<Promise<void>>>();

  /** `task` once every promise of `after` has settled, and a promise settling with it that never rejects. */
  const chain = <T>(after: Array<Promise<void> | undefined>, task: () => Promise<T>) => {
    const result = Promise.allSettled(after).then(task);
    return { result, settled: result.then(ignore, ignore) };
  };

  const setTail = (tails: Map<string, Promise<void>>, key: string, settled: Promise<void>): void => {
    tails.set(key, settled);
    settled.then(() => {
      if (tails.get(key) === settled) tails.delete(key);
    });
  };

  return {
    forFeedback<T>(projectName: string, feedbackId: string, task: () => Promise<T>): Promise<T> {
      const { result, settled } = chain([projectTails.get(projectName), feedbackTails.get(feedbackId)], task);
      setTail(feedbackTails, feedbackId, settled);
      const tasks = feedbackTasksByProject.get(projectName) ?? new Set();
      feedbackTasksByProject.set(projectName, tasks.add(settled));
      settled.then(() => {
        tasks.delete(settled);
        if (tasks.size === 0 && feedbackTasksByProject.get(projectName) === tasks) {
          feedbackTasksByProject.delete(projectName);
        }
      });
      return result;
    },

    forProject<T>(projectName: string, task: () => Promise<T>): Promise<T> {
      const pending = feedbackTasksByProject.get(projectName) ?? [];
      const { result, settled } = chain([projectTails.get(projectName), ...pending], task);
      setTail(projectTails, projectName, settled);
      return result;
    },
  };
}
