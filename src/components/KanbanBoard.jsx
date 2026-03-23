import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function KanbanBoard({ onLogout, showToast, projectName, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status_id: null,
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Status laden
      const { data: statusData, error: statusError } = await supabase
        .from('task_statuses')
        .select('*')
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setStatuses(statusData || []);

      // Tasks laden
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (taskError) throw taskError;
      setTasks(taskData || []);

      // Default status_id setzen (To Do als Standard)
      if (statusData && statusData.length > 0 && !newTask.status_id) {
        const todoStatus = statusData.find(s => s.name === 'To Do');
        setNewTask(prev => ({ ...prev, status_id: todoStatus ? todoStatus.id : statusData[0].id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Fehler beim Laden der Daten', 'error');
    }
  };

  const getTasksByStatus = (statusId) => {
    return tasks.filter(task => task.status_id === statusId);
  };

  const filteredTasks = (statusId) => {
    let filtered = getTasksByStatus(statusId);
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.task_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.assigned_to && task.assigned_to.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    
    return filtered;
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description || null,
        status_id: newTask.status_id,
        assigned_to: newTask.assigned_to || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        showToast('Task aktualisiert!', 'success');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        showToast('Task erstellt!', 'success');
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      status_id: statuses.length > 0 ? statuses[0].id : null,
      assigned_to: '',
      priority: 'medium',
      due_date: ''
    });
    setShowAddTask(false);
    setEditingTask(null);
  };

  const handleEditTask = (task) => {
    setNewTask({
      title: task.title,
      description: task.description || '',
      status_id: task.status_id,
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      due_date: task.due_date || ''
    });
    setEditingTask(task);
    setShowAddTask(true);
  };

  const handleDeleteTask = async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
      setShowConfirmDelete(null);
      showToast('Task gelöscht!', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, statusId) => {
    e.preventDefault();
    setDragOverColumn(statusId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, statusId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status_id === statusId) {
      setDraggedTask(null);
      return;
    }

    showToast('Daten werden geladen...', 'loading');

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId })
        .eq('id', draggedTask.id);

      if (error) throw error;
      await loadData();
      showToast('Task verschoben!', 'success');
    } catch (error) {
      console.error('Error moving task:', error);
      showToast('Fehler beim Verschieben', 'error');
    } finally {
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return priority;
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date().setHours(0, 0, 0, 0);
  };

  const ConfirmDeleteModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg text-[var(--vintage-charcoal)] mb-4">{title}</h3>
        <p className="text-sm text-[var(--vintage-gray)] mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors">
            Abbrechen
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
            Löschen
          </button>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col bg-[var(--vintage-cream)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--vintage-beige)] border-b border-[var(--vintage-border)] z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Projects
            </button>
            <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
            <h1 className="text-lg text-[var(--vintage-charcoal)] truncate" style={{ fontFamily: 'Georgia, serif' }}>
              {projectName || 'To-Do Board'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] p-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-2 mt-12">
              <button
                onClick={() => { setShowAddTask(true); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm rounded transition-colors flex items-center gap-3 bg-[var(--vintage-brown)] text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Neuer Task</span>
              </button>
            </nav>
            <div className="mt-8 pt-4 border-t border-[var(--vintage-border)]">
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
              >
                Abmelden
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex bg-[var(--vintage-beige)] border-r border-[var(--vintage-border)] flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          <div className="p-4 border-b border-[var(--vintage-border)] flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={onBack}
                  className="text-lg text-[var(--vintage-gray)] hover:text-black transition-colors flex-shrink-0"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Projects
                </button>
                <span className="text-lg text-[var(--vintage-gray)] flex-shrink-0">/</span>
                <h1 className="text-lg text-[var(--vintage-charcoal)] tracking-wide truncate" style={{ fontFamily: 'Georgia, serif' }}>
                  {projectName || 'To-Do Board'}
                </h1>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarCollapsed ? (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </>
                )}
              </svg>
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setShowAddTask(true)}
              className={`w-full text-left px-4 py-2.5 text-sm rounded transition-colors flex items-center gap-3 bg-[var(--vintage-brown)] text-white ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {!sidebarCollapsed && <span>Neuer Task</span>}
            </button>
          </nav>
          <div className="p-4 border-t border-[var(--vintage-border)]">
            <button
              onClick={onLogout}
              className={`w-full px-4 py-2 text-sm text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors ${sidebarCollapsed ? 'justify-center flex' : ''}`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              ) : 'Abmelden'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
              Kanban Board
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm w-40"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 bg-white border border-[var(--vintage-border)] rounded text-sm cursor-pointer"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                <option value="all">Alle Prioritäten</option>
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="low">Niedrig</option>
              </select>
              <button
                onClick={() => setShowAddTask(true)}
                className="px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors hidden lg:flex items-center gap-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Neuer Task
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statuses.map(status => (
              <div
                key={status.id}
                className={`flex-shrink-0 w-72 lg:w-80 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded-lg ${
                  dragOverColumn === status.id ? 'ring-2 ring-[var(--vintage-brown)]' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, status.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status.id)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-[var(--vintage-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      ></div>
                      <h3 className="text-sm font-medium text-[var(--vintage-charcoal)]" style={{ fontFamily: 'Georgia, serif' }}>
                        {status.name}
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--vintage-gray)] bg-white px-2 py-1 rounded">
                      {filteredTasks(status.id).length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {filteredTasks(status.id).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      className={`bg-white border border-[var(--vintage-border)] rounded-lg p-3 cursor-move hover:border-[var(--vintage-brown)] transition-colors ${
                        draggedTask?.id === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs text-[var(--vintage-brown)] font-mono">
                          {task.task_number}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                      </div>
                      <h4 className="text-sm text-[var(--vintage-charcoal)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-[var(--vintage-gray)] mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--vintage-border)]">
                        <div className="flex items-center gap-2">
                          {task.assigned_to && (
                            <span className="text-xs text-[var(--vintage-gray)] flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              {task.assigned_to}
                            </span>
                          )}
                        </div>
                        {task.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${isOverdue(task.due_date) ? 'text-red-600' : 'text-[var(--vintage-gray)]'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            {new Date(task.due_date).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 text-[var(--vintage-gray)] hover:text-[var(--vintage-brown)] transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete({ id: task.id, title: task.title })}
                          className="p-1 text-[var(--vintage-gray)] hover:text-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredTasks(status.id).length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--vintage-gray)]">
                      Keine Tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Add/Edit Task Modal */}
      {(showAddTask || editingTask) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[var(--vintage-border)] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg text-[var(--vintage-charcoal)] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              {editingTask ? 'Task bearbeiten' : 'Neuer Task'}
            </h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Titel *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Beschreibung</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Status</label>
                <select
                  value={newTask.status_id || ''}
                  onChange={(e) => setNewTask({...newTask, status_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                >
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Zugewiesen an</label>
                <input
                  type="text"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                  placeholder="Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Priorität</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                  >
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[var(--vintage-brown)] mb-1">Fälligkeitsdatum</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full px-3 py-2 bg-[var(--vintage-beige)] border border-[var(--vintage-border)] rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-[var(--vintage-border)] text-[var(--vintage-gray)] text-sm rounded hover:bg-[var(--vintage-beige)] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--vintage-brown)] text-white text-sm rounded hover:bg-[var(--vintage-brown-dark)] transition-colors"
                >
                  {editingTask ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          title="Task löschen"
          message={`Möchten Sie "${showConfirmDelete.title}" wirklich löschen?`}
          onConfirm={() => handleDeleteTask(showConfirmDelete.id)}
          onCancel={() => setShowConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default KanbanBoard;