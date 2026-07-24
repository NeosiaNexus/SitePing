import type { ReactElement } from "react";
import { useInboxUi } from "./context.js";
import { ChevronDownIcon } from "./icons.js";

interface ProjectSwitcherProps {
  projects: readonly string[];
  project: string;
  onChange: (project: string) => void;
}

/** Native select styled as a toolbar control — rendered only when more than one project is configured. */
export function ProjectSwitcher({ projects, project, onChange }: ProjectSwitcherProps): ReactElement {
  const { t } = useInboxUi();
  return (
    <div className="spd-project">
      <select
        className="spd-project-select"
        aria-label={t("inbox.project")}
        value={project}
        onChange={(event) => onChange(event.target.value)}
      >
        {projects.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <ChevronDownIcon />
    </div>
  );
}
