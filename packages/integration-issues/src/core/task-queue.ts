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
 * before any queued after it but a creation (see `forCreation`).
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

  /** `task` after `project` and the feedback's earlier work; the project's later tasks wait for it. */
  const queueOnFeedback = <T>(
    projectName: string,
    feedbackId: string,
    project: Promise<void> | undefined,
    task: () => Promise<T>,
  ): Promise<T> => {
    const { result, settled } = chain([project, feedbackTails.get(feedbackId)], task);
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
  };

  return {
    forFeedback<T>(projectName: string, feedbackId: string, task: () => Promise<T>): Promise<T> {
      return queueOnFeedback(projectName, feedbackId, projectTails.get(projectName), task);
    },

    /**
     * A new feedback's first task, which does not wait for its project's: a
     * feedback stored while its project is being deleted goes with it, so
     * waiting could not save its issue and would only hold the visitor's request.
     */
    forCreation<T>(projectName: string, feedbackId: string, task: () => Promise<T>): Promise<T> {
      return queueOnFeedback(projectName, feedbackId, undefined, task);
    },

    forProject<T>(projectName: string, task: () => Promise<T>): Promise<T> {
      const pending = feedbackTasksByProject.get(projectName) ?? [];
      const { result, settled } = chain([projectTails.get(projectName), ...pending], task);
      setTail(projectTails, projectName, settled);
      return result;
    },

    /** Whether no task is queued or running. The queue then holds nothing, whatever it has run. */
    get idle(): boolean {
      return feedbackTails.size === 0 && projectTails.size === 0 && feedbackTasksByProject.size === 0;
    },
  };
}
