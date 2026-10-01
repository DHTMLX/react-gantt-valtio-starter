import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import ReactGantt, {
  type ReactGanttProps,
  type ReactGanttRef,
  type Link,
  type SerializedTask,
  type Task,
} from '@dhtmlx/trial-react-gantt';
import '@dhtmlx/trial-react-gantt/dist/react-gantt.css';
import './GanttComponent.css';

import { useSnapshot } from 'valtio';
import { ganttState, actions } from '../store';

import Toolbar from './Toolbar';

// DataProcessor bookkeeping helpers: added to the instance by createDataProcessor, missing from the typings
type DataProcessorUserData = {
  getUserData(id: string | number, name: string, store: string): string;
  setUserData(id: string | number, name: string, value: string, store: string): void;
};

// Valtio snapshots are read-only, but Gantt writes into the config objects it gets
// (e.g. columns[i].width), so pass it a mutable copy. Functions and Dates are kept as-is.
const toMutable = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map(toMutable) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toMutable(v)])) as T;
  }
  return value;
};

// On phones the default grid (~390px) leaves no room for the timeline, so show a narrow grid there
const narrowScreen = window.matchMedia('(max-width: 599px)');
const subscribeNarrow = (onChange: () => void) => {
  narrowScreen.addEventListener('change', onChange);
  return () => narrowScreen.removeEventListener('change', onChange);
};

export default function DemoValtio() {
  const snap = useSnapshot(ganttState);
  const { tasks, links, config } = snap;
  const isNarrow = useSyncExternalStore(subscribeNarrow, () => narrowScreen.matches);
  // Separate memo: re-applying columns on every store config change (zoom, undo) would reset their widths
  const gridConfig = useMemo(
    () => ({
      grid_width: isNarrow ? 160 : 390,
      columns: [
        { name: 'text', tree: true, width: '*', resize: true },
        { name: 'start_date', align: 'center', resize: true, width: 100, hide: isNarrow },
        { name: 'duration', align: 'center', width: 70, hide: isNarrow },
        { name: 'add', width: 44 },
      ],
    }),
    [isNarrow]
  );
  // grid options set in the store take precedence
  const ganttConfig = useMemo(() => ({ ...gridConfig, ...toMutable(config) }), [gridConfig, config]);
  const { addTask, updateTask, deleteTask, addLink, updateLink, deleteLink, undo, redo, setZoom } = actions;
  const ganttRef = useRef<ReactGanttRef>(null);
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    document.title = 'DHTMLX React Gantt | Valtio';
  }, []);

  // Runs after ReactGantt has applied the new tasks/links (child effects run first) and repairs
  // what its silent re-apply of store items leaves behind in Gantt.
  useEffect(() => {
    const gantt = ganttRef.current?.instance;
    if (!gantt) return;

    // 1. The DataProcessor marks every deleted id as "true_deleted" and silently skips later deletes
    //    of that id. Undo/redo re-adds such ids, so clear the stale marker for everything in the store.
    const dp = gantt as unknown as DataProcessorUserData;
    if (dp.getUserData) {
      const reset = (id: string | number, store: 'task' | 'link') => {
        if (dp.getUserData(id, '!nativeeditor_status', store) === 'true_deleted') {
          dp.setUserData(id, '!nativeeditor_status', '', store);
        }
      };
      tasks.forEach((t) => reset(t.id, 'task'));
      links.forEach((l) => reset(l.id, 'link'));
    }

    // 2. Undo/redo re-adds deleted tasks at the end of their branch, and children restored before
    //    their parent end up at the root. Put every task back under its store parent, in store order.
    //    Gantt's branch order now follows the store: persist order there before enabling order_branch/sort.
    let needsRender = false;
    const nextIndex = new Map<string, number>();
    const branches = new Map<string, (string | number)[]>();
    gantt.silent(() => {
      for (const t of tasks) {
        if (!gantt.isTaskExists(t.id)) continue;
        const parent = t.parent && gantt.isTaskExists(t.parent) ? t.parent : gantt.config.root_id;
        const key = String(parent);
        const index = nextIndex.get(key) ?? 0;
        nextIndex.set(key, index + 1);
        const siblings = branches.get(key) ?? gantt.getChildren(parent);
        branches.set(key, siblings);
        if (String(siblings[index]) !== String(t.id)) {
          gantt.moveTask(t.id, index, parent);
          branches.set(key, gantt.getChildren(parent));
          needsRender = true;
        }
      }
    });

    // 3. Re-applied tasks lose Gantt's link index ($source/$target). Without it, deleting an edited
    //    task leaves its links behind and duplicate-link validation stops working, so rebuild it.
    gantt.eachTask((t: Task) => {
      t.$source = [];
      t.$target = [];
    });
    for (const l of gantt.getLinks()) {
      if (gantt.isTaskExists(l.source)) gantt.getTask(l.source).$source?.push(l.id);
      if (gantt.isTaskExists(l.target)) gantt.getTask(l.target).$target?.push(l.id);
    }

    // 4. Tasks re-added by undo/redo get no $open (open_tree_initially only applies on parse), so a
    //    restored project would come back collapsed. Expand newly appearing tasks like on load.
    const prev = knownIds.current;
    knownIds.current = new Set(tasks.map((t) => String(t.id)));
    if (prev && gantt.config.open_tree_initially) {
      for (const t of tasks) {
        if (!prev.has(String(t.id)) && gantt.isTaskExists(t.id) && !gantt.getTask(t.id).$open) {
          gantt.getTask(t.id).$open = true;
          needsRender = true;
        }
      }
    }

    if (needsRender) gantt.render();
  }, [tasks, links]);

  const templates: ReactGanttProps['templates'] = useMemo(
    () => ({
      format_date: (date: Date) => date.toISOString(),
      // new Date('2025-04-02') is UTC midnight
      // treat date-only strings as local days
      parse_date: (date: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date),
    }),
    []
  );

  const data: ReactGanttProps['data'] = useMemo(
    () => ({
      save: (entity, action, payload, id) => {
        if (entity === 'task') {
          const task = payload as SerializedTask;
          // return only the id: other fields of the response would be read as DataProcessor metadata
          if (action === 'create') return { id: addTask(task).id };
          else if (action === 'update') updateTask(task);
          else if (action === 'delete') deleteTask(id);
        } else if (entity === 'link') {
          const link = payload as Link;
          if (action === 'create') return { id: addLink(link).id };
          else if (action === 'update') updateLink(link);
          else if (action === 'delete') deleteLink(id);
        }
      },
    }),
    [addTask, updateTask, deleteTask, addLink, updateLink, deleteLink]
  );

  return (
    <div className="gantt-container">
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        canUndo={snap.past.length > 0}
        canRedo={snap.future.length > 0}
        currentZoom={config.zoom.current}
        onZoom={setZoom}
      />
      <ReactGantt ref={ganttRef} tasks={tasks} links={links} config={ganttConfig} templates={templates} data={data} />
    </div>
  );
}
