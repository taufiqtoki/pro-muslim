import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Checkbox, 
  IconButton, 
  Grid, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemSecondaryAction, 
  FormControlLabel,
  Chip,
  Card,
  CardContent,
  Stack,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
  Fab,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WorkIcon from '@mui/icons-material/Work';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../hooks/useAuth';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  deadline?: Date;
  priority: Priority;
  createdAt: Date;
}

const WorksTab: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTask, setNewTask] = useState<{ 
    title: string; 
    description: string; 
    priority: Priority;
  }>({ 
    title: '', 
    description: '', 
    priority: 'medium' 
  });
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [priorityMenuAnchorEl, setPriorityMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch tasks from Firebase
  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const tasksQuery = query(
          collection(db, `users/${user.uid}/tasks`),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(tasksQuery);
        const fetchedTasks: Task[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedTasks.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            completed: data.completed,
            deadline: data.deadline?.toDate(),
            priority: data.priority as Priority,
            createdAt: data.createdAt.toDate(),
          });
        });
        
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  // Apply filters and search
  useEffect(() => {
    let result = [...tasks];
    
    // Apply filter
    if (filter === 'active') {
      result = result.filter(task => !task.completed);
    } else if (filter === 'completed') {
      result = result.filter(task => task.completed);
    }
    
    // Apply search
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      result = result.filter(
        task => 
          task.title.toLowerCase().includes(lowerCaseSearch) || 
          task.description.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    setFilteredTasks(result);
  }, [tasks, filter, searchTerm]);

  // Add a new task
  const handleAddTask = async () => {
    if (!user || !newTask.title.trim()) return;

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        completed: false,
        priority: newTask.priority,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/tasks`), taskData);
      
      setTasks([
        {
          id: docRef.id,
          ...taskData,
        },
        ...tasks
      ]);
      
      setNewTask({ title: '', description: '', priority: 'medium' });
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId: string) => {
    if (!user) return;

    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    setTasks(updatedTasks);

    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks`, taskId), {
        completed: updatedTasks[taskIndex].completed
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasks`, taskId));
      setTasks(tasks.filter(task => task.id !== taskId));
      handleCloseMenu();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Start editing a task
  const handleStartEdit = (taskId: string) => {
    setEditingTask(taskId);
    handleCloseMenu();
  };

  // Save edited task
  const handleSaveEdit = async (taskId: string) => {
    if (!user) return;

    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks`, taskId), {
        title: tasks[taskIndex].title,
        description: tasks[taskIndex].description,
        priority: tasks[taskIndex].priority
      });
      
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Update task field while editing
  const handleUpdateTaskField = (taskId: string, field: keyof Task, value: any) => {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      [field]: value
    };
    
    setTasks(updatedTasks);
  };

  // Get properties based on priority
  const getPriorityProps = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return {
          color: '#FF3B30',
          bgcolor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
          label: 'High'
        };
      case 'medium':
        return {
          color: '#FF9500',
          bgcolor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
          label: 'Medium'
        };
      case 'low':
        return {
          color: '#34C759',
          bgcolor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
          label: 'Low'
        };
    }
  };

  // Menu handlers
  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, taskId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedTaskId(null);
  };

  // Priority menu handlers
  const handleOpenPriorityMenu = (event: React.MouseEvent<HTMLElement>) => {
    setPriorityMenuAnchorEl(event.currentTarget);
  };

  const handleClosePriorityMenu = () => {
    setPriorityMenuAnchorEl(null);
  };

  const handlePriorityChange = (priority: Priority) => {
    setNewTask({ ...newTask, priority });
    handleClosePriorityMenu();
  };

  const handleUpdateTaskPriority = async (taskId: string, priority: Priority) => {
    if (!user) return;

    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks`, taskId), {
        priority
      });
      
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex].priority = priority;
      setTasks(updatedTasks);
      
      handleCloseMenu();
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  return (
    <Box className="fade-in slide-up">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            letterSpacing: '-0.5px'
          }}
        >
          Task List
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ maxWidth: '600px' }}
        >
          Add, edit, and successfully complete all your tasks
        </Typography>
      </Box>
      
      {/* Add New Task Form */}
      <Card 
        variant="outlined" 
        className="card"
        sx={{ mb: 4 }}
      >
        <CardContent sx={{ pb: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 3 }}
          >
            <WorkIcon color="primary" />
            <Typography 
              variant="h6" 
              component="h2"
              sx={{ 
                fontWeight: 600,
                letterSpacing: '-0.5px'
              }}
            >
              Add New Task
            </Typography>
          </Stack>
        
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Task Title"
              value={newTask.title}
              variant="outlined"
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              InputProps={{
                sx: { borderRadius: 'var(--radius-md)' }
              }}
            />
            
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={newTask.description}
              variant="outlined"
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              InputProps={{
                sx: { borderRadius: 'var(--radius-md)' }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={newTask.priority === 'low' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setNewTask({ ...newTask, priority: 'low' })}
                  size="small"
                  startIcon={<FlagIcon />}
                  sx={{ 
                    borderRadius: 'var(--radius-pill)',
                    textTransform: 'none'
                  }}
                >
                  {getPriorityProps('low').label}
                </Button>
                <Button
                  variant={newTask.priority === 'medium' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setNewTask({ ...newTask, priority: 'medium' })}
                  size="small"
                  startIcon={<FlagIcon />}
                  sx={{ 
                    borderRadius: 'var(--radius-pill)',
                    textTransform: 'none'
                  }}
                >
                  {getPriorityProps('medium').label}
                </Button>
                <Button
                  variant={newTask.priority === 'high' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setNewTask({ ...newTask, priority: 'high' })}
                  size="small"
                  startIcon={<FlagIcon />}
                  sx={{ 
                    borderRadius: 'var(--radius-pill)',
                    textTransform: 'none'
                  }}
                >
                  {getPriorityProps('high').label}
                </Button>
              </Box>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTask}
                disabled={!newTask.title.trim()}
                sx={{ 
                  borderRadius: 'var(--radius-pill)',
                  px: 3,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'var(--shadow-sm)'
                  }
                }}
              >
                Add
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      
      {/* Task List Header with Filters and Search */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 2,
          gap: 2
        }}
      >
        <Stack direction="row" spacing={1}>
          <Button 
            variant={filter === 'all' ? 'contained' : 'text'} 
            onClick={() => setFilter('all')}
            size="small"
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none',
              boxShadow: 'none',
              minWidth: 'unset'
            }}
          >
            All
          </Button>
          <Button 
            variant={filter === 'active' ? 'contained' : 'text'} 
            onClick={() => setFilter('active')}
            size="small"
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none',
              boxShadow: 'none',
              minWidth: 'unset'
            }}
          >
            Active
          </Button>
          <Button 
            variant={filter === 'completed' ? 'contained' : 'text'} 
            onClick={() => setFilter('completed')}
            size="small"
            sx={{ 
              borderRadius: 'var(--radius-pill)',
              textTransform: 'none',
              boxShadow: 'none',
              minWidth: 'unset'
            }}
          >
            Completed
          </Button>
        </Stack>
        
        <TextField
          placeholder="Search tasks..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            sx: { 
              borderRadius: 'var(--radius-pill)',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              pr: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              }
            }
          }}
          sx={{ 
            width: { xs: '100%', sm: '220px' }
          }}
        />
      </Box>
      
      {/* Task List */}
      {loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            py: 8
          }}
        >
          <CircularProgress />
        </Box>
      ) : filteredTasks.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 6,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 'var(--radius-md)',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
          }}
        >
          <WorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No Tasks Found
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
            {searchTerm 
              ? 'No tasks match your search criteria'
              : filter !== 'all' 
                ? `No ${filter === 'active' ? 'active' : 'completed'} tasks found`
                : 'Your task list is empty. Use the form above to add new tasks.'
            }
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {filteredTasks.map((task) => (
            <Card 
              key={task.id} 
              sx={{ 
                borderRadius: 'var(--radius-md)',
                position: 'relative',
                borderLeft: '4px solid',
                borderColor: getPriorityProps(task.priority).color,
                boxShadow: 'var(--shadow-sm)',
                opacity: task.completed ? 0.7 : 1,
                '&:hover': {
                  boxShadow: 'var(--shadow-md)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all var(--transition-normal)'
              }}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                {editingTask === task.id ? (
                  // Edit mode
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Task Title"
                      value={task.title}
                      onChange={(e) => handleUpdateTaskField(task.id, 'title', e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        sx: { borderRadius: 'var(--radius-md)' }
                      }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={2}
                      value={task.description}
                      onChange={(e) => handleUpdateTaskField(task.id, 'description', e.target.value)}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        sx: { borderRadius: 'var(--radius-md)' }
                      }}
                    />
                    
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => setEditingTask(null)}
                        sx={{ 
                          borderRadius: 'var(--radius-pill)',
                          textTransform: 'none'
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => handleSaveEdit(task.id)}
                        startIcon={<SaveIcon />}
                        sx={{ 
                          borderRadius: 'var(--radius-pill)',
                          textTransform: 'none'
                        }}
                      >
                        Save
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  // View mode
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item>
                      <IconButton 
                        edge="start" 
                        onClick={() => handleToggleComplete(task.id)}
                        sx={{ 
                          color: task.completed ? 'success.main' : 'action.disabled',
                          p: 1
                        }}
                      >
                        {task.completed ? (
                          <CheckCircleOutlineIcon />
                        ) : (
                          <RadioButtonUncheckedIcon />
                        )}
                      </IconButton>
                    </Grid>
                    
                    <Grid item xs>
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600,
                            mb: 0.5,
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {task.title}
                        </Typography>
                        
                        {task.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              mb: 1,
                              textDecoration: task.completed ? 'line-through' : 'none'
                            }}
                          >
                            {task.description}
                          </Typography>
                        )}
                        
                        <Stack 
                          direction="row" 
                          spacing={1} 
                          alignItems="center"
                        >
                          <Chip 
                            label={getPriorityProps(task.priority).label}
                            size="small"
                            sx={{ 
                              bgcolor: getPriorityProps(task.priority).bgcolor,
                              color: getPriorityProps(task.priority).color,
                              fontWeight: 500,
                              borderRadius: 'var(--radius-pill)',
                              height: 24
                            }}
                          />
                          
                          <Typography 
                            variant="caption" 
                            color="text.disabled"
                          >
                            {format(task.createdAt, 'PP')}
                          </Typography>
                        </Stack>
                      </Box>
                    </Grid>
                    
                    <Grid item>
                      <IconButton 
                        edge="end" 
                        aria-label="more"
                        onClick={(e) => handleOpenMenu(e, task.id)}
                        sx={{ 
                          color: 'action.active',
                          p: 1
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      
      {/* Task Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          className: 'paper',
          elevation: 2,
          sx: { 
            minWidth: 180,
            borderRadius: 'var(--radius-md)'
          }
        }}
      >
        <MenuItem 
          onClick={() => selectedTaskId && handleStartEdit(selectedTaskId)}
          sx={{
            borderRadius: 'var(--radius-sm)',
            m: 0.5,
            py: 1
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
          Edit
        </MenuItem>
        
        {selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.priority !== 'high' && (
          <MenuItem 
            onClick={() => selectedTaskId && handleUpdateTaskPriority(selectedTaskId, 'high')}
            sx={{
              borderRadius: 'var(--radius-sm)',
              m: 0.5,
              py: 1,
              color: getPriorityProps('high').color
            }}
          >
            <FlagIcon fontSize="small" sx={{ mr: 1 }} />
            Set High Priority
          </MenuItem>
        )}
        
        {selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.priority !== 'medium' && (
          <MenuItem 
            onClick={() => selectedTaskId && handleUpdateTaskPriority(selectedTaskId, 'medium')}
            sx={{
              borderRadius: 'var(--radius-sm)',
              m: 0.5,
              py: 1,
              color: getPriorityProps('medium').color
            }}
          >
            <FlagIcon fontSize="small" sx={{ mr: 1 }} />
            Set Medium Priority
          </MenuItem>
        )}
        
        {selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.priority !== 'low' && (
          <MenuItem 
            onClick={() => selectedTaskId && handleUpdateTaskPriority(selectedTaskId, 'low')}
            sx={{
              borderRadius: 'var(--radius-sm)',
              m: 0.5,
              py: 1,
              color: getPriorityProps('low').color
            }}
          >
            <FlagIcon fontSize="small" sx={{ mr: 1 }} />
            Set Low Priority
          </MenuItem>
        )}
        
        <Divider sx={{ my: 0.5 }} />
        
        <MenuItem 
          onClick={() => selectedTaskId && handleDeleteTask(selectedTaskId)}
          sx={{
            borderRadius: 'var(--radius-sm)',
            m: 0.5,
            py: 1,
            color: 'error.main'
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WorksTab;
