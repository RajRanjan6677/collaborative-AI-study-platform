import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'var(--text-tertiary)',  bg: 'var(--bg-hover)' },
  in_progress: { label: 'In Progress', color: 'var(--warning)',        bg: 'hsla(38,92%,55%,0.1)' },
  done:        { label: 'Done',        color: 'var(--success)',        bg: 'var(--success-dim)' },
};

function SortableItem({ id, task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '0.85rem 1rem',
    marginBottom: '0.6rem',
    backgroundColor: isDragging ? 'var(--bg-hover)' : 'var(--bg-surface)',
    border: `1px solid ${isDragging ? 'var(--accent-border)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    cursor: isDragging ? 'grabbing' : 'grab',
    position: 'relative',
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? 'var(--shadow-md)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem', fontWeight: 600, paddingRight: '1.5rem' }}>
        {task.title}
      </h4>
      {task.description && (
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {task.description}
        </p>
      )}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
        by {task.creator_name}
      </div>
      <button
        style={{
          position: 'absolute', top: '0.6rem', right: '0.6rem',
          background: 'none', border: 'none',
          color: 'var(--text-tertiary)', cursor: 'pointer',
          fontSize: '1.1rem', lineHeight: 1,
          transition: 'color 0.15s',
          padding: '0',
        }}
        onMouseEnter={e => e.target.style.color = 'var(--danger)'}
        onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        title="Delete task"
      >
        ×
      </button>
    </div>
  );
}

function DroppableColumn({ id, title, tasks, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const cfg = STATUS_CONFIG[id];

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        backgroundColor: isOver ? 'var(--accent-dim)' : 'var(--bg-raised)',
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isOver ? 'var(--accent-border)' : 'var(--border)'}`,
        minHeight: '320px',
        transition: 'background-color 0.2s, border-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </h3>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem',
          borderRadius: '99px', background: cfg.bg, color: cfg.color
        }}>
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <SortableItem key={task.id} id={task.id.toString()} task={task} onDelete={onDelete} />
        ))}
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({ roomId, token }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setTasks(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTasks(); }, [roomId, token]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDesc, status: 'todo' })
      });
      if (res.ok) { setNewTaskTitle(''); setNewTaskDesc(''); fetchTasks(); }
    } catch (err) { console.error(err); }
  };

  const deleteTask = async (taskId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTasks();
    } catch (err) { console.error(err); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = parseInt(active.id);
    const newStatus = over.id;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`http://localhost:5000/api/rooms/${roomId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) { console.error(err); }
  };

  const cols = [
    { id: 'todo',        title: 'To Do'       },
    { id: 'in_progress', title: 'In Progress'  },
    { id: 'done',        title: 'Done'         },
  ];

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Add task form */}
      <form onSubmit={addTask} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Task title…"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          style={{ flex: '1 1 160px', minWidth: '140px' }}
        />
        <input
          type="text"
          className="form-input"
          placeholder="Description (optional)"
          value={newTaskDesc}
          onChange={e => setNewTaskDesc(e.target.value)}
          style={{ flex: '2 1 220px', minWidth: '160px' }}
        />
        <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 1.25rem' }}>
          + Add Task
        </button>
      </form>

      {/* Kanban columns */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
          {cols.map(col => (
            <DroppableColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter(t => t.status === col.id)}
              onDelete={deleteTask}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
