import Divider from '@mui/material/Divider';
import ButtonGroup from '@mui/material/ButtonGroup';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import Button from '@mui/material/Button';
import type { ZoomLevel } from '../seed/Seed';
import './Toolbar.css';

export interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onZoom?: (level: ZoomLevel) => void;
  currentZoom?: ZoomLevel;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function Toolbar({
  onUndo,
  onRedo,
  onZoom,
  currentZoom = 'month',
  canUndo = true,
  canRedo = true,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <ButtonGroup>
        <Button aria-label="Undo" title="Undo" disabled={!canUndo} onClick={() => onUndo?.()}>
          <UndoIcon />
        </Button>
        <Button aria-label="Redo" title="Redo" disabled={!canRedo} onClick={() => onRedo?.()}>
          <RedoIcon />
        </Button>
      </ButtonGroup>
      <Divider orientation="vertical"></Divider>
      <ButtonGroup>
        <Button onClick={() => onZoom?.('day')} variant={currentZoom === 'day' ? 'contained' : 'outlined'}>
          Day
        </Button>
        <Button onClick={() => onZoom?.('month')} variant={currentZoom === 'month' ? 'contained' : 'outlined'}>
          Month
        </Button>
        <Button onClick={() => onZoom?.('year')} variant={currentZoom === 'year' ? 'contained' : 'outlined'}>
          Year
        </Button>
      </ButtonGroup>
    </div>
  );
}
