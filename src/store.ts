import { proxy, ref } from 'valtio';
import type { Link, GanttConfig, SerializedTask } from '@dhtmlx/trial-react-gantt';
import { seedTasks, seedLinks, defaultZoomLevels, type ZoomLevel } from './seed/Seed';

interface Snapshot {
  tasks: SerializedTask[];
  links: Link[];
  config: GanttConfig;
}

export const ganttState = proxy<{
  tasks: SerializedTask[];
  links: Link[];
  config: GanttConfig;
  past: Snapshot[];
  future: Snapshot[];
  maxHistory: number;
}>({
  // proxy() uses the passed objects as its targets; copy the seed so the module exports stay pristine
  tasks: structuredClone(seedTasks),
  links: structuredClone(seedLinks),
  // Expand branches via config, not `open: true` on tasks: ReactGantt re-applies a changed task
  // through Gantt's initItem, which re-expands it whenever it carries open: true.
  config: { zoom: structuredClone(defaultZoomLevels), open_tree_initially: true },
  // history holds full deep copies; ref() keeps it out of Valtio's deep proxy/listener tracking
  past: ref([]),
  future: ref([]),
  maxHistory: 50,
});

// Gantt reports one user action as several synchronous data.save calls (deleting a parent sends
// a delete for each connected link, the parent and every descendant). Record one undo step per burst.
let historyBatchOpen = false;

const recordHistory = () => {
  if (historyBatchOpen) return;
  historyBatchOpen = true;
  queueMicrotask(() => {
    historyBatchOpen = false;
  });
  const { tasks, links, config, past, maxHistory } = ganttState;
  const snapshot = {
    tasks: JSON.parse(JSON.stringify(tasks)),
    links: JSON.parse(JSON.stringify(links)),
    config: JSON.parse(JSON.stringify(config)),
  };
  const next = [...past, snapshot];
  ganttState.past = ref(next.slice(Math.max(0, next.length - maxHistory)));
  ganttState.future = ref([]);
};

const sameId = (a: string | number | undefined, b: string | number | undefined) => String(a) === String(b);
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Gantt adds end_date (derived from start_date + duration) to every task payload; ignore it for no-op checks
const sameTask = (a: SerializedTask, b: SerializedTask) =>
  sameJson({ ...a, end_date: undefined }, { ...b, end_date: undefined });

// Gantt reads parent/source/target of UI-created items from DOM attributes ("2" instead of 2);
// store the referenced task's own id so === comparisons with task ids keep working.
const taskRef = <T extends string | number | undefined>(id: T): T =>
  (ganttState.tasks.find((t) => sameId(t.id, id))?.id ?? id) as T;

export const actions = {
  setZoom(level: ZoomLevel) {
    if (ganttState.config.zoom.current === level) return;
    recordHistory();
    ganttState.config.zoom.current = level;
  },
  undo() {
    const { past, future, tasks, links, config } = ganttState;
    if (past.length === 0) return;
    historyBatchOpen = false;
    const previous = past[past.length - 1];
    ganttState.tasks = previous.tasks;
    ganttState.links = previous.links;
    ganttState.config = previous.config;
    ganttState.past = ref(past.slice(0, -1));
    ganttState.future = ref([{ tasks, links, config }, ...future]);
  },
  redo() {
    const { past, future, tasks, links, config } = ganttState;
    if (future.length === 0) return;
    historyBatchOpen = false;
    const next = future[0];
    ganttState.tasks = next.tasks;
    ganttState.links = next.links;
    ganttState.config = next.config;
    ganttState.past = ref([...past, { tasks, links, config }]);
    ganttState.future = ref(future.slice(1));
  },
  addTask(task: SerializedTask) {
    recordHistory();
    const newTask = { ...task, id: `DB_ID:${task.id}`, parent: taskRef(task.parent) };
    ganttState.tasks = [...ganttState.tasks, newTask];
    return newTask;
  },

  updateTask(task: SerializedTask) {
    const current = ganttState.tasks.find((t) => sameId(t.id, task.id));
    if (!current) return;
    const merged = { ...current, ...task, id: current.id };
    if (sameTask(merged, current)) return;
    recordHistory();
    ganttState.tasks = ganttState.tasks.map((t) => (t === current ? merged : t));
  },

  deleteTask(id: string | number) {
    // cascade like Gantt does: descendants and every link touching a removed task
    const removed = new Set([String(id)]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const t of ganttState.tasks) {
        if (!removed.has(String(t.id)) && t.parent != null && removed.has(String(t.parent))) {
          removed.add(String(t.id));
          grew = true;
        }
      }
    }
    if (!ganttState.tasks.some((t) => removed.has(String(t.id)))) return;
    recordHistory();
    ganttState.tasks = ganttState.tasks.filter((t) => !removed.has(String(t.id)));
    ganttState.links = ganttState.links.filter(
      (l) => !removed.has(String(l.source)) && !removed.has(String(l.target))
    );
  },

  addLink(link: Link) {
    recordHistory();
    const newLink = { ...link, id: `DB_ID:${link.id}`, source: taskRef(link.source), target: taskRef(link.target) };
    ganttState.links = [...ganttState.links, newLink];
    return newLink;
  },

  updateLink(link: Link) {
    const current = ganttState.links.find((l) => sameId(l.id, link.id));
    if (!current) return;
    const merged = { ...current, ...link, id: current.id };
    if (sameJson(merged, current)) return;
    recordHistory();
    ganttState.links = ganttState.links.map((l) => (l === current ? merged : l));
  },

  deleteLink(id: string | number) {
    if (!ganttState.links.some((l) => sameId(l.id, id))) return;
    recordHistory();
    ganttState.links = ganttState.links.filter((l) => !sameId(l.id, id));
  },
};
