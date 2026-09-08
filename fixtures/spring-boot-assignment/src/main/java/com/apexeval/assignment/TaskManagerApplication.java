package com.apexeval.assignment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
public class TaskManagerApplication {

    private final Map<Long, Task> tasks = new HashMap<>();
    private long nextId = 1;

    public static void main(String[] args) {
        SpringApplication.run(TaskManagerApplication.class, args);
    }

    @GetMapping("/tasks")
    public List<Task> getAllTasks() {
        return new ArrayList<>(tasks.values());
    }

    @GetMapping("/tasks/{id}")
    public Task getTask(@PathVariable Long id) {
        return tasks.get(id);
    }

    @PostMapping("/tasks")
    public Task createTask(@RequestBody Task task) {
        task.setId(nextId++);
        tasks.put(task.getId(), task);
        return task;
    }

    @PutMapping("/tasks/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task task) {
        if (!tasks.containsKey(id)) {
            return null;
        }
        task.setId(id);
        tasks.put(id, task);
        return task;
    }

    @DeleteMapping("/tasks/{id}")
    public void deleteTask(@PathVariable Long id) {
        tasks.remove(id);
    }

    public static class Task {
        private Long id;
        private String title;
        private String description;
        private boolean completed;

        public Task() {}

        public Task(String title, String description) {
            this.title = title;
            this.description = description;
            this.completed = false;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }
    }
}