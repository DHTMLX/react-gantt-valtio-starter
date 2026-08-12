# React Gantt Chart with DHTMLX Gantt and Valtio

A working example of **DHTMLX React Gantt** integrated with **Valtio** for proxy-based reactive state management. Built with React 19+, Vite, and full TypeScript support.

**Related tutorial**: [Using React Gantt with Valtio](https://docs.dhtmlx.com/gantt/integrations/react/state/valtio/)

---

## What is React Gantt Chart with DHTMLX Gantt and Valtio Demo

This repository demonstrates how to drive a **DHTMLX React Gantt** chart entirely from a **Valtio** proxy store. Task and link data, chart configuration, and zoom level all live in a single reactive `ganttState` proxy object, and the component subscribes to it with Valtio's `useSnapshot` hook. Every create, update, and delete triggered inside the Gantt chart is routed through the chart's `data.save` callback into a corresponding Valtio action, so the store is always the single source of truth. The demo also implements snapshot-based **undo/redo** on top of the same proxy, using `past` and `future` history stacks. A Material UI toolbar exposes zoom controls (day, month, year) and undo/redo buttons.

## When to Use

Use this demo when you need to:
- Learn the idiomatic pattern for connecting DHTMLX React Gantt to a Valtio proxy store
- Implement CRUD operations (create, update, delete) on Gantt tasks and links via the `data.save` callback
- Add snapshot-based undo/redo history to a Gantt chart without a heavier state library
- See how to drive Gantt zoom levels (day/month/year) from external state
- Get a minimal, TypeScript-typed starting point for a React + Valtio + Gantt project

## Demo / Quick Start

```bash
git clone https://github.com/DHTMLX/react-gantt-valtio-starter.git
cd react-gantt-valtio-starter
npm install
npm run dev
```

or with yarn:

```bash
yarn
yarn dev
```

Expected result: a Gantt chart loads at `http://localhost:5173` with seed tasks and links, a toolbar for zoom/undo/redo, and drag-and-drop task editing backed by the Valtio store.

## Project Structure

```
src/
├── components/
│   ├── GanttComponent.tsx   # Main Gantt chart component with Valtio integration
│   └── Toolbar.tsx          # Material UI toolbar with zoom and undo/redo controls
├── seed/
│   └── Seed.ts              # Initial data (tasks, links, zoom levels)
├── store.ts                 # Valtio proxy state for state management
├── App.tsx
├── main.tsx
└── index.css
```

Data flows in one direction: `store.ts` holds the `ganttState` proxy and the `actions` object that mutates it. `GanttComponent.tsx` reads a live snapshot of that proxy with `useSnapshot`, passes `tasks`, `links`, and `config` down to `ReactGantt` as props, and wires the chart's `data.save` callback back into the store's actions. `Toolbar.tsx` only receives callback props (`onUndo`, `onRedo`, `onZoom`) and has no knowledge of Valtio itself.

## Key Patterns

- Reading reactive state with `useSnapshot(ganttState)` so the component re-renders automatically whenever the proxy changes
- Routing every Gantt `data.save` event (`create` / `update` / `delete` for both tasks and links) into dedicated Valtio actions
- Recording deep-cloned snapshots of `tasks`, `links`, and `config` into a `past` stack before each mutation, to support `undo`/`redo`
- Driving the toolbar's zoom buttons (`setZoom`) and history buttons (`undo`, `redo`) purely through props, keeping `Toolbar.tsx` decoupled from the store

## Code Examples

**Defining the reactive store** (`src/store.ts`):

```ts
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
```
`ganttState` is a single Valtio proxy holding tasks, links, chart configuration, and undo/redo history stacks, with a capped `maxHistory` to bound memory use.

**Connecting the chart to the store** (`src/components/GanttComponent.tsx`):

```tsx
const data: ReactGanttProps['data'] = useMemo(
  () => ({
    save: (entity, action, payload, id) => {
      if (entity === 'task') {
        const task = payload as SerializedTask;
        if (action === 'create') return addTask(task);
        else if (action === 'update') updateTask(task);
        else if (action === 'delete') deleteTask(id);
      } else if (entity === 'link') {
        const link = payload as Link;
        if (action === 'create') return addLink(link);
        else if (action === 'update') updateLink(link);
        else if (action === 'delete') deleteLink(id);
      }
    },
  }),
  [addTask, updateTask, deleteTask, addLink, updateLink, deleteLink]
);
```
Every task or link change fired by the Gantt chart is forwarded to a matching Valtio action, so the proxy state stays the single source of truth for the UI.

**Undo/redo with history snapshots** (`src/store.ts`):

```ts
export const actions = {
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
  // redo() mirrors undo() using the future stack
}
```
`undo` pops the last snapshot off the `past` stack, restores it into `ganttState`, and pushes the current state onto `future` so `redo` can restore it later.

## Features

| Feature | Details |
|---|---|
| Gantt chart UI | Project planning and task management via DHTMLX React Gantt |
| Valtio-driven CRUD | Task and link create/update/delete routed through Valtio proxy actions |
| Undo/redo | Snapshot-based history using `past`/`future` stacks in the store |
| Zoom levels | Day, month, and year views configured in `Seed.ts` and switched via the toolbar |
| Drag-and-drop | Native DHTMLX Gantt drag-and-drop scheduling |
| Material UI toolbar | Zoom and undo/redo controls built with MUI `Button`, `ButtonGroup`, and icons |
| TypeScript support | Typed tasks, links, and config via `@dhtmlx/trial-react-gantt` type exports |

## Production Notes

This is a starting point, not a production-ready app:
- The Gantt package used here (`@dhtmlx/trial-react-gantt`) is the evaluation build and requires a valid [DHTMLX license](https://dhtmlx.com/docs/products/licenses.shtml) or evaluation agreement for real use; the professional package name is `@dhx/react-gantt`
- Data is seeded in-memory from `Seed.ts` — there is no backend or persistence layer, so changes are lost on reload
- History snapshots use `JSON.parse(JSON.stringify(...))` deep clones, which is simple but won't scale well for very large task sets

## Related Resources

- [DHTMLX React Gantt product page](https://dhtmlx.com/docs/products/dhtmlxGantt-for-React/)
- [DHTMLX Gantt product page](https://dhtmlx.com/docs/products/dhtmlxGantt/)
- [React Gantt documentation](https://docs.dhtmlx.com/gantt/web__react.html)
- [React Gantt – Valtio integration tutorial](https://docs.dhtmlx.com/gantt/integrations/react/state/valtio/)
- [State management basics guide](https://docs.dhtmlx.com/gantt/integrations/react/state/state-management-basics/)
- Other state-management starters: [Redux Toolkit](https://docs.dhtmlx.com/gantt/integrations/react/state/redux-toolkit/), [Zustand](https://docs.dhtmlx.com/gantt/integrations/react/state/zustand/), [MobX](https://docs.dhtmlx.com/gantt/integrations/react/state/mobx/), [XState](https://docs.dhtmlx.com/gantt/integrations/react/state/xstate/), [Jotai](https://docs.dhtmlx.com/gantt/integrations/react/state/jotai/)
- [DHTMLX Blog](https://dhtmlx.com/blog/)
- [DHTMLX Forum](https://forum.dhtmlx.com/)

## License
 
The source code in this repository is released under the **MIT License**.
 
**Commercial License**
Required for proprietary or commercial applications. Includes access to PRO features, dedicated technical support, and long-term maintenance.
[Learn more →](https://dhtmlx.com/docs/products/dhtmlxGantt-for-React/#licensing)
 
**Try before you buy**
A free evaluation of DHTMLX React Gantt is available — no credit card required.
[Start your evaluation →](https://dhtmlx.com/docs/products/dhtmlxGantt-for-React/download.shtml)
