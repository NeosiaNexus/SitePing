import type { ReactElement, RefObject } from "react";
import type { InboxState } from "../types.js";
import { useInboxUi } from "./context.js";
import { RefreshIcon } from "./icons.js";
import { ProjectSwitcher } from "./project-switcher.js";
import { SearchInput } from "./search-input.js";
import { StatusTabs } from "./status-tabs.js";
import { TypeFilter } from "./type-filter.js";

interface ToolbarProps {
  state: InboxState;
  searchRef: RefObject<HTMLInputElement | null>;
}

/** Fixed 48px toolbar: project switcher (multi-project only), status tabs, type filter, search, refresh. */
export function Toolbar({ state, searchRef }: ToolbarProps): ReactElement {
  const { t } = useInboxUi();
  return (
    <div className="spd-toolbar">
      {state.projects.length > 1 ? (
        <ProjectSwitcher projects={state.projects} project={state.project} onChange={state.setProject} />
      ) : null}
      <StatusTabs status={state.status} counts={state.counts} onChange={state.setStatus} />
      <div className="spd-toolbar-spacer" />
      <TypeFilter type={state.type} onChange={state.setType} />
      <SearchInput value={state.search} onChange={state.setSearch} inputRef={searchRef} />
      <button
        type="button"
        className={`spd-icon-btn spd-refresh${state.loading ? " spd-spin" : ""}`}
        aria-label={t("inbox.refresh")}
        onClick={() => {
          void state.refresh();
        }}
      >
        <RefreshIcon />
      </button>
    </div>
  );
}
