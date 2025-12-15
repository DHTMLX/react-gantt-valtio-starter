# DHTMLX React Gantt Valtio Demo

This project demonstrates how to integrate the DHTMLX React Gantt component with Valtio for state management in a React application. The integration enables centralized control of Gantt chart data, tasks, and links, providing predictable updates and smooth UI interactions through a proxy-based state management approach. The setup uses React 19+ and Vite, with full TypeScript support for enhanced code quality and maintainability.

## Features:

- Powerful Gantt chart UI for project planning and task management.

- Task and link creation, update, and deletion managed through Valtio proxy state.

- React component driven approach with props controlling Gantt configuration.

- Seamless Valtio integration for predictable and powerful state management with proxy-based reactivity.

- Support for zoom levels (day, month, year), undo/redo operations, and drag-and-drop functionality.

- Interactive toolbar with Material-UI components for enhanced user experience.

- Strong TypeScript support for type-safe usage.

## Project Structure:

```
src/
├── components/
│   ├── GanttComponent.tsx   # Main Gantt chart component with Valtio integration
│   └── Toolbar.tsx          # Material-UI toolbar with zoom and undo/redo controls
├── seed/
│   └── Seed.ts              # Initial data (tasks, links, zoom levels)
├── store.ts                 # Valtio proxy state for state management
├── App.tsx
├── main.tsx
└── index.css
```

### How to install using npm/yarn

Install dependencies:

```
npm install
```

or

```
yarn
```

### Run the demo on the local server and explore it

```
npm run dev
```

or

```
yarn dev
```

## License

Source code in this repo is released under the **MIT License**.

**DHTMLX React Gantt** is a commercial library - use under a valid [DHTMLX license](https://dhtmlx.com/docs/products/licenses.shtml) or evaluation agreement.

## Useful links

[DHTMLX React Gantt product page](https://dhtmlx.com/docs/products/dhtmlxGantt-for-React/)

[DHTMLX Gantt product page](https://dhtmlx.com/docs/products/dhtmlxGantt/)

[Documentation](https://docs.dhtmlx.com/gantt/)

[React Gantt Documentation](https://docs.dhtmlx.com/gantt/web__react.html)

[Blog](https://dhtmlx.com/blog/)

[Forum](https://forum.dhtmlx.com/)
