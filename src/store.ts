import { proxy } from 'valtio';
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
  tasks: seedTasks,
  links: seedLinks,
  config: { zoom: { ...defaultZoomLevels } },
  past: [],
  future: [],
  maxHistory: 50,
});

const recordHistory = () => {
  const { tasks, links, config, past, maxHistory } = ganttState;
  const snapshot = {
    tasks: JSON.parse(JSON.stringify(tasks)),
    links: JSON.parse(JSON.stringify(links)),
    config: JSON.parse(JSON.stringify(config)),
  };
  ganttState.past = [...past.slice(-maxHistory + 1), snapshot];
  ganttState.future = [];
};

export const actions = {
  setZoom(level: ZoomLevel) {
    recordHistory();
    ganttState.config.zoom.current = level;
  },
  undo() {
    const { past, future, tasks, links, config } = ganttState;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    ganttState.tasks = previous.tasks;
    ganttState.links = previous.links;
    ganttState.config = previous.config;
    ganttState.past = past.slice(0, -1);
    ganttState.future = [{ tasks, links, config }, ...future];
  },
  redo() {
    const { past, future, tasks, links, config } = ganttState;
    if (future.length === 0) return;
    const next = future[0];
    ganttState.tasks = next.tasks;
    ganttState.links = next.links;
    ganttState.config = next.config;
    ganttState.past = [...past, { tasks, links, config }];
    ganttState.future = future.slice(1);
  },
  addTask(task: SerializedTask) {
    recordHistory();
    const newTask = { ...task, id: `DB_ID:${task.id}` };
    ganttState.tasks = [...ganttState.tasks, newTask];
    return newTask;
  },

  updateTask(task: SerializedTask) {
    recordHistory();
    ganttState.tasks = ganttState.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t));
  },

  deleteTask(id: string | number) {
    recordHistory();
    ganttState.tasks = ganttState.tasks.filter((t) => String(t.id) !== String(id));
  },

  addLink(link: Link) {
    recordHistory();
    const newLink = { ...link, id: `DB_ID:${link.id}` };
    ganttState.links = [...ganttState.links, newLink];
    return newLink;
  },

  updateLink(link: Link) {
    recordHistory();
    ganttState.links = ganttState.links.map((l) => (l.id === link.id ? { ...l, ...link } : l));
  },

  deleteLink(id: string | number) {
    recordHistory();
    ganttState.links = ganttState.links.filter((l) => String(l.id) !== String(id));
  },
};
