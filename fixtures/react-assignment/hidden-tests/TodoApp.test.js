import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TodoApp from '../src/TodoApp';

describe('TodoApp', () => {
  test('renders heading', () => {
    render(<TodoApp />);
    expect(screen.getByText('Todo App')).toBeInTheDocument();
  });

  test('adds a todo', () => {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText('Add a todo...');
    const button = screen.getByText('Add');
    
    fireEvent.change(input, { target: { value: 'Learn React' } });
    fireEvent.click(button);
    
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  test('toggles todo completion', () => {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText('Add a todo...');
    const button = screen.getByText('Add');
    
    fireEvent.change(input, { target: { value: 'Test todo' } });
    fireEvent.click(button);
    
    const todoText = screen.getByText('Test todo');
    fireEvent.click(todoText);
    
    expect(todoText).toHaveStyle('text-decoration: line-through');
  });

  test('deletes a todo', () => {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText('Add a todo...');
    const button = screen.getByText('Add');
    
    fireEvent.change(input, { target: { value: 'To delete' } });
    fireEvent.click(button);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(screen.queryByText('To delete')).not.toBeInTheDocument();
  });

  test('adds multiple todos', () => {
    render(<TodoApp />);
    const input = screen.getByPlaceholderText('Add a todo...');
    const button = screen.getByText('Add');
    
    fireEvent.change(input, { target: { value: 'Todo 1' } });
    fireEvent.click(button);
    
    fireEvent.change(input, { target: { value: 'Todo 2' } });
    fireEvent.click(button);
    
    expect(screen.getByText('Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Todo 2')).toBeInTheDocument();
  });
});