import { useEffect, useMemo } from 'react';
import ReactGantt, { type ReactGanttProps, type Link, type SerializedTask } from '@dhtmlx/trial-react-gantt';
import '@dhtmlx/trial-react-gantt/dist/react-gantt.css';

import { useSnapshot } from 'valtio';
import { ganttState, actions } from '../store';

import Toolbar from './Toolbar';

export default function DemoValtio() {
  const snap = useSnapshot(ganttState);
  const { tasks, links, config } = snap;
  const { addTask, updateTask, deleteTask, addLink, updateLink, deleteLink, undo, redo, setZoom } = actions;

  useEffect(() => {
    document.title = 'DHTMLX React Gantt | Valtio';
  }, []);

  const templates: ReactGanttProps['templates'] = useMemo(
    () => ({
      format_date: (date: Date) => date.toISOString(),
      parse_date: (date: string) => new Date(date),
    }),
    []
  );

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar onUndo={undo} onRedo={redo} currentZoom={config.zoom.current} onZoom={setZoom} />
      <ReactGantt tasks={tasks} links={links} config={config} templates={templates} data={data} />
    </div>
  );
}
