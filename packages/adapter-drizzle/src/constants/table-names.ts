/** Table names — override to fit your naming or avoid collisions. */
export interface SitepingTableNames {
  feedbacks: string;
  annotations: string;
  comments: string;
}

export const DEFAULT_SITEPING_TABLE_NAMES: SitepingTableNames = {
  feedbacks: "siteping_feedbacks",
  annotations: "siteping_annotations",
  comments: "siteping_comments",
};
